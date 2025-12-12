import PrimaryButton from "@/components/ui/primary-button";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";

function StatusStep({
  icon,
  title,
  description,
  status,
  last = false,
}: {
  icon: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "pending";
  last?: boolean;
}) {
  const getIconColor = () => {
    if (status === "completed") return "#10B981";
    if (status === "in-progress") return "#FF6A00";
    return "#D1D5DB";
  };

  const getBgColor = () => {
    if (status === "completed") return "#D1FAE5";
    if (status === "in-progress") return "#FFF5EB";
    return "#F3F4F6";
  };

  const getLineColor = () => {
    if (status === "completed") return "#10B981";
    return "#E5E7EB";
  };

  return (
    <View className={`flex-row items-start ${!last ? "mb-0" : ""}`}>
      <View className="items-center mr-4">
        <View
          className="w-12 h-12 rounded-2xl items-center justify-center"
          style={{ backgroundColor: getBgColor() }}
        >
          <Ionicons name={icon as any} size={22} color={getIconColor()} />
        </View>
        {!last && (
          <View
            className="w-0.5 h-10 mt-2"
            style={{ backgroundColor: getLineColor() }}
          />
        )}
      </View>
      <View className="flex-1 pt-1.5">
        <View className="flex-row items-center">
          <Text className="text-[15px] font-bold text-[#1A1A1A] flex-1">
            {title}
          </Text>
          {status === "completed" && (
            <View className="bg-[#D1FAE5] rounded-full px-2 py-0.5">
              <Text className="text-xs text-[#10B981] font-medium">Done</Text>
            </View>
          )}
          {status === "in-progress" && (
            <View className="bg-[#FFF5EB] rounded-full px-2 py-0.5">
              <Text className="text-xs text-[#FF6A00] font-medium">
                In Progress
              </Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-[#6B7280] mt-1">{description}</Text>
      </View>
    </View>
  );
}

export default function AccountPendingScreen() {
  const router = useRouter();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  const handleGoHome = () => {
    // For demo purposes, auto-approve and go to home
    setAuthenticated(true, "demo-user-123", "+91 98765 43210");
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-5 pt-10">
          {/* Success Animation Area */}
          <View className="items-center mb-8">
            <View className="w-28 h-28 bg-[#D1FAE5] rounded-full items-center justify-center mb-5">
              <View className="w-20 h-20 bg-[#10B981] rounded-full items-center justify-center">
                <Ionicons name="checkmark" size={44} color="white" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-[#1A1A1A] text-center mb-2">
              Application Submitted! 🎉
            </Text>
            <Text className="text-[15px] text-[#6B7280] text-center leading-6 px-4">
              Thank you for registering. Your application is now under review.
            </Text>
          </View>

          {/* Estimated Time Card */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
            <View className="flex-row items-center">
              <View className="w-14 h-14 bg-[#DBEAFE] rounded-2xl items-center justify-center">
                <Ionicons name="time-outline" size={28} color="#3B82F6" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-[#1A1A1A]">
                  Estimated Wait Time
                </Text>
                <Text className="text-[15px] text-[#6B7280]">
                  24-48 hours for verification
                </Text>
              </View>
            </View>
          </View>

          {/* Status Steps Card */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
            <Text className="text-lg font-bold text-[#1A1A1A] mb-5">
              Verification Progress
            </Text>

            <StatusStep
              icon="document-text-outline"
              title="Document Verification"
              description="We're verifying your KYC documents"
              status="in-progress"
            />
            <StatusStep
              icon="shield-checkmark-outline"
              title="Background Check"
              description="Safety verification process"
              status="pending"
            />
            <StatusStep
              icon="checkmark-circle-outline"
              title="Account Activation"
              description="You'll be notified when approved"
              status="pending"
              last
            />
          </View>

          {/* Notification Card */}
          <View className="bg-[#FFF5EB] rounded-3xl p-5 mb-5 flex-row items-center">
            <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center">
              <Ionicons name="notifications" size={24} color="#FF6A00" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-[15px] font-semibold text-[#1A1A1A]">
                Stay tuned!
              </Text>
              <Text className="text-sm text-[#6B7280]">
                We&apos;ll notify you once your account is approved
              </Text>
            </View>
          </View>

          {/* Contact Support */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-[#F3F4F6] rounded-xl items-center justify-center">
                  <Ionicons
                    name="help-circle-outline"
                    size={20}
                    color="#6B7280"
                  />
                </View>
                <Text className="text-[15px] font-semibold text-[#1A1A1A] ml-3">
                  Need help?
                </Text>
              </View>
              <Text className="text-[#FF6A00] font-semibold">
                Contact Support
              </Text>
            </View>
          </View>

          <View className="flex-1" />

          {/* Action Button */}
          <View className="pb-6 pt-4">
            <PrimaryButton title="Go to Home" onPress={handleGoHome} />
            <Text className="text-xs text-[#9CA3AF] text-center mt-3">
              Application ID: #KN2024001234
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
