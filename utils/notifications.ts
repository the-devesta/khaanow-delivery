import axios from "axios";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/auth";

type ExpoNotifications = typeof import("expo-notifications");

let NotificationsModule: ExpoNotifications | null | undefined;
let notificationHandlerConfigured = false;

function isAndroidExpoGo() {
  return Platform.OS === "android" && Constants.appOwnership === "expo";
}

async function getNotifications() {
  if (NotificationsModule !== undefined) return NotificationsModule;

  if (isAndroidExpoGo()) {
    NotificationsModule = null;
    console.log(
      "[Notifications] Android push notifications are not available in Expo Go; skipping push notifications.",
    );
    return NotificationsModule;
  }

  try {
    NotificationsModule = await import("expo-notifications");
  } catch (error) {
    NotificationsModule = null;
    console.log(
      "[Notifications] expo-notifications is unavailable in this runtime; skipping push notifications.",
    );
  }

  if (
    NotificationsModule &&
    typeof NotificationsModule.setNotificationHandler === "function" &&
    !notificationHandlerConfigured
  ) {
    notificationHandlerConfigured = true;
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  return NotificationsModule;
}

export async function getPushNotificationPermissionStatus() {
  const Notifications = await getNotifications();
  if (!Notifications) return "unavailable";

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (error) {
    console.log(
      "[Notifications] Push notifications are unavailable in this runtime.",
    );
    return "unavailable";
  }
}

/**
 * Register for push notifications and return the token
 */
export async function registerForPushNotificationsAsync({
  requestPermission = false,
}: { requestPermission?: boolean } = {}) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

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
