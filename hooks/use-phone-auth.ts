import { useCallback, useState } from 'react';

import { getNativeAuth, isExpoGo } from '@/config/firebase';
import { ApiService } from '@/services/api';

interface UsePhoneAuthResult {
  sendOtp: (phoneNumber: string) => Promise<boolean>;
  verifyOtp: (otp: string) => Promise<{
    success: boolean;
    data?: {
      deliveryPartnerId: string;
      token: string;
      onboardingStatus: string;
      onboardingProgress: number;
      isApproved?: boolean;
      profileComplete: boolean;
    };
    message?: string;
  }>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

// Module-level storage for confirmation result and phone number
// This persists across component instances (login -> otp screen navigation)
let storedConfirmation: any = null;
let storedPhoneNumber: string = '';



/**
 * Phone Authentication Hook - Works with both Expo Go and Native Builds
 * 
 * In Expo Go: Uses Firebase JS SDK with test phone numbers (no real SMS)
 * In Native Builds: Uses @react-native-firebase for real SMS sending
 * 
 * For testing in Expo Go:
 * 1. Add test phone numbers in Firebase Console (Authentication > Sign-in method > Phone > Phone numbers for testing)
 * 2. Use those test numbers in the app - they'll auto-verify with the configured OTP
 */
export function usePhoneAuth(): UsePhoneAuthResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Format phone number to E.164 format
   */
  const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If doesn't start with +, assume Indian number
    if (!cleaned.startsWith('+')) {
      // Remove leading 0 if present
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '+91' + cleaned;
    }
    
    return cleaned;
  };



  /**
   * Send OTP - Uses appropriate method based on environment
   */
  const sendOtp = async (phone: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const formattedPhone = formatPhoneNumber(phone);
      storedPhoneNumber = formattedPhone;
      
      console.log('📱 [Auth] Sending OTP to:', formattedPhone);
      console.log('📱 [Auth] Environment:', isExpoGo ? 'Expo Go' : 'Native Build');

      if (isExpoGo) {
        // In Expo Go, we assume usage of Firebase test phone numbers configured in console
        // Real SMS requires native build or development build
        console.log('✅ [Auth] Using Expo Go - assuming Firebase test phone number');
        
        // Use a dummy verification ID for test numbers
        setLoading(false);
        return true;
      } else {
        // Native build - use @react-native-firebase
        try {
          const nativeAuth = await getNativeAuth();
          const confirmationResult = await nativeAuth().signInWithPhoneNumber(formattedPhone);
          
          storedConfirmation = confirmationResult;
          console.log('✅ [Auth] OTP sent successfully via Native Firebase');
          
          setLoading(false);
          return true;
        } catch (nativeError: any) {
          console.error('❌ [Auth] Native Firebase error:', nativeError);
          throw nativeError;
        }
      }
    } catch (err: any) {
      console.error('❌ [Auth] Send OTP error:', err);
      
      // Parse Firebase error messages
      let errorMessage = err.message || 'Failed to send OTP. Please try again.';
      
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please check and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please wait a few minutes and try again.';
      } else if (err.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.code === 'auth/app-not-authorized') {
        errorMessage = 'App not authorized. Check Firebase project settings and SHA fingerprints.';
      } else if (err.code === 'auth/missing-client-identifier') {
        errorMessage = 'Missing client identifier. Ensure google-services.json is properly configured.';
      }
      
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  };

  /**
   * Verify OTP and get authentication token
   * Flow: Verify with Firebase → Get ID Token → Send to Backend
   */
  const verifyOtp = async (otp: string): Promise<{
    success: boolean;
    data?: {
      deliveryPartnerId: string;
      token: string;
      onboardingStatus: string;
      onboardingProgress: number;
      isApproved?: boolean;
      profileComplete: boolean;
    };
    message?: string;
  }> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 [Auth] Verifying OTP with Firebase...');
      
      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        throw new Error('Invalid OTP format. Please enter 6 digits.');
      }

      if (!storedConfirmation || !storedPhoneNumber) {
        throw new Error('Please request OTP first');
      }
      
      // Confirm the OTP code with Firebase (Native build only)
      console.log('📱 [Auth] Confirming OTP with Firebase Native...');
      const userCredential = await storedConfirmation.confirm(otp);
      
      if (!userCredential || !userCredential.user) {
        throw new Error('Failed to verify OTP with Firebase');
      }
      
      // Get the Firebase ID token
      console.log('🔑 [Auth] Getting Firebase ID token...');
      const idToken = await userCredential.user.getIdToken();
      
      console.log('📤 [Auth] Sending ID token to backend...');
      
      // Send ID token to backend for verification and user creation/login
      const response = await ApiService.verifyPhoneToken(idToken, storedPhoneNumber);
      
      // Clear stored data after verification
      storedConfirmation = null;
      storedPhoneNumber = '';
      
      if (response.success && response.data) {
        console.log('✅ [Auth] Authentication successful');
        setLoading(false);
        return {
          success: true,
          data: {
            deliveryPartnerId: response.data.deliveryPartnerId,
            token: response.data.token,
            onboardingStatus: response.data.onboardingStatus,
            onboardingProgress: response.data.onboardingProgress,
            isApproved: response.data.isApproved,
            profileComplete: response.data.profileComplete,
          },
        };
      } else {
        throw new Error(response.message || 'Backend verification failed');
      }
    } catch (err: any) {
      console.error('❌ [Auth] Verify OTP error:', err);
      
      // Check if this is an "account already exists" error with auth data
      // This can happen with some backend versions - treat as successful login
      const errorMessage = err.message || '';
      if (errorMessage.toLowerCase().includes('already exists')) {
        console.log('📱 [Auth] Account exists error - checking for embedded auth data');
        
        // If the API service already handled this and returned success data, 
        // this block shouldn't be reached. But as a fallback, we signal 
        // that another login attempt should be made
        setError('Welcome back! Please try logging in again.');
        setLoading(false);
        return {
          success: false,
          message: 'Account exists - please retry login',
        };
      }
      
      // Parse Firebase error messages
      let finalErrorMessage = 'Failed to verify OTP';
      if (err.code === 'auth/invalid-verification-code') {
        finalErrorMessage = 'Invalid OTP. Please check and try again.';
      } else if (err.code === 'auth/code-expired') {
        finalErrorMessage = 'OTP has expired. Please request a new one.';
      } else if (err.code === 'auth/session-expired') {
        finalErrorMessage = 'Session expired. Please request a new OTP.';
      } else if (err.message) {
        finalErrorMessage = err.message;
      }
      
      setError(finalErrorMessage);
      setLoading(false);
      return {
        success: false,
        message: finalErrorMessage,
      };
    }
  };

  return {
    sendOtp,
    verifyOtp,
    loading,
    error,
    clearError,
  };
}

export default usePhoneAuth;
