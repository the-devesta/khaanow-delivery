/**
 * CODOtpVerification
 * Handles the cash-on-delivery OTP flow:
 * 1. Driver taps "Send OTP" → backend generates OTP → customer sees it on tracking screen
 * 2. Customer reads OTP aloud → driver enters it here
 * 3. Tap "Verify" → backend validates → onVerified() called
 */
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { paymentService } from "../../services/paymentService";

interface Props {
  orderId: string;
  onVerified: () => void;
}

type Phase = "idle" | "sending" | "waiting" | "verifying" | "verified";
type OtpMethod = "app" | "whatsapp";

export default function CODOtpVerification({ orderId, onVerified }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sentMethod, setSentMethod] = useState<OtpMethod>("app");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSendOtp = async (method: OtpMethod) => {
    setPhase("sending");
    setSentMethod(method);
    setError("");
    try {
      await paymentService.sendCodOtp(orderId, method);
      setPhase("waiting");
      setTimeout(() => inputRef.current?.focus(), 300);
    } catch (e: any) {
      setError(e?.message || "Failed to send OTP. Please try again.");
      setPhase("idle");
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP shared by the customer.");
      return;
    }
    setPhase("verifying");
    setError("");
    try {
      await paymentService.verifyCodOtp(orderId, otp);
      setPhase("verified");
      setTimeout(onVerified, 800);
    } catch (e: any) {
      setError(
        e?.message || "OTP is incorrect or expired. Ask the customer to check.",
      );
      setPhase("waiting");
    }
  };

  if (phase === "verified") {
    return (
      <View className="px-6 py-6 items-center gap-3">
        <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-2">
          <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
        </View>
        <Text className="text-xl font-bold text-gray-900">Verified!</Text>
        <Text className="text-gray-500 text-center">
          Cash payment confirmed. Completing order…
        </Text>
      </View>
    );
  }

  return (
    <View className="px-6">
      {/* Instruction card */}
      <View className="bg-orange-50 rounded-2xl p-4 mb-5 flex-row gap-3">
        <Ionicons name="information-circle-outline" size={20} color="#FF6A00" />
        <Text className="flex-1 text-orange-700 text-sm leading-5">
          {phase === "idle" || phase === "sending"
            ? "Choose how to send the OTP to the customer. They need to share it with you to confirm cash receipt."
            : sentMethod === "whatsapp"
              ? "OTP sent to customer's WhatsApp. Ask them to read it out to you."
              : "OTP sent to the customer's order tracking screen. Ask them to read it out to you."}
        </Text>
      </View>

      {/* Send OTP buttons — shown in idle/sending phase */}
      {(phase === "idle" || phase === "sending") && (
        <View className="gap-3 mb-3">
          <TouchableOpacity
            onPress={() => handleSendOtp("app")}
            disabled={phase === "sending"}
            activeOpacity={0.8}
            className="bg-orange-500 rounded-2xl py-4 flex-row items-center justify-center gap-2">
            {phase === "sending" && sentMethod === "app" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name="phone-portrait-outline"
                  size={18}
                  color="white"
                />
                <Text className="text-white font-bold text-base">
                  Send to App
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSendOtp("whatsapp")}
            disabled={phase === "sending"}
            activeOpacity={0.8}
            className="bg-green-600 rounded-2xl py-4 flex-row items-center justify-center gap-2">
            {phase === "sending" && sentMethod === "whatsapp" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="logo-whatsapp" size={18} color="white" />
                <Text className="text-white font-bold text-base">
                  Send via WhatsApp
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* OTP input (shown after send) */}
      {(phase === "waiting" || phase === "verifying") && (
        <>
          <View className="bg-green-50 rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2">
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#16A34A"
            />
            <Text className="text-green-700 font-medium text-sm">
              OTP sent to customer
            </Text>
          </View>

          <Text className="text-sm font-medium text-gray-700 mb-2">
            Enter OTP from customer
          </Text>
          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={(v) => {
              setOtp(v.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="• • • • • •"
            placeholderTextColor="#D1D5DB"
            className="border border-gray-200 rounded-2xl text-center text-2xl font-bold tracking-widest text-gray-900 py-4 mb-3"
          />

          {error ? (
            <View className="flex-row items-center gap-1 mb-3">
              <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
              <Text className="text-red-500 text-sm flex-1">{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleVerify}
            disabled={otp.length !== 6 || phase === "verifying"}
            activeOpacity={0.8}
            className={`rounded-2xl py-4 items-center ${otp.length === 6 ? "bg-green-600" : "bg-gray-200"}`}>
            {phase === "verifying" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text
                className={`font-bold text-base ${otp.length === 6 ? "text-white" : "text-gray-400"}`}>
                Verify OTP
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSendOtp(sentMethod)}
            className="mt-3 items-center py-2">
            <Text className="text-orange-500 font-medium text-sm">
              Resend OTP
            </Text>
          </TouchableOpacity>
        </>
      )}

      {(phase === "idle" || phase === "sending") && error ? (
        <Text className="text-red-500 text-sm text-center mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
