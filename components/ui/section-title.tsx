import React from "react";
import { Text, TextProps } from "react-native";

interface SectionTitleProps extends TextProps {
  children: React.ReactNode;
}

export default function SectionTitle({
  children,
  ...props
}: SectionTitleProps) {
  return (
    <Text className="text-xl font-bold text-[#1A1A1A] mb-4" {...props}>
      {children}
    </Text>
  );
}
