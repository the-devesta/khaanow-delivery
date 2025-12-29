import { ApiService } from './api';

/**
 * AuthService - Handles authentication via backend API
 * 
 * The backend handles all OTP generation, verification, and JWT token management.
 * No Firebase client SDK is needed on the mobile app.
 */
export const AuthService = {
  /**
   * Send OTP to phone number
   * Backend generates and stores the OTP
   */
  sendOTP: async (phoneNumber: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await ApiService.sendOtp(phoneNumber);
      return {
        success: response.success,
        message: response.message || (response.success ? 'OTP sent successfully' : 'Failed to send OTP'),
      };
    } catch (error: any) {
      console.error('Send OTP error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send OTP',
      };
    }
  },

  /**
   * Verify OTP code with backend
   * Returns JWT token and partner data on success
   */
  verifyOTP: async (
    phoneNumber: string, 
    code: string
  ): Promise<{ 
    success: boolean; 
    message: string; 
    data?: any;
  }> => {
    try {
      const response = await ApiService.verifyOtp(phoneNumber, code);
      return {
        success: response.success,
        message: response.message || (response.success ? 'OTP verified successfully' : 'Failed to verify OTP'),
        data: response.data,
      };
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify OTP',
      };
    }
  },

  /**
   * Complete phone authentication flow (send OTP + verify)
   */
  completePhoneAuth: async (
    phoneNumber: string,
    otpCode: string
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> => {
    try {
      const verifyResult = await AuthService.verifyOTP(phoneNumber, otpCode);
      return verifyResult;
    } catch (error: any) {
      console.error('Complete phone auth error:', error);
      return {
        success: false,
        message: error.message || 'Authentication failed',
      };
    }
  },

  /**
   * Sign out - clears stored tokens
   */
  signOut: async (): Promise<void> => {
    try {
      await ApiService.removeToken();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  /**
   * Get current auth token
   */
  getCurrentToken: async (): Promise<string | null> => {
    try {
      return await ApiService.getToken();
    } catch (error) {
      console.error('Get current token error:', error);
      return null;
    }
  },

  /**
   * Check if user has a stored token
   */
  isAuthenticated: async (): Promise<boolean> => {
    const token = await ApiService.getToken();
    return !!token;
  },
};

export default AuthService;
