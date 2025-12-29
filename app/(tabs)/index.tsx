import OrderRequestModal from "@/components/orders/OrderRequestModal";
import StatCard from "@/components/ui/stat-card";
import StatusToggle from "@/components/ui/status-toggle";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { ApiService } from "@/services/api";
import { useOrderStore } from "@/store/orders";
import { usePartnerStore } from "@/store/partner";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface DashboardData {
  earnings: {
    today: number;
    week: number;
    month: number;
  };
  stats: {
    deliveriesToday: number;
    weekOrders: number;
    totalOrders: number;
    completedOrders: number;
    activeOrders: number;
  };
  rating: number;
  onlineStatus: boolean;
  activeOrder: {
    id: string;
    orderNumber: string;
    status: string;
    restaurantName: string;
    customerAddress: string;
    totalAmount: number;
    estimatedTime?: string;
  } | null;
}

interface ProfileData {
  name?: string;
  phone: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const { isOnline, toggleOnline, syncOnlineStatus } = usePartnerStore();

  const { pendingOrder, activeOrder, acceptOrder, rejectOrder } =
    useOrderStore();

  // Location tracking - auto-starts when online, auto-stops when offline
  // The hook handles location updates to backend internally
  useLocationTracking({
    updateInterval: 30000, // Update every 30 seconds
    distanceThreshold: 50, // Update if moved 50 meters
  });

