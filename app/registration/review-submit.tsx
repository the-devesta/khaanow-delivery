import AnimatedStepIndicator from "@/components/ui/animated-step-indicator";
import PrimaryButton from "@/components/ui/primary-button";
import { ApiService } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { goBackOrReplace } from "@/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import { SafeBlurView } from "@/components/ui/safe-blur-view";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function InfoRow({
  icon,
  label,
  value,
  verified = false,
}: {
  icon: string;
  label: string;
  value?: string;
  verified?: boolean;
}) {
  const displayValue = value || "Not provided";

  return (
    <View className="flex-row items-center py-3.5 border-b border-white/10">
      <View className="w-10 h-10 bg-white/10 rounded-xl items-center justify-center mr-3 border border-white/10">
        <Ionicons name={icon as any} size={18} color="rgba(255,255,255,0.7)" />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-white/50 mb-0.5 uppercase tracking-wider">
          {label}
        </Text>
        <Text
          className={`text-[15px] font-semibold ${
            value ? "text-white" : "text-white/40"
          }`}>
          {displayValue}
        </Text>
      </View>
      {verified && value ? (
        <View className="bg-green-500/20 rounded-full px-2 py-1 flex-row items-center border border-green-500/30">
          <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
          <Text className="text-xs text-green-400 font-medium ml-1">
            Verified
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ReviewAndSubmitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [reviewProfile, setReviewProfile] = useState<any>(null);
  const [agreed, setAgreed] = useState(false);
  const { partner, phoneNumber, setPartner } = useAuthStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const response = await ApiService.getProfile();
        if (!mounted) return;

        if (response.success && response.data) {
          const loadedProfile = (response.data as any).partner || response.data;
          setReviewProfile(loadedProfile);
          await setPartner(loadedProfile as any);
        } else {
          setReviewProfile(partner);
        }
      } catch (error) {
        console.error("❌ [ReviewSubmit] Failed to load profile:", error);
        if (mounted) setReviewProfile(partner);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const profile = reviewProfile || partner || {};
  const getParam = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const firstValue = (...values: any[]) =>
    values.find((value) => value !== undefined && value !== null && value !== "");
  const maskLast = (value: any, visible = 4, prefix = "") => {
    if (!value) return "";
    const text = String(value);
    return `${prefix}${"•".repeat(Math.max(text.length - visible, 4))}${text.slice(-visible)}`;
  };
  const maskPan = (value: any) => {
    if (!value) return "";
    const text = String(value).toUpperCase();
    if (text.length <= 2) return text;
    return `${text.slice(0, 5)}••••${text.slice(-1)}`;
  };
  const formatVehicleType = (value: any) => {
    if (!value) return "";
    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Collect registration data
  const registrationData = {
    name: firstValue(profile.name, partner?.name),
    email: firstValue(profile.email, partner?.email),
    phone: firstValue(profile.phone, phoneNumber),
    aadhaarNumber: maskLast(
      firstValue(getParam("aadhaarNumber"), profile.aadhaarNumber),
    ),
    panNumber: maskPan(firstValue(getParam("panNumber"), profile.panNumber)),
    vehicleType: formatVehicleType(
      firstValue(getParam("vehicleType"), profile.vehicleType),
    ),
    vehicleNumber: firstValue(getParam("vehicleNumber"), profile.vehicleNumber),
    drivingLicenseNumber:
      firstValue(getParam("drivingLicenseNumber"), profile.drivingLicenseNumber) ===
      "N/A"
        ? "Not required"
        : maskLast(
            firstValue(
              getParam("drivingLicenseNumber"),
              profile.drivingLicenseNumber,
            ),
            4,
            "DL",
          ),
    bankAccountName: firstValue(
      getParam("bankAccountName"),
      profile.bankAccountName,
      profile.bankDetails?.accountName,
    ),
    bankAccountNumber: maskLast(
      firstValue(
        getParam("bankAccountNumber"),
        profile.bankAccountNumber,
        profile.bankDetails?.accountNumber,
      ),
    ),
    bankIFSC: firstValue(
      getParam("bankIFSC"),
      profile.bankIFSC,
      profile.bankDetails?.ifsc,
    ),
    upiId: firstValue(getParam("upiId"), profile.upiId),
  };

  const handleSubmit = async () => {
    if (!agreed) {
      Alert.alert(
        "Agreement Required",
        "Please agree to the Terms of Service and Privacy Policy to continue.",
      );
      return;
    }

    console.log("📤 [ReviewSubmit] Submitting application...");
    setLoading(true);

    try {
      const { updateOnboardingStatus } = useAuthStore.getState();
      await updateOnboardingStatus("completed", 100);

      console.log(
        "✅ [ReviewSubmit] Application submitted, navigating to pending screen...",
      );
      router.replace("/registration/account-pending");
    } catch (error) {
      console.error("❌ [ReviewSubmit] Registration error:", error);
      Alert.alert(
        "Error",
        "Failed to complete registration. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Background Image with Blur */}
      <View className="absolute w-full h-full overflow-hidden">
        <Image
          source={require("../../assets/images/background.png")}
          className="w-full h-full"
          resizeMode="cover"
        />
        {Platform.OS === "ios" ? (
          <SafeBlurView
            intensity={40}
            tint="dark"
            className="absolute w-full h-full"
          />
        ) : (
          <View
            className="absolute w-full h-full"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 mb-6">
          <TouchableOpacity
            onPress={() => goBackOrReplace(router, "/registration/bank-details")}
            className="w-10 h-10 rounded-full items-center justify-center mb-6"
            style={{
              backgroundColor: "rgba(0,0,0,0.45)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.3)",
            }}
            activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="items-center">
            <AnimatedStepIndicator currentStep={6} totalSteps={6} />
          </View>
        </View>

        {/* Title Section */}
        <View className="px-6 mb-8">
          <Text className="text-4xl font-extrabold text-white mb-2  tracking-tight">
            Review & Submit
          </Text>
          <Text className="text-lg text-white/80 font-medium tracking-wide">
            Verify your information
          </Text>
        </View>

        {/* Content Cards */}
        <View className="px-6 pb-8 space-y-4">
          {/* Profile Card */}
          <View
            className="bg-white/20 backdrop-blur-md rounded-[24px] p-5 border-2 border-white/20 shadow-lg shadow-black/20 mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
            }}>
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-yellow-500/20 rounded-xl items-center justify-center border border-yellow-500/30">
                <Ionicons name="person" size={24} color="#F59E0B" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-white">
                  {profileLoading
                    ? "Loading..."
                    : registrationData.name || "Not provided"}
                </Text>
                <Text className="text-sm text-white/60">
                  {registrationData.email || "Email not provided"}
                </Text>
                <Text className="text-sm text-white/60">
                  {registrationData.phone || "Phone not provided"}
                </Text>
              </View>
              <TouchableOpacity
                className="bg-white/10 p-2 rounded-full"
                activeOpacity={0.7}>
                <Ionicons name="pencil" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* KYC Documents */}
          <View
            className="bg-white/20 backdrop-blur-md rounded-[24px] p-5 border-2 border-white/20 shadow-lg shadow-black/20 mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
            }}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-bold text-white">
                KYC Documents
              </Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Ionicons
                  name="pencil"
                  size={16}
                  color="rgba(255,255,255,0.6)"
                />
              </TouchableOpacity>
            </View>
            <InfoRow
              icon="card-outline"
              label="Aadhaar Number"
              value={registrationData.aadhaarNumber}
              verified={!!registrationData.aadhaarNumber}
            />
            <InfoRow
              icon="card-outline"
              label="PAN Number"
              value={registrationData.panNumber}
              verified={!!registrationData.panNumber}
            />
          </View>

          {/* Vehicle Information */}
          <View
            className="bg-white/20 backdrop-blur-md rounded-[24px] p-5 border-2 border-white/20 shadow-lg shadow-black/20 mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
            }}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-bold text-white">Vehicle Info</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Ionicons
                  name="pencil"
                  size={16}
                  color="rgba(255,255,255,0.6)"
                />
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
              verified={!!registrationData.drivingLicenseNumber}
            />
          </View>

          {/* Bank Details */}
          <View
            className="bg-white/20 backdrop-blur-md rounded-[24px] p-5 border-2 border-white/20 shadow-lg shadow-black/20 mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
            }}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-bold text-white">Bank Details</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Ionicons
                  name="pencil"
                  size={16}
                  color="rgba(255,255,255,0.6)"
                />
              </TouchableOpacity>
            </View>
            <InfoRow
              icon="person"
              label="Account Holder"
              value={registrationData.bankAccountName}
            />
            <InfoRow
              icon="card"
              label="Account Number"
              value={registrationData.bankAccountNumber}
            />
            <InfoRow
              icon="business"
              label="IFSC Code"
              value={registrationData.bankIFSC}
            />
            {registrationData.upiId ? (
              <InfoRow
                icon="qr-code"
                label="UPI ID"
                value={registrationData.upiId}
              />
            ) : null}
          </View>

          {/* Terms Agreement */}
          <TouchableOpacity
            onPress={() => setAgreed(!agreed)}
            activeOpacity={0.8}
            className={`rounded-[24px] p-5 flex-row items-start border ${
              agreed
                ? "bg-yellow-500/10 border-yellow-500/50"
                : "bg-white/5 border-white/10"
            } mb-6`}>
            <View
              className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-3 mt-0.5 ${
                agreed
                  ? "bg-[#F59E0B] border-[#F59E0B]"
                  : "border-white/30 bg-transparent"
              }`}>
              {agreed && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <Text className="flex-1 text-[14px] text-white/70 leading-5">
              I agree to the{" "}
              <Text className="text-yellow-400 font-bold">
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text className="text-yellow-400 font-bold">Privacy Policy</Text>.
              I confirm that all the information provided is accurate.
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <View className="pb-6">
            <PrimaryButton
              title="Submit Application"
              onPress={handleSubmit}
              loading={loading}
              disabled={!agreed}
            />
            <View className="flex-row items-center justify-center mt-4 opacity-70">
              <Ionicons name="shield-checkmark" size={16} color="#4ADE80" />
              <Text className="text-xs text-white/60 ml-1.5">
                Your data is encrypted and secure
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
