import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";

interface OrderInfoCardProps {
  title: string;
  icon: string;
  iconBg: string;
  name: string;
  address: string;
  phone?: string;
  showCall?: boolean;
}

export default function OrderInfoCard({
  title,
  icon,
  iconBg,
  name,
  address,
  phone,
  showCall = false,
}: OrderInfoCardProps) {
  const handleCall = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View
            className={`w-10 h-10 rounded-xl items-center justify-center`}
            style={{ backgroundColor: iconBg }}
          >
            <Ionicons name={icon as any} size={20} color="#FF6A00" />
          </View>
          <Text className="text-base font-bold text-[#1A1A1A] ml-3">
            {title}
          </Text>
        </View>
        {showCall && phone && (
          <TouchableOpacity
            onPress={handleCall}
            className="w-10 h-10 bg-[#10B981] rounded-full items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={18} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <View className="pl-13">
        <Text className="text-base font-semibold text-[#1A1A1A] mb-1">
          {name}
        </Text>
        <View className="flex-row items-start">
          <Ionicons
            name="location-outline"
            size={16}
            color="#6B7280"
            style={{ marginTop: 2, marginRight: 4 }}
          />
          <Text className="text-sm text-[#6B7280] flex-1 leading-5">
            {address}
          </Text>
        </View>
        {phone && (
          <View className="flex-row items-center mt-2">
            <Ionicons
              name="call-outline"
              size={16}
              color="#6B7280"
              style={{ marginRight: 4 }}
            />
            <Text className="text-sm text-[#6B7280]">{phone}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