  const fetchDashboard = async () => {
    try {
      // Fetch dashboard data
      const dashboardResponse = await ApiService.getDashboardData();
      if (dashboardResponse.success && dashboardResponse.data) {
        setDashboardData(dashboardResponse.data);
        // Sync online status with backend
        if (dashboardResponse.data.onlineStatus !== undefined) {
          syncOnlineStatus(dashboardResponse.data.onlineStatus);
        }
      }

      // Fetch profile for name
      const profileResponse = await ApiService.getProfile();
      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data as any);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptOrder = () => {
    if (pendingOrder) {
      acceptOrder(pendingOrder.id);
      router.push(`/orders/${pendingOrder.id}`);
    }
  };

  const handleRejectOrder = () => {
    if (pendingOrder) {
      rejectOrder(pendingOrder.id);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const handleToggleOnline = async () => {
    setToggleLoading(true);
    try {
      await toggleOnline();
      // Refresh dashboard to get updated status
      await fetchDashboard();
      if (!isOnline) {
        Alert.alert(
          "You're Online! 🎉",
          "You'll start receiving order requests now."
        );
      }
    } catch (error) {
      console.error("Toggle online error:", error);
      Alert.alert("Error", "Failed to update status. Please try again.");
    } finally {
      setToggleLoading(false);
    }
  };

  const handleViewOrderDetails = () => {
    if (activeOrder) {
      router.push(`/orders/${activeOrder.id}`);
    } else if (dashboardData?.activeOrder) {
      router.push(`/orders/${dashboardData.activeOrder.id}`);
    }
  };

  const partnerName = profile?.name || "Delivery Partner";
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Use dashboard data for stats
  const todayEarnings = dashboardData?.earnings?.today || 0;
  const completedOrders = dashboardData?.stats?.deliveriesToday || 0;
  const currentActiveOrder = activeOrder || (dashboardData?.activeOrder ? {
    id: dashboardData.activeOrder.id,
    restaurantName: dashboardData.activeOrder.restaurantName,
    customerName: "Customer",
    customerAddress: dashboardData.activeOrder.customerAddress,
    earnings: dashboardData.activeOrder.totalAmount * 0.1,
    status: dashboardData.activeOrder.status,
    estimatedTime: dashboardData.activeOrder.estimatedTime || "15 mins",
  } : null);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] items-center justify-center">
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text className="text-gray-500 mt-4">Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="bg-white px-6 pt-16 rounded-3xl pb-5 shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1">
              <Text className="text-sm text-[#7A7A7A]">{currentDate}</Text>
              <Text className="text-2xl font-bold text-[#1A1A1A] mt-1">
                Hello, {partnerName}! 👋
              </Text>
            </View>
            <TouchableOpacity
              className="w-12 h-12 bg-[#FFF5EB] rounded-full items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="notifications" size={22} color="#FF6A00" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Toggle */}
        <View className="px-6 mt-5">
          <StatusToggle
            isOnline={isOnline}
            onToggle={handleToggleOnline}
            loading={toggleLoading}
          />
        </View>

        {/* Today's Stats */}
        <View className="px-6 mt-5">
          <Text className="text-lg font-bold text-[#1A1A1A] mb-4">
            Today&apos;s Overview
          </Text>
          <View className="flex-row gap-4">
            <StatCard
              icon="wallet"
              label="Today Earnings"
              value={`₹${todayEarnings.toFixed(2)}`}
              color="#10B981"
              bgColor="#D1FAE5"
              onPress={() => router.push("/(tabs)/earnings")}
            />
            <StatCard
              icon="checkmark-done-circle"
              label="Completed"
              value={completedOrders}
              color="#3B82F6"
              bgColor="#DBEAFE"
              onPress={() => router.push("/(tabs)/orders")}
            />
          </View>
        </View>

        {/* Active Order Section */}
        <View className="px-6 mt-5">
          <Text className="text-lg font-bold text-[#1A1A1A] mb-4">
            Active Order
          </Text>
          {currentActiveOrder ? (
            <TouchableOpacity
              onPress={handleViewOrderDetails}
              activeOpacity={0.8}
              className="bg-white rounded-3xl shadow-md overflow-hidden"
            >
              {/* Status Header */}
              <View className="px-5 py-3 flex-row items-center justify-between bg-[#DBEAFE]">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                  <Text className="text-sm font-bold ml-2 text-[#3B82F6]">
                    {currentActiveOrder.status === "accepted" && "Order Accepted"}
                    {currentActiveOrder.status === "picked_up" && "Picked Up"}
                    {currentActiveOrder.status === "on_the_way" && "On the Way"}
                    {currentActiveOrder.status === "confirmed" && "Order Confirmed"}
                    {currentActiveOrder.status === "preparing" && "Preparing"}
                    {currentActiveOrder.status === "out_for_delivery" && "Out for Delivery"}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#3B82F6" />
                  <Text className="text-sm font-semibold ml-1 text-[#3B82F6]">
                    {currentActiveOrder.estimatedTime}
                  </Text>
                </View>
              </View>

              {/* Order Details */}
              <View className="p-5">
                <View className="mb-4">
                  <Text className="text-xs text-[#7A7A7A] mb-1">ORDER ID</Text>
                  <Text className="text-sm font-bold text-[#1A1A1A]">
                    #{currentActiveOrder.id.slice(-8)}
                  </Text>
                </View>

                {/* Restaurant */}
                <View className="flex-row items-start mb-4">
                  <View className="w-10 h-10 bg-[#FFF5EB] rounded-xl items-center justify-center">
                    <Ionicons name="restaurant" size={20} color="#FF6A00" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-[#7A7A7A] mb-0.5">
                      PICK UP FROM
                    </Text>
                    <Text className="text-base font-bold text-[#1A1A1A]">
                      {currentActiveOrder.restaurantName}
                    </Text>
                  </View>
                </View>

                {/* Customer */}
                <View className="flex-row items-start mb-4">
                  <View className="w-10 h-10 bg-[#D1FAE5] rounded-xl items-center justify-center">
                    <Ionicons name="location" size={20} color="#10B981" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-[#7A7A7A] mb-0.5">
                      DELIVER TO
                    </Text>
                    <Text className="text-base font-bold text-[#1A1A1A] mb-1">
                      {currentActiveOrder.customerName}
                    </Text>
                    <Text className="text-sm text-[#6B7280]">
                      {currentActiveOrder.customerAddress}
                    </Text>
                  </View>
                </View>

                {/* Action Button */}
                <View className="flex-row items-center justify-between pt-4 border-t border-[#F3F4F6]">
                  <View>
                    <Text className="text-xs text-[#7A7A7A] mb-0.5">
                      EARNINGS
                    </Text>
                    <Text className="text-lg font-bold text-[#10B981]">
                      ₹{currentActiveOrder.earnings}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-[#FF6A00] px-4 py-2 rounded-full">
                    <Text className="text-white font-semibold mr-2">
                      View Details
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View className="bg-white rounded-3xl p-8 shadow-md items-center">
              <View className="w-20 h-20 bg-[#F9FAFB] rounded-full items-center justify-center mb-4">
                <Ionicons name="cube-outline" size={36} color="#D1D5DB" />
              </View>
              <Text className="text-lg font-bold text-[#1A1A1A] mb-2">
                No Active Orders
              </Text>
              <Text className="text-sm text-[#7A7A7A] text-center mb-4">
                {isOnline
                  ? "You'll receive notifications when orders are assigned to you"
                  : "Go online to start receiving orders"}
              </Text>
              {!isOnline && (
                <TouchableOpacity
                  onPress={handleToggleOnline}
                  className="bg-[#FF6A00] px-6 py-3 rounded-full"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-semibold">Go Online</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="px-6 mt-5">
          <Text className="text-lg font-bold text-[#1A1A1A] mb-4">
            Quick Actions
          </Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-1 bg-white rounded-3xl p-5 shadow-md items-center"
              onPress={() => router.push("/(tabs)/orders")}
            >
              <View className="w-12 h-12 bg-[#FEF3C7] rounded-2xl items-center justify-center mb-3">
                <Ionicons name="time-outline" size={24} color="#F59E0B" />
              </View>
              <Text className="text-sm font-bold text-[#1A1A1A] text-center">
                Order History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-1 bg-white rounded-3xl p-5 shadow-md items-center"
              onPress={() => router.push("/(tabs)/earnings")}
            >
              <View className="w-12 h-12 bg-[#DBEAFE] rounded-2xl items-center justify-center mb-3">
                <Ionicons name="stats-chart" size={24} color="#3B82F6" />
              </View>
              <Text className="text-sm font-bold text-[#1A1A1A] text-center">
                Earnings
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips Section */}
        <View className="px-6 mt-5 mb-6">
          <View className="bg-[#FFF5EB] rounded-3xl p-5 flex-row items-start">
            <View className="w-10 h-10 bg-[#FF6A00] rounded-xl items-center justify-center">
              <Ionicons name="bulb" size={20} color="white" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-base font-bold text-[#1A1A1A] mb-1">
                Pro Tip
              </Text>
              <Text className="text-sm text-[#6B7280] leading-5">
                Going online during peak hours (12-2 PM & 7-9 PM) can help you
                earn more deliveries and tips!
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Order Request Modal - Only show when no active order */}
      {pendingOrder && !activeOrder && (
        <OrderRequestModal
          order={pendingOrder}
          onAccept={handleAcceptOrder}
          onReject={handleRejectOrder}
        />
      )}
    </SafeAreaView>
  );
}
