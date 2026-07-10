/**
 * PaymentOptionsModal
 * Shows bottom sheet with payment and delivery handoff options.
 * Handles: PREPAID delivery OTP, COD OTP, Payment Link, UPI QR
 */
import { Ionicons } from "@expo/vector-icons";
import {
  IOSGlassSurface,
  supportsLiquidGlass,
} from "@/components/ui/ios-liquid-glass";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CODOtpVerification from "./CODOtpVerification";
import PaymentLinkGenerator from "./PaymentLinkGenerator";
import UPIQRCodeView from "./UPIQRCodeView";

export type DeliveryPaymentType = "prepaid" | "cod" | "pay_at_delivery";

interface Props {
  visible: boolean;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string; // raw field from backend
  paymentStatus: string;
  onPaymentConfirmed: () => void;
  onClose: () => void;
}

const { height } = Dimensions.get("window");

type SubView = "menu" | "cod_otp" | "payment_link" | "upi_qr";

export default function PaymentOptionsModal({
  visible,
  orderId,
  orderNumber,
  totalAmount,
  paymentMethod,
  paymentStatus,
  onPaymentConfirmed,
  onClose,
}: Props) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const [subView, setSubView] = useState<SubView>("menu");

  // Determine payment type from order's paymentMethod field
  const payType: DeliveryPaymentType =
    paymentMethod === "cash"
      ? "cod"
      : paymentMethod === "razorpay" || paymentMethod === "online"
        ? "prepaid"
        : "pay_at_delivery";

  useEffect(() => {
    if (visible) {
      setSubView("menu");
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const animateKeyboard = (toValue: number, duration = 220) => {
      Animated.timing(keyboardOffset, {
        toValue,
        duration,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, (event) => {
      animateKeyboard(event.endCoordinates?.height || 0, event.duration || 220);
    });
    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      animateKeyboard(0, event.duration || 200);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const alreadyPaid =
    paymentStatus === "paid" ||
    paymentStatus === "completed" ||
    payType === "prepaid";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
      <Pressable
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={handleClose}
      />
      <Animated.View
        style={{
          position: "absolute",
          bottom: keyboardOffset,
          left: 0,
          right: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          transform: [{ translateY: slideAnim }],
        }}>
        <IOSGlassSurface
          shape="rect"
          cornerRadius={24}
          intensity={supportsLiquidGlass ? 40 : 0}
          fallbackBackgroundColor={
            supportsLiquidGlass ? "rgba(255,255,255,0.80)" : "#fff"
          }
          fallbackBorderColor="rgba(255,255,255,0.72)"
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 34,
          }}>
        {/* Handle + Header */}
        <View className="items-center pt-3 pb-4 px-6">
          <View className="w-10 h-1 bg-gray-200 rounded-full mb-4" />
          <View className="flex-row items-center justify-between w-full">
            {subView !== "menu" ? (
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setSubView("menu");
                }}
                hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color="#1F2937" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 22 }} />
            )}
            <Text className="text-lg font-bold text-gray-900">
              {subView === "menu"
                ? "Collect Payment"
                : subView === "cod_otp"
                  ? "Delivery Verification"
                  : subView === "payment_link"
                    ? "Payment Link"
                    : "UPI QR Code"}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount chip */}
        <View className="mx-6 mb-5 bg-gray-50 rounded-2xl p-4 flex-row items-center justify-between">
          <Text className="text-gray-500 font-medium">
            Order #{orderNumber.slice(-6)}
          </Text>
          <Text className="text-2xl font-bold text-gray-900">
            ₹{totalAmount}
          </Text>
        </View>

        {/* Content by sub-view */}
        {subView === "menu" && (
          <>
            {alreadyPaid ? (
              /* Already paid — still verify customer handoff with OTP */
              <View className="px-6">
                <View className="bg-green-50 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
                  <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                  <Text className="text-green-700 font-semibold flex-1">
                    {payType === "prepaid"
                      ? "Payment received online. Verify delivery OTP before completing."
                      : "Payment confirmed!"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSubView("cod_otp")}
                  className="bg-green-600 rounded-2xl py-4 items-center">
                  <Text className="text-white font-bold text-base">
                    Verify Delivery OTP
                  </Text>
                </TouchableOpacity>
              </View>
            ) : payType === "cod" ? (
              /* COD options — cash verification via OTP (mandatory), or offer digital payment alternatives */
              <View className="px-6 gap-3">
                <OptionButton
                  icon="cash-outline"
                  title="Verify Cash with OTP"
                  subtitle="Send OTP to customer to confirm cash receipt"
                  onPress={() => setSubView("cod_otp")}
                />
                <OptionButton
                  icon="qr-code-outline"
                  title="Accept UPI / QR Payment"
                  subtitle="Customer scans QR and pays digitally instead of cash"
                  onPress={() => setSubView("upi_qr")}
                />
                <OptionButton
                  icon="link-outline"
                  title="Send Payment Link"
                  subtitle="Customer taps a link to pay online via Razorpay"
                  onPress={() => setSubView("payment_link")}
                />
              </View>
            ) : (
              /* pay_at_delivery options */
              <View className="px-6 gap-3">
                <OptionButton
                  icon="link-outline"
                  title="Send Payment Link"
                  subtitle="Customer pays via Razorpay link on their phone"
                  onPress={() => setSubView("payment_link")}
                />
                <OptionButton
                  icon="qr-code-outline"
                  title="Show UPI QR Code"
                  subtitle="Customer scans QR and pays with any UPI app"
                  onPress={() => setSubView("upi_qr")}
                />
              </View>
            )}
          </>
        )}

        {subView === "cod_otp" && (
          <CODOtpVerification
            orderId={orderId}
            onVerified={() => {
              setSubView("menu");
              onPaymentConfirmed();
            }}
          />
        )}

        {subView === "payment_link" && (
          <PaymentLinkGenerator
            orderId={orderId}
            totalAmount={totalAmount}
            onPaymentConfirmed={() => {
              setSubView("menu");
              onPaymentConfirmed();
            }}
          />
        )}

        {subView === "upi_qr" && (
          <UPIQRCodeView
            orderId={orderId}
            totalAmount={totalAmount}
            onPaymentConfirmed={() => {
              setSubView("menu");
              onPaymentConfirmed();
            }}
          />
        )}
        </IOSGlassSurface>
      </Animated.View>
      </View>
    </Modal>
  );
}

function OptionButton({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex-row items-center gap-4">
      <View className="w-12 h-12 bg-orange-50 rounded-xl items-center justify-center">
        <Ionicons name={icon} size={22} color="#FF6A00" />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-gray-900 text-base">{title}</Text>
        <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}
