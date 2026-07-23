import { Platform } from "react-native";

/**
 * Environment Configuration
 * Centralizes all environment variables for the delivery app
 */

const requiredEnv = (key: string, value?: string) => {
  if (!value) {
    throw new Error(`${key} is required. Configure it in Expo/EAS env.`);
  }
  return value;
};

const googleMapsApiKey = requiredEnv(
  Platform.OS === "ios"
    ? "EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY"
    : "EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY",
  (Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
    : process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY) ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
);

const ENV = {
  // API Configuration
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    "https://5axnuhvpz7h2mjnrp2ledb7nmy0hmwkh.lambda-url.ap-south-1.on.aws/api",
  SOCKET_URL:
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    "https://5axnuhvpz7h2mjnrp2ledb7nmy0hmwkh.lambda-url.ap-south-1.on.aws",
  SOCKET_PATH: process.env.EXPO_PUBLIC_SOCKET_PATH || "/socket.io",

  // Firebase Configuration
  FIREBASE_API_KEY:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyAkfD1D3ErwApNq2aPouuPpfElyH-CI6Fg",
  FIREBASE_AUTH_DOMAIN:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "khaaonow-91e55.firebaseapp.com",
  FIREBASE_DATABASE_URL:
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ||
    "https://khaaonow-91e55-default-rtdb.asia-southeast1.firebasedatabase.app",
  FIREBASE_PROJECT_ID:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "khaaonow-91e55",
  FIREBASE_STORAGE_BUCKET:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "khaaonow-91e55.firebasestorage.app",
  FIREBASE_MESSAGING_SENDER_ID:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "665067279336",
  FIREBASE_APP_ID:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    "1:665067279336:android:e9f6d045f5d2e5706b8a5d",

  // App Configuration
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || "KhaaoNow Delivery",
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
  GOOGLE_MAPS_API_KEY: googleMapsApiKey,
};

export default ENV;
