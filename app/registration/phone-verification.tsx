import PrimaryButton from "@/components/ui/primary-button";
import { ApiService } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Yup from "yup";

const PhoneSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .matches(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .required("Phone number is required"),
});

export default function PhoneVerificationScreen() {
  const router = useRouter();
  const { setAuthenticated } = useAuthStore();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = React.useRef<(TextInput | null)[]>([]);

  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOtp = async () => {
    // Validate phone number
    try {
      await PhoneSchema.validate({ phoneNumber });
      setPhoneError("");
    } catch (err: any) {
      setPhoneError(err.message);
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.sendOtp(phoneNumber);

      if (response.success) {
        setStep("otp");
        setResendTimer(30);
      } else {
        Alert.alert(
          "Error",
          response.message || "Failed to send OTP. Please try again."
        );
      }
    } catch (error: any) {
      console.error("Send OTP error:", error);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

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

      if (response.success && response.data) {
        // Update auth store with phone number
        await setAuthenticated(
          true,
          response.data.deliveryPartnerId,
          `+91${phoneNumber}`,
          response.data.token
        );

        // Navigate based on onboarding status
        if (
          response.data.onboardingStatus === "COMPLETED" ||
          response.data.onboardingStatus === "completed"
        ) {
          router.replace("/(tabs)");
        } else {
          router.replace("/registration/basic-details");
        }
      } else {
        Alert.alert(
          "Verification Failed",
          response.message || "Failed to verify OTP. Please try again."
        );
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      Alert.alert("Error", "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const response = await ApiService.sendOtp(phoneNumber);
      if (response.success) {
        setResendTimer(30);
        setOtp(["", "", "", "", "", ""]);
        Alert.alert("Success", "OTP sent successfully!");
      } else {
        Alert.alert("Error", response.message || "Failed to resend OTP.");
      }
    } catch {
      Alert.alert("Error", "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
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
              onPress={() =>
                step === "otp" ? setStep("phone") : router.back()
              }
              className="w-12 h-12 bg-[#F8F8F8] rounded-full items-center justify-center mb-8"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>

            {step === "phone" ? (
              <>
                {/* Header */}
                <View className="mb-8">
                  <View className="w-16 h-16 bg-[#FFF5EB] rounded-2xl items-center justify-center mb-4">
                    <Ionicons name="call" size={32} color="#FF6A00" />
                  </View>
                  <Text className="text-2xl font-bold text-[#1A1A1A] mb-2">
                    Add Phone Number
                  </Text>
                  <Text className="text-base text-[#7A7A7A]">
                    Please add your phone number to complete your profile and
                    receive delivery updates.
                  </Text>
                </View>

                {/* Phone Input */}
                <View className="mb-6">
                  <Text className="text-sm font-medium text-[#374151] mb-2">
                    Phone Number
                  </Text>
                  <View className="flex-row items-center bg-[#F8F8F8] rounded-2xl border-2 border-[#E5E5E5] px-4">
                    <Text className="text-base text-[#1A1A1A] mr-2">+91</Text>
                    <View className="w-[1px] h-6 bg-[#E5E5E5] mr-3" />
                    <TextInput
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="Enter 10 digit number"
                      keyboardType="phone-pad"
                      maxLength={10}
                      className="flex-1 py-4 text-base text-[#1A1A1A]"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  {phoneError ? (
                    <Text className="text-sm text-red-500 mt-1">
                      {phoneError}
                    </Text>
                  ) : null}
                </View>

                <PrimaryButton
                  title="Send OTP"
                  onPress={handleSendOtp}
                  loading={loading}
                  disabled={phoneNumber.length !== 10}
                />
              </>
            ) : (
              <>
                {/* OTP Header */}
                <View className="mb-8">
                  <Text className="text-2xl font-bold text-[#1A1A1A] mb-2">
                    Verify OTP
                  </Text>
                  <Text className="text-base text-[#7A7A7A]">
                    Enter the 6-digit code sent to{"\n"}
                    <Text className="font-semibold text-[#1A1A1A]">
                      +91 {phoneNumber}
                    </Text>
                  </Text>
                </View>

                {/* OTP Input */}
                <View className="flex-row justify-between mb-8">
                  {otp.map((digit, index) => (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={1}
                      onPress={() => inputRefs.current[index]?.focus()}
                      className="w-12 h-14 bg-[#F8F8F8] rounded-xl border-2 items-center justify-center"
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
                        className="text-xl font-bold text-[#1A1A1A] text-center"
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
                    <TouchableOpacity
                      onPress={handleResendOtp}
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm font-semibold text-[#FF6A00]">
                        Resend OTP
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <PrimaryButton
                  title="Verify & Continue"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  disabled={otp.join("").length !== 6}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
