import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CardContainer from "./card-container";

interface DocumentUploaderProps {
  label: string;
  description?: string;
  imageUri?: string;
  onImageSelect: (uri: string) => void;
  loading?: boolean;
}

export default function DocumentUploader({
  label,
  description,
  imageUri,
  onImageSelect,
  loading = false,
}: DocumentUploaderProps) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelect(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelect(result.assets[0].uri);
    }
  };

  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-[#1A1A1A] mb-2">{label}</Text>
      {description && (
        <Text className="text-xs text-[#7A7A7A] mb-3">{description}</Text>
      )}

      <CardContainer padding={false}>
        {imageUri ? (
          <View className="relative">
            <Image
              source={{ uri: imageUri }}
              className="w-full h-48 rounded-2xl"
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={pickImage}
              className="absolute bottom-3 right-3 bg-[#FF6A00] rounded-full p-3 shadow-lg"
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="p-6">
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <>
                <View className="items-center mb-4">
                  <View className="w-20 h-20 bg-[#F8F8F8] rounded-full items-center justify-center mb-3">
                    <Ionicons
                      name="cloud-upload-outline"
                      size={36}
                      color={Colors.primary}
                    />
                  </View>
                  <Text className="text-sm text-[#7A7A7A] text-center">
                    Upload document photo
                  </Text>
                </View>

                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    onPress={takePhoto}
                    className="flex-1 bg-[#F8F8F8] py-3 rounded-xl flex-row items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={20}
                      color={Colors.textDark}
                    />
                    <Text className="ml-2 text-sm font-semibold text-[#1A1A1A]">
                      Camera
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={pickImage}
                    className="flex-1 bg-[#F8F8F8] py-3 rounded-xl flex-row items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="images-outline"
                      size={20}
                      color={Colors.textDark}
                    />
                    <Text className="ml-2 text-sm font-semibold text-[#1A1A1A]">
                      Gallery
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </CardContainer>
    </View>
  );
}
