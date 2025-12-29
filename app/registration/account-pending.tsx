import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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
    return "#9CA3AF";
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
    <View className={`flex-row items-start ${!last ? "mb-1" : ""}`}>
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
          <Text className="text-[15px] font-semibold text-[#1A1A1A] flex-1">
            {title}
          </Text>
          {status === "completed" && (
            <View className="bg-[#D1FAE5] rounded-full px-3 py-1">
              <Text className="text-xs text-[#059669] font-semibold">Done</Text>
            </View>
          )}
          {status === "in-progress" && (
            <View className="bg-[#FFF5EB] rounded-full px-3 py-1">
              <Text className="text-xs text-[#EA580C] font-semibold">
                In Progress
              </Text>
            </View>
          )}
          {status === "pending" && (
            <View className="bg-[#F3F4F6] rounded-full px-3 py-1">
              <Text className="text-xs text-[#6B7280] font-semibold">
                Pending
              </Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-[#6B7280] mt-1 leading-5">
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function AccountPendingScreen() {
  const router = useRouter();
  const { logout, fetchProfile, partner, isApproved, getNavigationRoute } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);

  // Animated pulse for the clock icon
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleRefresh = async () => {
    console.log('🔄 [Pending] Refreshing profile...');
    setRefreshing(true);
    
    try {
      await fetchProfile();
      
      // Check if user has been approved
      if (isApproved) {
        console.log('✅ [Pending] User approved! Navigating to home...');
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('❌ [Pending] Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckStatus = async () => {
    console.log('🔍 [Pending] Checking status...');
    setChecking(true);
    
    try {
      await fetchProfile();
      
      // Get the correct route based on updated state
      const route = getNavigationRoute();
      
      if (route !== '/registration/account-pending') {
        console.log('🧭 [Pending] Status changed, navigating to:', route);
        router.replace(route as any);
      } else {
        Alert.alert(
          "Still Under Review",
          "Your application is still being reviewed. We'll notify you once approved.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('❌ [Pending] Failed to check status:', error);
      Alert.alert("Error", "Failed to check status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            console.log('🚪 [Pending] Logging out...');
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      "Contact Support",
      "For any queries, please contact us at:\n\n📧 support@khaaonow.com\n📞 +91 1800-XXX-XXXX",
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#FF6A00"]}
            tintColor="#FF6A00"
          />
        }
      >
        <View className="flex-1 px-5 pt-6">
          {/* Header with Logout */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-1" />
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center px-4 py-2 bg-white rounded-full shadow-sm"
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text className="text-[#EF4444] font-semibold ml-2 text-sm">
                Logout
              </Text>
            </TouchableOpacity>
          </View>

          {/* Success Animation Area */}
          <View className="items-center mb-8">
            <View className="w-32 h-32 bg-[#FFF5EB] rounded-full items-center justify-center mb-6">
              <Animated.View
                style={[
                  {
                    width: 96,
                    height: 96,
                    backgroundColor: "#FF6A00",
                    borderRadius: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  pulseStyle,
                ]}
              >
                <Ionicons name="hourglass-outline" size={48} color="white" />
              </Animated.View>
            </View>
            <Text className="text-2xl font-bold text-[#1A1A1A] text-center mb-2">
              Application Under Review
            </Text>
            <Text className="text-base text-[#6B7280] text-center leading-6 px-4">
              Thank you for registering! Our team is reviewing your documents.
            </Text>
          </View>

          {/* Estimated Time Card */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-4">
            <View className="flex-row items-center">
              <View className="w-14 h-14 bg-[#EEF2FF] rounded-2xl items-center justify-center">
                <Ionicons name="time-outline" size={28} color="#6366F1" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-[#1A1A1A]">
                  Estimated Wait Time
                </Text>
                <Text className="text-base text-[#6B7280]">
                  24-48 business hours
                </Text>
              </View>
            </View>
          </View>

          {/* Status Steps Card */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-4">
            <Text className="text-lg font-bold text-[#1A1A1A] mb-5">
              Verification Progress
            </Text>

            <StatusStep
              icon="document-text-outline"
              title="Application Submitted"
              description="Your documents have been received"
              status="completed"
            />
            <StatusStep
              icon="shield-checkmark-outline"
              title="Document Verification"
              description="We're reviewing your KYC documents"
              status="in-progress"
            />
            <StatusStep
              icon="checkmark-circle-outline"
              title="Account Activation"
              description="You'll be notified when approved"
              status="pending"
              last
            />
          </View>

          {/* Check Status Button */}
          <TouchableOpacity
            onPress={handleCheckStatus}
            disabled={checking}
            className="bg-[#FF6A00] rounded-2xl py-4 px-6 mb-4 flex-row items-center justify-center shadow-lg"
            style={{
              shadowColor: "#FF6A00",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            activeOpacity={0.8}
          >
            {checking ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={22} color="white" />
                <Text className="text-white font-bold text-base ml-2">
                  Check Application Status
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Contact Support Card */}
          <TouchableOpacity
            onPress={handleContactSupport}
            className="bg-white rounded-2xl p-4 shadow-sm mb-4"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-11 h-11 bg-[#F3F4F6] rounded-xl items-center justify-center">
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={22}
                    color="#6B7280"
                  />
                </View>
                <View className="ml-3">
                  <Text className="text-[15px] font-semibold text-[#1A1A1A]">
                    Need help?
                  </Text>
                  <Text className="text-sm text-[#6B7280]">
                    Contact our support team
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <View className="flex-1" />

          {/* Info Message */}
          <View className="pb-6 pt-4">
            <View className="bg-[#EEF2FF] rounded-2xl p-4 border border-[#C7D2FE]">
              <View className="flex-row items-start">
                <Ionicons name="notifications-outline" size={22} color="#6366F1" />
                <Text className="flex-1 text-sm text-[#4338CA] ml-3 leading-5">
                  We'll send you a notification and SMS once your account is approved. 
                  Pull down to refresh status.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
