import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { ApiService } from "@/services/api";

// Runs even when the app is backgrounded or the screen is locked, as long as
// the OS keeps the foreground service alive (see startLocationUpdatesAsync's
// `foregroundService` option). watchPositionAsync/setInterval-based tracking
// (the old approach) gets throttled or fully paused once JS stops running in
// the background, which silently made "online" riders invisible to dispatch
// eligibility (their lastLocation just went stale). This task is registered
// at module load time (imported once from app/_layout.tsx) so the OS can
// invoke it in a headless JS context without the app being in the foreground.
export const BACKGROUND_LOCATION_TASK = "background-location-task";

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[BackgroundLocationTask] error:", error.message);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const location = locations?.[locations.length - 1];
  if (!location) return;

  try {
    await ApiService.updateLocation(
      location.coords.latitude,
      location.coords.longitude,
      {
        accuracy: location.coords.accuracy,
        heading: location.coords.heading,
        mocked: (location as any).mocked ?? false,
      },
    );
  } catch (e) {
    console.error("[BackgroundLocationTask] failed to report location:", e);
  }
});
