import AnimatedStepIndicator from "@/components/ui/animated-step-indicator";
import PrimaryButton from "@/components/ui/primary-button";
import { ApiService } from "@/services/api";
import { OnboardingStatus, useAuthStore } from "@/store/auth";
import { BasicDetailsSchema } from "@/utils/validations";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Formik } from "formik";
import { useState } from "react";
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

export default function BasicDetailsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { updateOnboardingStatus } = useAuthStore();

  const handleNext = async (values: { name: string; email: string }) => {
    console.log('📝 [BasicDetails] Submitting profile:', values);
    setLoading(true);
    
    try {
      const response = await ApiService.completeProfile(values);
      console.log('📡 [BasicDetails] API response:', {
        success: response.success,
        message: response.message,
      });
      
      if (response.success) {
        // Update local auth store with new onboarding status
        await updateOnboardingStatus(OnboardingStatus.PERSONAL_INFO, 20);
        console.log('✅ [BasicDetails] Local state updated, navigating to KYC...');
        
        router.push({
          pathname: "/registration/kyc-documents",
          params: values,
        });
      } else {
        Alert.alert("Error", response.message || "Failed to save profile");
      }
    } catch (error: any) {
      console.error("❌ [BasicDetails] Profile completion error:", error);
      Alert.alert("Error", "Failed to complete profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-5 pt-16 pb-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-8">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
              </TouchableOpacity>
              <View className="flex-1 mx-4">
                <AnimatedStepIndicator currentStep={1} totalSteps={5} />
              </View>
              <View className="w-10" />
            </View>

            {/* Title Section */}
            <View className="bg-white rounded-3xl p-6 mb-5 shadow-sm">
              <View className="w-14 h-14 bg-[#FFF5EB] rounded-2xl items-center justify-center mb-4">
                <Ionicons name="person" size={28} color="#FF6A00" />
              </View>
              <Text className="text-2xl font-bold text-[#1A1A1A] mb-2">
                Basic Details
              </Text>
              <Text className="text-[15px] text-[#6B7280] leading-6">
                Let&apos;s start with your personal information to create your
                delivery partner profile.
              </Text>
            </View>

            {/* Form */}
            <Formik
              initialValues={{ name: "", email: "" }}
              validationSchema={BasicDetailsSchema}
              onSubmit={handleNext}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
              }) => (
                <View className="flex-1">
                  <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
                    {/* Name Field */}
                    <View className="mb-5">
                      <Text className="text-sm font-semibold text-[#374151] mb-2.5">
                        Full Name
                      </Text>
                      <View
                        className={`flex-row items-center bg-[#F9FAFB] rounded-xl px-4 border ${
                          touched.name && errors.name
                            ? "border-red-400"
                            : "border-[#E5E7EB]"
                        }`}
                      >
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color="#9CA3AF"
                        />
                        <TextInput
                          placeholder="Enter your full name"
                          placeholderTextColor="#9CA3AF"
                          value={values.name}
                          onChangeText={handleChange("name")}
                          onBlur={handleBlur("name")}
                          className="flex-1 py-4 px-3 text-base text-[#1A1A1A]"
                        />
                        {values.name.length > 2 && !errors.name && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#10B981"
                          />
                        )}
                      </View>
                      {touched.name && errors.name && (
                        <Text className="text-red-500 text-xs mt-1.5 ml-1">
                          {errors.name}
                        </Text>
                      )}
                    </View>

                    {/* Email Field */}
                    <View>
                      <Text className="text-sm font-semibold text-[#374151] mb-2.5">
                        Email Address
                      </Text>
                      <View
                        className={`flex-row items-center bg-[#F9FAFB] rounded-xl px-4 border ${
                          touched.email && errors.email
                            ? "border-red-400"
                            : "border-[#E5E7EB]"
                        }`}
                      >
                        <Ionicons
                          name="mail-outline"
                          size={20}
                          color="#9CA3AF"
                        />
                        <TextInput
                          placeholder="Enter your email"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={values.email}
                          onChangeText={handleChange("email")}
                          onBlur={handleBlur("email")}
                          className="flex-1 py-4 px-3 text-base text-[#1A1A1A]"
                        />
                        {values.email.includes("@") && !errors.email && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#10B981"
                          />
                        )}
                      </View>
                      {touched.email && errors.email && (
                        <Text className="text-red-500 text-xs mt-1.5 ml-1">
                          {errors.email}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Info Card */}
                  <View className="bg-[#EFF6FF] rounded-2xl p-4 flex-row items-start mb-5">
                    <View className="w-8 h-8 bg-[#DBEAFE] rounded-full items-center justify-center">
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color="#3B82F6"
                      />
                    </View>
                    <Text className="text-sm text-[#1E40AF] ml-3 flex-1 leading-5">
                      Your information is encrypted and secure. We only use it
                      for verification purposes.
                    </Text>
                  </View>

                  <View className="flex-1" />

                  {/* Continue Button */}
                  <View className="pb-6 pt-4">
                    <PrimaryButton
                      title="Continue"
                      onPress={() => handleSubmit()}
                      loading={loading}
                    />
                  </View>
                </View>
              )}
            </Formik>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
