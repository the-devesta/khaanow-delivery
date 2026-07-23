import axios from "axios";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/auth";

type ExpoNotifications = typeof import("expo-notifications");

let NotificationsModule: ExpoNotifications | null | undefined;
let notificationHandlerConfigured = false;
let pushTokenListenerConfigured = false;
let lastPushTokenListenerHandledAt = 0;
const PUSH_TOKEN_REGISTER_RETRIES = 3;
const PUSH_TOKEN_CACHE_KEY = "delivery_push_token:last_backend_registration";
const PUSH_TOKEN_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function maskPushToken(token?: string | null) {
  if (!token) return "PushToken[…]";
  const match = token.match(/^(Expo(?:nent)?PushToken\[)(.*)(\])$/);
  const inner = match?.[2] ?? token;
  return `${match?.[1] ?? "PushToken["}…${inner.slice(-6)}${match?.[3] ?? "]"}`;
}

async function shouldSkipBackendTokenRegistration(token: string) {
  try {
    const raw = await AsyncStorage.getItem(PUSH_TOKEN_CACHE_KEY);
    if (!raw) return false;
    const cached = JSON.parse(raw) as { token?: string; registeredAt?: number };
    return (
      cached.token === token &&
      typeof cached.registeredAt === "number" &&
      Date.now() - cached.registeredAt < PUSH_TOKEN_CACHE_TTL_MS
    );
  } catch {
    return false;
  }
}

async function rememberBackendTokenRegistration(token: string) {
  await AsyncStorage.setItem(
    PUSH_TOKEN_CACHE_KEY,
    JSON.stringify({ token, registeredAt: Date.now() }),
  );
}

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
  } catch {
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
  } catch {
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
      console.log("📱 Expo Push Token:", maskPushToken(token));

      if (
        !pushTokenListenerConfigured &&
        typeof (Notifications as any).addPushTokenListener === "function"
      ) {
        pushTokenListenerConfigured = true;
        (Notifications as any).addPushTokenListener(() => {
          // The listener payload is the NATIVE FCM/APNs token, not an Expo
          // token — registering it raw made the backend reject it with
          // "Invalid Expo push token format" on every refresh (log flood).
          // Re-fetch the Expo token and register that instead.
          //
          // Guarded with a cooldown: calling getExpoPushTokenAsync() from
          // inside this callback can itself cause the native layer to emit
          // another token-refresh event on some devices/OS versions, which
          // re-fires this same listener — an unbounded self-triggering loop
          // observed hammering production. The cooldown breaks that
          // regardless of root cause.
          const now = Date.now();
          if (now - lastPushTokenListenerHandledAt < 60_000) return;
          lastPushTokenListenerHandledAt = now;

          void Notifications.getExpoPushTokenAsync({ projectId })
            .then((next: { data?: string }) => {
              if (next?.data) void registerPushTokenWithBackend(next.data);
            })
            .catch(() => {});
        });
      }
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
  const API_URL = API_BASE_URL;
  if (!API_URL) {
    console.warn(
      "⚠️ API_BASE_URL is missing; skipping push token registration instead of using a production fallback.",
    );
    return;
  }

  if (await shouldSkipBackendTokenRegistration(token)) {
    console.log("📱 Push token registration skipped; unchanged recently", {
      token: maskPushToken(token),
    });
    return { success: true, skipped: true };
  }

  for (let attempt = 1; attempt <= PUSH_TOKEN_REGISTER_RETRIES; attempt += 1) {
    try {
      const { token: authToken } = useAuthStore.getState();

      if (!authToken) {
        console.log("❌ No auth token found, skipping push token registration");
        return;
      }

      console.log("📤 Registering push token with backend...", {
        attempt,
        token: maskPushToken(token),
      });

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

      await rememberBackendTokenRegistration(token);
      console.log("✅ Push token registered successfully:", response.data);
      return response.data;
    } catch (error: any) {
      const canRetry =
        !error.response ||
        error.response.status >= 500 ||
        error.code === "ECONNABORTED";

      console.error(
        `❌ Failed to register push token with backend (attempt ${attempt}):`,
        error.response?.data || error.message,
      );

      if (!canRetry || attempt === PUSH_TOKEN_REGISTER_RETRIES) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}
