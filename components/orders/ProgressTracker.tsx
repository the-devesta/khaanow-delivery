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
    <View className="flex-row items-center justify-between">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;

        return (
          <React.Fragment key={index}>
            <View className="items-center flex-1">
              <View
                className={`w-12 h-12 rounded-full items-center justify-center mb-2  border-2 border-white ${
                  isCompleted
                    ? "bg-green-500"
                    : isActive
                      ? "bg-amber-500"
                      : "bg-gray-200"
                }`}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={20} color="white" />
                ) : (
                  <Ionicons
                    name={step.icon as any}
                    size={20}
                    color={isActive ? "white" : "#9CA3AF"}
                  />
                )}
              </View>
              <Text
                className={`text-[9px] font-semibold text-center leading-3 mt-1 ${
                  isCompleted || isActive ? "text-gray-900" : "text-gray-400"
                }`}
                numberOfLines={1}>
                {step.label}
              </Text>
            </View>

            {index < steps.length - 1 && (
              <View className="flex-1 h-0.5 bg-gray-200 mx-1 -mt-7 rounded-full">
                <View
                  className={`h-full rounded-full ${
                    isCompleted ? "bg-green-500" : "bg-gray-200"
                  }`}
                  style={{ width: isCompleted ? "100%" : "0%" }}
                />
              </View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
