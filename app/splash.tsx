import { useAuthStore } from "@/store/auth";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const KhaaoNowLogo = require("../assets/images/DeliveryKhaaoNow.png");

interface AnimatedSplashScreenProps {
  isAppReady: boolean;
  fontsLoaded: boolean;
  onAnimationComplete: () => void;
}

const MIN_DISPLAY_MS = 2400;
const BRAND_COLOR = "#FFD230";

SplashScreen.preventAutoHideAsync().catch(() => {});

export function Splash({
  isAppReady,
  fontsLoaded,
  onAnimationComplete,
}: AnimatedSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const exitStarted = useRef(false);

  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);
  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    logoOpacity.value = withTiming(1, { duration: 450 });
    logoScale.value = withSequence(
      withTiming(1.05, { duration: 600, easing: Easing.out(Easing.cubic) }),
      withRepeat(
        withSequence(
          withTiming(0.97, {
            duration: 900,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1.05, {
            duration: 900,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        true,
      ),
    );

    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale]);

  useEffect(() => {
    if (!isAppReady || !minTimeElapsed || exitStarted.current) return;

    exitStarted.current = true;
    containerScale.value = withTiming(1.04, { duration: 220 });
    containerOpacity.value = withTiming(0, { duration: 320 }, (finished) => {
      if (finished) {
        runOnJS(setIsVisible)(false);
        runOnJS(onAnimationComplete)();
      }
    });
  }, [
    isAppReady,
    minTimeElapsed,
    onAnimationComplete,
    containerOpacity,
    containerScale,
  ]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[logoStyle]}>
        <Image
          source={KhaaoNowLogo}
          style={styles.logo}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BRAND_COLOR,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  logo: {
    width: 260,
    height: 260,
  },
});

export default function SplashRoute() {
  const router = useRouter();
  const { initializeAuth, getNavigationRoute } = useAuthStore();
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 [Splash] Starting initialization...");
        await initializeAuth();
        console.log("✅ [Splash] Initialization complete");
        await SplashScreen.hideAsync();
        setIsAppReady(true);
      } catch (error) {
        console.error("❌ [Splash] Initialization failed:", error);
        await SplashScreen.hideAsync();
        setIsAppReady(true);
      }
    };

    initializeApp();
  }, [initializeAuth]);

  const handleAnimationComplete = () => {
    console.log("🎬 [Splash] Animation complete");
    const route = getNavigationRoute();
    console.log("🧭 [Splash] Navigating to:", route);
    router.replace(route as any);
  };

  return (
    <Splash
      isAppReady={isAppReady}
      fontsLoaded={true}
      onAnimationComplete={handleAnimationComplete}
    />
  );
}
