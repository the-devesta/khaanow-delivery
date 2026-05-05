import { Location } from "@/store/orders";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

/** Decode a Google / OSRM encoded polyline string into lat/lng array */
function decodePolyline(
  encoded: string,
): { latitude: number; longitude: number }[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const result: { latitude: number; longitude: number }[] = [];
  while (index < encoded.length) {
    let shift = 0;
    let value = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      value |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (value & 1) !== 0 ? ~(value >> 1) : value >> 1;
    shift = 0;
    value = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      value |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (value & 1) !== 0 ? ~(value >> 1) : value >> 1;
    result.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return result;
}

export interface RouteInfo {
  steps: {
    maneuver?: string;
    instruction: string;
    distanceText: string;
    endLocation: Location;
  }[];
  etaMin: number;
  distKm: number;
}

/** Haversine distance in metres between two lat/lng points */
export function haversineM(a: Location, b: Location): number {
  const R = 6371000;
  const dLat = (b.latitude - a.latitude) * (Math.PI / 180);
  const dLon = (b.longitude - a.longitude) * (Math.PI / 180);
  const lat1 = a.latitude * (Math.PI / 180);
  const lat2 = b.latitude * (Math.PI / 180);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

interface DeliveryMapProps {
  driverLocation: Location | null;
  pickupLocation?: Location;
  dropLocation?: Location;
  showRoute?: boolean;
  /** Highlight the active navigation phase on the map */
  navigationMode?: boolean;
  /** Which leg is being navigated */
  activePhase?: "pickup" | "dropoff";
  /** Called with basic route metrics when the road route is loaded */
  onRouteLoaded?: (info: RouteInfo) => void;
}

function isValidCoord(loc: Location | null | undefined): loc is Location {
  if (!loc) return false;
  if (loc.latitude === 0 && loc.longitude === 0) return false;
  if (loc.latitude === 28.5355 && loc.longitude === 77.391) return false;
  return true;
}

/**
 * Fetch road route. Tries Google Directions first; falls back to OSRM (free,
 * no key required) which uses the same encoded-polyline format.
 */
async function fetchRoadRoute(
  origin: Location,
  destination: Location,
): Promise<{ latitude: number; longitude: number }[]> {
  // ── 1. Google Directions ────────────────────────────────────────────────────
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const gUrl =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origin.latitude},${origin.longitude}` +
        `&destination=${destination.latitude},${destination.longitude}` +
        `&mode=driving` +
        `&key=${GOOGLE_MAPS_API_KEY}`;
      const gRes = await fetch(gUrl);
      const gData = await gRes.json();
      if (
        gData.status === "OK" &&
        gData.routes?.[0]?.overview_polyline?.points
      ) {
        return decodePolyline(gData.routes[0].overview_polyline.points);
      }
      console.log("[DeliveryMap] Google Directions status:", gData.status);
    } catch (e) {
      console.log("[DeliveryMap] Google Directions error:", e);
    }
  } else {
    console.log(
      "[DeliveryMap] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not set. Falling back to OSRM route.",
    );
  }

  // ── 2. OSRM fallback (free, no key) ────────────────────────────────────────
  try {
    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.longitude},${origin.latitude};` +
      `${destination.longitude},${destination.latitude}` +
      `?overview=full&geometries=polyline`;
    const osrmRes = await fetch(osrmUrl);
    const osrmData = await osrmRes.json();
    if (osrmData.code === "Ok" && osrmData.routes?.[0]?.geometry) {
      return decodePolyline(osrmData.routes[0].geometry);
    }
  } catch (e) {
    console.log("[DeliveryMap] OSRM error:", e);
  }

  return []; // straight-line fallback handled by caller
}

