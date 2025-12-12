import React from "react";
import { View, ViewProps } from "react-native";

interface CardContainerProps extends ViewProps {
  children: React.ReactNode;
  padding?: boolean;
}

export default function CardContainer({
  children,
  padding = true,
  style,
  ...props
}: CardContainerProps) {
  return (
    <View
      className={`bg-white rounded-2xl shadow-md ${padding ? "p-6" : ""}`}
      style={[
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 4,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
