import React, { PropsWithChildren } from "react";
import { View, ViewProps } from "react-native";

type SafeBlurViewProps = PropsWithChildren<
  ViewProps & {
    intensity?: number;
    tint?: "light" | "dark" | "default";
  }
>;

export function SafeBlurView({
  children,
  intensity: _intensity,
  tint: _tint,
  style,
  ...props
}: SafeBlurViewProps) {
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
}
