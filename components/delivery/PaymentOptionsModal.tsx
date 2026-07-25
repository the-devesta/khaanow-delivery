/**
 * PaymentOptionsModal
 * Shows bottom sheet with payment and delivery handoff options.
 * Handles: PREPAID delivery OTP, COD OTP, Payment Link, UPI QR
 */
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
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

type SubView = "menu" | "cod_otp" | "payment_link" | "upi_qr";

export type PaymentOptionsModalHandle = {
  present: () => void;
  dismiss: () => void;
};

const debugPaymentSheet = (message: string, details?: Record<string, unknown>) => {
  if (__DEV__) {
    console.log(`[PaymentSheetDebug] ${message}`, details ?? "");
  }
};

function PaymentOptionsModal(
  {
    visible,
    orderId,
    orderNumber,
    totalAmount,
    paymentMethod,
    paymentStatus,
    onPaymentConfirmed,
    onClose,
  }: Props,
  ref: React.ForwardedRef<PaymentOptionsModalHandle>,
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const closingRef = useRef(false);
  const [subView, setSubView] = useState<SubView>("menu");
  const snapPoints = useMemo(
    () => (subView === "menu" ? ["58%", "82%"] : ["72%", "94%"]),
    [subView],
  );

  // Determine payment type from order's paymentMethod field.
  // Backend values are not perfectly consistent across old/new orders:
  // examples seen: COD, cash, online, razorpay, pay_at_delivery.
  const normalizedPaymentMethod = paymentMethod?.toLowerCase?.().trim() ?? "";
  const payType: DeliveryPaymentType =
    ["cod", "cash", "cash_on_delivery", "pay_on_delivery"].includes(
      normalizedPaymentMethod,
    )
      ? "cod"
      : ["razorpay", "online", "prepaid", "paid_online"].includes(
            normalizedPaymentMethod,
          )
        ? "prepaid"
        : "pay_at_delivery";

  const handleClose = () => {
    debugPaymentSheet("modal close button pressed", {
      orderId,
      orderNumber,
    });
    Keyboard.dismiss();
    closingRef.current = true;
    sheetRef.current?.dismiss();
  };

  const handleDismiss = useCallback(() => {
    debugPaymentSheet("modal dismissed", {
      orderId,
      orderNumber,
      visible,
      closing: closingRef.current,
    });
    Keyboard.dismiss();
    if (visible || closingRef.current) {
      closingRef.current = false;
      onClose();
    }
  }, [onClose, visible, orderId, orderNumber]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const alreadyPaid =
    paymentStatus === "paid" ||
    paymentStatus === "completed" ||
    payType === "prepaid";

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        debugPaymentSheet("imperative present", {
          orderId,
          orderNumber,
          paymentMethod,
          paymentStatus,
          payType,
          visible,
        });
        Keyboard.dismiss();
        closingRef.current = false;
        setSubView("menu");
        sheetRef.current?.present();
      },
      dismiss: () => {
        debugPaymentSheet("imperative dismiss", {
          orderId,
          orderNumber,
        });
        closingRef.current = true;
        sheetRef.current?.dismiss();
      },
    }),
    [orderId, orderNumber, paymentMethod, paymentStatus, payType, visible],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: "#FFFFFF", borderRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: "#D1D5DB", width: 42 }}
      onChange={(index) =>
        debugPaymentSheet("bottom sheet index changed", {
          orderId,
          orderNumber,
          index,
        })
      }
      onDismiss={handleDismiss}>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 34 }}>
        {/* Handle + Header */}
        <View className="items-center pt-1 pb-4 px-6">
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
                  onPress={() => {
                    debugPaymentSheet("option selected", {
                      orderId,
                      orderNumber,
                      option: "cod_otp",
                    });
                    setSubView("cod_otp");
                  }}
                />
                <OptionButton
                  icon="qr-code-outline"
                  title="Accept UPI / QR Payment"
                  subtitle="Customer scans QR and pays digitally instead of cash"
                  onPress={() => {
                    debugPaymentSheet("option selected", {
                      orderId,
                      orderNumber,
                      option: "upi_qr",
                    });
                    setSubView("upi_qr");
                  }}
                />
                <OptionButton
                  icon="link-outline"
                  title="Send Payment Link"
                  subtitle="Customer taps a link to pay online via Razorpay"
                  onPress={() => {
                    debugPaymentSheet("option selected", {
                      orderId,
                      orderNumber,
                      option: "payment_link",
                    });
                    setSubView("payment_link");
                  }}
                />
              </View>
            ) : (
              /* pay_at_delivery options */
              <View className="px-6 gap-3">
                <OptionButton
                  icon="link-outline"
                  title="Send Payment Link"
                  subtitle="Customer pays via Razorpay link on their phone"
                  onPress={() => {
                    debugPaymentSheet("option selected", {
                      orderId,
                      orderNumber,
                      option: "payment_link",
                    });
                    setSubView("payment_link");
                  }}
                />
                <OptionButton
                  icon="qr-code-outline"
                  title="Show UPI QR Code"
                  subtitle="Customer scans QR and pays with any UPI app"
                  onPress={() => {
                    debugPaymentSheet("option selected", {
                      orderId,
                      orderNumber,
                      option: "upi_qr",
                    });
                    setSubView("upi_qr");
                  }}
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
      </BottomSheetScrollView>
    </BottomSheetModal>
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

export default forwardRef<PaymentOptionsModalHandle, Props>(PaymentOptionsModal);
