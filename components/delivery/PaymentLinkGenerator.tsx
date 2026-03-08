/**
 * PaymentLinkGenerator
 * Generates a Razorpay payment link, shows it to the driver,
 * and polls until the customer pays.
 */
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { paymentService } from "../../services/paymentService";
import { socketService } from "../../services/socket";

interface Props {
  orderId: string;
  totalAmount: number;
  onPaymentConfirmed: () => void;
}

type Phase = "idle" | "generating" | "waiting" | "paid";

const POLL_INTERVAL_MS = 5000;

export default function PaymentLinkGenerator({
  orderId,
  totalAmount,
  onPaymentConfirmed,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  // Listen for webhook-triggered payment-confirmed socket event.
  useEffect(() => {
    const handler = (data: { orderId: string; paymentStatus: string }) => {
      if (data.orderId !== orderId) return;
      stopPolling();
      setPhase("paid");
      setTimeout(onPaymentConfirmed, 800);
    };
    socketService.on("payment-confirmed", handler);
    return () => socketService.off("payment-confirmed", handler);
  }, [orderId, onPaymentConfirmed]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const result = await paymentService.checkPaymentStatus(orderId);
        if (result.paid) {
          stopPolling();
          setPhase("paid");
          setTimeout(onPaymentConfirmed, 800);
        }
      } catch {
        // continue polling silently
      }
    }, POLL_INTERVAL_MS);
  }, [orderId, onPaymentConfirmed]);

  const handleGenerate = async () => {
    setPhase("generating");
    setError("");
    try {
      const result = await paymentService.generatePaymentLink(orderId);
      setPaymentUrl(result.paymentLinkUrl);
      setPhase("waiting");
      startPolling();
    } catch (e: any) {
      setError(e?.message || "Failed to generate link. Please try again.");
      setPhase("idle");
    }
  };

  const handleShare = async () => {
    if (!paymentUrl) return;
    try {
      await Share.share({
        message: `Please pay ₹${totalAmount} for your KhaaoNow order: ${paymentUrl}`,
        url: paymentUrl,
      });
    } catch {}
  };

  if (phase === "paid") {
    return (
      <View className="px-6 py-6 items-center gap-3">
        <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-2">
          <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
        </View>
        <Text className="text-xl font-bold text-gray-900">
          Payment Received!
        </Text>
        <Text className="text-gray-500 text-center">
          Completing your delivery…
        </Text>
      </View>
    );
  }

  return (
    <View className="px-6">
      {phase === "idle" && (
        <>
          <View className="bg-blue-50 rounded-2xl p-4 mb-5 flex-row gap-3">
            <Ionicons name="link-outline" size={20} color="#3B82F6" />
            <Text className="flex-1 text-blue-700 text-sm leading-5">
              Generate a Razorpay payment link and share it with the customer.
              They can pay via card, UPI, netbanking, or wallet.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleGenerate}
            activeOpacity={0.8}
            className="bg-blue-600 rounded-2xl py-4 items-center">
            <Text className="text-white font-bold text-base">
              Generate Payment Link
            </Text>
          </TouchableOpacity>
          {error ? (
            <Text className="text-red-500 text-sm text-center mt-3">
              {error}
            </Text>
          ) : null}
        </>
      )}

      {phase === "generating" && (
        <View className="items-center py-8 gap-3">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-500">Creating payment link…</Text>
        </View>
      )}

      {phase === "waiting" && paymentUrl && (
        <>
          {/* URL display */}
          <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-4">
            <Text className="text-xs font-medium text-gray-500 mb-1">
              Payment Link
            </Text>
            <Text
              className="text-blue-600 text-sm font-medium"
              numberOfLines={2}
              ellipsizeMode="middle">
              {paymentUrl}
            </Text>
          </View>

          {/* Action row */}
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.8}
              className="flex-1 bg-blue-600 rounded-xl py-3 flex-row items-center justify-center gap-2">
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text className="text-white font-semibold text-sm">
                Share Link
              </Text>
            </TouchableOpacity>
          </View>

          {/* Polling status */}
          <View className="bg-orange-50 rounded-2xl p-4 flex-row items-center gap-3">
            <ActivityIndicator size="small" color="#FF6A00" />
            <Text className="flex-1 text-orange-700 text-sm">
              Waiting for customer payment… This refreshes automatically.
            </Text>
          </View>

          <TouchableOpacity
            onPress={async () => {
              stopPolling();
              const result = await paymentService.checkPaymentStatus(orderId);
              if (result.paid) {
                setPhase("paid");
                setTimeout(onPaymentConfirmed, 800);
              } else {
                startPolling();
              }
            }}
            className="mt-3 items-center py-2">
            <Text className="text-orange-500 font-medium text-sm">
              Check Now
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
