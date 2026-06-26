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

const KhaaoNowLogo = require("../assets/images/DeliveryKhaaoNow.png");

interface AnimatedSplashScreenProps {
  isAppReady: boolean;
  fontsLoaded: boolean;
  onAnimationComplete: () => void;
}

const MIN_DISPLAY_MS = 2400;
const TEXT_ENTER_DELAY_MS = 600;
const BRAND_COLOR = "#F7B731";
const CIRCLE_COLOR = "#FFEC56";

SplashScreen.preventAutoHideAsync().catch(() => {});

export function AnimatedSplashScreen({
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
  const circleScale = useSharedValue(0.9);
  const circleOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(28);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    circleOpacity.value = withTiming(1, { duration: 450 });
    circleScale.value = withSequence(
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
  }, []);

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

  const circleStyle = useAnimatedStyle(() => ({
    opacity: circleOpacity.value,
    transform: [{ scale: circleScale.value }],
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
      <Animated.View style={[styles.circleWrap, circleStyle]}>
        <Animated.Image
          source={KhaaoNowLogo}
          style={[styles.logo, logoStyle]}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.textGroup, textStyle]}>
        <Text
          style={styles.brandText}
          allowFontScaling={false}
          adjustsFontSizeToFit={true}
          numberOfLines={1}
        >
          {fontsLoaded ? "KhaaoNow" : " "}
        </Text>
        <Animated.Text
          style={[styles.tagline, taglineStyle]}
          allowFontScaling={false}
          adjustsFontSizeToFit={true}
          numberOfLines={1}
        >
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
  circleWrap: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: CIRCLE_COLOR,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 160,
    height: 160,
  },
  textGroup: {
    alignItems: "center",
  },
  brandText: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 32,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 1,
    marginTop: 6,
    textTransform: "uppercase",
  },
});
