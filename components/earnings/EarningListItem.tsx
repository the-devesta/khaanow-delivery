import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface EarningListItemProps {
  date: string;
  amount: number;
  orderCount: number;
  onPress?: () => void;
}

export default function EarningListItem({
  date,
  amount,
  orderCount,
  onPress,
}: EarningListItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-white rounded-3xl p-4 mb-3 border border-gray-100 flex-row items-center justify-between ">
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 bg-[#FFFBEB] rounded-xl items-center justify-center border border-amber-100">
          <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-[#1A1A1A] mb-0.5">
            {date}
          </Text>
          <Text className="text-xs font-medium text-[#6B7280]">
            {orderCount} {orderCount === 1 ? "delivery" : "deliveries"}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="items-end">
          <Text className="text-base font-extrabold text-[#10B981]">
            ₹{(amount || 0).toLocaleString()}
          </Text>
          <Text className="text-[10px] text-[#9CA3AF] font-medium">earned</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );
}
