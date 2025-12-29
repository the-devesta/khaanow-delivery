import { ERROR_MESSAGES } from '../constants/api';

export interface ErrorResponse {
  message: string;
  code?: string;
  field?: string;
  details?: any;
}

/**
 * Parse and format API errors
 */
export const parseApiError = (error: any): ErrorResponse => {
  // Axios error
  if (error.response) {
    const { data, status } = error.response;
    
    // Validation errors
    if (status === 400 && data.errors) {
      return {
        message: data.message || ERROR_MESSAGES.VALIDATION_ERROR,
        details: data.errors,
      };
    }
    
    // Unauthorized
    if (status === 401) {
      return {
        message: data.message || ERROR_MESSAGES.UNAUTHORIZED,
        code: 'UNAUTHORIZED',
      };
    }
    
    // Forbidden
    if (status === 403) {
      return {
        message: data.message || 'Access forbidden',
        code: 'FORBIDDEN',
      };
    }
    
    // Not found
    if (status === 404) {
      return {
        message: data.message || 'Resource not found',
        code: 'NOT_FOUND',
      };
    }
    
    // Server error
    if (status >= 500) {
      return {
        message: data.message || ERROR_MESSAGES.SERVER_ERROR,
        code: 'SERVER_ERROR',
      };
    }
    
    // Other errors
    return {
      message: data.message || 'An error occurred',
      code: data.code,
      details: data.error,
    };
  }
  
  // Network error
  if (error.request) {
    return {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      code: 'NETWORK_ERROR',
    };
  }
  
  // Other errors
  return {
    message: error.message || 'An unexpected error occurred',
  };
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: any): boolean => {
  return error.message === ERROR_MESSAGES.NETWORK_ERROR || !error.response;
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: any): boolean => {
  return error.response?.status === 401;
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: any): boolean => {
  return error.response?.status === 400;
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: any[]): string => {
  if (!errors || errors.length === 0) {
    return '';
  }
  
  return errors.map(err => err.msg || err.message).join(', ');
};

/**
 * Retry function for failed API calls
 */
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on auth errors or validation errors
      if (isAuthError(error) || isValidationError(error)) {
        throw error;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
};

/**
 * Handle API error and show appropriate message
 */
export const handleApiError = (error: any, showAlert: (message: string) => void) => {
  const errorResponse = parseApiError(error);
  
  if (errorResponse.details) {
    const validationMsg = formatValidationErrors(errorResponse.details);
    showAlert(validationMsg || errorResponse.message);
  } else {
    showAlert(errorResponse.message);
  }
};

export default {
  parseApiError,
  isNetworkError,
  isAuthError,
  isValidationError,
  formatValidationErrors,
  retryRequest,
  handleApiError,
};
