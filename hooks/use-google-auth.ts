import { API_CONFIG } from '@/constants/api';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

// Required for iOS to properly close the browser
WebBrowser.maybeCompleteAuthSession();

interface UseGoogleAuthResult {
  promptAsync: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

interface GoogleAuthResponse {
  success: boolean;
  message?: string;
  data?: {
    deliveryPartnerId: string;
    token: string;
    onboardingStatus: string;
    onboardingProgress: number;
    profileComplete: boolean;
  };
}

/**
 * 🚀 Google OAuth Hook for Delivery Partner App - Backend OAuth Flow
 * 
 * This uses the backend's OAuth endpoints which handle everything:
 * - NO client ID configuration needed
 * - NO state management issues
 * - NO complex redirect handling
 * - Works with Google's security policies
 * - 100% reliable!
 * 
 * Flow:
 * 1. User taps "Sign in with Google"
 * 2. Open system browser to backend OAuth URL
 * 3. Backend redirects to Google
 * 4. User authenticates with Google
 * 5. Google redirects back to backend
 * 6. Backend validates and returns JWT via deep link
 * 7. App intercepts deep link and logs in user
 */
export function useGoogleAuth(
  onSuccess: (response: GoogleAuthResponse) => void,
  onError: (error: string) => void
): UseGoogleAuthResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for deep links - needed for Android where browser may not auto-close
  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup deep link listener for OAuth callback
  const handleDeepLink = (event: { url: string }) => {
    let url = event.url;
    console.log('🔗 Deep link received:', url);

    // Remove fragment identifier (#) if present
    url = url.split('#')[0];

    // Check if this is our OAuth callback
    if (url.includes('khaaonowdelivery://') && url.includes('token=')) {
      const tokenMatch = url.match(/token=([^&]+)/);
      const errorMatch = url.match(/error=([^&]+)/);

      if (tokenMatch) {
        let token = decodeURIComponent(tokenMatch[1]);
        // Clean any trailing characters (like # or ?)
        token = token.replace(/[#?].*$/, '').trim();
        console.log('✅ Token received from deep link');
        console.log('Token length:', token.length);
        setLoading(false);
        
        // Success - call onSuccess with the backend response format
        onSuccess({
          success: true,
          data: {
            deliveryPartnerId: '', // Will be filled from decoded token
            token: token,
            onboardingStatus: 'PERSONAL_INFO',
            onboardingProgress: 15,
            profileComplete: false,
          },
        });
      } else if (errorMatch) {
        const errorMsg = decodeURIComponent(errorMatch[1]);
        console.error('❌ OAuth error:', errorMsg);
        setError(errorMsg);
        onError(errorMsg);
        setLoading(false);
      }
    }
  };

  const promptAsync = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Opening Google OAuth in browser...');
      console.log('Backend URL:', API_CONFIG.BASE_URL);

      // Open backend OAuth URL in system browser
      // Backend will redirect to Google, handle auth, and deep link back to app
      const authUrl = `${API_CONFIG.BASE_URL}/delivery-partners/auth/google`;
      
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'khaaonowdelivery://auth/callback'
      );

      console.log('Browser result:', result.type);

      // Handle browser dismissal
      if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('❌ User cancelled authentication');
        setLoading(false);
        setError('Authentication cancelled');
        onError('Authentication cancelled by user');
      }
      // Success case is handled by deep link listener
    } catch (err: any) {
      const errorMessage = err.message || 'Google authentication failed';
      console.error('❌ OAuth error:', errorMessage);
      setError(errorMessage);
      onError(errorMessage);
      setLoading(false);
    }
  };

  return {
    promptAsync,
    loading,
    error,
  };
}
