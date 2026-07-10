import MissedOrderCard from "@/components/orders/MissedOrderCard";
import { IOSGlassIconButton } from "@/components/ui/ios-liquid-glass";
import { useOrderStore } from "@/store/orders";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    orderHistory,
    activeOrder,
    activeOrders,
    routePlan,
    missedOrders,
    fetchOrderHistory,
    fetchAvailableOrders,
    fetchAssignedOrders,
    fetchRoutePlan,
    dismissMissedOrder,
    pruneMissedOrders,
  } = useOrderStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "delivered" | "cancelled" | "active"
  >("all");

  useEffect(() => {
    fetchOrderHistory();
    fetchAssignedOrders();
    fetchAvailableOrders();
    fetchRoutePlan();
    pruneMissedOrders();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchOrderHistory(),
      fetchAvailableOrders(),
      fetchAssignedOrders(),
      fetchRoutePlan(),
    ]);
    pruneMissedOrders();
    setRefreshing(false);
  };

  // Merge activeOrder into the list so in-progress orders are always visible.
  // Also merge expired/cancelled/unavailable missed orders into history so they show in "All Orders".
  // We use a Map to guarantee that each order.id is perfectly unique, stripping out duplicates from history.
  // Rule: any missed order that is NOT an active pending request (still available + not yet expired)
  // belongs in the history section.
  const expiredMissedAsOrders = missedOrders
    .filter(
      (m) =>
        m.expiresAt.getTime() <= Date.now() ||
        m.reason === "cancelled" ||
        !m.stillAvailable,
    )
    .map((m) => m.order);

  const allOrders = Array.from(
    new Map(
      [
        ...orderHistory,
        ...expiredMissedAsOrders,
        ...activeOrders,
        ...(activeOrder ? [activeOrder] : []),
      ].map((o) => [o.id, o]),
    ).values(),
  );

  console.log(
    "🗂️ [Orders Tab] orderHistory:",
    orderHistory.length,
    "| missedOrders:",
    missedOrders.length,
    "| expiredMissed:",
    expiredMissedAsOrders.length,
    "| allOrders:",
    allOrders.length,
  );
  console.log(
    "🗂️ [Orders Tab] allOrders statuses:",
    allOrders.map((o) => ({ id: o.id.slice(-6), status: o.status })),
  );

  // Active pending requests (still acceptable) go in the Pending Requests section.
  const activePendingRequests = missedOrders.filter(
    (m) => m.expiresAt.getTime() > Date.now() && m.stillAvailable,
  );

  const filteredOrders = allOrders.filter((order) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "active") {
      return !["delivered", "cancelled"].includes(order.status);
    }
    return order.status === activeFilter;
  });

  const completedCount = allOrders.filter(
    (o) => o.status === "delivered",
  ).length;
  const totalEarnings = allOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + (o.earnings || 0), 0);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "delivered":
        return { bg: "#D1FAE5", text: "#10B981", label: "Delivered" };
      case "cancelled":
        return { bg: "#FEE2E2", text: "#EF4444", label: "Cancelled" };
      case "delivery_partner_accepted":
      case "accepted":
        return { bg: "#DBEAFE", text: "#3B82F6", label: "Accepted" };
      case "delivery_partner_reached":
        return { bg: "#EDE9FE", text: "#7C3AED", label: "At Restaurant" };
      case "delivery_partner_picked_up":
      case "picked_up":
        return { bg: "#FEF3C7", text: "#D97706", label: "Picked Up" };
      case "delivery_partner_reached_user_dest":
      case "on_the_way":
        return { bg: "#FFF5EB", text: "#FF6A00", label: "On The Way" };
      case "confirmed":
      case "preparing":
      case "ready":
      case "out_for_delivery":
        return {
          bg: "#FEF3C7",
          text: "#D97706",
          label: status
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        };
      default:
        return {
          bg: "#F3F4F6",
          text: "#6B7280",
          label: status.replace(/_/g, " ") || "Pending",
        };
    }
  };

  return (
    <View className="flex-1 bg-[#F3E0D9]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#F59E0B"
            colors={["#F59E0B"]}
          />
        }
        contentContainerStyle={{
          paddingBottom: 110,
          paddingTop: insets.top + 10,
        }}>
        {/* Header */}
        <View className="px-6 pb-5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1">
              <Text className="text-sm font-medium text-[#7A7A7A] uppercase tracking-wider">
                Order History
              </Text>
              <Text className="text-3xl font-extrabold text-[#1A1A1A] mt-1">
                Your Deliveries 📦
              </Text>
            </View>
            <IOSGlassIconButton
              icon="search-outline"
              systemImage="magnifyingglass"
              color="#F59E0B"
              size={48}
            />
          </View>
        </View>

        {/* Stats Cards */}
        <View className="px-6 mt-2 flex-row gap-4">
          <View className="flex-1 bg-white rounded-[32px] p-5  relative overflow-hidden">
            <View className="absolute right-0 top-0 w-16 h-16 bg-[#10B981]/10 rounded-full -mr-6 -mt-6" />
            <View className="w-10 h-10 bg-[#D1FAE5] rounded-2xl items-center justify-center mb-3">
              <Ionicons
                name="checkmark-done-circle"
                size={20}
                color="#10B981"
              />
            </View>
            <Text className="text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-1">
              Completed
            </Text>
            <Text className="text-2xl font-extrabold text-[#1A1A1A]">
              {completedCount}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-[32px] p-5  relative overflow-hidden">
            <View className="absolute right-0 top-0 w-16 h-16 bg-[#F59E0B]/10 rounded-full -mr-6 -mt-6" />
            <View className="w-10 h-10 bg-[#FFFBEB] rounded-2xl items-center justify-center mb-3">
              <Ionicons name="wallet" size={20} color="#F59E0B" />
            </View>
            <Text className="text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-1">
              Total Earned
            </Text>
            <Text className="text-2xl font-extrabold text-[#1A1A1A]">
              ₹{totalEarnings}
            </Text>
          </View>
        </View>

        {/* Pending Requests Section - only show still-available ones */}
        {activePendingRequests.length > 0 && (
          <View className="px-6 mt-6">
            <View className="flex-row items-center justify-between mb-4 ml-1">
              <Text className="text-lg font-bold text-[#1A1A1A]">
                Pending Requests
              </Text>
              <View className="bg-orange-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-orange-600">
                  {activePendingRequests.length}{" "}
                  {activePendingRequests.length === 1 ? "Request" : "Requests"}
                </Text>
              </View>
            </View>
            {activePendingRequests.map((missed) => (
              <MissedOrderCard key={missed.order.id} missed={missed} />
            ))}
          </View>
        )}

        {routePlan && routePlan.stops.length > 0 && (
          <View className="px-6 mt-6">
            <View className="bg-white rounded-[32px] p-5 border border-orange-100">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">
                    Optimized Route
                  </Text>
                  <Text className="text-lg font-extrabold text-[#1A1A1A] mt-1">
                    {routePlan.activeOrderCount} active • {routePlan.totalDistanceKm} km
                  </Text>
                </View>
                <View className="bg-orange-50 px-3 py-1.5 rounded-full">
                  <Text className="text-xs font-bold text-orange-600">
                    Max {routePlan.maxActiveBatch}
                  </Text>
                </View>
              </View>

              {routePlan.stops.map((stop) => (
                <TouchableOpacity
                  key={`${stop.orderId}-${stop.type}-${stop.sequence}`}
                  onPress={() => router.push(`/orders/${stop.orderId}`)}
                  className="flex-row items-start py-3 border-t border-gray-100">
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                      stop.type === "pickup" ? "bg-amber-100" : "bg-emerald-100"
                    }`}>
                    <Text
                      className={`text-xs font-extrabold ${
                        stop.type === "pickup"
                          ? "text-amber-700"
                          : "text-emerald-700"
                      }`}>
                      {stop.sequence}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-[#1A1A1A]">
                      {stop.type === "pickup" ? "Pickup" : "Drop"} •{" "}
                      {stop.type === "pickup"
                        ? stop.restaurantName
                        : stop.customerName}
                    </Text>
                    <Text className="text-xs text-[#7A7A7A] mt-1" numberOfLines={1}>
                      {stop.address || `Order #${stop.orderId.slice(-8)}`}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-[#9CA3AF]">
                    {stop.distanceKm} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View className="px-6 mt-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}>
            {(
              [
                { key: "all", label: "All Orders" },
                { key: "active", label: "In Progress" },
                { key: "delivered", label: "Completed" },
                { key: "cancelled", label: "Cancelled" },
              ] as const
            ).map((filter) => (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.7}
                onPress={() => setActiveFilter(filter.key)}
                style={[
                  {
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 50,
                    borderWidth: 1,
                  },
                  activeFilter === filter.key
                    ? { backgroundColor: "#F59E0B", borderColor: "#F59E0B" }
                    : { backgroundColor: "#ffffff", borderColor: "#E5E7EB" },
                ]}>
                <Text
                  style={[
                    { fontWeight: "700", fontSize: 14 },
                    activeFilter === filter.key
                      ? { color: "#ffffff" }
                      : { color: "#7A7A7A" },
                  ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Orders List */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center justify-between mb-4 ml-1">
            <Text className="text-lg font-bold text-[#1A1A1A]">
              {activeFilter === "all"
                ? "All Orders"
                : activeFilter === "active"
                  ? "In Progress Orders"
                : activeFilter === "delivered"
                  ? "Completed Orders"
                  : "Cancelled Orders"}
            </Text>
            <View className="bg-gray-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-[#6B7280]">
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1 ? "Order" : "Orders"}
              </Text>
            </View>
          </View>

          {filteredOrders.length === 0 ? (
            <View className="bg-white rounded-[32px] p-8 items-center">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="receipt-outline" size={36} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-bold text-[#1A1A1A] mb-2">
                No Orders Yet
              </Text>
              <Text className="text-sm text-[#7A7A7A] text-center max-w-[200px] leading-5">
                {activeFilter === "active"
                  ? "No active deliveries right now"
                  : "Complete your first delivery to see your order history"}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const statusStyle = getStatusStyle(order.status);
              const orderDate = new Date(order.createdAt).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                },
              );
              const isActive = !["delivered", "cancelled"].includes(
                order.status,
              );
              return (
                <TouchableOpacity
                  key={order.id}
                  activeOpacity={0.8}
                  className="bg-white rounded-[32px] p-1 mb-4 "
                  onPress={() => router.push(`/orders/${order.id}`)}>
                  <View className="bg-gray-50 rounded-[28px] p-5">
                    <View className="flex-row items-center justify-between mb-4">
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-[#9CA3AF] mb-1 tracking-wider">
                          ORDER ID
                        </Text>
                        <Text className="text-sm font-bold text-[#1A1A1A]">
                          #{order.id.slice(-8)}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}>
                        {isActive && (
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: "#3B82F6",
                            }}
                          />
                        )}
                        <View
                          className="px-3 py-1.5 rounded-full"
                          style={{ backgroundColor: statusStyle.bg }}>
                          <Text
                            className="text-xs font-bold"
                            style={{ color: statusStyle.text }}>
                            {statusStyle.label}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row items-start mb-4">
                      <View className="w-10 h-10 bg-[#FFFBEB] rounded-xl items-center justify-center ">
                        <Ionicons name="restaurant" size={24} color="#F59E0B" />
                      </View>
                      <View className="ml-4 flex-1">
                        <Text className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
                          Pickup From
                        </Text>
                        <Text
                          className="text-base font-bold text-[#1A1A1A] leading-tight"
                          numberOfLines={1}>
                          {order.restaurantName}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between pt-4 border-t border-gray-100">
                      <Text className="text-xs font-bold text-[#9CA3AF]">
                        {orderDate}
                      </Text>
                      <Text className="text-lg font-extrabold text-[#1A1A1A]">
                        ₹{order.earnings || 0}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
