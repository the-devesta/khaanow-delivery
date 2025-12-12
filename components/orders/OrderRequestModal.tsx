import { Order } from "@/store/orders";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");
const SWIPE_THRESHOLD = 150;

interface OrderRequestModalProps {
  order: Order | null;
  onAccept: () => void;
  onReject: () => void;
}

export default function OrderRequestModal({
  order,
  onAccept,
  onReject,
}: OrderRequestModalProps) {
  const visible = order !== null;
  const [timeLeft, setTimeLeft] = useState(20);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setTimeLeft(20);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, pulseAnim]);

  useEffect(() => {
    if (!visible || !order) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, order, onReject]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx < SWIPE_THRESHOLD + 50) {
          swipeAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= SWIPE_THRESHOLD) {
          Animated.timing(swipeAnim, {
            toValue: width,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onAccept();
            swipeAnim.setValue(0);
          });
        } else {
          Animated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View className="flex-1 bg-black/50">
        <Animated.View
          className="flex-1 justify-end"
          style={{ transform: [{ translateY: slideAnim }] }}
        >
          <View className="bg-white rounded-t-[40px] px-6 pt-8 pb-6">
            {/* Timer */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 rounded-full bg-[#FFF5EB] items-center justify-center mb-3">
                <Text className="text-3xl font-bold text-[#FF6A00]">
                  {timeLeft}
                </Text>
              </View>
              <Text className="text-lg font-bold text-[#1A1A1A]">
                New Order Request
              </Text>
              <Text className="text-sm text-[#6B7280] mt-1">
                Accept within {timeLeft} seconds
              </Text>
            </View>

            {/* Order Info */}
            <View className="bg-[#FAFAFA] rounded-2xl p-4 mb-5">
              {/* Restaurant */}
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 bg-[#FFF5EB] rounded-xl items-center justify-center">
                  <Ionicons name="restaurant" size={20} color="#FF6A00" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-[#6B7280] mb-1">Pickup</Text>
                  <Text className="text-base font-bold text-[#1A1A1A]">
                    {order.restaurantName}
                  </Text>
                  <Text className="text-xs text-[#6B7280]" numberOfLines={1}>
                    {order.restaurantAddress}
                  </Text>
                </View>
              </View>

              <View className="h-px bg-[#E5E7EB] my-3" />

              {/* Customer */}
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-[#D1FAE5] rounded-xl items-center justify-center">
                  <Ionicons name="location" size={20} color="#10B981" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-[#6B7280] mb-1">Drop</Text>
                  <Text className="text-base font-bold text-[#1A1A1A]">
                    {order.customerName}
                  </Text>
                  <Text className="text-xs text-[#6B7280]" numberOfLines={1}>
                    {order.customerAddress}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row mb-6">
              <View className="flex-1 bg-[#FAFAFA] rounded-2xl p-4 mr-2">
                <Text className="text-xs text-[#6B7280] mb-1">Distance</Text>
                <Text className="text-lg font-bold text-[#1A1A1A]">
                  {order.distance} km
                </Text>
              </View>
              <View className="flex-1 bg-[#FAFAFA] rounded-2xl p-4 mx-1">
                <Text className="text-xs text-[#6B7280] mb-1">Time</Text>
                <Text className="text-lg font-bold text-[#1A1A1A]">
                  {order.estimatedTime}
                </Text>
              </View>
              <View className="flex-1 bg-[#D1FAE5] rounded-2xl p-4 ml-2">
                <Text className="text-xs text-[#10B981] mb-1">Earnings</Text>
                <Text className="text-lg font-bold text-[#10B981]">
                  ₹{order.earnings}
                </Text>
              </View>
            </View>

            {/* Swipe to Accept */}
            <View className="bg-[#FFF5EB] rounded-full h-16 mb-4 overflow-hidden">
              <Animated.View
                {...panResponder.panHandlers}
                className="absolute left-1 top-1 bottom-1 w-14 bg-[#FF6A00] rounded-full items-center justify-center"
                style={{
                  transform: [{ translateX: swipeAnim }, { scale: pulseAnim }],
                }}
              >
                <Ionicons name="chevron-forward" size={24} color="white" />
              </Animated.View>
              <View className="flex-1 items-center justify-center">
                <Text className="text-base font-bold text-[#FF6A00]">
                  Swipe to Accept →
                </Text>
              </View>
            </View>

            {/* Reject Button */}
            <TouchableOpacity
              onPress={onReject}
              className="bg-[#FEE2E2] rounded-full py-4 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-base font-bold text-[#EF4444]">
                Reject Order
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
