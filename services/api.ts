import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError, AxiosInstance } from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

// API Configuration
// Priority order:
// 1. EXPO_PUBLIC_API_URL environment variable (for production builds)
// 2. __DEV__ mode: Uses local backend
// 3. Fallback: Production backend

const getApiUrl = () => {
  // Check environment variable first (set in .env.local or eas.json)
  const envApiUrl =
    Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;

  if (envApiUrl) {
    console.log("🌐 [API] Using environment API URL:", envApiUrl);
    return envApiUrl;
  }

  // Development mode fallback
  if (__DEV__) {
    // If you are testing with a local backend, change this to your machine's IP address (e.g., "http://192.168.1.100:3001/api")
    // Note: 'localhost' will not work on physical devices or Android emulators.
    const fallbackUrl =
      "https://5axnuhvpz7h2mjnrp2ledb7nmy0hmwkh.lambda-url.ap-south-1.on.aws/api";
    console.log("🌐 [API] DEV mode fallback URL:", fallbackUrl);
    console.log(
      "💡 [API] To use a different URL locally, make sure EXPO_PUBLIC_API_URL is loaded by clearing metro cache (npm start -c)",
    );
    return fallbackUrl;
  }

  // Production fallback
  const productionUrl =
    "https://5axnuhvpz7h2mjnrp2ledb7nmy0hmwkh.lambda-url.ap-south-1.on.aws/api";
  console.log("🌐 [API] Using production backend:", productionUrl);
  return productionUrl;
};

export const API_BASE_URL = getApiUrl();
const TOKEN_KEY = "delivery_partner_token";
const AUTH_SESSION_KEYS = [
  "isAuthenticated",
  "userId",
  "phoneNumber",
  "partnerData",
  "onboardingStatus",
  "onboardingProgress",
  "isApproved",
];

console.log("🌐 [API] Final backend URL:", API_BASE_URL);

export const storeDeliveryPartnerToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export const getDeliveryPartnerToken = async (): Promise<string | null> => {
  const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
  if (secureToken) return secureToken;

  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (!legacyToken) return null;

  await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
  await AsyncStorage.removeItem(TOKEN_KEY);
  return legacyToken;
};

export const removeDeliveryPartnerToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
};

const clearAuthSession = async () => {
  await Promise.all([
    AsyncStorage.multiRemove(AUTH_SESSION_KEYS),
    removeDeliveryPartnerToken(),
  ]);
};

// Interfaces
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface LoginResponse {
  success: boolean;
  exists?: boolean;
  partnerId?: string;
  message?: string;
  data?: {
    phone: string;
    deliveryPartnerId: string;
    token: string;
    onboardingStatus: string;
    onboardingProgress: number;
    isApproved?: boolean;
    profileComplete: boolean;
  };
}

interface ProfileData {
  name: string;
  email: string;
}

interface DocumentsData {
  aadhaarNumber?: string;
  panNumber?: string;
  aadhaarPhoto?: string;
  panPhoto?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  rcPhoto?: string;
  drivingLicenseNumber?: string;
  drivingLicensePhoto?: string;
  profilePhoto?: string;
}

interface BankDetailsData {
  bankAccountName: string;
  bankAccountNumber: string;
  bankIFSC: string;
  bankAccountPhoto?: string;
  upiId?: string;
}

interface DeliveryPartner {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  avatar?: string;
  provider: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isApproved: boolean;
  onboardingStatus: string;
  onboardingProgress: number;
  rating: number;
  totalOrders: number;
  completedOrders: number;
  isActive: boolean;
  vehicleType?: string;
  vehicleNumber?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    photoUrl?: string;
  };
  upiId?: string;
}

// Axios Instance
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request Interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getDeliveryPartnerToken();
        if (token) {
          console.log("🔑 [API] Attaching token to request:", config.url);
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn(
            "⚠️ [API] No token found in storage for request:",
            config.url,
          );
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response Interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || "";
        const isAuthEndpoint = requestUrl.includes("/auth/");

        if (status === 401 && !isAuthEndpoint) {
          console.warn("🚪 [API] Session expired; clearing auth state");
          await clearAuthSession();
          router.replace("/auth/login" as any);
        }

        return Promise.reject(error);
      },
    );
  }

  async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();

