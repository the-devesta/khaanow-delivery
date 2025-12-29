/**
 * API Configuration Constants
 */

// API Base URL
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://khaaonow-be.azurewebsites.net/api',
  TIMEOUT: 30000, // 30 seconds
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'delivery_partner_token',
  USER_ID: 'userId',
  PHONE_NUMBER: 'phoneNumber',
  IS_AUTHENTICATED: 'isAuthenticated',
  PARTNER_DATA: 'partnerData',
  PARTNER_STORAGE: 'partner-storage',
};

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    VERIFY_PHONE_TOKEN: '/delivery-partners/auth/verify-phone-token',
    GOOGLE_AUTH: '/delivery-partners/auth/google',
  },
  
  // Profile
  PROFILE: {
    COMPLETE: '/delivery-partners/profile/complete',
    GET: '/delivery-partners/profile',
    UPDATE: '/delivery-partners/profile',
  },
  
  // Documents
  DOCUMENTS: {
    UPLOAD: '/delivery-partners/documents/upload',
  },
  
  // Bank Details
  BANK: {
    ADD: '/delivery-partners/bank-details',
    UPDATE: '/delivery-partners/bank-details',
  },
  
  // Orders
  ORDERS: {
    AVAILABLE: '/orders',
    ASSIGNED: '/delivery-partners/orders/assigned',
    HISTORY: '/delivery-partners/orders/history',
    ACCEPT: (id: string) => `/delivery-partners/orders/${id}/accept`,
    GET_BY_ID: (id: string) => `/orders/${id}`,
    UPDATE_STATUS: (id: string) => `/orders/${id}/status`,
  },
  
  // Location & Status
  PARTNER: {
    LOCATION: '/delivery-partners/location',
    TOGGLE_STATUS: '/delivery-partners/toggle-status',
  },
  
  // Earnings & Dashboard
  EARNINGS: {
    GET: '/delivery-partners/earnings',
    DASHBOARD: '/delivery-partners/dashboard',
  },
};

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  PICKED_UP: 'picked_up',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

// Onboarding Status
export const ONBOARDING_STATUS = {
  PHONE_VERIFIED: 'phone_verified',
  PERSONAL_INFO: 'personal_info',
  DOCUMENTS: 'documents',
  VEHICLE_INFO: 'vehicle_info',
  BANK_DETAILS: 'bank_details',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

// Vehicle Types
export const VEHICLE_TYPES = {
  BIKE: 'bike',
  SCOOTER: 'scooter',
  CAR: 'car',
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  UPI: 'upi',
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
} as const;

// Location Update Interval (in milliseconds)
export const LOCATION_UPDATE_INTERVAL = 15000; // 15 seconds

// Order Refresh Interval (in milliseconds)
export const ORDER_REFRESH_INTERVAL = 30000; // 30 seconds

// Dashboard Refresh Interval (in milliseconds)
export const DASHBOARD_REFRESH_INTERVAL = 60000; // 1 minute

// Maximum retry attempts for failed API calls
export const MAX_RETRY_ATTEMPTS = 3;

// Retry delay (in milliseconds)
export const RETRY_DELAY = 1000; // 1 second

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5 MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

// Earnings Periods
export const EARNINGS_PERIODS = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  INVALID_CREDENTIALS: 'Invalid credentials. Please check and try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit of 5 MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a valid image.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully',
  DOCUMENTS_UPLOADED: 'Documents uploaded successfully',
  BANK_DETAILS_ADDED: 'Bank details added successfully',
  ORDER_ACCEPTED: 'Order accepted successfully',
  ORDER_COMPLETED: 'Order completed successfully',
  STATUS_UPDATED: 'Status updated successfully',
  LOCATION_UPDATED: 'Location updated successfully',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  ORDER: 'order',
  PAYMENT: 'payment',
  SYSTEM: 'system',
  PROMOTION: 'promotion',
} as const;

// App Configuration
export const APP_CONFIG = {
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'KhaoNow Delivery',
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  SUPPORT_EMAIL: 'support@khaaonow.com',
  SUPPORT_PHONE: '+91-1234567890',
};

export default {
  API_CONFIG,
  STORAGE_KEYS,
  ENDPOINTS,
  ORDER_STATUS,
  ONBOARDING_STATUS,
  VEHICLE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  LOCATION_UPDATE_INTERVAL,
  ORDER_REFRESH_INTERVAL,
  DASHBOARD_REFRESH_INTERVAL,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY,
  FILE_UPLOAD,
  EARNINGS_PERIODS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  NOTIFICATION_TYPES,
  APP_CONFIG,
};
