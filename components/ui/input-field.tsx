import { Colors } from "@/constants/colors";
import React from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function InputField({
  label,
  error,
  icon,
  ...props
}: InputFieldProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-semibold text-[#1A1A1A] mb-2">
          {label}
        </Text>
      )}
      <View className="flex-row items-center bg-[#F8F8F8] rounded-2xl px-4 py-4 border border-[#E5E5E5]">
        {icon && <View className="mr-3">{icon}</View>}
        <TextInput
          {...props}
          className="flex-1 text-base text-[#1A1A1A]"
          placeholderTextColor={Colors.textLight}
          style={{ padding: 0 }}
        />
      </View>
      {error && <Text className="text-red-500 text-xs mt-1 ml-2">{error}</Text>}
    </View>
  );
}
