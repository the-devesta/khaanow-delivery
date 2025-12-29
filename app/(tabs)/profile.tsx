import { ApiService } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ProfileData {
  id: string;
  name?: string;
  email?: string;
  phone: string;
  avatar?: string;
  rating: number;
  totalOrders: number;
  completedOrders: number;
  vehicleType?: string;
  vehicleNumber?: string;
  isApproved: boolean;
  onboardingStatus: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, phoneNumber } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await ApiService.getProfile();
      if (response.success && response.data) {
        setProfile(response.data as any);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = () => {
    logout();
    router.replace("/auth/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "DP";
    const parts = name.split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const menuItems = [
    { id: 1, title: "Edit Profile", icon: "person-outline", route: "" },
    { id: 2, title: "Payment Methods", icon: "card-outline", route: "" },
    { id: 3, title: "Order History", icon: "receipt-outline", route: "" },
    { id: 4, title: "Notifications", icon: "notifications-outline", route: "" },
    { id: 5, title: "Settings", icon: "settings-outline", route: "" },
    { id: 6, title: "Help & Support", icon: "help-circle-outline", route: "" },
  ];

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text className="text-gray-500 mt-4">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#FF6A00"]}
          />
        }
      >
        <View className="px-6 pt-8 pb-8">
          {/* Header */}
          <Text className="text-2xl font-bold text-[#1A1A1A] mb-6">
            Profile
          </Text>

          {/* Profile Card */}
          <View className="bg-[#F8F8F8] rounded-2xl p-6 mb-6">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-[#FF6A00] rounded-full items-center justify-center mr-4">
                <Text className="text-white text-2xl font-bold">
                  {getInitials(profile?.name)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-[#1A1A1A] mb-1">
                  {profile?.name || "Delivery Partner"}
                </Text>
                <Text className="text-sm text-[#7A7A7A]">
                  {profile?.phone || phoneNumber}
                </Text>
                {profile?.email && (
                  <Text className="text-xs text-[#9CA3AF] mt-1">
                    {profile.email}
                  </Text>
                )}
              </View>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={24} color="#7A7A7A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Card */}
          <View className="bg-[#FFF5EB] rounded-2xl p-5 mb-6">
            <Text className="text-base font-semibold text-[#FF6A00] mb-4">
              Your Stats
            </Text>
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-[#1A1A1A]">
                  {profile?.rating?.toFixed(1) || "0.0"}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="star" size={14} color="#FFB800" />
                  <Text className="text-xs text-[#7A7A7A] ml-1">Rating</Text>
                </View>
              </View>
              <View className="w-px bg-[#FFD4A8]" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-[#1A1A1A]">
                  {profile?.completedOrders || 0}
                </Text>
                <Text className="text-xs text-[#7A7A7A] mt-1">Deliveries</Text>
              </View>
              <View className="w-px bg-[#FFD4A8]" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-[#1A1A1A]">
                  {profile?.vehicleType || "N/A"}
                </Text>
                <Text className="text-xs text-[#7A7A7A] mt-1">Vehicle</Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View className="space-y-2">
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                className="flex-row items-center justify-between bg-[#F8F8F8] rounded-2xl p-4 mb-2"
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

          {/* App Version */}
          <Text className="text-xs text-[#9CA3AF] text-center mt-6">
            Khaaonow Delivery Partner v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
