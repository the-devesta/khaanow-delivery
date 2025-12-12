import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";

interface StatusToggleProps {
  isOnline: boolean;
  onToggle: () => void;
  loading?: boolean;
}

export default function StatusToggle({
  isOnline,
  onToggle,
  loading = false,
}: StatusToggleProps) {
  return (
    <View className="bg-white rounded-3xl p-6 shadow-md">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View
            className={`w-14 h-14 rounded-2xl items-center justify-center ${
              isOnline ? "bg-[#D1FAE5]" : "bg-[#FEE2E2]"
            }`}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={isOnline ? "#10B981" : "#EF4444"}
              />
            ) : (
              <Ionicons
                name={isOnline ? "checkmark-circle" : "close-circle"}
                size={28}
                color={isOnline ? "#10B981" : "#EF4444"}
              />
            )}
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-bold text-[#1A1A1A] mb-1">
              {isOnline ? "You're Online" : "You're Offline"}
            </Text>
            <Text className="text-sm text-[#7A7A7A]">
              {isOnline
                ? "Ready to accept orders"
                : "Go online to start receiving orders"}
            </Text>
          </View>
        </View>
        <Switch
          value={isOnline}
          onValueChange={onToggle}
          trackColor={{ false: "#E5E5E5", true: "#FFB380" }}
          thumbColor={isOnline ? "#FF6A00" : "#FFFFFF"}
          ios_backgroundColor="#E5E5E5"
          disabled={loading}
        />
      </View>

      {isOnline && (
        <View className="mt-4 pt-4 border-t border-[#F0F0F0] flex-row items-center">
          <View className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
          <Text className="text-sm text-[#10B981] font-medium ml-2">
            Active - Waiting for orders
          </Text>
        </View>
      )}
    </View>
  );
}
