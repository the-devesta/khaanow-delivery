import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { ApiService } from "../services/api";

// Onboarding status enum matching backend
export enum OnboardingStatus {
  PHONE_VERIFIED = "phone_verified",
  PERSONAL_INFO = "personal_info",
  DOCUMENTS = "documents",
  VEHICLE_INFO = "vehicle_info",
  BANK_DETAILS = "bank_details",
  COMPLETED = "completed",
  REJECTED = "rejected",
}

interface DeliveryPartner {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  avatar?: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isApproved: boolean;
  onboardingStatus: OnboardingStatus | string;
  onboardingProgress: number;
  rating: number;
  totalOrders: number;
  completedOrders: number;
  isActive: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  phoneNumber: string | null;
  partner: DeliveryPartner | null;
  token: string | null;
  loading: boolean;
  onboardingStatus: OnboardingStatus | string | null;
  onboardingProgress: number;
  isApproved: boolean;
  
  // Actions
  setAuthenticated: (
    isAuth: boolean,
    userId?: string,
    phoneNumber?: string,
    token?: string,
    onboardingStatus?: string,
    onboardingProgress?: number,
    isApproved?: boolean
  ) => void;
  setPartner: (partner: DeliveryPartner | null) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<DeliveryPartner>) => void;
  updateOnboardingStatus: (status: string, progress: number) => Promise<void>;
  getNavigationRoute: () => string;
}

