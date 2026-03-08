import PrimaryButton from "@/components/ui/primary-button";
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
      className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 shadow-2xl"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <PrimaryButton
        title={label}
        onPress={onPress}
        loading={loading}
        disabled={disabled}
      />
    </View>
  );
}
