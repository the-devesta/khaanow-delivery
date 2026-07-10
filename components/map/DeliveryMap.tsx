import { Location } from "@/store/orders";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

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
  navigationMode?: boolean;
  activePhase?: "pickup" | "dropoff";
  onRouteLoaded?: (info: RouteInfo) => void;
}

type MapKind = "standard" | "satellite" | "hybrid";
type RouteFetchResult = {
  coordinates: { latitude: number; longitude: number }[];
  etaMin: number;
  distKm: number;
};

function isValidCoord(loc: Location | null | undefined): loc is Location {
  if (!loc) return false;
  if (loc.latitude === 0 && loc.longitude === 0) return false;
  if (loc.latitude === 28.5355 && loc.longitude === 77.391) return false;
  return true;
}

function areSameCoord(a?: Location | null, b?: Location | null): boolean {
  if (!isValidCoord(a) || !isValidCoord(b)) return false;
  return (
    Math.abs(a.latitude - b.latitude) < 0.00001 &&
    Math.abs(a.longitude - b.longitude) < 0.00001
  );
}

function getNextMapType(type: MapKind): MapKind {
  if (type === "standard") return "satellite";
  if (type === "satellite") return "hybrid";
  return "standard";
}

function getStraightLineMetrics(origin: Location, destination: Location) {
  const distM = haversineM(origin, destination);
  return {
    distKm: Math.round(distM / 100) / 10,
    etaMin: Math.max(1, Math.round(distM / (20000 / 60))),
  };
}

function getDistanceM(origin?: Location | null, destination?: Location | null) {
  if (!isValidCoord(origin) || !isValidCoord(destination)) return Infinity;
  return haversineM(origin, destination);
}

async function fetchDistanceMatrixMetrics(
  origin: Location,
  destination: Location,
): Promise<{ etaMin: number; distKm: number } | null> {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.includes("YOUR_")) {
    return null;
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${origin.latitude},${origin.longitude}` +
      `&destinations=${destination.latitude},${destination.longitude}` +
      `&mode=driving` +
      `&departure_time=now` +
      `&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const element = data.rows?.[0]?.elements?.[0];
    if (data.status !== "OK" || element?.status !== "OK") return null;

    const durationSeconds =
      element.duration_in_traffic?.value ?? element.duration?.value;
    const distanceMetres = element.distance?.value;
    if (typeof durationSeconds !== "number" || typeof distanceMetres !== "number") {
      return null;
    }

    return {
      etaMin: Math.max(1, Math.ceil(durationSeconds / 60)),
      distKm: Math.round(distanceMetres / 100) / 10,
    };
  } catch (error) {
    console.log("[DeliveryMap] Distance Matrix error:", error);
    return null;
  }
}

function parseGoogleDurationSeconds(duration?: string): number | null {
  if (!duration) return null;
  const seconds = Number.parseFloat(duration.replace("s", ""));
  return Number.isFinite(seconds) ? seconds : null;
}

async function fetchGoogleRoutesApiRoute(
  origin: Location,
  destination: Location,
  travelMode: "TWO_WHEELER" | "DRIVE",
): Promise<RouteFetchResult | null> {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.includes("YOUR_")) {
    return null;
  }

  try {
    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.latitude,
                longitude: origin.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
            },
          },
          travelMode,
          routingPreference: "TRAFFIC_AWARE",
          computeAlternativeRoutes: false,
          polylineQuality: "HIGH_QUALITY",
          polylineEncoding: "ENCODED_POLYLINE",
          languageCode: "en-IN",
          units: "METRIC",
        }),
      },
    );
    const data = await res.json();
    const route = data.routes?.[0];
    const encodedPolyline = route?.polyline?.encodedPolyline;
    if (!res.ok || !encodedPolyline) {
      console.log(
        `[DeliveryMap] Routes API ${travelMode} failed:`,
        data.error?.message ?? data.status ?? res.status,
      );
      return null;
    }

    const durationSeconds = parseGoogleDurationSeconds(route.duration);
    const distanceMeters = route.distanceMeters;
    const fallbackMetrics = getStraightLineMetrics(origin, destination);

    return {
      coordinates: decodePolyline(encodedPolyline),
      etaMin:
        typeof durationSeconds === "number"
          ? Math.max(1, Math.ceil(durationSeconds / 60))
          : fallbackMetrics.etaMin,
      distKm:
        typeof distanceMeters === "number"
          ? Math.round(distanceMeters / 100) / 10
          : fallbackMetrics.distKm,
    };
  } catch (error) {
    console.log(`[DeliveryMap] Routes API ${travelMode} error:`, error);
    return null;
  }
}