const STORAGE_KEYS = {
  IS_AUTHENTICATED: "isAuthenticated",
  USER_ID: "userId",
  PHONE_NUMBER: "phoneNumber",
  PARTNER_DATA: "partnerData",
  TOKEN: "delivery_partner_token",
  ONBOARDING_STATUS: "onboardingStatus",
  ONBOARDING_PROGRESS: "onboardingProgress",
  IS_APPROVED: "isApproved",
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  userId: null,
  phoneNumber: null,
  partner: null,
  token: null,
  loading: false,
  onboardingStatus: null,
  onboardingProgress: 0,
  isApproved: false,

  setAuthenticated: async (isAuth, userId, phoneNumber, token, onboardingStatus, onboardingProgress, isApproved) => {
    console.log('🔐 [Auth] setAuthenticated called:', {
      isAuth,
      userId,
      onboardingStatus,
      onboardingProgress,
      isApproved,
    });

    set({ 
      isAuthenticated: isAuth, 
      userId: userId || null, 
      phoneNumber: phoneNumber || null,
      token: token || null,
      onboardingStatus: onboardingStatus || null,
      onboardingProgress: onboardingProgress || 0,
      isApproved: isApproved || false,
    });
    
    if (isAuth) {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.IS_AUTHENTICATED, "true"],
        [STORAGE_KEYS.USER_ID, userId || ""],
        [STORAGE_KEYS.PHONE_NUMBER, phoneNumber || ""],
        [STORAGE_KEYS.ONBOARDING_STATUS, onboardingStatus || ""],
        [STORAGE_KEYS.ONBOARDING_PROGRESS, String(onboardingProgress || 0)],
        [STORAGE_KEYS.IS_APPROVED, isApproved ? "true" : "false"],
      ]);
      
      if (token) {
        await ApiService.storeToken(token);
      }
      
      console.log('✅ [Auth] Auth state saved to storage');
    } else {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.IS_AUTHENTICATED,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.PHONE_NUMBER,
        STORAGE_KEYS.PARTNER_DATA,
        STORAGE_KEYS.ONBOARDING_STATUS,
        STORAGE_KEYS.ONBOARDING_PROGRESS,
        STORAGE_KEYS.IS_APPROVED,
      ]);
      await ApiService.removeToken();
      console.log('🚪 [Auth] Auth state cleared from storage');
    }
  },

  setPartner: async (partner) => {
    console.log('👤 [Auth] setPartner called:', partner?.id);
    
    set({ 
      partner,
      onboardingStatus: partner?.onboardingStatus || null,
      onboardingProgress: partner?.onboardingProgress || 0,
      isApproved: partner?.isApproved || false,
    });
    
    if (partner) {
      await AsyncStorage.setItem(STORAGE_KEYS.PARTNER_DATA, JSON.stringify(partner));
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ONBOARDING_STATUS, partner.onboardingStatus || ""],
        [STORAGE_KEYS.ONBOARDING_PROGRESS, String(partner.onboardingProgress || 0)],
        [STORAGE_KEYS.IS_APPROVED, partner.isApproved ? "true" : "false"],
      ]);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.PARTNER_DATA);
    }
  },

  updateOnboardingStatus: async (status: string, progress: number) => {
    console.log('📊 [Auth] updateOnboardingStatus:', { status, progress });
    
    set({
      onboardingStatus: status,
      onboardingProgress: progress,
    });
    
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ONBOARDING_STATUS, status],
      [STORAGE_KEYS.ONBOARDING_PROGRESS, String(progress)],
    ]);
    
    // Also update partner object if exists
    const partner = get().partner;
    if (partner) {
      const updatedPartner = {
        ...partner,
        onboardingStatus: status,
        onboardingProgress: progress,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.PARTNER_DATA, JSON.stringify(updatedPartner));
      set({ partner: updatedPartner });
    }
  },

  logout: async () => {
    console.log('🚪 [Auth] Logging out...');
    
    set({ 
      isAuthenticated: false, 
      userId: null, 
      phoneNumber: null,
      partner: null,
      token: null,
      onboardingStatus: null,
      onboardingProgress: 0,
      isApproved: false,
    });
    
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.IS_AUTHENTICATED,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.PHONE_NUMBER,
      STORAGE_KEYS.PARTNER_DATA,
      STORAGE_KEYS.ONBOARDING_STATUS,
      STORAGE_KEYS.ONBOARDING_PROGRESS,
      STORAGE_KEYS.IS_APPROVED,
    ]);
    
    await ApiService.removeToken();
    console.log('✅ [Auth] Logout complete');
  },

  initializeAuth: async () => {
    try {
      console.log('🔄 [Auth] Initializing auth state...');
      set({ loading: true });
      
      const [isAuth, userId, phoneNumber, partnerData, token, onboardingStatus, onboardingProgress, isApproved] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
        AsyncStorage.getItem(STORAGE_KEYS.PHONE_NUMBER),
        AsyncStorage.getItem(STORAGE_KEYS.PARTNER_DATA),
        ApiService.getToken(),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_STATUS),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_PROGRESS),
        AsyncStorage.getItem(STORAGE_KEYS.IS_APPROVED),
      ]);
      
      console.log('📦 [Auth] Loaded from storage:', {
        isAuth,
        userId,
        hasToken: !!token,
        onboardingStatus,
        onboardingProgress,
        isApproved,
      });
      
      if (isAuth === "true" && token) {
        const partner = partnerData ? JSON.parse(partnerData) : null;
        
        set({ 
          isAuthenticated: true, 
          userId, 
          phoneNumber,
          partner,
          token,
          onboardingStatus: onboardingStatus || partner?.onboardingStatus || null,
          onboardingProgress: parseInt(onboardingProgress || '0', 10) || partner?.onboardingProgress || 0,
          isApproved: isApproved === "true" || partner?.isApproved || false,
        });
        
        // Fetch latest profile data from server
        console.log('🔄 [Auth] Fetching latest profile from server...');
        await get().fetchProfile();
      } else {
        console.log('❌ [Auth] No valid auth state found');
      }
    } catch (error) {
      console.error("❌ [Auth] Failed to initialize auth:", error);
    } finally {
      set({ loading: false });
    }
  },

  fetchProfile: async () => {
    try {
      console.log('📡 [Auth] Fetching profile from API...');
      const response = await ApiService.getProfile();
      
      if (response.success && response.data) {
        console.log('✅ [Auth] Profile fetched:', {
          id: response.data.id,
          onboardingStatus: response.data.onboardingStatus,
          onboardingProgress: response.data.onboardingProgress,
          isApproved: response.data.isApproved,
        });
        
        await get().setPartner(response.data);
      } else {
        console.warn('⚠️ [Auth] Failed to fetch profile:', response.message);
      }
    } catch (error) {
      console.error("❌ [Auth] Failed to fetch profile:", error);
    }
  },

  updateProfile: (updates) => {
    const currentPartner = get().partner;
    if (currentPartner) {
      const updatedPartner = { ...currentPartner, ...updates };
      get().setPartner(updatedPartner);
    }
  },

  /**
   * Determine the correct navigation route based on auth and onboarding state
   */
  getNavigationRoute: (): string => {
    const { isAuthenticated, onboardingStatus, isApproved, partner } = get();
    
    console.log('🧭 [Auth] getNavigationRoute called:', {
      isAuthenticated,
      onboardingStatus,
      isApproved,
      partnerOnboardingStatus: partner?.onboardingStatus,
    });
    
    // Not authenticated - go to login
    if (!isAuthenticated) {
      console.log('➡️ [Auth] Route: /auth/login (not authenticated)');
      return '/auth/login';
    }
    
    // Use partner data if available, fallback to stored state
    const status = partner?.onboardingStatus || onboardingStatus;
    const approved = partner?.isApproved || isApproved;
    
    // Check for rejection
    if (status === OnboardingStatus.REJECTED) {
      console.log('➡️ [Auth] Route: /registration/account-rejected (rejected)');
      return '/registration/account-rejected';
    }
    
    // Registration completed - check approval status
    if (status === OnboardingStatus.COMPLETED) {
      if (approved) {
        console.log('➡️ [Auth] Route: /(tabs) (approved)');
        return '/(tabs)';
      } else {
        console.log('➡️ [Auth] Route: /registration/account-pending (pending approval)');
        return '/registration/account-pending';
      }
    }
    
    // Registration not complete - route to appropriate step
    switch (status) {
      case OnboardingStatus.PHONE_VERIFIED:
        console.log('➡️ [Auth] Route: /registration/basic-details (phone verified)');
        return '/registration/basic-details';
      
      case OnboardingStatus.PERSONAL_INFO:
        console.log('➡️ [Auth] Route: /registration/kyc-documents (personal info done)');
        return '/registration/kyc-documents';
      
      case OnboardingStatus.DOCUMENTS:
        console.log('➡️ [Auth] Route: /registration/vehicle-details (documents done)');
        return '/registration/vehicle-details';
      
      case OnboardingStatus.VEHICLE_INFO:
        console.log('➡️ [Auth] Route: /registration/profile-photo (vehicle info done)');
        return '/registration/profile-photo';
      
      case OnboardingStatus.BANK_DETAILS:
        console.log('➡️ [Auth] Route: /registration/review-submit (bank details done)');
        return '/registration/review-submit';
      
      default:
        // Fallback: if no status but authenticated, go to basic details
        console.log('➡️ [Auth] Route: /registration/basic-details (default fallback)');
        return '/registration/basic-details';
    }
  },
}));
