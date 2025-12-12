import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace("/auth/login");
  };

  const menuItems = [
    { id: 1, title: "Edit Profile", icon: "person-outline", route: "" },
    { id: 2, title: "Payment Methods", icon: "card-outline", route: "" },
    { id: 3, title: "Notifications", icon: "notifications-outline", route: "" },
    { id: 4, title: "Settings", icon: "settings-outline", route: "" },
    { id: 5, title: "Help & Support", icon: "help-circle-outline", route: "" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        <View className="px-6 pt-16 pb-8">
          {/* Header */}
          <Text className="text-2xl font-bold text-[#1A1A1A] mb-6">
            Profile
          </Text>

          {/* Profile Card */}
          <View className="bg-[#F8F8F8] rounded-2xl p-6 mb-6">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-[#FF6A00] rounded-full items-center justify-center mr-4">
                <Text className="text-white text-2xl font-bold">RK</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-[#1A1A1A] mb-1">
                  Rahul Kumar
                </Text>
                <Text className="text-sm text-[#7A7A7A]">+91 9876543210</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#7A7A7A" />
            </View>
          </View>

          {/* Menu Items */}
          <View className="space-y-2">
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                className="flex-row items-center justify-between bg-[#F8F8F8] rounded-2xl p-4"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3">
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color="#1A1A1A"
                    />
                  </View>
                  <Text className="text-base font-semibold text-[#1A1A1A]">
                    {item.title}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#7A7A7A" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.7}
            className="mt-6 bg-[#FF6A00] rounded-2xl py-4 items-center"
          >
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={20} color="white" />
              <Text className="text-white text-base font-bold ml-2">
                Logout
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
