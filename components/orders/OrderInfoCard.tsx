import { Ionicons } from "@expo/vector-icons";
import { openPhoneDialer } from "@/utils/phone";
import { Text, TouchableOpacity, View } from "react-native";

interface OrderInfoCardProps {
  title: string;
  icon: string;
  iconBg: string;
  name: string;
  address: string | Record<string, any> | undefined | null;
  phone?: string;
  showCall?: boolean;
}

/** Safely convert address to a displayable string regardless of what the backend sends */
function formatAddress(
  address: string | Record<string, any> | undefined | null,
): string {
  if (!address) return "Address unavailable";
  if (typeof address === "string") return address || "Address unavailable";
  // Object form: { street, city, state, postalCode, fullAddress, ... }
  if (typeof address === "object") {
    const a = address as any;
    if (a.fullAddress) return a.fullAddress;
    const parts = [a.street, a.city, a.state, a.postalCode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Address unavailable";
  }
  return String(address);
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
      openPhoneDialer(phone);
    }
  };

  return (
    <View className="bg-white rounded-2xl p-4  border border-gray-100 mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className={`w-10 h-10 rounded-xl items-center justify-center `}
            style={{ backgroundColor: iconBg }}>
            <Ionicons name={icon as any} size={20} color="#FF6A00" />
          </View>
          <Text
            className="text-sm font-bold text-gray-900 ml-3"
            numberOfLines={1}>
            {title}
          </Text>
        </View>
        {showCall && phone && (
          <TouchableOpacity
            onPress={handleCall}
            className="w-10 h-10 bg-green-500 rounded-xl items-center justify-center "
            activeOpacity={0.7}>
            <Ionicons name="call" size={18} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <View className="pl-0">
        <Text
          className="text-sm font-semibold text-gray-900 mb-1.5"
          numberOfLines={1}>
          {name}
        </Text>
        <View className="flex-row items-start">
          <Ionicons
            name="location-outline"
            size={16}
            color="#6B7280"
            style={{ marginTop: 2, marginRight: 6 }}
          />
          <Text
            className="text-xs text-gray-600 flex-1 leading-4"
            numberOfLines={2}>
            {formatAddress(address)}
          </Text>
        </View>
        {phone && (
          <View className="flex-row items-center mt-1.5">
            <Ionicons
              name="call-outline"
              size={16}
              color="#6B7280"
              style={{ marginRight: 6 }}
            />
            <Text className="text-xs text-gray-600" numberOfLines={1}>
              {phone}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
