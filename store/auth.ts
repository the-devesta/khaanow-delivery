import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  phoneNumber: string | null;
  setAuthenticated: (
    isAuth: boolean,
    userId?: string,
    phoneNumber?: string
  ) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  phoneNumber: null,
  setAuthenticated: (isAuth, userId, phoneNumber) => {
    set({ isAuthenticated: isAuth, userId: userId || null, phoneNumber: phoneNumber || null });
    if (isAuth) {
      AsyncStorage.setItem("isAuthenticated", "true");
      if (userId) AsyncStorage.setItem("userId", userId);
      if (phoneNumber) AsyncStorage.setItem("phoneNumber", phoneNumber);
    }
  },
  logout: () => {
    set({ isAuthenticated: false, userId: null, phoneNumber: null });
    AsyncStorage.multiRemove(["isAuthenticated", "userId", "phoneNumber"]);
  },
  initializeAuth: async () => {
    try {
      const isAuth = await AsyncStorage.getItem("isAuthenticated");
      const userId = await AsyncStorage.getItem("userId");
      const phoneNumber = await AsyncStorage.getItem("phoneNumber");
      if (isAuth === "true") {
        set({ isAuthenticated: true, userId, phoneNumber });
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
    }
  },
}));
