import AnimatedBottomDock from "@/components/AnimatedBottomDock";
import { DockProvider, useDock } from "@/context/DockContext";
import "@/global.css";
import { socketService } from "@/services/socket";
import { useOrderStore } from "@/store/orders";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { AppState, Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const BRAND_COLOR = "#F7B731";
const INACTIVE_COLOR = "#94a3b8";

function TabsContent() {
  const { isDockVisible } = useDock();
  const { initializeSocket } = useOrderStore();

  useEffect(() => {
    initializeSocket();

    // Re-ensure socket is live whenever the app moves back to foreground
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        socketService.ensureConnected();
      }
    });

    return () => appStateSub.remove();
  }, [initializeSocket]);

  // iOS glass tabs with blur
  if (Platform.OS === "ios") {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: BRAND_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarBackground: () => (
            <BlurView intensity={90} style={{ flex: 1 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                }}
              />
            </BlurView>
          ),
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 1,
            borderTopColor: "rgba(229, 231, 235, 0.3)",
            height: 83,
            paddingBottom: 24,
            paddingTop: 8,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
            marginTop: 4,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            title: "Earnings",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    );
  }

  // Android fallback with custom dock
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: "none" },
      }}
      tabBar={(props) => (
        <AnimatedBottomDock {...props} isVisible={isDockVisible} />
      )}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="earnings" options={{ title: "Earnings" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <DockProvider>
      <TabsContent />
    </DockProvider>
  );
}
