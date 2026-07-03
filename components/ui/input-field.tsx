import { Colors } from "@/constants/colors";
import { inputTextStyle } from "@/constants/form-styles";
import {
  IOSGlassSurface,
  supportsLiquidGlass,
} from "@/components/ui/ios-liquid-glass";
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
      <IOSGlassSurface
        shape="rect"
        cornerRadius={18}
        intensity={supportsLiquidGlass ? 34 : 0}
        fallbackBackgroundColor="rgba(255,255,255,0.62)"
        fallbackBorderColor="rgba(255,255,255,0.72)"
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: supportsLiquidGlass
            ? "rgba(255,255,255,0.72)"
            : "#E5E5E5",
          backgroundColor: supportsLiquidGlass ? undefined : "#F8F8F8",
        }}>
        {icon && <View className="mr-3">{icon}</View>}
        <TextInput
          {...props}
          className="flex-1 text-[#1A1A1A] font-semibold"
          placeholderTextColor={Colors.textLight}
          style={[inputTextStyle.base, props.style]}
        />
      </IOSGlassSurface>
      {error && <Text className="text-red-500 text-xs mt-1 ml-2">{error}</Text>}
    </View>
  );
}
