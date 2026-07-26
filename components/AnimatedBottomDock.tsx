import { Ionicons } from "@expo/vector-icons";
import {
  IOSGlassSurface,
  supportsLiquidGlass,
} from "@/components/ui/ios-liquid-glass";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { JSX, useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#F59E0B";
const CIRCLE_SIZE = 56;
const ACTIVE_WIDTH = 114;

const TAB_META = {
  index: {
    labelKey: "common.home",
    icon: (focused: boolean, color: string) => (
      <Ionicons
        name={focused ? "home" : "home-outline"}
        size={24}
        color={color}
      />
    ),
  },
  orders: {
    labelKey: "common.orders",
    icon: (focused: boolean, color: string) => (
      <Ionicons
        name={focused ? "list" : "list-outline"}
        size={24}
        color={color}
      />
    ),
  },
  earnings: {
    labelKey: "common.earnings",
    icon: (focused: boolean, color: string) => (
      <Ionicons
        name={focused ? "wallet" : "wallet-outline"}
        size={24}
        color={color}
      />
    ),
  },
  profile: {
    labelKey: "common.profile",
    icon: (focused: boolean, color: string) => (
      <Ionicons
        name={focused ? "person" : "person-outline"}
        size={24}
        color={color}
      />
    ),
  },
} satisfies Record<
  string,
  { labelKey: string; icon: (focused: boolean, color: string) => JSX.Element }
>;

type TabKey = keyof typeof TAB_META;

type TabDockItemProps = {
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  renderIcon: (focused: boolean, color: string) => JSX.Element;
};

function TabDockItem({
  label,
  isFocused,
  onPress,
  onLongPress,
  renderIcon,
}: TabDockItemProps) {
  const progress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: isFocused ? 1 : 0,
      stiffness: 180,
      damping: 18,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  }, [isFocused, progress]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCLE_SIZE, ACTIVE_WIDTH],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ marginHorizontal: 0 }}
    >
      <Animated.View
        style={[
          {
            width,
            height: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE,
            backgroundColor: isFocused
              ? supportsLiquidGlass
                ? "rgba(245,158,11,0.92)"
                : PRIMARY
              : supportsLiquidGlass
                ? "rgba(255,255,255,0.28)"
                : "#ffffff",
            borderWidth: supportsLiquidGlass ? 1 : 0,
            borderColor: supportsLiquidGlass
              ? "rgba(255,255,255,0.55)"
              : "transparent",
            transform: [{ scale }],
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",
          },
        ]}
      >
        {renderIcon(isFocused, isFocused ? "#ffffff" : PRIMARY)}
        {isFocused && (
          <Text
            style={{
              marginLeft: 8,
              color: "#ffffff",
              fontWeight: "600",
              fontSize: 13,
            }}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

type AnimatedBottomDockProps = BottomTabBarProps & {
  isVisible: boolean;
};

export default function AnimatedBottomDock({
  state,
  descriptors,
  navigation,
  isVisible,
}: AnimatedBottomDockProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isVisible ? 0 : 150,
      useNativeDriver: true,
      stiffness: 180,
      damping: 20,
      mass: 0.8,
    }).start();
  }, [isVisible, translateY]);

  return (
    <View
      pointerEvents="box-none"
      style={{ width: "100%", position: "absolute", bottom: 0 }}
    >
      <Animated.View
        style={{
          position: "absolute",
          bottom: Math.max(insets.bottom, 8) + 12,
          alignSelf: "center",
          paddingHorizontal: 5,
          paddingVertical: 5,
          backgroundColor: supportsLiquidGlass
            ? "rgba(255,255,255,0.24)"
            : "rgba(17,24,39,0.94)",
          borderWidth: 1,
          borderColor: supportsLiquidGlass
            ? "rgba(255,255,255,0.58)"
            : "rgba(255,255,255,0.12)",
          overflow: "hidden",
          borderRadius: 100,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.22,
          shadowRadius: 24,
          elevation: 12,
          transform: [{ translateY }],
        }}
        pointerEvents={isVisible ? "auto" : "none"}
      >
        {supportsLiquidGlass && (
          <IOSGlassSurface
            pointerEvents="none"
            shape="capsule"
            cornerRadius={100}
            intensity={30}
            fallbackBackgroundColor="rgba(255,255,255,0.24)"
            fallbackBorderColor="rgba(255,255,255,0.58)"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const meta = TAB_META[route.name as TabKey] ?? {
            labelKey: "",
            icon: (focused: boolean, color: string) => (
              <Ionicons
                name={focused ? "ellipse" : "ellipse-outline"}
                size={25}
                color={color}
              />
            ),
          };

          return (
            <TabDockItem
              key={route.key}
              label={
                meta.labelKey
                  ? t(meta.labelKey)
                  : String(options.tabBarLabel ?? options.title ?? route.name)
              }
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              renderIcon={meta.icon}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}
