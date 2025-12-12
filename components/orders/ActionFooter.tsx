import PrimaryButton from "@/components/ui/primary-button";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ActionFooterProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function ActionFooter({
  label,
  onPress,
  loading = false,
  disabled = false,
}: ActionFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-white border-t border-[#F3F4F6] px-5 py-4"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <PrimaryButton
        title={label}
        onPress={onPress}
        loading={loading}
        disabled={disabled}
      />
    </View>
  );
}
