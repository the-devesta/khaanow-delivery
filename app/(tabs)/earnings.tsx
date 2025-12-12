import EarningBarChart from "@/components/earnings/EarningBarChart";
import EarningListItem from "@/components/earnings/EarningListItem";
import EarningSummaryCard from "@/components/earnings/EarningSummaryCard";
import { useOrderStore } from "@/store/orders";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function EarningsScreen() {
  const { orderHistory } = useOrderStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const { todayEarnings, weeklyData, earningsHistory, completedOrders } =
    useMemo(() => {
      const completedOrders = orderHistory.filter(
        (o) => o.status === "delivered"
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = completedOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });

      const todayEarnings = todayOrders.reduce((sum, o) => sum + o.earnings, 0);

      // Calculate weekly data (last 7 days)
      const weeklyData: { label: string; value: number }[] = [];
      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const dayOrders = completedOrders.filter((o) => {
          const orderDate = new Date(o.createdAt);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === date.getTime();
        });

        const dayEarnings = dayOrders.reduce((sum, o) => sum + o.earnings, 0);
        weeklyData.push({
          label: dayLabels[date.getDay()],
          value: dayEarnings,
        });
      }

      // Group earnings by date for history
      const earningsByDate = new Map<
        string,
        { amount: number; count: number }
      >();
      completedOrders.forEach((order) => {
        const dateKey = new Date(order.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const existing = earningsByDate.get(dateKey) || { amount: 0, count: 0 };
        earningsByDate.set(dateKey, {
          amount: existing.amount + order.earnings,
          count: existing.count + 1,
        });
      });

      const earningsHistory = Array.from(earningsByDate.entries())
        .map(([date, data]) => ({
          date,
          amount: data.amount,
          orderCount: data.count,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7);

      return {
        todayEarnings,
        weeklyData,
        earningsHistory,
        completedOrders: todayOrders.length,
      };
    }, [orderHistory]);

  const weeklyEarnings = weeklyData.reduce((sum, day) => sum + day.value, 0);
  const maxValue = Math.max(...weeklyData.map((d) => d.value), 100);

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
              <Text className="text-sm text-[#7A7A7A]">Earnings Overview</Text>
              <Text className="text-2xl font-bold text-[#1A1A1A] mt-1">
                Track Your Income 💰
              </Text>
            </View>
            <TouchableOpacity
              className="w-12 h-12 bg-[#FFF5EB] rounded-full items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={22} color="#FF6A00" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <View className="px-6 mt-5">
          <EarningSummaryCard
            title="Today's Earnings"
            amount={todayEarnings}
            subtitle={`From ${completedOrders} deliveries`}
            icon="trending-up"
            iconColor="#FF6A00"
            iconBg="#FFF5EB"
            trend={{ value: "12%", isPositive: true }}
          />
        </View>

        <View className="px-6 mt-4 flex-row gap-4">
          <View className="flex-1">
            <View className="bg-white rounded-3xl p-4 shadow-md">
              <View className="w-10 h-10 bg-[#DBEAFE] rounded-xl items-center justify-center mb-3">
                <Ionicons name="calendar" size={20} color="#3B82F6" />
              </View>
              <Text className="text-xs text-[#6B7280] mb-1">Weekly Total</Text>
              <Text className="text-2xl font-bold text-[#1A1A1A]">
                ₹{weeklyEarnings.toLocaleString()}
              </Text>
            </View>
          </View>
          <View className="flex-1">
            <View className="bg-white rounded-3xl p-4 shadow-md">
              <View className="w-10 h-10 bg-[#D1FAE5] rounded-xl items-center justify-center mb-3">
                <Ionicons name="checkmark-done" size={20} color="#10B981" />
              </View>
              <Text className="text-xs text-[#6B7280] mb-1">Completed</Text>
              <Text className="text-2xl font-bold text-[#1A1A1A]">
                {orderHistory.filter((o) => o.status === "delivered").length}
              </Text>
            </View>
          </View>
        </View>

        {/* Bar Chart */}
        <View className="px-6 mt-5">
          <EarningBarChart data={weeklyData} maxValue={maxValue} />
        </View>

        {/* Earnings History */}
        <View className="px-6 mt-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-[#1A1A1A]">
              Earnings History
            </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text className="text-sm font-semibold text-[#FF6A00]">
                See All
              </Text>
            </TouchableOpacity>
          </View>
          {earningsHistory.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 shadow-sm items-center">
              <View className="w-20 h-20 bg-[#F9FAFB] rounded-full items-center justify-center mb-4">
                <Ionicons name="wallet-outline" size={36} color="#D1D5DB" />
              </View>
              <Text className="text-lg font-bold text-[#1A1A1A] mb-2">
                No Earnings Yet
              </Text>
              <Text className="text-sm text-[#7A7A7A] text-center">
                Complete deliveries to start earning
              </Text>
            </View>
          ) : (
            earningsHistory.map((item, index) => (
              <EarningListItem
                key={index}
                date={item.date}
                amount={item.amount}
                orderCount={item.orderCount}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
