import AnimatedStepIndicator from "@/components/ui/animated-step-indicator";
import PrimaryButton from "@/components/ui/primary-button";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Document upload component
function DocumentUploadCard({
  title,
  subtitle,
  imageUri,
  onUpload,
}: {
  title: string;
  subtitle: string;
  imageUri: string;
  onUpload: (uri: string) => void;
}) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onUpload(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onUpload(result.assets[0].uri);
    }
  };

  const showOptions = () => {
    Alert.alert("Upload Document", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={showOptions}
      activeOpacity={0.7}
      className="bg-[#F9FAFB] rounded-2xl border-2 border-dashed border-[#E5E7EB] overflow-hidden mb-4"
    >
      {imageUri ? (
        <View className="relative">
          <Image
            source={{ uri: imageUri }}
            className="w-full h-40"
            resizeMode="cover"
          />
          <View className="absolute top-2 right-2 bg-[#10B981] rounded-full p-1.5">
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
          <TouchableOpacity
            onPress={showOptions}
            className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md"
          >
            <Ionicons name="camera" size={18} color="#FF6A00" />
          </TouchableOpacity>
        </View>
      ) : (
        <View className="py-8 px-4 items-center">
          <View className="w-14 h-14 bg-[#FFF5EB] rounded-full items-center justify-center mb-3">
            <Ionicons name="cloud-upload-outline" size={28} color="#FF6A00" />
          </View>
          <Text className="text-base font-semibold text-[#374151] mb-1">
            {title}
          </Text>
          <Text className="text-sm text-[#9CA3AF] text-center">{subtitle}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function KycDocumentsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarPhoto, setAadhaarPhoto] = useState("");
  const [panPhoto, setPanPhoto] = useState("");
  const [errors, setErrors] = useState<{ aadhaar?: string; pan?: string }>({});

  const validateAadhaar = (value: string) => {
    if (!/^\d{12}$/.test(value)) {
      return "Aadhaar must be 12 digits";
    }
    return "";
  };

  const validatePan = (value: string) => {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase())) {
      return "Invalid PAN format (e.g., ABCDE1234F)";
    }
    return "";
  };

  const handleNext = () => {
    const aadhaarError = validateAadhaar(aadhaarNumber);
    const panError = validatePan(panNumber);

    if (aadhaarError || panError) {
      setErrors({ aadhaar: aadhaarError, pan: panError });
      return;
    }

    if (!aadhaarPhoto || !panPhoto) {
      Alert.alert(
        "Documents Required",
        "Please upload both Aadhaar and PAN card photos to continue."
      );
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: "/registration/vehicle-details",
        params: {
          aadhaarNumber,
          panNumber: panNumber.toUpperCase(),
          aadhaarPhoto,
          panPhoto,
        },
      });
    }, 400);
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
                <AnimatedStepIndicator currentStep={2} totalSteps={5} />
              </View>
              <View className="w-10" />
            </View>

            {/* Title Section */}
            <View className="bg-white rounded-3xl p-6 mb-5 shadow-sm">
              <View className="w-14 h-14 bg-[#FFF5EB] rounded-2xl items-center justify-center mb-4">
                <Ionicons name="shield-checkmark" size={28} color="#FF6A00" />
              </View>
              <Text className="text-2xl font-bold text-[#1A1A1A] mb-2">
                KYC Verification
              </Text>
              <Text className="text-[15px] text-[#6B7280] leading-6">
                Upload your government IDs for identity verification. This is
                required for secure deliveries.
              </Text>
            </View>

            {/* Aadhaar Section */}
            <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 bg-[#FEF3C7] rounded-xl items-center justify-center">
                  <Text className="text-lg">🪪</Text>
                </View>
                <Text className="text-lg font-bold text-[#1A1A1A] ml-3">
                  Aadhaar Card
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-[#374151] mb-2">
                  Aadhaar Number
                </Text>
                <View
                  className={`flex-row items-center bg-[#F9FAFB] rounded-xl px-4 border ${
                    errors.aadhaar ? "border-red-400" : "border-[#E5E7EB]"
                  }`}
                >
                  <Ionicons name="card-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    placeholder="Enter 12-digit Aadhaar number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={12}
                    value={aadhaarNumber}
                    onChangeText={(text) => {
                      setAadhaarNumber(text);
                      if (errors.aadhaar) setErrors({ ...errors, aadhaar: "" });
                    }}
                    className="flex-1 py-4 px-3 text-base text-[#1A1A1A]"
                  />
                  {aadhaarNumber.length === 12 &&
                    !validateAadhaar(aadhaarNumber) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10B981"
                      />
                    )}
                </View>
                {errors.aadhaar && (
                  <Text className="text-red-500 text-xs mt-1.5 ml-1">
                    {errors.aadhaar}
                  </Text>
                )}
              </View>

              <DocumentUploadCard
                title="Upload Aadhaar Card"
                subtitle="Take a photo or choose from gallery"
                imageUri={aadhaarPhoto}
                onUpload={setAadhaarPhoto}
              />
            </View>

            {/* PAN Section */}
            <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 bg-[#DBEAFE] rounded-xl items-center justify-center">
                  <Text className="text-lg">💳</Text>
                </View>
                <Text className="text-lg font-bold text-[#1A1A1A] ml-3">
                  PAN Card
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-[#374151] mb-2">
                  PAN Number
                </Text>
                <View
                  className={`flex-row items-center bg-[#F9FAFB] rounded-xl px-4 border ${
                    errors.pan ? "border-red-400" : "border-[#E5E7EB]"
                  }`}
                >
                  <Ionicons name="card-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    placeholder="Enter PAN (e.g., ABCDE1234F)"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                    maxLength={10}
                    value={panNumber}
                    onChangeText={(text) => {
                      setPanNumber(text.toUpperCase());
                      if (errors.pan) setErrors({ ...errors, pan: "" });
                    }}
                    className="flex-1 py-4 px-3 text-base text-[#1A1A1A]"
                  />
                  {panNumber.length === 10 && !validatePan(panNumber) && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#10B981"
                    />
                  )}
                </View>
                {errors.pan && (
                  <Text className="text-red-500 text-xs mt-1.5 ml-1">
                    {errors.pan}
                  </Text>
                )}
              </View>

              <DocumentUploadCard
                title="Upload PAN Card"
                subtitle="Take a photo or choose from gallery"
                imageUri={panPhoto}
                onUpload={setPanPhoto}
              />
            </View>

            {/* Continue Button */}
            <View className="pb-6 pt-2">
              <PrimaryButton
                title="Continue"
                onPress={handleNext}
                loading={loading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
