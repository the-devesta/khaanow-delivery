import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountRejectedScreen() {
  const router = useRouter();
  const { logout, partner } = useAuthStore();

  const handleLogout = async () => {
    console.log('🚪 [Rejected] Logging out...');
    await logout();
    router.replace('/auth/login');
  };

  const handleContactSupport = () => {
    Alert.alert(
      "Contact Support",
      "For any queries regarding your application, please contact us at:\n\n📧 support@khaaonow.com\n📞 +91 1800-XXX-XXXX\n\nOur team will help you understand the rejection reason and guide you through the reapplication process.",
      [{ text: "OK" }]
    );
  };

  const handleTryAgain = async () => {
    Alert.alert(
      "Reapply",
      "To apply again, you'll need to logout and register with a different phone number or contact support for help.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout & Try Again",
          onPress: handleLogout,
        },
        {
          text: "Contact Support",
          onPress: handleContactSupport,
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
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

          {/* Rejection Icon */}
          <View className="items-center mb-8">
            <View className="w-32 h-32 bg-[#FEE2E2] rounded-full items-center justify-center mb-6">
              <View className="w-24 h-24 bg-[#EF4444] rounded-full items-center justify-center">
                <Ionicons name="close" size={56} color="white" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-[#1A1A1A] text-center mb-2">
              Application Not Approved
            </Text>
            <Text className="text-base text-[#6B7280] text-center leading-6 px-2">
              We're sorry, but we couldn't approve your application at this time.
            </Text>
          </View>

          {/* Reason Card */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-4">
            <View className="flex-row items-start">
              <View className="w-12 h-12 bg-[#FEF3C7] rounded-2xl items-center justify-center">
                <Ionicons name="information-circle" size={26} color="#D97706" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-[#1A1A1A] mb-2">
                  Possible Reasons
                </Text>
                <View className="space-y-2">
                  <View className="flex-row items-start">
                    <View className="w-1.5 h-1.5 bg-[#6B7280] rounded-full mt-2 mr-3" />
                    <Text className="flex-1 text-[15px] text-[#6B7280] leading-5">
                      Documents were unclear or invalid
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <View className="w-1.5 h-1.5 bg-[#6B7280] rounded-full mt-2 mr-3" />
                    <Text className="flex-1 text-[15px] text-[#6B7280] leading-5">
                      Information mismatch in submitted documents
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <View className="w-1.5 h-1.5 bg-[#6B7280] rounded-full mt-2 mr-3" />
                    <Text className="flex-1 text-[15px] text-[#6B7280] leading-5">
                      Background verification did not pass
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* What You Can Do Card */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-4">
            <Text className="text-lg font-bold text-[#1A1A1A] mb-4">
              What You Can Do
            </Text>
            
            <View className="space-y-4">
              <TouchableOpacity
                onPress={handleContactSupport}
                className="flex-row items-center p-4 bg-[#F0FDF4] rounded-2xl"
                activeOpacity={0.7}
              >
                <View className="w-11 h-11 bg-[#10B981] rounded-xl items-center justify-center">
                  <Ionicons name="chatbubble-ellipses" size={22} color="white" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[15px] font-semibold text-[#1A1A1A]">
                    Contact Support
                  </Text>
                  <Text className="text-sm text-[#6B7280]">
                    Get help with your application
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#10B981" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTryAgain}
                className="flex-row items-center p-4 bg-[#EEF2FF] rounded-2xl"
                activeOpacity={0.7}
              >
                <View className="w-11 h-11 bg-[#6366F1] rounded-xl items-center justify-center">
                  <Ionicons name="reload" size={22} color="white" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[15px] font-semibold text-[#1A1A1A]">
                    Apply Again
                  </Text>
                  <Text className="text-sm text-[#6B7280]">
                    Restart the application process
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#6366F1" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-1" />

          {/* Footer Info */}
          <View className="pb-6 pt-4">
            <View className="bg-[#FEF3C7] rounded-2xl p-4 border border-[#FDE68A]">
              <View className="flex-row items-start">
                <Ionicons name="help-circle-outline" size={22} color="#D97706" />
                <Text className="flex-1 text-sm text-[#92400E] ml-3 leading-5">
                  If you believe this was a mistake, please contact our support team. 
                  We're here to help you resolve any issues.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
