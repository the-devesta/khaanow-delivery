import DeliveryMap from "@/components/map/DeliveryMap";
import ActionFooter from "@/components/orders/ActionFooter";
import OrderInfoCard from "@/components/orders/OrderInfoCard";
import ProgressTracker from "@/components/orders/ProgressTracker";
import { useOrderStore } from "@/store/orders";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STEPS = [
  { label: "Pickup", icon: "restaurant-outline" },
  { label: "On the Way", icon: "bicycle-outline" },
  { label: "Delivered", icon: "checkmark-circle-outline" },
];

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    activeOrder,
    orderHistory,
    updateOrderStatus,
    completeOrder,
    driverLocation,
    simulateDriverMovement,
  } = useOrderStore();
  const [loading, setLoading] = useState(false);

  // Find order from either active or history
  const order =
    activeOrder?.id === id
      ? activeOrder
      : orderHistory.find((o) => o.id === id);

  const isActiveOrder = activeOrder?.id === id;

  useEffect(() => {
    if (!isActiveOrder) return;

    const interval = setInterval(() => {
      simulateDriverMovement();
    }, 2000);

    return () => clearInterval(interval);
  }, [isActiveOrder, simulateDriverMovement]);

  if (!order) {
    router.back();
    return null;
  }

  const getCurrentStep = () => {
    switch (order.status) {
      case "accepted":
        return 1;
      case "picked_up":
        return 2;
      case "on_the_way":
        return 2;
      case "delivered":
        return 3;
      default:
        return 1;
    }
  };

  const getActionLabel = () => {
    switch (order.status) {
      case "accepted":
        return "Mark as Picked Up";
      case "picked_up":
        return "Start Delivery";
      case "on_the_way":
        return "Order Delivered";
      default:
        return "Continue";
    }
  };

  const handleAction = async () => {
    if (!isActiveOrder) return;

    setLoading(true);

    try {
      switch (order.status) {
        case "accepted":
          await updateOrderStatus("picked_up");
          Alert.alert("Success", "Order marked as picked up!");
          break;
        case "picked_up":
          await updateOrderStatus("on_the_way");
          Alert.alert("Success", "Delivery started!");
          break;
        case "on_the_way":
          completeOrder();
          Alert.alert("Success", "Order delivered successfully!", [
            { text: "OK", onPress: () => router.replace("/(tabs)") },
          ]);
          break;
      }
    } catch (error) {
      console.error("Update order status error:", error);
      Alert.alert("Error", "Failed to update order status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentStep = getCurrentStep();

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="flex-1">
        {/* Header */}
        <View className="bg-white px-5 pt-16 pb-5 flex-row items-center justify-between shadow-sm">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-[#F9FAFB] rounded-full items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-[#1A1A1A]">
            Order #{order.id.slice(-6)}
          </Text>
          <View className="w-10" />
        </View>

        {/* Map - Half Screen */}
        <View className="h-[45%]">
          <DeliveryMap
            driverLocation={driverLocation}
            pickupLocation={order.pickupLocation}
            dropLocation={order.dropLocation}
            showRoute={order.status !== "accepted"}
          />
        </View>

        {/* Progress Tracker */}
        <ProgressTracker currentStep={currentStep} steps={STEPS} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="px-5 pt-5">
            {/* Restaurant Info */}
            <OrderInfoCard
              title="Pickup Location"
              icon="restaurant"
              iconBg="#FFF5EB"
              name={order.restaurantName}
              address={order.restaurantAddress}
            />

            {/* Customer Info */}
            <OrderInfoCard
              title="Drop Location"
              icon="location"
              iconBg="#D1FAE5"
              name={order.customerName}
              address={order.customerAddress}
              phone={order.customerPhone}
              showCall
            />

            {/* Order Items */}
            <View className="bg-white rounded-3xl p-5 shadow-sm mb-4">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-[#DBEAFE] rounded-xl items-center justify-center">
                  <Ionicons name="fast-food" size={20} color="#3B82F6" />
                </View>
                <Text className="text-base font-bold text-[#1A1A1A] ml-3">
                  Order Items
                </Text>
              </View>
              {order.items.map((item, index) => (
                <View
                  key={index}
                  className="flex-row justify-between py-2 border-b border-[#F3F4F6]"
                >
                  <Text className="text-sm text-[#6B7280]">
                    {item.name} x {item.quantity}
                  </Text>
                </View>
              ))}
            </View>

            {/* Payment & Earnings */}
            <View className="bg-white rounded-3xl p-5 shadow-sm mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-[#FEF3C7] rounded-xl items-center justify-center">
                    <Ionicons name="wallet" size={20} color="#F59E0B" />
                  </View>
                  <Text className="text-base font-bold text-[#1A1A1A] ml-3">
                    Payment Details
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between py-2 border-b border-[#F3F4F6]">
                <Text className="text-sm text-[#6B7280]">Payment Type</Text>
                <Text className="text-sm font-semibold text-[#1A1A1A] uppercase">
                  {order.paymentType}
                </Text>
              </View>
              <View className="flex-row justify-between py-2 border-b border-[#F3F4F6]">
                <Text className="text-sm text-[#6B7280]">Distance</Text>
                <Text className="text-sm font-semibold text-[#1A1A1A]">
                  {order.distance} km
                </Text>
              </View>
              <View className="flex-row justify-between pt-3">
                <Text className="text-base font-bold text-[#1A1A1A]">
                  Your Earnings
                </Text>
                <Text className="text-lg font-bold text-[#10B981]">
                  ₹{order.earnings}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Footer - Only show for active orders */}
        {isActiveOrder && (
          <ActionFooter
            label={getActionLabel()}
            onPress={handleAction}
            loading={loading}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
