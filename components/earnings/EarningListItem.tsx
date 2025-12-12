import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface EarningListItemProps {
  date: string;
  amount: number;
  orderCount: number;
}

export default function EarningListItem({
  date,
  amount,
  orderCount,
}: EarningListItemProps) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 bg-[#FFF5EB] rounded-xl items-center justify-center">
          <Ionicons name="calendar-outline" size={20} color="#FF6A00" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-[#1A1A1A] mb-0.5">
            {date}
          </Text>
          <Text className="text-xs text-[#6B7280]">
            {orderCount} {orderCount === 1 ? "order" : "orders"}
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-lg font-bold text-[#10B981]">₹{amount}</Text>
      </View>
    </View>
  );
}
