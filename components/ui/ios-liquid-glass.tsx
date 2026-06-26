import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

const IS_IOS = Platform.OS === "ios";

export const supportsLiquidGlass = false;

export function canUseSwiftUIGlass() {
  return false;
}

type GlassSurfaceProps = PropsWithChildren<{
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  tint?: "light" | "dark" | "default";
  cornerRadius?: number;
  shape?: "rect" | "capsule" | "circle";
  interactive?: boolean;
  glassTint?: string;
  fallbackBackgroundColor?: string;
  fallbackBorderColor?: string;
  pointerEvents?: "box-none" | "none" | "box-only" | "auto";
}>;

export function IOSGlassSurface({
  children,
  style,
  intensity = 28,
  tint = "light",
  cornerRadius = 24,
  shape = "rect",
  fallbackBackgroundColor = "rgba(255,255,255,0.72)",
  fallbackBorderColor = "rgba(255,255,255,0.72)",
  pointerEvents,
}: GlassSurfaceProps) {
  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        {
          overflow: "hidden",
          borderRadius: shape === "capsule" ? 999 : cornerRadius,
          borderWidth: IS_IOS ? 1 : 0,
          borderColor: IS_IOS ? fallbackBorderColor : "transparent",
          backgroundColor: IS_IOS ? fallbackBackgroundColor : "transparent",
        },
        style,
      ]}>
      {IS_IOS ? (
        <BlurView
          intensity={intensity}
          tint={tint}
          style={{ ...StyleSheetFill }}
        />
      ) : null}
      {children}
    </View>
  );
}

const StyleSheetFill: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

type GlassButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline";
  tintColor?: string;
  icon?: React.ReactNode;
};

export function IOSGlassButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  tintColor = "#F59E0B",
  icon,
}: GlassButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={{
        width: "100%",
        minHeight: 52,
        borderRadius: 22,
        overflow: "hidden",
        opacity: disabled ? 0.65 : 1,
      }}>
      <IOSGlassSurface
        shape="capsule"
        cornerRadius={26}
        fallbackBackgroundColor={
          variant === "outline" ? "rgba(255,255,255,0.62)" : tintColor
        }
        fallbackBorderColor={
          variant === "outline" ? "rgba(245,158,11,0.55)" : "rgba(255,255,255,0.35)"
        }
        style={{
          minHeight: 52,
          alignItems: "center",
          justifyContent: "center",
        }}>
        {loading ? (
          <ActivityIndicator color={variant === "outline" ? tintColor : "#fff"} />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                color: variant === "outline" ? tintColor : "#fff",
                fontSize: 16,
                fontWeight: "800",
              }}>
              {title}
            </Text>
            {icon && <View style={{ marginLeft: 8 }}>{icon}</View>}
          </View>
        )}
      </IOSGlassSurface>
    </TouchableOpacity>
  );
}

export function IOSGlassIconButton({
  onPress,
  icon,
  color = "#F59E0B",
  size = 48,
}: {
  onPress?: () => void;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  systemImage?: string;
  color?: string;
  size?: number;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <IOSGlassSurface
        shape="circle"
        cornerRadius={size / 2}
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}>
        <Ionicons name={icon} size={Math.round(size * 0.5)} color={color} />
      </IOSGlassSurface>
    </TouchableOpacity>
  );
}
