import { Ionicons } from "@expo/vector-icons";
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

let NativeGlassView: React.ComponentType<any> | null = null;
let nativeGlassAvailable = false;

if (IS_IOS) {
  try {
    const glassEffect = require("expo-glass-effect");
    NativeGlassView = glassEffect.GlassView;
    nativeGlassAvailable =
      glassEffect.isGlassEffectAPIAvailable?.() ||
      glassEffect.isLiquidGlassAvailable?.() ||
      false;
  } catch {
    NativeGlassView = null;
    nativeGlassAvailable = false;
  }
}

export const supportsLiquidGlass = nativeGlassAvailable;

export function canUseSwiftUIGlass() {
  return nativeGlassAvailable;
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
  glassTint,
  fallbackBackgroundColor = "rgba(255,255,255,0.72)",
  fallbackBorderColor = "rgba(255,255,255,0.72)",
  pointerEvents,
}: GlassSurfaceProps) {
  if (IS_IOS && NativeGlassView && nativeGlassAvailable) {
    return (
      <View
        pointerEvents={pointerEvents}
        style={[
          {
            overflow: "hidden",
            borderRadius: shape === "capsule" ? 999 : cornerRadius,
            borderWidth: 1,
            borderColor: fallbackBorderColor,
            backgroundColor: "transparent",
          },
          style,
        ]}>
        <NativeGlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          colorScheme={tint === "dark" ? "dark" : tint === "light" ? "light" : "auto"}
          tintColor={glassTint}
          style={StyleSheetFill}
        />
        <View pointerEvents="none" style={StyleSheetFill} />
        {children}
      </View>
    );
  }

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
        <View
          pointerEvents="none"
          style={[
            StyleSheetFill,
            {
              backgroundColor:
                tint === "dark"
                  ? `rgba(0,0,0,${Math.min(intensity / 120, 0.58)})`
                  : "rgba(255,255,255,0.38)",
            },
          ]}
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
  const isOutline = variant === "outline";
  const fillColor = variant === "secondary" ? "#1F2937" : tintColor;
  const textColor = disabled ? "#6B7280" : isOutline ? tintColor : "#FFFFFF";

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
          disabled ? "#D1D5DB" : isOutline ? "rgba(255,255,255,0.62)" : fillColor
        }
        fallbackBorderColor={
          isOutline ? "rgba(245,158,11,0.55)" : "rgba(255,255,255,0.35)"
        }
        style={{
          minHeight: 52,
          alignItems: "center",
          justifyContent: "center",
        }}>
        {!isOutline ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheetFill,
              {
                backgroundColor: disabled ? "#D1D5DB" : fillColor,
                opacity: nativeGlassAvailable ? 0.92 : 1,
              },
            ]}
          />
        ) : null}
        {loading ? (
          <ActivityIndicator color={isOutline ? tintColor : "#fff"} />
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              zIndex: 1,
            }}>
            <Text
              style={{
                color: textColor,
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
