import { useOrderStore } from "@/store/orders";
import { usePartnerStore } from "@/store/partner";
import { BACKGROUND_LOCATION_TASK } from "@/tasks/backgroundLocationTask";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";

interface LocationTrackingOptions {
  updateInterval?: number; // in milliseconds
  distanceThreshold?: number; // in meters
  enableBackgroundTracking?: boolean;
}

interface LocationTrackingState {
  isTracking: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
  } | null;
  error: string | null;
  permissionStatus: "granted" | "denied" | "undetermined";
}

export function useLocationTracking(options: LocationTrackingOptions = {}) {
  const {
    updateInterval = 30000, // 30 seconds default
    distanceThreshold = 50, // 50 meters
  } = options;

  const { isOnline } = usePartnerStore();
  const { updateLocation } = useOrderStore();

  const [state, setState] = useState<LocationTrackingState>({
    isTracking: false,
    currentLocation: null,
    error: null,
    permissionStatus: "undetermined",
  });

  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Request location permissions
  const requestPermissions = useCallback(async () => {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== "granted") {
        setState((prev) => ({
          ...prev,
          permissionStatus: "denied",
          error: "Location permission is required to track deliveries",
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        permissionStatus: "granted",
        error: null,
      }));

      // Background permission is separate from foreground and can be denied
      // independently (or unsupported on some OS versions) - don't block
      // foreground tracking on it, but it's required for the background
      // task to actually receive updates while the app isn't focused.
      try {
        await Location.requestBackgroundPermissionsAsync();
      } catch (error) {
        console.warn("Background location permission request failed:", error);
      }

      return true;
    } catch (error) {
      console.error("Error requesting location permissions:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to request location permissions",
      }));
      return false;
    }
  }, []);

  // Keeps location reporting alive via the OS (foreground service on
  // Android, background location mode on iOS) even when the app is
  // backgrounded or the screen is locked - watchPositionAsync/setInterval
  // below get throttled or fully paused in that state, which previously let
  // "online" riders silently go stale and drop out of dispatch eligibility.
  const startBackgroundTracking = useCallback(async () => {
    try {
      const { status: backgroundStatus } =
        await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") return;

      const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK,
      );
      if (alreadyStarted) return;

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: updateInterval,
        distanceInterval: distanceThreshold,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "KhaaoNow Delivery",
          notificationBody: "Tracking your location while you're online",
          notificationColor: "#F59E0B",
        },
        pausesUpdatesAutomatically: false,
      });
    } catch (error) {
      console.error("Failed to start background location tracking:", error);
    }
  }, [updateInterval, distanceThreshold]);

  const stopBackgroundTracking = useCallback(async () => {
    try {
      const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK,
      );
      if (alreadyStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (error) {
      console.error("Failed to stop background location tracking:", error);
    }
  }, []);

  // Get current location once
  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setState((prev) => ({
        ...prev,
        currentLocation: newLocation,
      }));

      return newLocation;
    } catch (error) {
      console.error("Error getting current location:", error);
      return null;
    }
  }, []);

  // Send location to backend
  const updateBackendLocation = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        if (isOnline) {
          await updateLocation(latitude, longitude);
          console.log("📍 Location updated:", { latitude, longitude });
        }
      } catch (error) {
        console.error("Failed to update location:", error);
      }
    },
    [isOnline, updateLocation],
  );

  // Start location tracking
  const startTracking = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        "Location Permission Required",
        "Please enable location permissions in settings to track deliveries.",
        [{ text: "OK" }],
      );
      return;
    }

    setState((prev) => ({ ...prev, isTracking: true }));

    // Get initial location
    const initialLocation = await getCurrentLocation();
    if (initialLocation) {
      await updateBackendLocation(
        initialLocation.latitude,
        initialLocation.longitude,
      );
    }

    // Set up continuous location watching
    locationWatchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: distanceThreshold,
        timeInterval: updateInterval,
      },
      async (location) => {
        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setState((prev) => ({
          ...prev,
          currentLocation: newLocation,
        }));

        // Only update backend if partner is online
        if (isOnline) {
          await updateBackendLocation(
            newLocation.latitude,
            newLocation.longitude,
          );
        }
      },
    );

    // Set up periodic backend updates even if position hasn't changed significantly
    intervalRef.current = setInterval(async () => {
      if (isOnline) {
        const location = await getCurrentLocation();
        if (location) {
          await updateBackendLocation(location.latitude, location.longitude);
        }
      }
    }, updateInterval);

    // OS-level background task - keeps reporting when the app is
    // backgrounded/locked, which the watch/interval above cannot do.
    await startBackgroundTracking();
  }, [
    requestPermissions,
    getCurrentLocation,
    updateBackendLocation,
    startBackgroundTracking,
    distanceThreshold,
    updateInterval,
    isOnline,
  ]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    stopBackgroundTracking();

    setState((prev) => ({ ...prev, isTracking: false }));
  }, [stopBackgroundTracking]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        isOnline
      ) {
        // App coming to foreground - refresh location
        getCurrentLocation().then((location) => {
          if (location) {
            updateBackendLocation(location.latitude, location.longitude);
          }
        });
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isOnline, getCurrentLocation, updateBackendLocation]);

  // Auto-start/stop tracking based on online status
  useEffect(() => {
    if (isOnline && !state.isTracking) {
      startTracking();
    } else if (!isOnline && state.isTracking) {
      stopTracking();
    }
  }, [isOnline, state.isTracking, startTracking, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
    getCurrentLocation,
    requestPermissions,
  };
}
