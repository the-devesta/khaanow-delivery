import { useOrderStore } from "@/store/orders";
import { usePartnerStore } from "@/store/partner";
import { BACKGROUND_LOCATION_TASK } from "@/tasks/backgroundLocationTask";
import Constants from "expo-constants";
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
  backgroundPermissionDenied: boolean;
  lastSuccessfulUpdateAt: number | null;
}

// High-frequency profile while carrying an active order — this is what makes
// the rider move smoothly on customer/restaurant maps instead of jumping
// every 30s. Idle riders stay on the caller-provided (slow) profile.
const ACTIVE_DELIVERY_UPDATE_INTERVAL = 5000; // 5 seconds
const ACTIVE_DELIVERY_DISTANCE_THRESHOLD = 10; // 10 meters
const IS_EXPO_GO = Constants.appOwnership === "expo";

export function useLocationTracking(options: LocationTrackingOptions = {}) {
  const {
    updateInterval: idleUpdateInterval = 30000, // 30 seconds default
    distanceThreshold: idleDistanceThreshold = 50, // 50 meters
  } = options;

  const { isOnline } = usePartnerStore();
  const { updateLocation, activeOrders, activeOrder } = useOrderStore();

  const hasActiveDelivery = Boolean(
    activeOrder || (activeOrders && activeOrders.length > 0),
  );
  const updateInterval = hasActiveDelivery
    ? ACTIVE_DELIVERY_UPDATE_INTERVAL
    : idleUpdateInterval;
  const distanceThreshold = hasActiveDelivery
    ? ACTIVE_DELIVERY_DISTANCE_THRESHOLD
    : idleDistanceThreshold;

  const [state, setState] = useState<LocationTrackingState>({
    isTracking: false,
    currentLocation: null,
    error: null,
    permissionStatus: "undetermined",
    backgroundPermissionDenied: false,
    lastSuccessfulUpdateAt: null,
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

      if (IS_EXPO_GO) {
        // Expo Go cannot carry this app's Info.plist background-location keys
        // or background task capabilities. Keep foreground tracking alive for
        // testing, and let real dev/prod builds request background access.
        setState((prev) => ({
          ...prev,
          backgroundPermissionDenied: false,
        }));
      } else {
        // Background permission is separate from foreground and can be denied
        // independently (or unsupported on some OS versions) - don't block
        // foreground tracking on it, but it's required for the background
        // task to actually receive updates while the app isn't focused.
        try {
          const { status: backgroundStatus } =
            await Location.requestBackgroundPermissionsAsync();
          setState((prev) => ({
            ...prev,
            backgroundPermissionDenied: backgroundStatus !== "granted",
          }));
        } catch (error) {
          console.warn("Background location permission request failed:", error);
          setState((prev) => ({ ...prev, backgroundPermissionDenied: true }));
        }
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
    if (IS_EXPO_GO) {
      setState((prev) => ({ ...prev, backgroundPermissionDenied: false }));
      return;
    }

    try {
      const { status: backgroundStatus } =
        await Location.getBackgroundPermissionsAsync();
      setState((prev) => ({
        ...prev,
        backgroundPermissionDenied: backgroundStatus !== "granted",
      }));
      if (backgroundStatus !== "granted") return;

      // Restart if already running so a cadence change (idle <-> active
      // delivery) actually takes effect on the OS-level task.
      const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK,
      );
      if (alreadyStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

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
    async (
      latitude: number,
      longitude: number,
      metadata?: { heading?: number | null; accuracy?: number | null },
    ) => {
      try {
        if (isOnline) {
          const result = await updateLocation(latitude, longitude, metadata);
          if (result?.success === false) {
            console.error("Location update rejected by backend:", result);
            return;
          }
          console.log("📍 Location updated:", { latitude, longitude });
          setState((prev) => ({
            ...prev,
            lastSuccessfulUpdateAt: Date.now(),
          }));
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

    // Set up continuous location watching. While carrying an order, use
    // BestForNavigation for a tight, smooth GPS track the customer sees move
    // in real time; fall back to High when idle to save battery.
    locationWatchRef.current = await Location.watchPositionAsync(
      {
        accuracy: hasActiveDelivery
          ? Location.Accuracy.BestForNavigation
          : Location.Accuracy.High,
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
            {
              heading: location.coords.heading,
              accuracy: location.coords.accuracy,
            },
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
    hasActiveDelivery,
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

  // Restart the watchers when the cadence profile flips (idle <-> active
  // delivery) so the higher frequency actually takes effect mid-session.
  const cadenceRef = useRef({ updateInterval, distanceThreshold });
  useEffect(() => {
    const previous = cadenceRef.current;
    cadenceRef.current = { updateInterval, distanceThreshold };
    if (
      previous.updateInterval === updateInterval &&
      previous.distanceThreshold === distanceThreshold
    ) {
      return;
    }
    if (!state.isTracking || !isOnline) return;

    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    void startTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateInterval, distanceThreshold]);

  // Health-check: some Android OEMs (Xiaomi/Vivo/Oppo/OnePlus battery
  // managers) silently kill the background location foreground-service
  // without the app being notified — the rider's app still shows "online"
  // but lastLocation on the backend goes stale, silently dropping them out
  // of dispatch eligibility for every new order. Periodically verify the
  // OS task is still registered while online, and force an immediate ping +
  // restart it if it was killed.
  useEffect(() => {
    if (!isOnline || !state.isTracking) return;

    const HEALTH_CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
    const healthCheck = setInterval(async () => {
      try {
        const stillRunning = await Location.hasStartedLocationUpdatesAsync(
          BACKGROUND_LOCATION_TASK,
        );
        if (!stillRunning) {
          console.warn(
            "⚠️ Background location task was killed by the OS — restarting.",
          );
          await startBackgroundTracking();
        }
        // Force a fresh ping regardless, as cheap insurance against
        // watchPositionAsync silently stalling without erroring.
        const location = await getCurrentLocation();
        if (location) {
          await updateBackendLocation(location.latitude, location.longitude);
        }
      } catch (error) {
        console.error("Location health-check failed:", error);
      }
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => clearInterval(healthCheck);
  }, [
    isOnline,
    state.isTracking,
    startBackgroundTracking,
    getCurrentLocation,
    updateBackendLocation,
  ]);

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
