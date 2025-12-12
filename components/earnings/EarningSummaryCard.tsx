import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface EarningSummaryCardProps {
  title: string;
  amount: number;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function EarningSummaryCard({
  title,
  amount,
  subtitle,
  icon,
  iconColor,
  iconBg,
  trend,
}: EarningSummaryCardProps) {
  return (
    <View className="bg-white rounded-3xl p-5 shadow-md">
      <View className="flex-row items-center justify-between mb-3">
        <View
          className="w-12 h-12 rounded-2xl items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        {trend && (
          <View
            className={`px-3 py-1 rounded-full ${
              trend.isPositive ? "bg-[#D1FAE5]" : "bg-[#FEE2E2]"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                trend.isPositive ? "text-[#10B981]" : "text-[#EF4444]"
              }`}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-[#6B7280] mb-1">{title}</Text>
      <Text className="text-3xl font-bold text-[#1A1A1A] mb-1">
        ₹{amount.toLocaleString()}
      </Text>
      <Text className="text-xs text-[#9CA3AF]">{subtitle}</Text>
    </View>
  );
}