const getApiErrorMessage = (error: any, fallback: string) =>
  error.response?.data?.message ||
  error.response?.data?.error ||
  error.message ||
  fallback;

// API Service
export const ApiService = {
  // ==================== AUTHENTICATION ====================

  /**
   * Verify Firebase Phone Token
   * This is the primary authentication method using Firebase
   */
  async verifyPhoneToken(
    idToken: string,
    phone: string,
  ): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(
        "/delivery-partners/auth/verify-phone-token",
        { idToken, phone },
      );

      // Store token if available
      if (response.data?.token) {
        await storeDeliveryPartnerToken(response.data.token);
      }

      return response;
    } catch (error: any) {
      console.error("Verify phone token error:", error);

      // Check if this is an "account already exists" error - treat as successful login
      const errorMessage = error.response?.data?.message || "";
      const errorData = error.response?.data?.data;

      if (errorMessage.toLowerCase().includes("already exists") && errorData) {
        // Backend returned existing account data - treat as successful login
        console.log("📱 [Auth] Existing account detected, treating as login");

        if (errorData.token) {
          await storeDeliveryPartnerToken(errorData.token);
        }

        return {
          success: true,
          message: "Login successful",
          data: errorData,
        };
      }

      // Also check if the error response contains success data (some API versions)
      if (error.response?.data?.success && error.response?.data?.data) {
        const data = error.response.data.data;
        if (data.token) {
          await storeDeliveryPartnerToken(data.token);
        }
        return {
          success: true,
          message: error.response.data.message || "Login successful",
          data: data,
        };
      }

      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to verify phone token",
      };
    }
  },

  /**
   * Send OTP to phone number
   * Backend handles OTP generation and storage
   */
  async sendOtp(phoneNumber: string): Promise<LoginResponse> {
    try {
      // Format phone number to E.164 format (+91XXXXXXXXXX)
      const phone = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;

      const response = await apiClient.post<LoginResponse>(
        "/delivery-partners/auth/send-otp",
        { phone },
      );

      return response;
    } catch (error: any) {
      console.error("Send OTP error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to send OTP",
      };
    }
  },

  /**
   * Verify OTP and authenticate
   * Returns JWT token on success
   */
  async verifyOtp(phoneNumber: string, otp: string): Promise<LoginResponse> {
    try {
      // Format phone number to E.164 format (+91XXXXXXXXXX)
      const phone = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;

      const response = await apiClient.post<LoginResponse>(
        "/delivery-partners/auth/verify-otp",
        { phone, otp },
      );

      // Store token if available
      if (response.data?.token) {
        await storeDeliveryPartnerToken(response.data.token);
      }

      return response;
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to verify OTP",
      };
    }
  },

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Complete delivery partner profile
   */
  async completeProfile(
    data: ProfileData,
  ): Promise<ApiResponse<{ partner: DeliveryPartner; token: string }>> {
    try {
      console.log(
        "📤 [API] Completing profile with data:",
        JSON.stringify(data, null, 2),
      );
      const response = await apiClient.post<ApiResponse>(
        "/delivery-partners/profile/complete",
        data,
      );

      // Update token if new one is provided
      if (response.data?.token) {
        await storeDeliveryPartnerToken(response.data.token);
      }

      console.log("✅ [API] Profile completion successful:", response);
      return response;
    } catch (error: any) {
      console.error("❌ [API] Complete profile error:", error);
      console.error("❌ [API] Error Response Data:", error.response?.data);
      console.error("❌ [API] Error Status:", error.response?.status);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to complete profile",
      };
    }
  },

  /**
   * Upload registration documents
   */
  async uploadDocuments(
    data: DocumentsData,
  ): Promise<ApiResponse<{ partner: DeliveryPartner }>> {
    try {
      const response = await apiClient.post<ApiResponse>(
        "/delivery-partners/documents/upload",
        data,
      );
      return response;
    } catch (error: any) {
      console.error("Upload documents error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to upload documents",
      };
    }
  },

  /**
   * Add bank details
   */
  async addBankDetails(
    data: BankDetailsData,
  ): Promise<ApiResponse<{ partner: DeliveryPartner }>> {
    try {
      const response = await apiClient.post<ApiResponse>(
        "/delivery-partners/bank-details",
        data,
      );
      return response;
    } catch (error: any) {
      console.error("Add bank details error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to add bank details",
      };
    }
  },

  /**
   * Submit complete registration (combines all steps)
   * Legacy method - kept for backward compatibility
   */
  async submitRegistration(
    data: any,
  ): Promise<{ success: boolean; message: string; partnerId?: string }> {
    try {
      // Step 1: Complete Profile
      await this.completeProfile({
        name: data.name,
        email: data.email,
      });

      // Step 2: Upload Documents
      await this.uploadDocuments({
        aadhaarNumber: data.aadhaarNumber,
        panNumber: data.panNumber,
        aadhaarPhoto: data.aadhaarPhoto,
        panPhoto: data.panPhoto,
        vehicleType: data.vehicleType,
        vehicleNumber: data.vehicleNumber,
        rcPhoto: data.rcPhoto,
        drivingLicenseNumber: data.drivingLicenseNumber,
        drivingLicensePhoto: data.drivingLicensePhoto,
        profilePhoto: data.profilePhoto,
      });

      return {
        success: true,
        message: "Registration submitted successfully",
      };
    } catch (error: any) {
      console.error("Submit registration error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to submit registration",
      };
    }
  },

  // ==================== PARTNER PROFILE ====================

  /**
   * Get current partner profile
   */
  async getProfile(): Promise<ApiResponse<DeliveryPartner>> {
    try {
      const response = await apiClient.get<ApiResponse>(
        "/delivery-partners/profile",
      );
      return response;
    } catch (error: any) {
      console.error("Get profile error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get profile",
      };
    }
  },

  /**
   * Update partner profile
   */
  async updateProfile(data: any): Promise<ApiResponse<DeliveryPartner>> {
    try {
      const response = await apiClient.put<ApiResponse>(
        "/delivery-partners/profile",
        data,
      );
      return response;
    } catch (error: any) {
      console.error("Update profile error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update profile",
      };
    }
  },

  /**
   * Update partner location
   */
  async updateLocation(
    latitude: number,
    longitude: number,
    metadata?: {
      accuracy?: number | null;
      mocked?: boolean | null;
      heading?: number | null;
    },
  ): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(
        "/delivery-partners/location",
        { latitude, longitude, ...metadata },
      );
      return response;
    } catch (error: any) {
      console.error("Update location error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update location",
      };
    }
  },

  /**
   * Toggle online/offline status
   */
  async toggleOnlineStatus(
    isOnline: boolean,
  ): Promise<ApiResponse<{ isActive: boolean }>> {
    try {
      const response = await apiClient.post<ApiResponse>(
        "/delivery-partners/toggle-status",
        { isActive: isOnline },
      );
      return response;
    } catch (error: any) {
      console.error("Toggle status error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to toggle status",
      };
    }
  },

  // ==================== ORDERS ====================

  /**
   * Get available orders for the delivery partner
   */
  async getAvailableOrders(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<ApiResponse>(
        "/delivery-partners/orders/available",
      );
      return response;
    } catch (error: any) {
      console.error("Get available orders error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get available orders",
        data: [],
      };
    }
  },

  /**
   * Get assigned orders
   */
  async getAssignedOrders(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<ApiResponse>(
        "/delivery-partners/orders/assigned",
      );
      return response;
    } catch (error: any) {
      console.error("Get assigned orders error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get assigned orders",
        data: [],
      };
    }
  },

  async getDeliveryRoutePlan(
    location?: { latitude: number; longitude: number },
  ): Promise<ApiResponse<any>> {
    try {
      const query = location
        ? `?latitude=${location.latitude}&longitude=${location.longitude}`
        : "";
      const response = await apiClient.get<ApiResponse>(
        `/delivery-partners/orders/route-plan${query}`,
      );
      return response;
    } catch (error: any) {
      console.error("Get delivery route plan error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get delivery route plan",
        data: null,
      };
    }
  },

  /**
   * Get order details by ID
   */
  async getOrderById(orderId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<ApiResponse>(
        `/delivery-partners/orders/${orderId}`,
      );
      return response;
    } catch (error: any) {
      console.error("Get order error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get order details",
      };
    }
  },

  /**
   * Accept an order
   */
  async acceptOrder(orderId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(
        `/delivery-partners/orders/${orderId}/accept`,
      );
      return response;
    } catch (error: any) {
      console.error("Accept order error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to accept order",
      };
    }
  },

  /**
   * Reject/skip an order
   */
  async rejectOrder(orderId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(
        `/delivery-partners/orders/${orderId}/reject`,
      );
      return response;
    } catch (error: any) {
      console.error("Reject order error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to reject order",
      };
    }
  },

  /**
   * Get current active order
   */
  async getActiveOrder(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<ApiResponse>(
        "/delivery-partners/orders/active",
      );
      return response;
    } catch (error: any) {
      console.error("Get active order error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get active order",
        data: null,
      };
    }
  },

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    metadata?: {
      currentLocation?: { latitude: number; longitude: number };
      proofPhotoUrl?: string;
    },
  ): Promise<ApiResponse> {
    try {
      const response = await apiClient.patch<ApiResponse>(
        `/delivery-partners/orders/${orderId}/status`,
        { status, ...metadata },
      );
      return response;
    } catch (error: any) {
      console.error("Update order status error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to update order status",
      };
    }
  },

  async reportDeliveryDelay(
    orderId: string,
    reason: string,
  ): Promise<ApiResponse> {
    try {
      const updatedEta = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const response = await apiClient.post<ApiResponse>(
        `/delivery-partners/orders/${orderId}/report-delay`,
        {
          reason,
          delayReason: reason,
          delayType: "RIDER_DELAY",
          updatedEta,
          significant: false,
        },
      );
      return response;
    } catch (error: any) {
      console.error("Report delivery delay error:", error);
      return {
        success: false,
        message: getApiErrorMessage(error, "Failed to report delivery delay"),
      };
    }
  },

  async requestOrderReassignment(
    orderId: string,
    reason: string,
  ): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(
        `/delivery-partners/orders/${orderId}/request-reassignment`,
        {
          reason,
          delayReason: reason,
          delayType: "REASSIGNMENT_DELAY",
          significant: true,
        },
      );
      return response;
    } catch (error: any) {
      console.error("Request reassignment error:", error);
      return {
        success: false,
        message: getApiErrorMessage(error, "Failed to request reassignment"),
      };
    }
  },

  async confirmReturnedToRestaurant(orderId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(
        `/delivery-partners/orders/${orderId}/confirm-returned`,
      );
      return response;
    } catch (error: any) {
      console.error("Confirm returned error:", error);
      return {
        success: false,
        message: getApiErrorMessage(error, "Failed to confirm order return"),
      };
    }
  },

  /**
   * Get order history
   */
  async getOrderHistory(
    page: number = 1,
    limit: number = 20,
  ): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<ApiResponse>(
        `/delivery-partners/orders/history?page=${page}&limit=${limit}`,
      );
      return response;
    } catch (error: any) {
      console.error("Get order history error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get order history",
        data: [],
      };
    }
  },

  // ==================== EARNINGS ====================

  /**
   * Get earnings summary
   */
  async getEarnings(
    period: "today" | "week" | "month" = "today",
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<ApiResponse>(
        `/delivery-partners/earnings?period=${period}`,
      );
      return response;
    } catch (error: any) {
      console.error("Get earnings error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get earnings",
        data: {
          today: 0,
          week: 0,
          month: 0,
        },
      };
    }
  },

  async requestPayoutWithdrawal(amount: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<ApiResponse>(
        "/delivery-partners/payout/request",
        { amount },
      );
      return response;
    } catch (error: any) {
      console.error("Request payout withdrawal error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to request withdrawal",
      };
    }
  },

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<ApiResponse>(
        "/delivery-partners/dashboard",
      );
      return response;
    } catch (error: any) {
      console.error("Get dashboard data error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get dashboard data",
        data: {
          earnings: { today: 0, week: 0, month: 0 },
          stats: { deliveriesToday: 0, shiftsCompleted: 0, activeOrders: 0 },
          onlineStatus: false,
        },
      };
    }
  },

  /**
   * Get user notifications
   */
  async getNotifications(
    page: number = 1,
    limit: number = 20,
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<ApiResponse>(
        `/notifications/user?page=${page}&limit=${limit}`,
      );
      return response;
    } catch (error: any) {
      console.error("Get notifications error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get notifications",
        data: [],
      };
    }
  },

  // ==================== GOOGLE AUTHENTICATION ====================

  /**
   * Authenticate with Google
   * Sends Google user data to backend
   */
  async googleLogin(googleData: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<any>(
        "/delivery-partners/auth/google",
        googleData,
      );

      // Store token if available
      if (response.data?.token) {
        await storeDeliveryPartnerToken(response.data.token);
      }

      return {
        success: response.success,
        message: response.message,
        data: {
          phone: response.data?.partner?.phone || "",
          deliveryPartnerId:
            response.data?.partner?.id || response.data?.partner?._id,
          token: response.data?.token,
          onboardingStatus: response.data?.partner?.onboardingStatus,
          onboardingProgress:
            response.data?.onboardingProgress ||
            response.data?.partner?.onboardingProgress,
          profileComplete:
            response.data?.partner?.onboardingStatus === "completed",
        },
      };
    } catch (error: any) {
      console.error("Google login error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to authenticate with Google",
      };
    }
  },

  // ==================== ACCOUNT MANAGEMENT ====================

  /**
   * Delete the current delivery partner account permanently
   */
  async deleteAccount(): Promise<ApiResponse> {
    try {
      const response = await apiClient.delete<ApiResponse>(
        "/delivery-partners/account",
      );
      // Clear token on successful deletion
      if (response.success) {
        await removeDeliveryPartnerToken();
      }
      return response;
    } catch (error: any) {
      console.error("Delete account error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to delete account",
      };
    }
  },

  // ==================== UTILITY ====================

  /**
   * Store authentication token
   */
  async storeToken(token: string): Promise<void> {
    await storeDeliveryPartnerToken(token);
  },

  /**
   * Get stored token
   */
  async getToken(): Promise<string | null> {
    return await getDeliveryPartnerToken();
  },

  /**
   * Remove stored token
   */
  async removeToken(): Promise<void> {
    await removeDeliveryPartnerToken();
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getDeliveryPartnerToken();
    return !!token;
  },

  // ==================== DELIVERY PARTNER WHATSAPP OTP ====================

  /**
   * Send OTP to delivery partner via WhatsApp
   * Uses WhatsApp Business API for OTP delivery
   */
  async sendDeliveryPartnerOtp(
    phoneNumber: string,
  ): Promise<ApiResponse<{ phone: string; expiresIn: number; otp?: string }>> {
    try {
      // Format phone number to E.164 format (+91XXXXXXXXXX)
      // Remove non-digits first, then ensure +91 prefix
      let phone = phoneNumber.replace(/\D/g, "");

      // If user entered 10 digits, add 91. If 12 (with 91), keep it.
      if (phone.length === 10) {
        phone = `91${phone}`;
      } else if (phone.length === 12 && phone.startsWith("91")) {
        // already has 91
      } else if (phone.startsWith("0")) {
        phone = `91${phone.substring(1)}`;
      }

      // Ensure + prefix
      const formattedPhone = `+${phone}`;

      const response = await apiClient.post<ApiResponse>(
        "/delivery-partners/auth/send-otp",
        { phone: formattedPhone },
      );

      return response;
    } catch (error: any) {
      console.error("Send delivery partner OTP error:", error);
      throw error;
    }
  },

  /**
   * Verify delivery partner OTP
   * Returns JWT token and partner data on success
   */
  async verifyDeliveryPartnerOtp(
    phoneNumber: string,
    otp: string,
  ): Promise<LoginResponse> {
    try {
      // Format phone number to E.164 format (+91XXXXXXXXXX)
      let phone = phoneNumber.replace(/\D/g, "");

      if (phone.length === 10) {
        phone = `91${phone}`;
      } else if (phone.length === 12 && phone.startsWith("91")) {
        // already has 91
      } else if (phone.startsWith("0")) {
        phone = `91${phone.substring(1)}`;
      }

      const formattedPhone = `+${phone}`;

      const response = await apiClient.post<LoginResponse>(
        "/delivery-partners/auth/verify-otp",
        { phone: formattedPhone, otp },
      );

      // Store token if available
      if (response.data?.token) {
        await storeDeliveryPartnerToken(response.data.token);
      }

      return response;
    } catch (error: any) {
      console.error("Verify delivery partner OTP error:", error);
      throw error;
    }
  },

  // ==================== RAW HTTP HELPERS (for service modules) ====================

  async get<T = any>(url: string, config?: any): Promise<T> {
    return apiClient.get<T>(url, config);
  },

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return apiClient.post<T>(url, data, config);
  },
};

export default ApiService;
