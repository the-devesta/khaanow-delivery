import { ApiService } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import {
  registerForPushNotificationsAsync,
  registerPushTokenWithBackend,
} from "@/utils/notifications";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationsEnabled(status === "granted");
    });
  }, []);

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!enabled) {
      setNotificationsEnabled(false);
      return;
    }

    const token = await registerForPushNotificationsAsync({
      requestPermission: true,
    });

    if (token) {
      await registerPushTokenWithBackend(token);
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
      Alert.alert(
        "Notifications Off",
        "You can keep using KhaaoNow Delivery without push notifications. To enable them later, allow notifications in Settings.",
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDeleteAccount,
        },
      ],
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const response = await ApiService.deleteAccount();

      if (response.success) {
        // Clear local auth state
        await logout();
        // Navigate to login, replacing the whole stack so user can't go back
        router.replace("/auth/login");
      } else {
        Alert.alert(
          "Error",
          response.message || "Failed to delete account. Please try again.",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Something went wrong. Please try again.",
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F3E0D9]">
      <View
        style={{ paddingTop: insets.top }}
        className="px-6 pb-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-[#1A1A1A]">Settings</Text>
          <View className="w-10" />
        </View>
      </View>

      <View className="p-6">
        <View className="bg-white rounded-3xl p-6  mb-6">
          <Text className="text-gray-900 font-bold mb-4 text-base">
            Preferences
          </Text>

          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#4B5563"
              />
              <Text className="text-gray-700 ml-3 font-medium">
                Push Notifications
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#E5E7EB", true: "#F59E0B" }}
              thumbColor={"#FFFFFF"}
              onValueChange={handleNotificationToggle}
              value={notificationsEnabled}
            />
          </View>

          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
              <Ionicons name="language-outline" size={22} color="#4B5563" />
              <Text className="text-gray-700 ml-3 font-medium">Language</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-500 mr-2">English</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </View>
        </View>

        <View className="bg-white rounded-3xl p-6 mb-6">
          <Text className="text-gray-900 font-bold mb-4 text-base">About</Text>

          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <Text className="text-gray-700 font-medium ml-1">
              Terms & Conditions
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <Text className="text-gray-700 font-medium ml-1">
              Privacy Policy
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-gray-700 font-medium ml-1">App Version</Text>
            <Text className="text-gray-500">1.0.0</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View className="bg-red-50 rounded-3xl p-6 border border-red-100">
          <View className="flex-row items-center mb-1">
            <Ionicons name="warning-outline" size={18} color="#EF4444" />
            <Text className="text-red-600 font-bold text-base ml-2">
              Danger Zone
            </Text>
          </View>
          <Text className="text-red-400 text-xs mb-4 font-medium">
            These actions are permanent and cannot be undone.
          </Text>

          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            activeOpacity={0.8}
            className="bg-red-500 rounded-2xl py-4 items-center flex-row justify-center"
            style={{ opacity: deletingAccount ? 0.6 : 1 }}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            )}
            <Text className="text-white font-bold text-base ml-2">
              {deletingAccount ? "Deleting Account..." : "Delete Account"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
