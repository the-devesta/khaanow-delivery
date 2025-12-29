import { useOrderStore } from "@/store/orders";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrdersScreen() {
  const router = useRouter();
  const { orderHistory } = useOrderStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "delivered" | "cancelled"
  >("all");

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const filteredOrders = orderHistory.filter((order) => {
    if (activeFilter === "all") return true;
    return order.status === activeFilter;
  });

  const completedCount = orderHistory.filter(
    (o) => o.status === "delivered"
  ).length;
  const totalEarnings = orderHistory
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.earnings, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return { bg: "#D1FAE5", text: "#10B981", label: "Completed" };
      case "cancelled":
        return { bg: "#FEE2E2", text: "#EF4444", label: "Cancelled" };
      default:
        return { bg: "#E5E7EB", text: "#6B7280", label: "Unknown" };
    }
  };

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
        <View className="bg-white px-6 pt-16 pb-5 rounded-b-3xl shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1">
              <Text className="text-sm text-[#7A7A7A]">Order History</Text>
              <Text className="text-2xl font-bold text-[#1A1A1A] mt-1">
                Your Deliveries 📦
              </Text>
            </View>
            <TouchableOpacity
              className="w-12 h-12 bg-[#FFF5EB] rounded-full items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="search-outline" size={22} color="#FF6A00" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View className="px-6 mt-5 flex-row gap-4">
          <View className="flex-1 bg-white rounded-3xl p-4 shadow-md">
            <View className="w-10 h-10 bg-[#D1FAE5] rounded-xl items-center justify-center mb-3">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <Text className="text-xs text-[#6B7280] mb-1">Completed</Text>
            <Text className="text-2xl font-bold text-[#1A1A1A]">
              {completedCount}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-3xl p-4 shadow-md">
            <View className="w-10 h-10 bg-[#FFF5EB] rounded-xl items-center justify-center mb-3">
              <Ionicons name="wallet" size={20} color="#FF6A00" />
            </View>
            <Text className="text-xs text-[#6B7280] mb-1">Total Earned</Text>
            <Text className="text-2xl font-bold text-[#1A1A1A]">
              ₹{totalEarnings}
            </Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="px-6 mt-5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveFilter("all")}
              className={`px-5 py-3 rounded-full ${
                activeFilter === "all" ? "bg-[#FF6A00]" : "bg-white"
              }`}
            >
              <Text
                className={`font-semibold ${
                  activeFilter === "all" ? "text-white" : "text-[#1A1A1A]"
                }`}
              >
                All Orders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveFilter("delivered")}
              className={`px-5 py-3 rounded-full ${
                activeFilter === "delivered" ? "bg-[#FF6A00]" : "bg-white"
              }`}
            >
              <Text
                className={`font-semibold ${
                  activeFilter === "delivered" ? "text-white" : "text-[#1A1A1A]"
                }`}
              >
                Completed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveFilter("cancelled")}
              className={`px-5 py-3 rounded-full ${
                activeFilter === "cancelled" ? "bg-[#FF6A00]" : "bg-white"
              }`}
            >
              <Text
                className={`font-semibold ${
                  activeFilter === "cancelled" ? "text-white" : "text-[#1A1A1A]"
                }`}
              >
                Cancelled
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Orders List */}
        <View className="px-6 mt-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-[#1A1A1A]">
              {activeFilter === "all"
                ? "All Orders"
                : activeFilter === "delivered"
                ? "Completed Orders"
                : "Cancelled Orders"}
            </Text>
            <Text className="text-sm text-[#6B7280]">
              {filteredOrders.length}{" "}
              {filteredOrders.length === 1 ? "order" : "orders"}
            </Text>
          </View>

          {filteredOrders.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 shadow-sm items-center">
              <View className="w-20 h-20 bg-[#F9FAFB] rounded-full items-center justify-center mb-4">
                <Ionicons name="receipt-outline" size={36} color="#D1D5DB" />
              </View>
              <Text className="text-lg font-bold text-[#1A1A1A] mb-2">
                No Orders Yet
              </Text>
              <Text className="text-sm text-[#7A7A7A] text-center">
                Complete your first delivery to see your order history
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const statusStyle = getStatusColor(order.status);
              const orderDate = new Date(order.createdAt).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }
              );
              return (
                <TouchableOpacity
                  key={order.id}
                  activeOpacity={0.8}
                  className="bg-white rounded-3xl p-5 shadow-sm mb-4"
                  onPress={() => router.push(`/orders/${order.id}`)}
                >
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1">
                      <Text className="text-xs text-[#7A7A7A] mb-1">
                        ORDER ID
                      </Text>
                      <Text className="text-sm font-bold text-[#1A1A1A]">
                        #{order.id.slice(-8)}
                      </Text>
                    </View>
                    <View
                      className="px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: statusStyle.bg }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: statusStyle.text }}
                      >
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-start mb-4">
                    <View className="w-10 h-10 bg-[#FFF5EB] rounded-xl items-center justify-center">
                      <Ionicons name="restaurant" size={20} color="#FF6A00" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-bold text-[#1A1A1A] mb-1">
                        {order.restaurantName}
                      </Text>
                      <View className="flex-row items-center">
                        <Ionicons
                          name="person-outline"
                          size={14}
                          color="#6B7280"
                        />
                        <Text className="text-sm text-[#6B7280] ml-1">
                          {order.customerName}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between pt-4 border-t border-[#F3F4F6]">
                    <View className="flex-row items-center gap-3">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="text-xs text-[#6B7280] ml-1">
                          {orderDate}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="text-xs text-[#6B7280] ml-1">
                          {order.distance} km
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold text-[#10B981]">
                      ₹{order.earnings}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