async function fetchRoadRoute(
  origin: Location,
  destination: Location,
): Promise<RouteFetchResult> {
  const fallbackMetrics = getStraightLineMetrics(origin, destination);

  if (GOOGLE_MAPS_API_KEY && !GOOGLE_MAPS_API_KEY.includes("YOUR_")) {
    const twoWheelerRoute = await fetchGoogleRoutesApiRoute(
      origin,
      destination,
      "TWO_WHEELER",
    );
    if (twoWheelerRoute) return twoWheelerRoute;

    const driveRoute = await fetchGoogleRoutesApiRoute(
      origin,
      destination,
      "DRIVE",
    );
    if (driveRoute) return driveRoute;
  } else {
    console.log(
      "[DeliveryMap] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not set. Falling back to OSRM route.",
    );
  }

  if (GOOGLE_MAPS_API_KEY && !GOOGLE_MAPS_API_KEY.includes("YOUR_")) {
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
        const route = gData.routes[0];
        const leg = route.legs?.[0];
        const matrixMetrics = await fetchDistanceMatrixMetrics(
          origin,
          destination,
        );
        return {
          coordinates: decodePolyline(route.overview_polyline.points),
          etaMin:
            matrixMetrics?.etaMin ??
            (leg?.duration?.value
              ? Math.max(1, Math.ceil(leg.duration.value / 60))
              : fallbackMetrics.etaMin),
          distKm:
            matrixMetrics?.distKm ??
            (leg?.distance?.value
              ? Math.round(leg.distance.value / 100) / 10
              : fallbackMetrics.distKm),
        };
      }
      console.log("[DeliveryMap] Google Directions status:", gData.status);
    } catch (error) {
      console.log("[DeliveryMap] Google Directions error:", error);
    }
  }

  try {
    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.longitude},${origin.latitude};` +
      `${destination.longitude},${destination.latitude}` +
      `?overview=full&geometries=polyline`;
    const osrmRes = await fetch(osrmUrl);
    const osrmData = await osrmRes.json();
    if (osrmData.code === "Ok" && osrmData.routes?.[0]?.geometry) {
      const route = osrmData.routes[0];
      return {
        coordinates: decodePolyline(route.geometry),
        etaMin: route.duration
          ? Math.max(1, Math.ceil(route.duration / 60))
          : fallbackMetrics.etaMin,
        distKm: route.distance
          ? Math.round(route.distance / 100) / 10
          : fallbackMetrics.distKm,
      };
    }
  } catch (error) {
    console.log("[DeliveryMap] OSRM error:", error);
  }

  return {
    coordinates: [origin, destination],
    ...fallbackMetrics,
  };
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

  const mapRef = useRef<MapView>(null);
  const driverMarkerRef = useRef<InstanceType<typeof Marker>>(null);
  const initialDriverCoordRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const isFirstFit = useRef(true);
  const onRouteLoadedRef = useRef(onRouteLoaded);
  const lastRouteSignatureRef = useRef<string>("");
  const [mapType, setMapType] = useState<MapKind>("standard");
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  useEffect(() => {
    onRouteLoadedRef.current = onRouteLoaded;
  }, [onRouteLoaded]);

  const getInitialCenter = (): { latitude: number; longitude: number } => {
    if (isValidCoord(pickupLocation)) return pickupLocation;
    if (isValidCoord(dropLocation)) return dropLocation;
    if (isValidCoord(driverLocation)) return driverLocation;
    return { latitude: 20.5937, longitude: 78.9629 };
  };

  const center = getInitialCenter();
  const validPickupLocation = isValidCoord(pickupLocation)
    ? pickupLocation
    : null;
  const validDropLocation = isValidCoord(dropLocation) ? dropLocation : null;
  const validDriverLocation = isValidCoord(driverLocation)
    ? driverLocation
    : null;
  const driverHeading =
    typeof (driverLocation as any)?.heading === "number"
      ? (driverLocation as any).heading
      : 0;

  // Animate the driver marker smoothly instead of letting it snap between
  // GPS pings. The Marker's declarative `coordinate` prop is only used for
  // the very first position (captured once into a ref); every update after
  // that moves the marker imperatively so it doesn't fight the animation.
  useEffect(() => {
    if (!validDriverLocation) {
      initialDriverCoordRef.current = null;
      return;
    }
    if (!initialDriverCoordRef.current) {
      initialDriverCoordRef.current = {
        latitude: validDriverLocation.latitude,
        longitude: validDriverLocation.longitude,
      };
      return;
    }
    driverMarkerRef.current?.animateMarkerToCoordinate(
      {
        latitude: validDriverLocation.latitude,
        longitude: validDriverLocation.longitude,
      },
      1000,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validDriverLocation?.latitude, validDriverLocation?.longitude]);

  const routeOrigin =
    activePhase === "dropoff"
      ? validDriverLocation ?? validPickupLocation
      : validDriverLocation ?? validPickupLocation;
  const routeDestination =
    activePhase === "dropoff" ? validDropLocation : validPickupLocation;
  const canDrawRoute =
    showRoute && isValidCoord(routeOrigin) && isValidCoord(routeDestination);

  const updateRouteState = useCallback(
    (
      nextCoords: { latitude: number; longitude: number }[],
      info: RouteInfo,
    ) => {
      const coordSignature = nextCoords
        .map((coord) => `${coord.latitude.toFixed(6)},${coord.longitude.toFixed(6)}`)
        .join("|");
      const infoSignature = `${info.etaMin}|${info.distKm}|${info.steps.length}`;
      const nextSignature = `${coordSignature}::${infoSignature}`;

      if (lastRouteSignatureRef.current === nextSignature) {
        return;
      }

      lastRouteSignatureRef.current = nextSignature;
      setRouteCoords(nextCoords);
      onRouteLoadedRef.current?.(info);
    },
    [],
  );

  useEffect(() => {
    if (!canDrawRoute) {
      lastRouteSignatureRef.current = "";
      setRouteCoords([]);
      return;
    }
    if (areSameCoord(routeOrigin, routeDestination)) {
      lastRouteSignatureRef.current = "";
      setRouteCoords([]);
      return;
    }

    const fallbackCoords = [routeOrigin!, routeDestination!];
    const fallback = getStraightLineMetrics(routeOrigin!, routeDestination!);
    updateRouteState(fallbackCoords, {
      steps: [],
      etaMin: fallback.etaMin,
      distKm: fallback.distKm,
    });
    let cancelled = false;

    fetchRoadRoute(routeOrigin!, routeDestination!)
      .then((route) => {
        if (cancelled) return;
        const nextCoords =
          route.coordinates.length >= 2 ? route.coordinates : fallbackCoords;
        updateRouteState(nextCoords, {
          steps: [],
          etaMin: route.etaMin,
          distKm: route.distKm,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.log("[DeliveryMap] Route fetch failed:", error);
        updateRouteState(fallbackCoords, {
          steps: [],
          etaMin: fallback.etaMin,
          distKm: fallback.distKm,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    canDrawRoute,
    routeOrigin?.latitude,
    routeOrigin?.longitude,
    routeDestination?.latitude,
    routeDestination?.longitude,
    updateRouteState,
  ]);

  const fitMapToMarkers = useCallback(
    (animated = true) => {
      if (!mapRef.current) return;

      const coords: Location[] = [];
      if (isValidCoord(validDriverLocation)) coords.push(validDriverLocation);
      if (isValidCoord(validPickupLocation)) coords.push(validPickupLocation);
      if (isValidCoord(validDropLocation)) coords.push(validDropLocation);
      if (routeCoords.length > 1) {
        coords.push(...routeCoords);
      }

      if (coords.length === 0) return;

      if (coords.length === 1) {
        mapRef.current.animateToRegion(
          { ...coords[0], latitudeDelta: 0.018, longitudeDelta: 0.018 },
          500,
        );
        return;
      }

      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 130, right: 115, bottom: 135, left: 115 },
        animated,
      });
    },
    [
      routeCoords,
      validDriverLocation,
      validDropLocation,
      validPickupLocation,
    ],
  );

  useEffect(() => {
    fitMapToMarkers(!isFirstFit.current);
    isFirstFit.current = false;
  }, [fitMapToMarkers]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
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
        pitchEnabled={false}
        rotateEnabled={false}
        showsBuildings={false}
        loadingEnabled
        onMapReady={() => {
          setTimeout(() => fitMapToMarkers(false), 250);
        }}
        customMapStyle={[
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
        ]}>
        {routeCoords.length > 1 && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor="rgba(255,255,255,0.95)"
              strokeWidth={10}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor="#FF6A00"
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {validPickupLocation && (
          <Marker coordinate={validPickupLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.markerBubble, styles.pickupBubble]}>
              <MaterialCommunityIcons name="store" size={20} color="#FF6A00" />
            </View>
          </Marker>
        )}

        {validDropLocation && (
          <Marker coordinate={validDropLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.markerBubble, styles.dropBubble]}>
              <Ionicons name="person" size={18} color="#fff" />
            </View>
          </Marker>
        )}

        {validDriverLocation && (
          <Marker
            ref={driverMarkerRef}
            coordinate={initialDriverCoordRef.current ?? validDriverLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={Platform.OS === "android"}
            rotation={driverHeading}>
            <View style={[styles.markerBubble, styles.driverBubble]}>
              <MaterialCommunityIcons name="motorbike" size={18} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.controlButton}
          activeOpacity={0.8}
          onPress={() => setMapType((type) => getNextMapType(type))}>
          <Ionicons
            name={mapType === "standard" ? "layers-outline" : "map-outline"}
            size={20}
            color={mapType === "standard" ? "#1F2937" : "#FF6A00"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          activeOpacity={0.8}
          onPress={() => fitMapToMarkers(true)}>
          <Ionicons name="locate-outline" size={20} color="#1F2937" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 24,
    marginHorizontal: 5,
    borderTopRightRadius: 24,
    borderBottomEndRadius: 24,
    borderBottomStartRadius: 24,
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  driverBubble: {
    backgroundColor: "#FF6A00",
  },
  pickupBubble: {
    backgroundColor: "#FFF5EB",
  },
  dropBubble: {
    backgroundColor: "#111827",
  },
  mapControls: {
    position: "absolute",
    right: 12,
    top: 12,
    gap: 10,
  },
  controlButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
});
