import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface Step {
  label: string;
  icon: string;
}

interface ProgressTrackerProps {
  currentStep: number;
  steps: Step[];
}

export default function ProgressTracker({
  currentStep,
  steps,
}: ProgressTrackerProps) {
  return (
    <View className="bg-white px-6 py-5">
      <View className="flex-row items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <React.Fragment key={index}>
              <View className="items-center flex-1">
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${
                    isCompleted
                      ? "bg-[#10B981]"
                      : isActive
                      ? "bg-[#FF6A00]"
                      : "bg-[#E5E7EB]"
                  }`}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={24} color="white" />
                  ) : (
                    <Ionicons
                      name={step.icon as any}
                      size={22}
                      color={isActive ? "white" : "#9CA3AF"}
                    />
                  )}
                </View>
                <Text
                  className={`text-xs font-semibold text-center ${
                    isCompleted || isActive
                      ? "text-[#1A1A1A]"
                      : "text-[#9CA3AF]"
                  }`}
                >
                  {step.label}
                </Text>
              </View>

              {index < steps.length - 1 && (
                <View className="flex-1 h-0.5 bg-[#E5E7EB] mx-1 -mt-8">
                  <View
                    className={`h-full ${
                      isCompleted ? "bg-[#10B981]" : "bg-[#E5E7EB]"
                    }`}
                    style={{ width: isCompleted ? "100%" : "0%" }}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
