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

const VEHICLE_TYPES = [
  { id: "bicycle", name: "Bicycle", icon: "🚲", color: "#D1FAE5" },
  { id: "bike", name: "Bike", icon: "🏍️", color: "#FEF3C7" },
  { id: "scooter", name: "Scooter", icon: "🛵", color: "#DBEAFE" },
  { id: "car", name: "Car", icon: "🚗", color: "#FDE68A" },
];

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
            className="w-full h-36"
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
        <View className="py-6 px-4 items-center">
          <View className="w-12 h-12 bg-[#FFF5EB] rounded-full items-center justify-center mb-2">
            <Ionicons name="cloud-upload-outline" size={24} color="#FF6A00" />
          </View>
          <Text className="text-sm font-semibold text-[#374151] mb-1">
            {title}
          </Text>
          <Text className="text-xs text-[#9CA3AF] text-center">{subtitle}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function VehicleDetailsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [dlNumber, setDlNumber] = useState("");
  const [rcPhoto, setRcPhoto] = useState("");
  const [licensePhoto, setLicensePhoto] = useState("");
  const [errors, setErrors] = useState<{
    vehicle?: string;
    vehicleNum?: string;
    dl?: string;
  }>({});

  const validateVehicleNumber = (value: string) => {
    if (!/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/.test(value.toUpperCase())) {
      return "Invalid format (e.g., KA01AB1234)";
    }
    return "";
  };

  const validateDL = (value: string) => {
    if (value.length < 10) {
      return "DL number must be at least 10 characters";
    }
    return "";
  };

  const handleNext = () => {
    const newErrors: typeof errors = {};

    if (!selectedVehicle) {
      newErrors.vehicle = "Please select a vehicle type";
      setErrors(newErrors);
      return;
    }

    // Bicycle doesn't need vehicle documents
    if (selectedVehicle === "bicycle") {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        router.push({
          pathname: "/registration/profile-photo",
          params: {
            vehicleType: selectedVehicle,
            vehicleNumber: "BICYCLE",
            drivingLicenseNumber: "N/A",
          },
        });
      }, 400);
      return;
    }

    // For motorized vehicles, validate documents
    if (validateVehicleNumber(vehicleNumber)) {
      newErrors.vehicleNum = validateVehicleNumber(vehicleNumber);
    }
    if (validateDL(dlNumber)) {
      newErrors.dl = validateDL(dlNumber);
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!rcPhoto || !licensePhoto) {
      Alert.alert(
        "Documents Required",
        "Please upload both RC Book and Driving License photos."
      );
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: "/registration/profile-photo",
        params: {
          vehicleType: selectedVehicle,
          vehicleNumber: vehicleNumber.toUpperCase(),
          drivingLicenseNumber: dlNumber.toUpperCase(),
          rcPhoto,
          licensePhoto,
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
                <AnimatedStepIndicator currentStep={3} totalSteps={5} />
              </View>
              <View className="w-10" />
            </View>

            {/* Title Section */}
            <View className="bg-white rounded-3xl p-6 mb-5 shadow-sm">
              <View className="w-14 h-14 bg-[#FFF5EB] rounded-2xl items-center justify-center mb-4">
                <Text className="text-2xl">🚚</Text>
              </View>
              <Text className="text-2xl font-bold text-[#1A1A1A] mb-2">
                Vehicle Details
              </Text>
              <Text className="text-[15px] text-[#6B7280] leading-6">
                Add your vehicle information for smooth delivery operations.
              </Text>
            </View>

            {/* Vehicle Type Selection */}
            <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
              <Text className="text-lg font-bold text-[#1A1A1A] mb-4">
                Select Vehicle Type
              </Text>
              <View className="flex-row justify-between">
                {VEHICLE_TYPES.map((vehicle) => (
                  <TouchableOpacity
                    key={vehicle.id}
                    onPress={() => {
                      setSelectedVehicle(vehicle.id);
                      if (errors.vehicle) setErrors({ ...errors, vehicle: "" });
                    }}
                    activeOpacity={0.7}
                    className={`flex-1 mx-1 rounded-2xl p-4 items-center border-2 ${
                      selectedVehicle === vehicle.id
                        ? "border-[#FF6A00] bg-[#FFF5EB]"
                        : "border-transparent bg-[#F9FAFB]"
                    }`}
                  >
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center mb-2"
                      style={{ backgroundColor: vehicle.color }}
                    >
                      <Text className="text-2xl">{vehicle.icon}</Text>
                    </View>
                    <Text
                      className={`text-sm font-semibold ${
                        selectedVehicle === vehicle.id
                          ? "text-[#FF6A00]"
                          : "text-[#374151]"
                      }`}
                    >
                      {vehicle.name}
                    </Text>
                    {selectedVehicle === vehicle.id && (
                      <View className="absolute top-2 right-2">
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#FF6A00"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {errors.vehicle && (
                <Text className="text-red-500 text-xs mt-2 ml-1">
                  {errors.vehicle}
                </Text>
              )}
            </View>

            {/* Bicycle Info Message */}
            {selectedVehicle === "bicycle" && (
              <View className="bg-[#D1FAE5] rounded-3xl p-5 mb-5 flex-row items-center">
                <View className="w-12 h-12 bg-[#10B981] rounded-full items-center justify-center">
                  <Ionicons name="checkmark" size={24} color="white" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-base font-bold text-[#1A1A1A] mb-1">
                    No Documents Required
                  </Text>
                  <Text className="text-sm text-[#6B7280]">
                    Bicycle riders don&apos;t need vehicle registration or
                    driving license.
                  </Text>
                </View>
              </View>
            )}

            {/* Vehicle Number & RC - Hidden for Bicycle */}
            {selectedVehicle !== "bicycle" && (
              <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 bg-[#FEF3C7] rounded-xl items-center justify-center">
                    <Ionicons name="car" size={20} color="#F59E0B" />
                  </View>
                  <Text className="text-lg font-bold text-[#1A1A1A] ml-3">
                    Vehicle Registration
                  </Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-[#374151] mb-2">
                    Vehicle Number
                  </Text>
                  <View
                    className={`flex-row items-center bg-[#F9FAFB] rounded-xl px-4 border ${
                      errors.vehicleNum ? "border-red-400" : "border-[#E5E7EB]"
                    }`}
                  >
                    <Ionicons name="car-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      placeholder="e.g., KA01AB1234"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      maxLength={10}
                      value={vehicleNumber}
                      onChangeText={(text) => {
                        setVehicleNumber(text.toUpperCase());
                        if (errors.vehicleNum)
                          setErrors({ ...errors, vehicleNum: "" });
                      }}
                      className="flex-1 py-4 px-3 text-base text-[#1A1A1A]"
                    />
                    {vehicleNumber && !validateVehicleNumber(vehicleNumber) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10B981"
                      />
                    )}
                  </View>
                  {errors.vehicleNum && (
                    <Text className="text-red-500 text-xs mt-1.5 ml-1">
                      {errors.vehicleNum}
                    </Text>
                  )}
                </View>

                <DocumentUploadCard
                  title="Upload RC Book"
                  subtitle="Front page of Registration Certificate"
                  imageUri={rcPhoto}
                  onUpload={setRcPhoto}
                />
              </View>
            )}

            {/* Driving License - Hidden for Bicycle */}
            {selectedVehicle !== "bicycle" && (
              <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 bg-[#DBEAFE] rounded-xl items-center justify-center">
                    <Ionicons name="card" size={20} color="#3B82F6" />
                  </View>
                  <Text className="text-lg font-bold text-[#1A1A1A] ml-3">
                    Driving License
                  </Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-[#374151] mb-2">
                    DL Number
                  </Text>
                  <View
                    className={`flex-row items-center bg-[#F9FAFB] rounded-xl px-4 border ${
                      errors.dl ? "border-red-400" : "border-[#E5E7EB]"
                    }`}
                  >
                    <Ionicons name="card-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      placeholder="Enter Driving License number"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      value={dlNumber}
                      onChangeText={(text) => {
                        setDlNumber(text.toUpperCase());
                        if (errors.dl) setErrors({ ...errors, dl: "" });
                      }}
                      className="flex-1 py-4 px-3 text-base text-[#1A1A1A]"
                    />
                    {dlNumber && !validateDL(dlNumber) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10B981"
                      />
                    )}
                  </View>
                  {errors.dl && (
                    <Text className="text-red-500 text-xs mt-1.5 ml-1">
                      {errors.dl}
                    </Text>
                  )}
                </View>

                <DocumentUploadCard
                  title="Upload Driving License"
                  subtitle="Clear photo of your DL (front side)"
                  imageUri={licensePhoto}
                  onUpload={setLicensePhoto}
                />
              </View>
            )}

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
