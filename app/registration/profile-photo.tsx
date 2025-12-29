import AnimatedStepIndicator from "@/components/ui/animated-step-indicator";
import PrimaryButton from "@/components/ui/primary-button";
import { ApiService } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PHOTO_GUIDELINES = [
  {
    icon: "sunny-outline",
    text: "Use good natural lighting",
    color: "#F59E0B",
  },
  {
    icon: "eye-outline",
    text: "Face should be clearly visible",
    color: "#3B82F6",
  },
  {
    icon: "glasses-outline",
    text: "Remove sunglasses or hats",
    color: "#10B981",
  },
  {
    icon: "happy-outline",
    text: "Look straight at the camera",
    color: "#8B5CF6",
  },
];

export default function ProfilePhotoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
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
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const showOptions = () => {
    Alert.alert("Profile Photo", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleNext = async () => {
    if (!profilePhoto) {
      Alert.alert(
        "Photo Required",
        "Please upload a profile photo to continue."
      );
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.uploadDocuments({
        profilePhoto,
      });

      if (response.success) {
        router.push({
          pathname: "/registration/review-submit",
          params: { profilePhoto },
        });
      } else {
        Alert.alert(
          "Error",
          response.message || "Failed to upload profile photo"
        );
      }
    } catch (error: any) {
      console.error("Profile photo upload error:", error);
      Alert.alert("Error", "Failed to upload profile photo. Please try again.");
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
              <AnimatedStepIndicator currentStep={4} totalSteps={5} />
            </View>
            <View className="w-10" />
          </View>

          {/* Title Section */}
          <View className="bg-white rounded-3xl p-6 mb-5 shadow-sm">
            <View className="w-14 h-14 bg-[#FFF5EB] rounded-2xl items-center justify-center mb-4">
              <Ionicons name="camera" size={28} color="#FF6A00" />
            </View>
            <Text className="text-2xl font-bold text-[#1A1A1A] mb-2">
              Profile Photo
            </Text>
            <Text className="text-[15px] text-[#6B7280] leading-6">
              Add a clear photo of yourself. This helps restaurants and
              customers identify you.
            </Text>
          </View>

          {/* Profile Photo Section */}
          <View className="bg-white rounded-3xl p-6 shadow-sm mb-5 items-center">
            <TouchableOpacity
              onPress={showOptions}
              activeOpacity={0.8}
              className="relative"
            >
              {profilePhoto ? (
                <View className="relative">
                  <Image
                    source={{ uri: profilePhoto }}
                    className="w-44 h-44 rounded-full"
                    resizeMode="cover"
                  />
                  <View className="absolute -bottom-1 -right-1 bg-[#10B981] rounded-full p-2">
                    <Ionicons name="checkmark" size={20} color="white" />
                  </View>
                </View>
              ) : (
                <View className="w-44 h-44 bg-[#F9FAFB] rounded-full items-center justify-center border-4 border-dashed border-[#E5E7EB]">
                  <View className="w-16 h-16 bg-[#FFF5EB] rounded-full items-center justify-center mb-2">
                    <Ionicons name="person" size={32} color="#FF6A00" />
                  </View>
                  <Text className="text-sm text-[#9CA3AF] font-medium">
                    Tap to add
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={showOptions}
                className="absolute bottom-0 right-0 bg-[#FF6A00] rounded-full p-3 shadow-lg"
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={22} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>

            {profilePhoto && (
              <TouchableOpacity
                onPress={showOptions}
                className="mt-4 px-6 py-2 bg-[#FFF5EB] rounded-full"
                activeOpacity={0.7}
              >
                <Text className="text-[#FF6A00] font-semibold">
                  Change Photo
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Guidelines */}
          <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
            <Text className="text-lg font-bold text-[#1A1A1A] mb-4">
              Photo Guidelines
            </Text>
            {PHOTO_GUIDELINES.map((item, index) => (
              <View
                key={index}
                className={`flex-row items-center ${
                  index < PHOTO_GUIDELINES.length - 1 ? "mb-4" : ""
                }`}
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={item.color}
                  />
                </View>
                <Text className="text-[15px] text-[#374151] ml-3 flex-1">
                  {item.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          {!profilePhoto && (
            <View className="bg-white rounded-3xl p-5 shadow-sm mb-5">
              <TouchableOpacity
                onPress={takePhoto}
                className="bg-[#FF6A00] py-4 rounded-2xl flex-row items-center justify-center mb-3"
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={22} color="white" />
                <Text className="ml-2 text-base font-semibold text-white">
                  Take Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={pickImage}
                className="bg-[#F9FAFB] py-4 rounded-2xl flex-row items-center justify-center border border-[#E5E7EB]"
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={22} color="#374151" />
                <Text className="ml-2 text-base font-semibold text-[#374151]">
                  Choose from Gallery
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Continue Button */}
          <View className="pb-6 pt-2">
            <PrimaryButton
              title="Continue"
              onPress={handleNext}
              loading={loading}
              disabled={!profilePhoto}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
