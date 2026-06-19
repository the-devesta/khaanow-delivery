import { Location } from "@/store/orders";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import Svg, { Path } from "react-native-svg";

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

type MapKind = "standard" | "satellite" | "hybrid";
type MarkerRole = "pickup" | "drop" | "driver";
type MarkerPoint = { role: MarkerRole; x: number; y: number };
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

function offsetCoord(loc: Location, index: number, total: number): Location {
  if (total <= 1) return loc;
  const radius = 0.00018;
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    latitude: loc.latitude + Math.sin(angle) * radius,
    longitude: loc.longitude + Math.cos(angle) * radius,
  };
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

/**
 * Fetch road route. Tries Google Routes API first, then legacy Directions,
 * then OSRM. Caller already draws an instant straight fallback.
 */
async function fetchRoadRoute(
  origin: Location,
  destination: Location,
): Promise<RouteFetchResult> {
  const fallbackMetrics = getStraightLineMetrics(origin, destination);

  // ── 1. Google Routes API ────────────────────────────────────────────────────
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

  // ── 2. Legacy Google Directions fallback ───────────────────────────────────
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
    } catch (e) {
      console.log("[DeliveryMap] Google Directions error:", e);
    }
  }

  // ── 3. OSRM fallback (free, no key) ────────────────────────────────────────
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
  } catch (e) {
    console.log("[DeliveryMap] OSRM error:", e);
  }

  return {
    coordinates: [],
    ...fallbackMetrics,
  }; // straight-line fallback handled by caller
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
  const isFirstFit = useRef(true);
  const [mapType, setMapType] = useState<MapKind>("standard");
  const [mapReady, setMapReady] = useState(false);
  const [markerPoints, setMarkerPoints] = useState<MarkerPoint[]>([]);
  const [routePath, setRoutePath] = useState("");
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

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
  const markerLocations = [
    validPickupLocation,
    validDropLocation,
    validDriverLocation,
  ].filter(Boolean) as Location[];
  const hasOverlappingMarkers =
    areSameCoord(validPickupLocation, validDropLocation) ||
    areSameCoord(validPickupLocation, validDriverLocation) ||
    areSameCoord(validDropLocation, validDriverLocation);
  const pickupOffsetIndex = validPickupLocation
    ? markerLocations.indexOf(validPickupLocation)
    : 0;
  const dropOffsetIndex = validDropLocation
    ? markerLocations.indexOf(validDropLocation)
    : 0;
  const driverOffsetIndex = validDriverLocation
    ? markerLocations.indexOf(validDriverLocation)
    : 0;
  const pickupMarkerCoord =
    validPickupLocation && hasOverlappingMarkers
      ? offsetCoord(
          validPickupLocation,
          pickupOffsetIndex,
          markerLocations.length,
        )
      : validPickupLocation;
  const dropMarkerCoord =
    validDropLocation && hasOverlappingMarkers
      ? offsetCoord(validDropLocation, dropOffsetIndex, markerLocations.length)
      : validDropLocation;
  const driverMarkerCoord =
    validDriverLocation && hasOverlappingMarkers
      ? offsetCoord(
          validDriverLocation,
          driverOffsetIndex,
          markerLocations.length,
        )
      : validDriverLocation;
  const phaseRouteOrigin = validDriverLocation ?? validPickupLocation;
  const phaseRouteDestination =
    validDriverLocation && activePhase === "dropoff"
      ? validDropLocation
      : validDriverLocation
        ? validPickupLocation
        : validDropLocation;
  const shouldShowOrderLeg =
    getDistanceM(phaseRouteOrigin, phaseRouteDestination) < 80 &&
    isValidCoord(validPickupLocation) &&
    isValidCoord(validDropLocation) &&
    !areSameCoord(validPickupLocation, validDropLocation);
  const routeOrigin = shouldShowOrderLeg ? validPickupLocation : phaseRouteOrigin;
  const routeDestination = shouldShowOrderLeg
    ? validDropLocation
    : phaseRouteDestination;
  const canDrawRoute =
    showRoute && isValidCoord(routeOrigin) && isValidCoord(routeDestination);

  const updateMarkerPoints = useCallback(async () => {
    if (!mapRef.current || !mapReady) return;

    const markerCoords: { role: MarkerRole; coord: Location | null }[] = [
      { role: "pickup", coord: pickupMarkerCoord },
      { role: "drop", coord: dropMarkerCoord },
      { role: "driver", coord: driverMarkerCoord },
    ];

    const points = await Promise.all(
      markerCoords
        .filter((item): item is { role: MarkerRole; coord: Location } =>
          isValidCoord(item.coord),
        )
        .map(async (item) => {
          const point = await mapRef.current!.pointForCoordinate(item.coord);
          return { role: item.role, x: point.x, y: point.y };
        }),
    );

    setMarkerPoints(points);
  }, [
    mapReady,
    pickupMarkerCoord?.latitude,
    pickupMarkerCoord?.longitude,
    dropMarkerCoord?.latitude,
    dropMarkerCoord?.longitude,
    driverMarkerCoord?.latitude,
    driverMarkerCoord?.longitude,
  ]);

  const updateRouteSegments = useCallback(async () => {
    if (!mapRef.current || !mapReady || !canDrawRoute) {
      setRoutePath("");
      return;
    }

    const coords =
      routeCoords.length >= 2
        ? routeCoords
        : isValidCoord(routeOrigin) &&
            isValidCoord(routeDestination) &&
            !areSameCoord(routeOrigin, routeDestination)
          ? [routeOrigin, routeDestination]
          : [];

    if (coords.length < 2) {
      setRoutePath("");
      return;
    }

    const step = Math.max(1, Math.floor(coords.length / 70));
    const sampled = coords.filter(
      (_coord, index) => index % step === 0 || index === coords.length - 1,
    );

    const points = await Promise.all(
      sampled.map((coord) => mapRef.current!.pointForCoordinate(coord)),
    );

    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    setRoutePath(path);
  }, [
    mapReady,
    canDrawRoute,
    mapSize.width,
    mapSize.height,
    routeCoords,
    routeOrigin?.latitude,
    routeOrigin?.longitude,
    routeDestination?.latitude,
    routeDestination?.longitude,
  ]);

  const updateMapOverlays = useCallback(() => {
    updateMarkerPoints();
    updateRouteSegments();
  }, [updateMarkerPoints, updateRouteSegments]);

  // Fetch road-following route for rider's current leg. Before pickup:
  // driver -> restaurant. After pickup: driver -> customer.
  useEffect(() => {
    if (!canDrawRoute) {
      setRouteCoords([]);
      return;
    }
    if (areSameCoord(routeOrigin, routeDestination)) {
      setRouteCoords([]);
      return;
    }

    const fallbackCoords = [routeOrigin!, routeDestination!];
    const fallback = getStraightLineMetrics(routeOrigin!, routeDestination!);
    setRouteCoords(fallbackCoords);
    onRouteLoaded?.({
      steps: [],
      etaMin: fallback.etaMin,
      distKm: fallback.distKm,
    });

    fetchRoadRoute(routeOrigin!, routeDestination!)
      .then((route) => {
        setRouteCoords(
          route.coordinates.length >= 2
            ? route.coordinates
            : fallbackCoords,
        );
        if (onRouteLoaded) {
          onRouteLoaded({
            steps: [],
            etaMin: route.etaMin,
            distKm: route.distKm,
          });
        }
      })
      .catch((error) => {
        console.log("[DeliveryMap] Route fetch failed:", error);
        setRouteCoords(fallbackCoords);
        onRouteLoaded?.({
          steps: [],
          etaMin: fallback.etaMin,
          distKm: fallback.distKm,
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canDrawRoute,
    routeOrigin?.latitude,
    routeOrigin?.longitude,
    routeDestination?.latitude,
    routeDestination?.longitude,
  ]);

  const fitMapToMarkers = useCallback(
    (animated = true) => {
      if (!mapRef.current) return;
      const coords: Location[] = [];
      if (isValidCoord(driverMarkerCoord)) coords.push(driverMarkerCoord);
      if (isValidCoord(pickupMarkerCoord)) coords.push(pickupMarkerCoord);
      if (isValidCoord(dropMarkerCoord)) coords.push(dropMarkerCoord);
      if (coords.length === 0) return;
      if (coords.length === 1) {
        mapRef.current.animateToRegion(
          { ...coords[0], latitudeDelta: 0.018, longitudeDelta: 0.018 },
          500,
        );
        setTimeout(updateMapOverlays, 550);
        return;
      }
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 130, right: 115, bottom: 135, left: 115 },
        animated,
      });
      setTimeout(updateMapOverlays, animated ? 550 : 100);
    },
    [
      driverMarkerCoord?.latitude,
      driverMarkerCoord?.longitude,
      pickupMarkerCoord?.latitude,
      pickupMarkerCoord?.longitude,
      dropMarkerCoord?.latitude,
      dropMarkerCoord?.longitude,
      updateMapOverlays,
    ],
  );

  // Fit map to rendered marker positions, including visual overlap offsets.
  useEffect(() => {
    fitMapToMarkers(!isFirstFit.current);
    isFirstFit.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    driverMarkerCoord?.latitude,
    driverMarkerCoord?.longitude,
    pickupMarkerCoord?.latitude,
    pickupMarkerCoord?.longitude,
    dropMarkerCoord?.latitude,
    dropMarkerCoord?.longitude,
  ]);

  useEffect(() => {
    updateMapOverlays();
  }, [updateMapOverlays, mapType, routeCoords]);

  const getMarkerPoint = (role: MarkerRole) =>
    markerPoints.find((point) => point.role === role);
  const fallbackStartPoint =
    activePhase === "pickup"
      ? (getMarkerPoint("driver") ?? getMarkerPoint("pickup"))
      : (getMarkerPoint("driver") ?? getMarkerPoint("pickup"));
  const fallbackEndPoint =
    activePhase === "pickup"
      ? (getMarkerPoint("pickup") ?? getMarkerPoint("drop"))
      : (getMarkerPoint("drop") ?? getMarkerPoint("pickup"));
  const fallbackScreenPath =
    showRoute &&
    fallbackStartPoint &&
    fallbackEndPoint &&
    Math.hypot(
      fallbackEndPoint.x - fallbackStartPoint.x,
      fallbackEndPoint.y - fallbackStartPoint.y,
    ) > 8
      ? `M ${fallbackStartPoint.x} ${fallbackStartPoint.y} L ${fallbackEndPoint.x} ${fallbackEndPoint.y}`
      : "";
  const visibleRoutePath = routePath || fallbackScreenPath;

  return (
    <View
      style={styles.container}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setMapSize({ width, height });
      }}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === "ios" ? undefined : PROVIDER_GOOGLE}
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
        loadingEnabled
        onMapReady={() => {
          setMapReady(true);
          setTimeout(updateMapOverlays, 250);
        }}
        onRegionChangeComplete={updateMapOverlays}
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
      </MapView>

      <View pointerEvents="none" style={styles.overlayLayer}>
        {visibleRoutePath.length > 0 && mapSize.width > 0 && mapSize.height > 0 && (
          <Svg
            width={mapSize.width}
            height={mapSize.height}
            style={StyleSheet.absoluteFill}>
            <Path
              d={visibleRoutePath}
              fill="none"
              stroke="rgba(255,255,255,0.95)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d={visibleRoutePath}
              fill="none"
              stroke="#FF6A00"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}

        {markerPoints.map((point) => (
          <View
            key={point.role}
            style={[
              styles.markerOverlay,
              {
                left: point.x - 22,
                top: point.y - 22,
                zIndex:
                  point.role === "driver" ? 30 : point.role === "drop" ? 20 : 10,
              },
            ]}>
            <View
              style={[
                styles.markerBubble,
                point.role === "pickup" && styles.pickupBubble,
                point.role === "drop" && styles.dropBubble,
                point.role === "driver" && styles.driverBubble,
              ]}>
              {point.role === "pickup" && (
                <MaterialCommunityIcons name="store" size={20} color="#FF6A00" />
              )}
              {point.role === "drop" && (
                <Ionicons name="person" size={18} color="#fff" />
              )}
              {point.role === "driver" && (
                <Ionicons name="bicycle" size={18} color="#fff" />
              )}
            </View>
          </View>
        ))}
      </View>

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
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  markerOverlay: {
    position: "absolute",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  markerBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  driverBubble: {
    backgroundColor: "#FF6A00",
    borderColor: "#fff",
  },
  pickupBubble: {
    backgroundColor: "#FFF5EB",
    borderColor: "#fff",
  },
  dropBubble: {
    backgroundColor: "#111827",
    borderColor: "#fff",
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
