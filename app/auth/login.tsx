import InputField from "@/components/ui/input-field";
import PrimaryButton from "@/components/ui/primary-button";
import { ApiService } from "@/services/api";
import { LoginSchema } from "@/utils/validations";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Formik } from "formik";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { phoneNumber: string }) => {
    setLoading(true);
    try {
      const response = await ApiService.sendOtp(values.phoneNumber);
      if (response.success) {
        router.push({
          pathname: "/auth/otp",
          params: {
            phoneNumber: values.phoneNumber,
            exists: String(response.exists),
          },
        });
      }
    } catch (error) {
      console.error("Login error:", error);
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-24 pb-12">
            {/* Logo/Header Section */}
            <View className="items-center mb-12">
              <View className="w-24 h-24 rounded-3xl items-center justify-center mb-6 overflow-hidden">
                <Image
                  source={require("../../assets/images/logo2.png")}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <Text className="text-3xl font-bold text-[#1A1A1A] mb-2">
                Khaaonow Delivery
              </Text>
              <Text className="text-base text-[#7A7A7A] text-center">
                Partner with us and start earning
              </Text>
            </View>

            {/* Form Section */}
            <View className="flex-1">
              <Text className="text-2xl font-bold text-[#1A1A1A] mb-2">
                Welcome Back
              </Text>
              <Text className="text-base text-[#7A7A7A] mb-8">
                Enter your phone number to continue
              </Text>

              <Formik
                initialValues={{ phoneNumber: "" }}
                validationSchema={LoginSchema}
                onSubmit={handleLogin}
              >
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
                  errors,
                  touched,
                }) => (
                  <View>
                    <InputField
                      label="Phone Number"
                      placeholder="Enter 10 digit mobile number"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={values.phoneNumber}
                      onChangeText={handleChange("phoneNumber")}
                      onBlur={handleBlur("phoneNumber")}
                      error={
                        touched.phoneNumber && errors.phoneNumber
                          ? errors.phoneNumber
                          : undefined
                      }
                      icon={
                        <Ionicons
                          name="call-outline"
                          size={20}
                          color="#7A7A7A"
                        />
                      }
                    />

                    <View className="mt-6">
                      <PrimaryButton
                        title="Send OTP"
                        onPress={handleSubmit}
                        loading={loading}
                      />
                    </View>
                  </View>
                )}
              </Formik>
            </View>

            {/* Footer */}
            <View className="py-6">
              <Text className="text-xs text-[#7A7A7A] text-center">
                By continuing, you agree to our{" "}
                <Text className="text-[#FF6A00] font-semibold">
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text className="text-[#FF6A00] font-semibold">
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
