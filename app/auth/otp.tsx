import PrimaryButton from "@/components/ui/primary-button";
import { useWhatsAppAuth } from "@/hooks/use-whatsapp-auth";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface OtpBoxProps {
  digit: string;
  isFocused: boolean;
}

function OtpBox({ digit, isFocused }: OtpBoxProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (digit) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [digit]);

  return (
    <Animated.View
      className="w-12 h-14 md:w-14 md:h-16 rounded-2xl border-2 items-center justify-center"
      style={{
        backgroundColor: isFocused ? "#FFF" : "#F8F8F8",
        borderColor: isFocused ? "#FF6A00" : digit ? "#FF6A00" : "#E5E5E5",
        transform: [{ scale }],
      }}
    >
      <Text className="text-2xl font-bold text-[#1A1A1A]">{digit || ""}</Text>
    </Animated.View>
  );
}

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phoneNumber = params.phoneNumber as string;

  const { sendOtp, verifyOtp, loading, error, clearError } = useWhatsAppAuth();
  const { setAuthenticated, getNavigationRoute } = useAuthStore();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  // A single string state holds the entire OTP
  const [otp, setOtp] = useState("");
  const inputRef = useRef<TextInput>(null);
  const [isInputFocused, setIsInputFocused] = useState(true);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;

    try {
      clearError();
      console.log("🔐 [OTP] Verifying OTP...");

      // Verify OTP with WhatsApp backend
      const response = await verifyOtp(phoneNumber, otp);

      if (response.success && response.data) {
        console.log("✅ [OTP] Verification successful:", {
          deliveryPartnerId: response.data.deliveryPartnerId,
          onboardingStatus: response.data.onboardingStatus,
          onboardingProgress: response.data.onboardingProgress,
          isApproved: response.data.isApproved,
          profileComplete: response.data.profileComplete,
        });

        const formattedPhone = `+91${phoneNumber}`;

        // Store full authentication data including onboarding status
        await setAuthenticated(
          true,
          response.data.deliveryPartnerId,
          formattedPhone,
          response.data.token,
          response.data.onboardingStatus,
          response.data.onboardingProgress,
          response.data.isApproved || false,
        );

        // Get the correct navigation route based on state
        const route = getNavigationRoute();
        console.log("🧭 [OTP] Navigating to:", route);

        router.replace(route as any);
      } else {
        Alert.alert(
          "Verification Failed",
          response.message || "Failed to verify OTP. Please try again.",
        );
      }
    } catch (err: any) {
      console.error("❌ [OTP] Verification error:", err);
      Alert.alert("Error", err.message || "Invalid OTP. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      clearError();
      console.log("📤 [OTP] Resending OTP...");
      const success = await sendOtp(phoneNumber);

      if (success) {
        setResendTimer(30);
        setOtp("");
        inputRef.current?.focus();
        Alert.alert("Success", "OTP sent successfully!");
      } else if (error) {
        Alert.alert("Error", error);
      }
    } catch (err: any) {
      console.error("❌ [OTP] Resend error:", err);
      Alert.alert("Error", err.message || "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  const handlePressOtpContainer = () => {
    inputRef.current?.focus();
  };

  // Convert the OTP string into an array of 6 elements for rendering
  const otpArray = otp.split("");
  const codeLength = new Array(6).fill("");

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-12">
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-12 h-12 bg-[#F8F8F8] rounded-full items-center justify-center mb-8"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>

            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-[#1A1A1A] mb-3">
                Verify OTP
              </Text>
              <Text className="text-base text-[#7A7A7A]">
                Enter the 6-digit code sent to{"\n"}
                <Text className="font-semibold text-[#1A1A1A]">
                  +91 {phoneNumber}
                </Text>
              </Text>
            </View>

            {/* OTP Input Container */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={handlePressOtpContainer}
              className="flex-row justify-between mb-8"
            >
              {codeLength.map((_, index) => {
                const digit = otpArray[index] || "";
                // The active box is the one right after the current input length
                // Unless the input is full (length === 6), then no box is heavily highlighted
                const isCurrentIndex = otp.length === index;
                const isFocused = isInputFocused && isCurrentIndex;

                return (
                  <OtpBox key={index} digit={digit} isFocused={isFocused} />
                );
              })}

              {/* HIDDEN INVISIBLE TEXT INPUT TO CAPTURE ALL TYPING/PASTING */}
              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={(text) => {
                  // Keep only digits and slice to max length
                  const cleanText = text.replace(/[^0-9]/g, "");
                  setOtp(cleanText.slice(0, 6));
                }}
                maxLength={6}
                keyboardType="number-pad"
                returnKeyType="done"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                autoFocus={true}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                }}
              />
            </TouchableOpacity>

            {/* Resend OTP */}
            <View className="flex-row items-center justify-center mb-8">
              {resendTimer > 0 ? (
                <Text className="text-sm text-[#7A7A7A]">
                  Resend OTP in{" "}
                  <Text className="font-semibold text-[#FF6A00]">
                    {resendTimer}s
                  </Text>
                </Text>
              ) : resendLoading ? (
                <Text className="text-sm text-[#7A7A7A]">Sending...</Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResendOtp}
                  activeOpacity={0.7}
                  disabled={resendLoading}
                >
                  <Text className="text-sm font-semibold text-[#FF6A00]">
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Verify Button */}
            <PrimaryButton
              title="Verify & Continue"
              onPress={handleVerifyOtp}
              loading={loading}
              disabled={otp.length !== 6}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
