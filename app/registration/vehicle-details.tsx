import AnimatedStepIndicator from "@/components/ui/animated-step-indicator";
import PrimaryButton from "@/components/ui/primary-button";
import { ApiService } from "@/services/api";
import { uploadImageToFirebase } from "@/services/storage";
import { OnboardingStatus, useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const VEHICLE_TYPES = [
  { id: "bicycle", name: "Bicycle", icon: "bicycle-outline" },
  { id: "bike", name: "Bike", icon: "bicycle" },
  { id: "scooter", name: "Scooter", icon: "speedometer-outline" },
  { id: "car", name: "Car", icon: "car-sport-outline" },
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
    const options = [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" as const },
    ];
    Alert.alert("Upload Document", "Choose an option", options);
  };

  return (
    <TouchableOpacity
      onPress={showOptions}
      activeOpacity={0.7}
      className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden mb-4 mt-2"
      style={{ minHeight: 140, justifyContent: "center" }}>
      {imageUri ? (
        <View className="relative w-full h-40">
          <Image
            source={{ uri: imageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute top-2 right-2 bg-green-500 rounded-full p-1.5 ">
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
          <TouchableOpacity
            onPress={showOptions}
            className="absolute bottom-2 right-2 bg-white rounded-full p-2 border border-gray-200">
            <Ionicons name="camera" size={18} color="#374151" />
          </TouchableOpacity>
        </View>
      ) : (
        <View className="py-6 px-4 items-center">
          <View className="w-12 h-12 bg-amber-50 rounded-full items-center justify-center mb-3 border border-amber-200">
            <Ionicons name="cloud-upload-outline" size={24} color="#F59E0B" />
          </View>
          <Text className="text-sm font-bold text-gray-700 mb-0.5">
            {title}
          </Text>
          <Text className="text-xs text-gray-400 text-center max-w-[200px]">
            {subtitle}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function VehicleDetailsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { updateOnboardingStatus } = useAuthStore();
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
  const insets = useSafeAreaInsets();

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

  const handleNext = async () => {
    const newErrors: typeof errors = {};

    if (!selectedVehicle) {
      newErrors.vehicle = "Please select a vehicle type";
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      let vehicleData: any = {
        vehicleType: selectedVehicle,
      };

      // Bicycle doesn't need vehicle documents
      if (selectedVehicle === "bicycle") {
        vehicleData.vehicleNumber = "BICYCLE";
        vehicleData.drivingLicenseNumber = "N/A";
      } else {
        // For motorized vehicles, validate documents
        if (validateVehicleNumber(vehicleNumber)) {
          newErrors.vehicleNum = validateVehicleNumber(vehicleNumber);
        }
        if (validateDL(dlNumber)) {
          newErrors.dl = validateDL(dlNumber);
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          setLoading(false);
          return;
        }

        if (!rcPhoto || !licensePhoto) {
          Alert.alert(
            "Documents Required",
            "Please upload both RC Book and Driving License photos.",
          );
          setLoading(false);
          return;
        }

        // Upload images to Firebase
        const rcUrl = await uploadImageToFirebase(rcPhoto, "vehicle_docs");
        const licenseUrl = await uploadImageToFirebase(
          licensePhoto,
          "vehicle_docs",
        );

        vehicleData.vehicleNumber = vehicleNumber.toUpperCase();
        vehicleData.drivingLicenseNumber = dlNumber.toUpperCase();
        vehicleData.rcPhoto = rcUrl;
        vehicleData.drivingLicensePhoto = licenseUrl;
      }

      const response = await ApiService.uploadDocuments(vehicleData);

      if (response.success) {
        await updateOnboardingStatus(OnboardingStatus.VEHICLE_INFO, 60);
        router.push({
          pathname: "/registration/profile-photo",
          params: vehicleData,
        });
      } else {
        Alert.alert(
          "Error",
          response.message || "Failed to save vehicle details",
        );
      }
    } catch (error: any) {
      console.error("Vehicle details upload error:", error);
      Alert.alert("Error", "Failed to save vehicle details. Please try again.");
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
          source={require("../../assets/images/reg-vehicle.png")}
          className="w-full h-full"
          resizeMode="cover"
        />
        {Platform.OS === "ios" ? (
          <BlurView
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1">
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
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                backgroundColor: "rgba(0,0,0,0.45)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.3)",
              }}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View className="items-center">
              <AnimatedStepIndicator currentStep={3} totalSteps={5} />
            </View>
          </View>

          {/* Main Content */}
          <View className="px-6 flex-1 justify-end pb-8">
            <View className="mb-8">
              <Text className="text-4xl font-extrabold text-white mb-2  tracking-tight">
                Vehicle Details
              </Text>
              <Text className="text-lg text-white/80 font-medium tracking-wide">
                Tell us what you drive
              </Text>
            </View>

            {/* Glassmorphism Form Card */}
            <View
              className="bg-white rounded-[32px] p-6 border-2 border-gray-200 shadow-lg shadow-black/20"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
              }}>
              {/* Vehicle Type Selection */}
              <View className="mb-6">
                <Text className="text-xs font-bold text-gray-600 mb-3 ml-1 uppercase tracking-wider">
                  Select Vehicle Type
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {VEHICLE_TYPES.map((vehicle) => (
                    <Pressable
                      key={vehicle.id}
                      onPress={() => {
                        setSelectedVehicle(vehicle.id);
                        if (errors.vehicle)
                          setErrors({ ...errors, vehicle: "" });
                      }}
                      style={{
                        width: "22%",
                        marginBottom: 4,
                      }}
                      android_ripple={{
                        color: "rgba(245,158,11,0.2)",
                        borderless: false,
                      }}>
                      <View
                        style={{
                          width: "100%",
                          aspectRatio: 0.9,
                          borderRadius: 16,
                          paddingVertical: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 2,
                          borderColor:
                            selectedVehicle === vehicle.id
                              ? "#D97706"
                              : "#D1D5DB",
                          backgroundColor:
                            selectedVehicle === vehicle.id
                              ? "#F59E0B"
                              : "#F3F4F6",
                          overflow: "hidden",
                          shadowColor:
                            selectedVehicle === vehicle.id ? "#F59E0B" : "#000",
                          shadowOffset: {
                            width: 0,
                            height: selectedVehicle === vehicle.id ? 4 : 1,
                          },
                          shadowOpacity:
                            selectedVehicle === vehicle.id ? 0.4 : 0.06,
                          shadowRadius: selectedVehicle === vehicle.id ? 8 : 2,
                          elevation: selectedVehicle === vehicle.id ? 6 : 1,
                        }}>
                        {/* Selected checkmark badge */}
                        {selectedVehicle === vehicle.id && (
                          <View
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: "#FFFFFF",
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                            <Ionicons
                              name="checkmark"
                              size={11}
                              color="#D97706"
                            />
                          </View>
                        )}
                        <View style={{ marginBottom: 6 }}>
                          <Ionicons
                            name={vehicle.icon as any}
                            size={32}
                            color={
                              selectedVehicle === vehicle.id
                                ? "#FFFFFF"
                                : "#4B5563"
                            }
                          />
                        </View>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color:
                              selectedVehicle === vehicle.id
                                ? "#FFFFFF"
                                : "#374151",
                          }}>
                          {vehicle.name}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                {errors.vehicle && (
                  <Text className="text-red-400 text-xs mt-1 ml-1 font-medium">
                    {errors.vehicle}
                  </Text>
                )}
              </View>

              {/* Bicycle Info Message */}
              {selectedVehicle === "bicycle" && (
                <View className="bg-green-500/10 rounded-2xl p-4 mb-6 flex-row items-center border border-green-500/20">
                  <View className="w-10 h-10 bg-green-500/20 rounded-full items-center justify-center">
                    <Ionicons name="checkmark" size={20} color="#4ADE80" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-bold text-green-400 mb-0.5">
                      No Documents Required
                    </Text>
                    <Text className="text-xs text-green-300 leading-4">
                      Bicycle riders don't need vehicle registration or license.
                    </Text>
                  </View>
                </View>
              )}

              {/* Vehicle Number & RC - Hidden for Bicycle */}
              {selectedVehicle !== "bicycle" && selectedVehicle !== "" && (
                <View>
                  {/* Vehicle Number */}
                  <View className="mb-6">
                    <Text className="text-xs font-bold text-gray-600 mb-2 ml-1 uppercase tracking-wider">
                      Vehicle Number
                    </Text>
                    <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-200 h-14 px-4 ">
                      <Ionicons name="car-outline" size={20} color="#6B7280" />
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
                        className="flex-1 ml-3 text-lg text-gray-900 font-semibold h-full"
                        selectionColor="#F59E0B"
                      />
                      {vehicleNumber &&
                        !validateVehicleNumber(vehicleNumber) && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#10B981"
                          />
                        )}
                    </View>
                    {errors.vehicleNum && (
                      <Text className="text-red-400 text-xs mt-1.5 ml-1 font-medium">
                        {errors.vehicleNum}
                      </Text>
                    )}

                    <DocumentUploadCard
                      title="Upload RC Book"
                      subtitle="Front page of Registration"
                      imageUri={rcPhoto}
                      onUpload={setRcPhoto}
                    />
                  </View>

                  <View className="h-[1px] bg-gray-200 mb-6" />

                  {/* Driving License */}
                  <View className="mb-6">
                    <Text className="text-xs font-bold text-gray-600 mb-2 ml-1 uppercase tracking-wider">
                      Driving License
                    </Text>
                    <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-200 h-14 px-4 ">
                      <Ionicons name="card-outline" size={20} color="#6B7280" />
                      <TextInput
                        placeholder="Enter DL number"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="characters"
                        value={dlNumber}
                        onChangeText={(text) => {
                          setDlNumber(text.toUpperCase());
                          if (errors.dl) setErrors({ ...errors, dl: "" });
                        }}
                        className="flex-1 ml-3 text-lg text-gray-900 font-semibold h-full"
                        selectionColor="#F59E0B"
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
                      <Text className="text-red-400 text-xs mt-1.5 ml-1 font-medium">
                        {errors.dl}
                      </Text>
                    )}

                    <DocumentUploadCard
                      title="Upload Driving License"
                      subtitle="Front side of your DL"
                      imageUri={licensePhoto}
                      onUpload={setLicensePhoto}
                    />
                  </View>
                </View>
              )}

              <PrimaryButton
                title="Continue"
                onPress={handleNext}
                loading={loading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
