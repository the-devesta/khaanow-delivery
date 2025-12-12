import { useAuthStore } from "@/store/auth";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

// Prevent auto-hiding of splash screen
SplashScreen.preventAutoHideAsync();

export default function CustomSplashScreen() {
  const router = useRouter();
  const { isAuthenticated, initializeAuth } = useAuthStore();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current; // Start normal
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const initialize = async () => {
      // Hide the Expo splash screen
      await SplashScreen.hideAsync();

      // Initialize auth state from storage
      await initializeAuth();

      // Smooth fade in and scale sequence
      Animated.sequence([
        // Initial fade in
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        // Hold for a moment
        Animated.delay(600),
        // Main zoom out effect with better timing
        Animated.parallel([
          // Logo zooms from normal to larger
          Animated.timing(scaleAnim, {
            toValue: 3.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          // Logo fades out as it zooms
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Navigate based on auth state
        if (isAuthenticated) {
          router.replace("/(tabs)");
        } else {
          router.replace("/auth/login");
        }
      });
    };

    initialize();
  }, [opacityAnim, router, scaleAnim, isAuthenticated, initializeAuth]);

  // Dynamic shadow based on scale
  const shadowOpacity = scaleAnim.interpolate({
    inputRange: [1, 3.5],
    outputRange: [0.25, 0],
  });

  const shadowRadius = scaleAnim.interpolate({
    inputRange: [1, 3.5],
    outputRange: [30, 0],
  });

  return (
    <View style={styles.container}>
      {/* Animated logo container with zoom-out effect */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            shadowOpacity: shadowOpacity,
            shadowRadius: shadowRadius,
          },
        ]}
      >
        {/* Main logo */}
        <Image
          source={require("../assets/images/logo1.png")}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF6A00",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6A00",
    shadowOffset: {
      width: 0,
      height: 15,
    },
    elevation: 15,
  },
  logo: {
    width: 280,
    height: 280,
    borderRadius: 140,
  },
});
