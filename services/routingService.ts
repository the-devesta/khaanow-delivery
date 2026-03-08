/**
 * Routing Service — OSRM-based route polyline & ETA
 * Uses the public OSRM demo server (replace with self-hosted for production)
 */

export interface RouteStep {
  instruction: string;
  distance: number; // metres
  duration: number; // seconds
  distanceText: string;
  maneuver?: string;
  endLocation: { latitude: number; longitude: number };
}

export interface RouteResult {
  coordinates: { latitude: number; longitude: number }[];
  steps: RouteStep[];
  distKm: number;
  etaMin: number;
}

const OSRM_BASE = "https://router.project-osrm.org";

/**
 * Fetch a driving route from origin → destination using OSRM.
 * Returns decoded polyline coordinates, turn-by-turn steps, distance & ETA.
 */
export async function getRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): Promise<RouteResult> {
  const url =
    `${OSRM_BASE}/route/v1/driving/` +
    `${origin.longitude},${origin.latitude};` +
    `${destination.longitude},${destination.latitude}` +
    `?steps=true&geometries=geojson&overview=full&annotations=false`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`OSRM request failed: ${response.status}`);

  const data = await response.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No route found from OSRM");
  }

  const route = data.routes[0];
  const distKm = parseFloat((route.distance / 1000).toFixed(1));
  const etaMin = Math.ceil(route.duration / 60);

  // Decode GeoJSON coordinates [lng, lat] → { latitude, longitude }
  const coordinates: { latitude: number; longitude: number }[] =
    route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
      latitude: lat,
      longitude: lng,
    }));

  // Extract turn-by-turn steps
  const steps: RouteStep[] = [];
  for (const leg of route.legs || []) {
    for (const step of leg.steps || []) {
      const endCoord = step.geometry?.coordinates?.at(-1);
      steps.push({
        instruction:
          step.maneuver?.instruction || formatManeuver(step.maneuver),
        distance: step.distance,
        duration: step.duration,
        distanceText: formatDistance(step.distance),
        maneuver: step.maneuver?.type,
        endLocation: endCoord
          ? { latitude: endCoord[1], longitude: endCoord[0] }
          : destination,
      });
    }
  }

  return { coordinates, steps, distKm, etaMin };
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

function formatManeuver(maneuver: any): string {
  if (!maneuver) return "Continue";
  const type = (maneuver.type || "").replace(/-/g, " ");
  const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : "";
  return (
    `${type}${modifier}`.replace(/\b\w/g, (c) => c.toUpperCase()) || "Continue"
  );
}
