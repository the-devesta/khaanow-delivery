import { useAuthStore } from "@/store/auth";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const KhaaoNowLogo = require("../assets/images/KhaaoNowSplash.gif");

interface AnimatedSplashScreenProps {
  isAppReady: boolean;
  fontsLoaded: boolean;
  onAnimationComplete: () => void;
}

const MIN_DISPLAY_MS = 2400;
const TEXT_ENTER_DELAY_MS = 600;
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
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(28);
  const taglineOpacity = useSharedValue(0);

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

    textOpacity.value = withDelay(
      TEXT_ENTER_DELAY_MS,
      withTiming(1, { duration: 520 }),
    );
    textTranslateY.value = withDelay(
      TEXT_ENTER_DELAY_MS,
      withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    taglineOpacity.value = withDelay(
      TEXT_ENTER_DELAY_MS + 250,
      withTiming(1, { duration: 480 }),
    );

    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, textOpacity, textTranslateY, taglineOpacity]);

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

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
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

      <Animated.View style={[styles.textGroup, textStyle]}>
        <Text
          style={styles.brandText}
          allowFontScaling={false}
          adjustsFontSizeToFit={true}
          numberOfLines={1}>
          {fontsLoaded ? "KhaaoNow" : " "}
        </Text>
        <Animated.Text
          style={[styles.tagline, taglineStyle]}
          allowFontScaling={false}
          adjustsFontSizeToFit={true}
          numberOfLines={1}>
          {fontsLoaded ? "Delivery Partner" : " "}
        </Animated.Text>
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
  logoWrap: {
    width: 600,
    height: 600,
    borderRadius: 0,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  logo: {
    width: 600,
    height: 600,
  },
  textGroup: {
    alignItems: "center",
  },
  brandText: {
    fontFamily: "Poppins-Bold",
    fontSize: 36,
    color: "#ffffff",
    letterSpacing: 1.4,
  },
  tagline: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 1.2,
    marginTop: 6,
    textTransform: "uppercase",
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
