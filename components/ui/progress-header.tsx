import React from "react";
import { Text, View } from "react-native";

interface ProgressHeaderProps {
  step: number;
  total: number;
  title: string;
}

export default function ProgressHeader({
  step,
  total,
  title,
}: ProgressHeaderProps) {
  const progress = (step / total) * 100;

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-semibold text-[#7A7A7A]">
          Step {step} of {total}
        </Text>
        <Text className="text-sm font-semibold text-[#FF6A00]">
          {Math.round(progress)}%
        </Text>
      </View>
      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <View
          className="h-full bg-[#FF6A00] rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>
      <Text className="text-2xl font-bold text-[#1A1A1A] mt-4">{title}</Text>
    </View>
  );
}
