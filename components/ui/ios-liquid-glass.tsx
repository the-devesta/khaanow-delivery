import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

const IS_IOS = Platform.OS === "ios";
const IOS_MAJOR_VERSION =
  typeof Platform.Version === "string"
    ? parseInt(Platform.Version, 10)
    : Number(Platform.Version);

export const supportsLiquidGlass = IS_IOS && IOS_MAJOR_VERSION >= 26;

let SwiftUI: any = {};
let SwiftUIModifiers: any = {};
let swiftUILoadError: string | null = null;

if (IS_IOS) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SwiftUI = require("@expo/ui/swift-ui");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SwiftUIModifiers = require("@expo/ui/swift-ui/modifiers");
  } catch (error: any) {
    swiftUILoadError = error?.message ?? "Unknown SwiftUI load error";
  }
}

if (__DEV__ && IS_IOS && swiftUILoadError) {
  console.warn("SwiftUI Liquid Glass fallback active:", swiftUILoadError);
}

export function canUseSwiftUIGlass() {
  return (
    supportsLiquidGlass &&
    !swiftUILoadError &&
    SwiftUI?.Host &&
    SwiftUIModifiers?.glassEffect
  );
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
  interactive = true,
  glassTint = "rgba(255,255,255,0.12)",
  fallbackBackgroundColor = "rgba(255,255,255,0.72)",
  fallbackBorderColor = "rgba(255,255,255,0.72)",
  pointerEvents,
}: GlassSurfaceProps) {
  const swiftShape = shape === "rect" ? "roundedRectangle" : shape;
  const useSwiftUIGlass =
    canUseSwiftUIGlass() &&
    SwiftUI.Host &&
    SwiftUI.HStack &&
    SwiftUI.Spacer &&
    SwiftUIModifiers.frame;

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
      {IS_IOS && useSwiftUIGlass ? (
        <View pointerEvents="none" style={{ ...StyleSheetFill }}>
          <SwiftUI.Host style={StyleSheetFill}>
            <SwiftUI.HStack
              spacing={0}
              modifiers={[
                SwiftUIModifiers.glassEffect({
                  shape: swiftShape,
                  cornerRadius,
                  glass: {
                    variant: "regular",
                    interactive,
                    tint: glassTint,
                  },
                }),
                SwiftUIModifiers.frame({
                  width: Dimensions.get("window").width,
                  height: 220,
                }),
              ]}>
              <SwiftUI.Spacer minLength={0} />
            </SwiftUI.HStack>
          </SwiftUI.Host>
        </View>
      ) : IS_IOS ? (
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
  if (IS_IOS && !loading && canUseSwiftUIGlass()) {
    const { Host, Button } = SwiftUI;
    const { buttonStyle, controlSize, tint, frame } = SwiftUIModifiers;
    if (Host && Button && buttonStyle && controlSize && tint && frame) {
      return (
        <View style={{ width: "100%", opacity: disabled ? 0.55 : 1 }}>
          <Host matchContents>
            <Button
              label={title}
              onPress={disabled ? undefined : onPress}
              modifiers={[
                buttonStyle(variant === "outline" ? "glass" : "glassProminent"),
                controlSize("extraLarge"),
                tint(variant === "secondary" ? "#1F2937" : tintColor),
                frame({ width: Dimensions.get("window").width - 48 }),
              ]}
            />
          </Host>
        </View>
      );
    }
  }

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
  systemImage,
  color = "#F59E0B",
  size = 48,
}: {
  onPress?: () => void;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  systemImage?: string;
  color?: string;
  size?: number;
}) {
  if (IS_IOS && canUseSwiftUIGlass() && SwiftUI.Button && SwiftUI.Image) {
    const { Host, Button, Image } = SwiftUI;
    const { buttonStyle, frame, glassEffect, tint, font } = SwiftUIModifiers;
    if (
      Host &&
      Button &&
      Image &&
      buttonStyle &&
      frame &&
      glassEffect &&
      tint &&
      font
    ) {
      return (
        <Host matchContents>
          <Button
            onPress={onPress}
            modifiers={[
              buttonStyle("plain"),
              frame({ width: size, height: size }),
              glassEffect({
                shape: "circle",
                glass: { variant: "regular", interactive: true },
              }),
            ]}>
            <Image
              systemName={systemImage ?? "magnifyingglass"}
              modifiers={[tint(color), font({ size: 21, weight: "semibold" })]}
            />
          </Button>
        </Host>
      );
    }
  }

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