export default function DeliveryMap({
  driverLocation,
  pickupLocation,
  dropLocation,
  showRoute = true,
  navigationMode = false,
  activePhase,
  onRouteLoaded,
}: DeliveryMapProps) {
  void navigationMode;
  void activePhase;
  const mapRef = useRef<MapView>(null);
  const isFirstFit = useRef(true);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  // Fetch road-following route whenever pickup/drop change
  useEffect(() => {
    if (!isValidCoord(pickupLocation) || !isValidCoord(dropLocation)) return;
    fetchRoadRoute(pickupLocation, dropLocation).then((coords) => {
      setRouteCoords(coords);
      if (onRouteLoaded) {
        const distM = haversineM(pickupLocation!, dropLocation!);
        const distKm = Math.round(distM / 100) / 10;
        const etaMin = Math.max(1, Math.round(distM / (20000 / 60)));
        onRouteLoaded({ steps: [], etaMin, distKm });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickupLocation?.latitude,
    pickupLocation?.longitude,
    dropLocation?.latitude,
    dropLocation?.longitude,
  ]);

  const getInitialCenter = (): { latitude: number; longitude: number } => {
    if (isValidCoord(pickupLocation)) return pickupLocation;
    if (isValidCoord(dropLocation)) return dropLocation;
    if (isValidCoord(driverLocation)) return driverLocation;
    return { latitude: 20.5937, longitude: 78.9629 };
  };

  const center = getInitialCenter();

  // Fit map to all valid markers
  useEffect(() => {
    if (!mapRef.current) return;
    const coords: Location[] = [];
    if (isValidCoord(driverLocation)) coords.push(driverLocation);
    if (isValidCoord(pickupLocation)) coords.push(pickupLocation);
    if (isValidCoord(dropLocation)) coords.push(dropLocation);
    if (coords.length === 0) return;
    if (coords.length === 1) {
      mapRef.current.animateToRegion(
        { ...coords[0], latitudeDelta: 0.01, longitudeDelta: 0.01 },
        500,
      );
      return;
    }
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 60, bottom: 100, left: 60 },
      animated: !isFirstFit.current,
    });
    isFirstFit.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    driverLocation?.latitude,
    driverLocation?.longitude,
    pickupLocation?.latitude,
    pickupLocation?.longitude,
    dropLocation?.latitude,
    dropLocation?.longitude,
  ]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === "ios" ? undefined : PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={false}
        loadingEnabled
        customMapStyle={
          Platform.OS === "ios"
            ? undefined
            : [
                {
                  featureType: "water",
                  elementType: "geometry",
                  stylers: [{ color: "#C6DBEF" }],
                },
                {
                  featureType: "landscape",
                  elementType: "geometry",
                  stylers: [{ color: "#F9FAFB" }],
                },
                {
                  featureType: "road",
                  elementType: "geometry",
                  stylers: [{ color: "#FFFFFF" }],
                },
                { featureType: "poi", stylers: [{ visibility: "off" }] },
              ]
        }>
        {/* ── Restaurant / Pickup marker ── */}
        {isValidCoord(pickupLocation) && (
          <Marker
            coordinate={pickupLocation!}
            title="Pickup (Restaurant)"
            anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerWrap}>
              <View
                style={[styles.markerBubble, { backgroundColor: "#FFF5EB" }]}>
                <MaterialCommunityIcons
                  name="store"
                  size={20}
                  color="#FF6A00"
                />
              </View>
            </View>
          </Marker>
        )}

        {/* ── Customer / Drop marker ── */}
        {isValidCoord(dropLocation) && (
          <Marker
            coordinate={dropLocation!}
            title="Drop (Customer)"
            anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerWrap}>
              <View style={[styles.markerBubble, styles.dropBubble]}>
                <Text style={styles.dropLabel}>You</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* ── Driver / Scooter marker ── */}
        {isValidCoord(driverLocation) && (
          <Marker
            coordinate={driverLocation}
            title="Your Location"
            anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerWrap}>
              <View style={[styles.markerBubble, styles.driverBubble]}>
                <Ionicons name="bicycle" size={18} color="#fff" />
              </View>
            </View>
          </Marker>
        )}

        {/* ── Road route ── */}
        {showRoute &&
          isValidCoord(pickupLocation) &&
          isValidCoord(dropLocation) && (
            <Polyline
              coordinates={
                routeCoords.length > 0
                  ? routeCoords
                  : [pickupLocation!, dropLocation!]
              }
              strokeColor="#FF6A00"
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  driverBubble: {
    backgroundColor: "#FF6A00",
    borderColor: "#fff",
  },
  dropBubble: {
    backgroundColor: "#1F2937",
    borderColor: "#fff",
    paddingHorizontal: 10,
    width: "auto",
    borderRadius: 20,
  },
  dropLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
