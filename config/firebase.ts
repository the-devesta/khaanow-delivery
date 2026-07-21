/**
 * Firebase Configuration
 *
 * The app uses Firebase JS SDK services where needed. Phone OTP auth is handled
 * by the backend, so native Firebase Auth is intentionally not bundled.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import ENV from "./env";

// Firebase configuration
export const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  databaseURL: ENV.FIREBASE_DATABASE_URL,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID,
};

// Check if running in Expo Go
export const isExpoGo = Constants.appOwnership === "expo";

// Initialize Firebase app (singleton)
let app: FirebaseApp;
let auth: any;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);

  // Initialize Auth with AsyncStorage persistence for React Native
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage as any),
    });
    console.log("✅ Firebase Auth initialized with AsyncStorage persistence");
  } catch (error) {
    // If already initialized, get the existing instance
    auth = getAuth(app);
    console.log("ℹ️ Using existing Firebase Auth instance");
  }
} else {
  app = getApp();
  auth = getAuth(app);
}

// Export auth instance
export { auth };

// Initialize and export Storage
export const storage = getStorage(app);

// Export types for use in hooks
export type { ConfirmationResult } from "firebase/auth";

console.log(
  "🔥 Firebase initialized:",
  isExpoGo ? "Expo Go (JS SDK)" : "Native Build (JS SDK)",
);
