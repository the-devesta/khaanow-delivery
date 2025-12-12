import PrimaryButton from "@/components/ui/primary-button";
import { ApiService } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phoneNumber = params.phoneNumber as string;
  const exists = params.exists === "true";

  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) return;

    setLoading(true);
    try {
      const response = await ApiService.verifyOtp(phoneNumber, otpValue);
      if (response.success) {
        // Import auth store
        const { useAuthStore } = await import("@/store/auth");
        const { setAuthenticated } = useAuthStore.getState();

        if (exists) {
          // Set authenticated and navigate to home
          setAuthenticated(true, response.partnerId || "USER_ID", phoneNumber);
          router.replace("/(tabs)");
        } else {
          // New user - proceed to registration
          router.replace("/registration/basic-details");
        }
      } else {
        // Show error - invalid OTP
        console.warn("OTP verification failed:", response.message);
        // In a real app, show an alert or toast here
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      // In a real app, show an error alert here
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendTimer(30);
    await ApiService.sendOtp(phoneNumber);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="always"
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

            {/* Dev Hint - Remove in production */}
            <View className="bg-[#FFF5E6] border border-[#FFE5D9] rounded-2xl p-4 mb-6">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#FF6A00" />
                <View className="flex-1 ml-2">
                  <Text className="text-sm font-semibold text-[#FF6A00] mb-1">
                    Demo Mode
                  </Text>
                  <Text className="text-xs text-[#7A7A7A]">
                    Any 6-digit code will work for testing. Tap on the boxes to
                    enter OTP.
                  </Text>
                </View>
              </View>
            </View>

            {/* OTP Input */}
            <View className="flex-row justify-between mb-8">
              {otp.map((digit, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={1}
                  onPress={() => inputRefs.current[index]?.focus()}
                  className="w-14 h-16 bg-[#F8F8F8] rounded-2xl border-2 border-[#E5E5E5] items-center justify-center"
                  style={{
                    borderColor: digit ? "#FF6A00" : "#E5E5E5",
                  }}
                >
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    className="text-2xl font-bold text-[#1A1A1A] text-center"
                    style={{ padding: 0 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Resend OTP */}
            <View className="flex-row items-center justify-center mb-8">
              {resendTimer > 0 ? (
                <Text className="text-sm text-[#7A7A7A]">
                  Resend OTP in{" "}
                  <Text className="font-semibold text-[#FF6A00]">
                    {resendTimer}s
                  </Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
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
              disabled={otp.join("").length !== 6}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
