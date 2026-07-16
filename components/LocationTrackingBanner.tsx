import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

// Health-check in useLocationTracking forces a ping every 2 minutes even
// when idle, so a healthy session should never go this long without a
// successful update. Padded well above that to avoid false positives from
// one slow/failed request.
const STALE_THRESHOLD_MS = 3 * 60 * 1000;

interface LocationTrackingBannerProps {
  isOnline: boolean;
  isTracking: boolean;
  permissionStatus: "granted" | "denied" | "undetermined";
  backgroundPermissionDenied: boolean;
  lastSuccessfulUpdateAt: number | null;
  onRetry: () => void;
}

export default function LocationTrackingBanner({
  isOnline,
  isTracking,
  permissionStatus,
  backgroundPermissionDenied,
  lastSuccessfulUpdateAt,
  onRetry,
}: LocationTrackingBannerProps) {
  // Staleness is time-based, not driven by a prop change - tick every 15s
  // while online so the banner actually appears/disappears without
  // requiring some unrelated re-render to happen to trigger it.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isOnline) return;
    const tick = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(tick);
  }, [isOnline]);

  if (!isOnline) return null;

  const permissionDenied = permissionStatus === "denied";
  const sinceLastUpdate = lastSuccessfulUpdateAt
    ? now - lastSuccessfulUpdateAt
    : null;
  const isStale =
    isTracking &&
    !permissionDenied &&
    sinceLastUpdate !== null &&
    sinceLastUpdate > STALE_THRESHOLD_MS;

  if (!permissionDenied && !backgroundPermissionDenied && !isStale) {
    return null;
  }

  const { title, message } = permissionDenied
    ? {
        title: "Location permission is off",
        message: "You won't receive new orders until this is fixed.",
      }
    : isStale
    ? {
        title: "Location tracking may have stopped",
        message:
          "Your position hasn't updated in a few minutes — riders showing offline may miss new orders.",
      }
    : {
        title: "Background location is off",
        message:
          "Tracking may stop when the app is closed or the screen locks.",
      };

  return (
    <View className="mx-4 mt-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        <Text className="text-red-700 font-bold text-sm">{title}</Text>
        <Text className="text-red-600/80 text-xs mt-0.5">{message}</Text>
      </View>
      <TouchableOpacity
        onPress={onRetry}
        className="rounded-full bg-red-600 px-4 py-2">
        <Text className="text-white font-semibold text-xs">Fix now</Text>
      </TouchableOpacity>
    </View>
  );
}
