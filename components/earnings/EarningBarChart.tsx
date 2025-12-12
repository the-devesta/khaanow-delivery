import React from "react";
import { Text, View } from "react-native";

interface BarData {
  label: string;
  value: number;
}

interface EarningBarChartProps {
  data: BarData[];
  maxValue: number;
}

export default function EarningBarChart({
  data,
  maxValue,
}: EarningBarChartProps) {
  return (
    <View className="bg-white rounded-3xl p-5 shadow-md">
      <Text className="text-lg font-bold text-[#1A1A1A] mb-5">
        Weekly Earnings
      </Text>
      <View className="flex-row items-end justify-between h-48">
        {data.map((item, index) => {
          const heightPercentage = (item.value / maxValue) * 100;
          const barHeight = Math.max((heightPercentage / 100) * 180, 8);

          return (
            <View key={index} className="items-center flex-1 mx-1">
              <View className="items-center justify-end flex-1 w-full">
                {item.value > 0 && (
                  <Text className="text-xs font-semibold text-[#6B7280] mb-2">
                    ₹{item.value}
                  </Text>
                )}
                <View
                  className="w-full rounded-t-xl bg-gradient-to-b from-[#FF6A00] to-[#FF8534]"
                  style={{
                    height: barHeight,
                    backgroundColor: "#FF6A00",
                  }}
                />
              </View>
              <Text className="text-xs text-[#9CA3AF] mt-2">{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
