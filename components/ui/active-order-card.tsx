import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface ActiveOrderCardProps {
  order: {
    id: string;
    restaurantName: string;
    customerName: string;
    deliveryAddress: string;
    orderValue: number;
    status: "accepted" | "picked_up" | "delivering";
    estimatedTime: string;
  };
  onViewDetails?: () => void;
}

export default function ActiveOrderCard({
  order,
  onViewDetails,
}: ActiveOrderCardProps) {
  const getStatusInfo = () => {
    switch (order.status) {
      case "accepted":
        return {
          text: "Order Accepted",
          icon: "checkmark-circle" as const,
          color: "#3B82F6",
          bgColor: "#DBEAFE",
        };
      case "picked_up":
        return {
          text: "Picked Up",
          icon: "bag-check" as const,
          color: "#F59E0B",
          bgColor: "#FEF3C7",
        };
      case "delivering":
        return {
          text: "On the Way",
          icon: "bicycle" as const,
          color: "#10B981",
          bgColor: "#D1FAE5",
        };
    }
  };

  const statusInfo = getStatusInfo()!;

  return (
    <TouchableOpacity
      onPress={onViewDetails}
      activeOpacity={0.8}
      className="bg-white rounded-3xl shadow-md overflow-hidden"
    >
      {/* Status Header */}
      <View
        className="px-5 py-3 flex-row items-center justify-between"
        style={{ backgroundColor: statusInfo.bgColor }}
      >
        <View className="flex-row items-center">
          <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
          <Text
            className="text-sm font-bold ml-2"
            style={{ color: statusInfo.color }}
          >
            {statusInfo.text}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color={statusInfo.color} />
          <Text
            className="text-sm font-semibold ml-1"
            style={{ color: statusInfo.color }}
          >
            {order.estimatedTime}
          </Text>
        </View>
      </View>

      {/* Order Details */}
      <View className="p-5">
        <View className="mb-4">
          <Text className="text-xs text-[#7A7A7A] mb-1">ORDER ID</Text>
          <Text className="text-sm font-bold text-[#1A1A1A]">#{order.id}</Text>
        </View>

        {/* Restaurant */}
        <View className="flex-row items-start mb-4">
          <View className="w-10 h-10 bg-[#FFF5EB] rounded-xl items-center justify-center">
            <Ionicons name="restaurant" size={20} color="#FF6A00" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-xs text-[#7A7A7A] mb-0.5">PICK UP FROM</Text>
            <Text className="text-base font-bold text-[#1A1A1A]">
              {order.restaurantName}
            </Text>
          </View>
        </View>

        {/* Delivery Info */}
        <View className="flex-row items-start mb-4">
          <View className="w-10 h-10 bg-[#D1FAE5] rounded-xl items-center justify-center">
            <Ionicons name="location" size={20} color="#10B981" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-xs text-[#7A7A7A] mb-0.5">DELIVER TO</Text>
            <Text className="text-base font-bold text-[#1A1A1A] mb-1">
              {order.customerName}
            </Text>
            <Text className="text-sm text-[#7A7A7A]" numberOfLines={2}>
              {order.deliveryAddress}
            </Text>
          </View>
        </View>

        {/* Order Value */}
        <View className="bg-[#F9FAFB] rounded-2xl p-4 flex-row items-center justify-between">
          <Text className="text-sm text-[#7A7A7A]">Order Value</Text>
          <Text className="text-xl font-bold text-[#1A1A1A]">
            ₹{order.orderValue.toFixed(2)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
