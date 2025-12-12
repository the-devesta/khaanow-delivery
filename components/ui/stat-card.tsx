import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color?: string;
  bgColor?: string;
  onPress?: () => void;
}

export default function StatCard({
  icon,
  label,
  value,
  color = "#FF6A00",
  bgColor = "#FFF5EB",
  onPress,
}: StatCardProps) {
  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      className="flex-1 bg-white rounded-3xl p-5 shadow-md"
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View
        className="w-12 h-12 rounded-2xl items-center justify-center mb-3"
        style={{ backgroundColor: bgColor }}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="text-sm text-[#7A7A7A] mb-1">{label}</Text>
      <Text className="text-2xl font-bold text-[#1A1A1A]">{value}</Text>
    </CardWrapper>
  );
}
