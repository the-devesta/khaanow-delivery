import AnimatedStepIndicator from "@/components/ui/animated-step-indicator";
import PrimaryButton from "@/components/ui/primary-button";
import { ApiService } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function InfoRow({
  icon,
  label,
  value,
  verified = false,
}: {
  icon: string;
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <View className="flex-row items-center py-3.5 border-b border-[#F3F4F6]">
      <View className="w-10 h-10 bg-[#F9FAFB] rounded-xl items-center justify-center mr-3">
        <Ionicons name={icon as any} size={18} color="#6B7280" />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-[#9CA3AF] mb-0.5">{label}</Text>
        <Text className="text-[15px] font-semibold text-[#1A1A1A]">
          {value}
        </Text>
      </View>
      {verified && (
        <View className="bg-[#D1FAE5] rounded-full px-2 py-1 flex-row items-center">
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text className="text-xs text-[#10B981] font-medium ml-1">
            Verified
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ReviewAndSubmitScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // In a real app, you'd collect all data from previous screens
  const registrationData = {
    name: "Rahul Kumar",
    email: "rahul@example.com",
    phone: "+91 98765 43210",
    aadhaarNumber: "••••••••9012",
    panNumber: "ABCDE••••F",
    vehicleType: "Bike",
    vehicleNumber: "KA01AB1234",
    drivingLicenseNumber: "DL••••••7890",
  };

  const handleSubmit = async () => {
    if (!agreed) {
      return;
    }
    setLoading(true);
    try {
      const response = await ApiService.submitRegistration(
        registrationData as any
      );
      if (response.success) {
        router.replace("/registration/account-pending");
      }
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
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
              <AnimatedStepIndicator currentStep={5} totalSteps={5} />
            </View>
            <View className="w-10" />
          </View>

          {/* Title Section */}
          <View className="bg-white rounded-3xl p-6 mb-5 shadow-sm">
            <View className="w-14 h-14 bg-[#D1FAE5] rounded-2xl items-center justify-center mb-4">
              <Ionicons name="document-text" size={28} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-[#1A1A1A] mb-2">
              Review & Submit
            </Text>
            <Text className="text-[15px] text-[#6B7280] leading-6">
              Please verify all your information before submitting your
              application.
            </Text>
          </View>

          {/* Profile Card */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-[#FFF5EB] rounded-2xl items-center justify-center">
                <Ionicons name="person" size={32} color="#FF6A00" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-[#1A1A1A]">
                  {registrationData.name}
                </Text>
                <Text className="text-sm text-[#6B7280]">
                  {registrationData.email}
                </Text>
                <Text className="text-sm text-[#6B7280]">
                  {registrationData.phone}
                </Text>
              </View>
              <TouchableOpacity
                className="w-9 h-9 bg-[#F9FAFB] rounded-full items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* KYC Documents */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-[#FEF3C7] rounded-xl items-center justify-center">
                  <Text className="text-lg">🪪</Text>
                </View>
                <Text className="text-lg font-bold text-[#1A1A1A] ml-3">
                  KYC Documents
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.7}>
                <Ionicons name="pencil" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <InfoRow
              icon="card-outline"
              label="Aadhaar Number"
              value={registrationData.aadhaarNumber}
              verified
            />
            <InfoRow
              icon="card-outline"
              label="PAN Number"
              value={registrationData.panNumber}
              verified
            />
          </View>

          {/* Vehicle Information */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-[#DBEAFE] rounded-xl items-center justify-center">
                  <Text className="text-lg">🏍️</Text>
                </View>
                <Text className="text-lg font-bold text-[#1A1A1A] ml-3">
                  Vehicle Info
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.7}>
                <Ionicons name="pencil" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <InfoRow
              icon="bicycle"
              label="Vehicle Type"
              value={registrationData.vehicleType}
            />
            <InfoRow
              icon="car-outline"
              label="Vehicle Number"
              value={registrationData.vehicleNumber}
            />
            <InfoRow
              icon="document-outline"
              label="Driving License"
              value={registrationData.drivingLicenseNumber}
              verified
            />
          </View>

          {/* Terms Agreement */}
          <TouchableOpacity
            onPress={() => setAgreed(!agreed)}
            activeOpacity={0.8}
            className="bg-white rounded-3xl p-5 shadow-sm mb-5 flex-row items-start"
          >
            <View
              className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-3 mt-0.5 ${
                agreed
                  ? "bg-[#FF6A00] border-[#FF6A00]"
                  : "border-[#D1D5DB] bg-white"
              }`}
            >
              {agreed && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <Text className="flex-1 text-[15px] text-[#6B7280] leading-6">
              I agree to the{" "}
              <Text className="text-[#FF6A00] font-semibold">
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text className="text-[#FF6A00] font-semibold">
                Privacy Policy
              </Text>
              . I confirm that all the information provided is accurate.
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <View className="pb-6 pt-2">
            <PrimaryButton
              title="Submit Application"
              onPress={handleSubmit}
              loading={loading}
              disabled={!agreed}
            />
            <View className="flex-row items-center justify-center mt-4">
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text className="text-xs text-[#6B7280] ml-1.5">
                Your data is encrypted and secure
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
