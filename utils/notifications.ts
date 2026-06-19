import axios from "axios";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/auth";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and return the token
 */
export async function registerForPushNotificationsAsync({
  requestPermission = false,
}: { requestPermission?: boolean } = {}) {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted" && requestPermission) {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notifications are not enabled; skipping push token registration.");
      return;
    }

    // Get the project ID from Expo constants (needed for Expo Go)
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    try {
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log("📱 Expo Push Token:", token);
    } catch (e) {
      console.error("Error getting push token:", e);
    }
  } else {
    console.log("Must use physical device for Push Notifications");
  }

  return token;
}

/**
 * Register the push token with the backend
 */
export async function registerPushTokenWithBackend(token: string) {
  try {
    const API_URL =
      API_BASE_URL ||
      "https://5axnuhvpz7h2mjnrp2ledb7nmy0hmwkh.lambda-url.ap-south-1.on.aws/api";
    const { token: authToken } = useAuthStore.getState();

    if (!authToken) {
      console.log("❌ No auth token found, skipping push token registration");
      return;
    }

    console.log("📤 Registering push token with backend...", { token });

    const response = await axios.post(
      `${API_URL}/notifications/register`,
      { pushToken: token },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Push token registered successfully:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Failed to register push token with backend:",
      error.message,
    );
    if (error.response) {
      console.error("Server response:", error.response.data);
    }
  }
}
