import { Colors } from "@/constants/colors";
import React from "react";
import { Switch, Text, View } from "react-native";

interface ToggleOnlineSwitchProps {
  isOnline: boolean;
  onToggle: (value: boolean) => void;
}

export default function ToggleOnlineSwitch({
  isOnline,
  onToggle,
}: ToggleOnlineSwitchProps) {
  return (
    <View className="bg-white rounded-2xl p-4 shadow-md flex-row items-center justify-between">
      <View>
        <Text className="text-lg font-bold text-[#1A1A1A]">
          {isOnline ? "You're Online" : "You're Offline"}
        </Text>
        <Text className="text-sm text-[#7A7A7A] mt-1">
          {isOnline ? "Ready to receive orders" : "Not accepting orders"}
        </Text>
      </View>

      <Switch
        value={isOnline}
        onValueChange={onToggle}
        trackColor={{ false: "#E5E5E5", true: Colors.primary }}
        thumbColor={Colors.white}
        ios_backgroundColor="#E5E5E5"
      />
    </View>
  );
}
