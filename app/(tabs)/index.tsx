import OrderRequestModal from "@/components/orders/OrderRequestModal";
import StatCard from "@/components/ui/stat-card";
import StatusToggle from "@/components/ui/status-toggle";
import { useOrderStore } from "@/store/orders";
import { usePartnerStore } from "@/store/partner";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const { isOnline, toggleOnline, initializeStore } = usePartnerStore();

  const {
    pendingOrder,
    activeOrder,
    orderHistory,
    acceptOrder,
    rejectOrder,
    simulateNewOrder,
  } = useOrderStore();

  // Calculate stats from orderHistory to match orders and earnings tabs
  const { todayEarnings, completedOrders } = useMemo(() => {
    const completedOrdersList = orderHistory.filter(
      (o) => o.status === "delivered"
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = completedOrdersList.filter((o) => {
      const orderDate = new Date(o.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    const todayEarnings = todayOrders.reduce((sum, o) => sum + o.earnings, 0);

    return {
      todayEarnings,
      completedOrders: todayOrders.length,
    };
  }, [orderHistory]);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // Simulate new orders when online (for development)
  useEffect(() => {
    if (isOnline && !pendingOrder && !activeOrder) {
      const timer = setTimeout(() => {
        simulateNewOrder();
      }, 10000); // New order every 10 seconds when online

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingOrder, activeOrder, simulateNewOrder]);

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
    await initializeStore();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleToggleOnline = () => {
    setToggleLoading(true);
    setTimeout(() => {
      toggleOnline();
      setToggleLoading(false);
      if (!isOnline) {
        Alert.alert(
          "You're Online! 🎉",
          "You'll start receiving order requests now."
        );
      }
    }, 500);
  };

  const handleViewOrderDetails = () => {
    if (activeOrder) {
      router.push(`/orders/${activeOrder.id}`);
    }
  };

  const partnerName = "Rahul Kumar";
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

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
          {activeOrder ? (
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
                    {activeOrder.status === "accepted" && "Order Accepted"}
                    {activeOrder.status === "picked_up" && "Picked Up"}
                    {activeOrder.status === "on_the_way" && "On the Way"}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#3B82F6" />
                  <Text className="text-sm font-semibold ml-1 text-[#3B82F6]">
                    {activeOrder.estimatedTime}
                  </Text>
                </View>
              </View>

              {/* Order Details */}
              <View className="p-5">
                <View className="mb-4">
                  <Text className="text-xs text-[#7A7A7A] mb-1">ORDER ID</Text>
                  <Text className="text-sm font-bold text-[#1A1A1A]">
                    #{activeOrder.id.slice(-8)}
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
                      {activeOrder.restaurantName}
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
                      {activeOrder.customerName}
                    </Text>
                    <Text className="text-sm text-[#6B7280]">
                      {activeOrder.customerAddress}
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
                      ₹{activeOrder.earnings}
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
