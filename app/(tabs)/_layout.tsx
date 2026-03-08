import AnimatedBottomDock from "@/components/AnimatedBottomDock";
import { DockProvider, useDock } from "@/context/DockContext";
import "@/global.css";
import { socketService } from "@/services/socket";
import { useOrderStore } from "@/store/orders";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";

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
