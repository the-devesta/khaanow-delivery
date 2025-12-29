import PrimaryButton from "@/components/ui/primary-button";
import { usePhoneAuth } from "@/hooks/use-phone-auth";
import { LoginSchema } from "@/utils/validations";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Formik } from "formik";
import { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View
} from "react-native";

// Screen dimensions not needed for this layout

export default function LoginScreen() {
  const router = useRouter();
  const { sendOtp, loading, error, clearError } = usePhoneAuth();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, scaleAnim, pulseAnim]);

  const features = [
    { icon: "flash", label: "Fast Payments", color: "#10B981" },
    { icon: "time-outline", label: "Flexible Hours", color: "#3B82F6" },
    { icon: "shield-checkmark", label: "Insurance", color: "#8B5CF6" },
  ];

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#FF6A00" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Gradient Header with Wave */}
          <LinearGradient
            colors={["#FF6A00", "#FF8534", "#FFA366"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="pt-16 pb-20 px-6"
            style={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
          >
            {/* Logo & Brand */}
            <Animated.View 
              className="items-center"
              style={{
                opacity: fadeAnim,
                transform: [{ scale: pulseAnim }],
              }}
            >
              <View className="w-24 h-24 rounded-3xl items-center justify-center mb-4 overflow-hidden bg-white/20 shadow-xl">
                <Image
                  source={require("../../assets/images/2 2.png")}
                  className="w-36 h-36"
                  resizeMode="cover"
                  borderRadius={12}
                />
              </View>
              <Text className="text-3xl font-bold text-white tracking-tight">
                Khaaonow
              </Text>
              <Text className="text-lg font-medium text-white/90 mt-1">
                Delivery Partner
              </Text>
            </Animated.View>

            {/* Features Row */}
            <Animated.View 
              className="flex-row justify-center mt-8 gap-6"
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {features.map((feature, index) => (
                <View key={index} className="items-center">
                  <View 
                    className="w-12 h-12 rounded-2xl items-center justify-center mb-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                  >
                    <Ionicons name={feature.icon as any} size={24} color="white" />
                  </View>
                  <Text className="text-xs font-medium text-white/90 text-center">
                    {feature.label}
                  </Text>
                </View>
              ))}
            </Animated.View>
          </LinearGradient>

          {/* Form Card */}
          <Animated.View 
            className="flex-1 px-6 -mt-8"
            style={{
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            }}
          >
            <View className="bg-white rounded-3xl shadow-2xl p-6 border border-gray-100">
              {/* Welcome Text */}
              <View className="mb-6">
                <Text className="text-2xl font-bold text-[#1A1A1A]">
                  Welcome! 👋
                </Text>
                <Text className="text-base text-[#6B7280] mt-2">
                  Enter your phone number to get started
                </Text>
              </View>

              <Formik
                initialValues={{ phoneNumber: "" }}
                validationSchema={LoginSchema}
                onSubmit={async (values) => {
                  try {
                    clearError();

                    // Send OTP via Firebase
                    const success = await sendOtp(values.phoneNumber);

                    if (success) {
                      router.push({
                        pathname: "/auth/otp",
                        params: {
                          phoneNumber: values.phoneNumber,
                        },
                      });
                    } else if (error) {
                      Alert.alert("Error", error);
                    }
                  } catch (err: any) {
                    console.error("Login error:", err);
                    Alert.alert(
                      "Error",
                      err.message || "Failed to send OTP. Please try again."
                    );
                  }
                }}
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
                    {/* Phone Input */}
                    <View className="mb-6">
                      <Text className="text-sm font-semibold text-[#374151] mb-2">
                        Phone Number
                      </Text>
                      <View className="flex-row items-stretch">
                        {/* Country Code with Flag */}
                        <View className="bg-[#F9FAFB] rounded-l-2xl px-4 border-2 border-r-0 border-[#E5E7EB] flex-row items-center justify-center">
                          <Text className="text-lg mr-1">🇮🇳</Text>
                          <Text className="text-base text-[#1A1A1A] font-semibold">
                            +91
                          </Text>
                        </View>
                        {/* Phone Input */}
                        <View className="flex-1 flex-row items-center bg-[#F9FAFB] rounded-r-2xl px-4 border-2 border-l-0 border-[#E5E7EB]">
                          <Ionicons
                            name="call-outline"
                            size={20}
                            color="#9CA3AF"
                            style={{ marginRight: 12 }}
                          />
                          <TextInput
                            placeholder="Enter 10 digit number"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={values.phoneNumber}
                            onChangeText={handleChange("phoneNumber")}
                            onBlur={handleBlur("phoneNumber")}
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 text-base text-[#1A1A1A] py-4"
                            style={{ padding: 0, paddingVertical: 16 }}
                          />
                        </View>
                      </View>
                      {touched.phoneNumber && errors.phoneNumber && (
                        <Text className="text-red-500 text-xs mt-2 ml-2">
                          {errors.phoneNumber}
                        </Text>
                      )}
                    </View>

                    {/* Info Banner */}
                    <View className="bg-gradient-to-r from-[#FFF5EB] to-[#FEF3C7] rounded-2xl p-4 mb-6 border border-[#FBBF24]/20">
                      <View className="flex-row items-start">
                        <View className="w-10 h-10 bg-[#FF6A00]/10 rounded-xl items-center justify-center">
                          <Ionicons
                            name="shield-checkmark"
                            size={20}
                            color="#FF6A00"
                          />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className="text-sm font-semibold text-[#92400E] mb-1">
                            Secure Verification
                          </Text>
                          <Text className="text-xs text-[#A16207] leading-5">
                            We&apos;ll send a 6-digit OTP to verify your identity. Your number is safe with us.
                          </Text>
                        </View>
                      </View>
                    </View>

                    <PrimaryButton
                      title="Continue"
                      onPress={handleSubmit}
                      loading={loading}
                    />
                  </View>
                )}
              </Formik>
            </View>

            {/* Stats/Social Proof */}
            <View className="flex-row justify-center items-center mt-6 mb-4">
              <View className="flex-row items-center px-4 py-2 bg-[#F0FDF4] rounded-full">
                <MaterialCommunityIcons name="account-group" size={18} color="#10B981" />
                <Text className="text-sm font-semibold text-[#10B981] ml-2">
                  10,000+ Active Partners
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View className="pt-4 pb-8">
              <Text className="text-xs text-[#9CA3AF] text-center leading-5">
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
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
