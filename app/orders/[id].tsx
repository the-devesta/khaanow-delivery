import PaymentOptionsModal from "@/components/delivery/PaymentOptionsModal";
import DeliveryMap, {
  RouteInfo,
  haversineM,
} from "@/components/map/DeliveryMap";
import ActionFooter from "@/components/orders/ActionFooter";
import OrderInfoCard from "@/components/orders/OrderInfoCard";
import ProgressTracker from "@/components/orders/ProgressTracker";
import { ApiService } from "@/services/api";
import { socketService } from "@/services/socket";
import { Location, useOrderStore } from "@/store/orders";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STEPS = [
  { label: "Accepted", icon: "checkmark-done-outline" },
  { label: "At Restaurant", icon: "restaurant-outline" },
  { label: "Picked Up", icon: "bicycle-outline" },
  { label: "Arrived", icon: "location-outline" },
];

// ── Navigation helpers ────────────────────────────────────────────────────

function getManeuverIcon(
  maneuver?: string,
): React.ComponentProps<typeof Ionicons>["name"] {
  switch (maneuver) {
    case "turn-left":
      return "arrow-back";
    case "turn-right":
      return "arrow-forward";
    case "turn-sharp-left":
      return "return-down-back";
    case "turn-sharp-right":
      return "return-down-forward";
    case "uturn-left":
    case "uturn-right":
      return "refresh";
    case "roundabout-left":
    case "roundabout-right":
      return "sync-circle";
    case "merge":
      return "git-branch";
    default:
      return "arrow-up";
  }
}

/** Parse any backend location shape into { latitude, longitude } */
function parseLocation(loc: any): Location | undefined {
  if (!loc) return undefined;
  if (Array.isArray(loc)) {
    if (loc.length >= 2 && typeof loc[0] === "number") {
      return { latitude: loc[1], longitude: loc[0] };
    }
    return undefined;
  }
  if (typeof loc !== "object") return undefined;
  // GeoJSON { type: "Point", coordinates: [lng, lat] }
  if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    return { latitude: loc.coordinates[1], longitude: loc.coordinates[0] };
  }
  if (typeof loc.latitude === "number" && typeof loc.longitude === "number") {
    return { latitude: loc.latitude, longitude: loc.longitude };
  }
  if (typeof loc.lat === "number" && typeof loc.lng === "number") {
    return { latitude: loc.lat, longitude: loc.lng };
  }
  return undefined;
}

/** Transform raw API order response to typed order object */
function transformApiOrder(raw: any) {
  // restaurant can come as populated object (from API) or as restaurantId
  const restaurant = raw.restaurant || raw.restaurantId || {};
  const customer = raw.customer || raw.userId || {};
  const deliveryAddr = raw.deliveryAddress || {};
  const restaurantAddr = raw.restaurantAddress || {};

  const restaurantName =
    restaurant?.restaurantName ||
    restaurant?.name ||
    restaurantAddr?.name ||
    "Unknown Restaurant";

  const restaurantAddress =
    restaurant?.address?.street ||
    restaurant?.address?.fullAddress ||
    restaurantAddr?.fullAddress ||
    restaurantAddr?.street ||
    "";

  const customerName = customer?.name || "Customer";
  const customerPhone = customer?.phone || "";
  const customerAddress =
    deliveryAddr?.fullAddress || deliveryAddr?.street || "";

  const pickupLocation =
    parseLocation(restaurant?.location) ??
    parseLocation(restaurant?.address?.location) ??
    parseLocation(restaurant?.address?.coordinates) ??
    (restaurantAddr?.latitude != null
      ? {
          latitude: restaurantAddr.latitude,
          longitude: restaurantAddr.longitude,
        }
      : undefined);

  const dropLocation =
    parseLocation(deliveryAddr?.location) ??
    parseLocation(deliveryAddr?.coordinates) ??
    (deliveryAddr?.latitude != null
      ? { latitude: deliveryAddr.latitude, longitude: deliveryAddr.longitude }
      : undefined);

  const earnings =
    raw.estimatedDeliveryFee ||
    raw.deliveryFee ||
    Math.max(30, (raw.totalAmount || 0) * 0.1);

  const totalAmount = raw.totalAmount || raw.total || 0;

  // Determine payment category for the delivery UI logic
  const rawPaymentMethod: string = raw.paymentMethod || "cash";
  const paymentType =
    rawPaymentMethod === "card" ||
    rawPaymentMethod === "razorpay" ||
    rawPaymentMethod === "online"
      ? ("online" as const)
      : ("cash" as const);

  return {
    id: raw.id || raw._id,
    orderNumber: raw.orderNumber || raw._id || raw.id || "",
    status: raw.status,
    restaurantName,
    restaurantAddress,
    customerName,
    customerPhone,
    customerAddress,
    pickupLocation,
    dropLocation,
    earnings,
    totalAmount,
    distance: raw.deliveryInfo?.distanceKm || 0,
    paymentType,
    rawPaymentMethod,
    paymentStatus: raw.paymentStatus || "pending",
    items:
      raw.items?.map((item: any) => ({
        name: item.food?.name || item.name || "Item",
        quantity: item.quantity,
      })) || [],
    createdAt: new Date(raw.createdAt),
    estimatedTime: (() => {
      const raw2 = raw.deliveryInfo?.durationMinutes;
      if (!raw2) return "30 min";
      const mins = raw2 > 120 ? Math.ceil(raw2 / 60) : Math.ceil(raw2);
      return `${mins} min`;
    })(),
  };
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeOrder, updateOrderStatus, completeOrder, setDriverLocation } =
    useOrderStore();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [apiOrder, setApiOrder] = useState<ReturnType<
    typeof transformApiOrder
  > | null>(null);
  const [driverLocation, setDriverLoc] = useState<Location | null>(null);
  const [isMapCollapsed, setIsMapCollapsed] = useState(false);
  const mapHeightAnim = useRef(new Animated.Value(1)).current; // 1 = full, 0 = collapsed
  const locationWatchRef = useRef<ExpoLocation.LocationSubscription | null>(
    null,
  );

  // Navigation mode state
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({
    steps: [],
    etaMin: 0,
    distKm: 0,
  });
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const isActiveOrder = activeOrder?.id === id;

  // Fetch full order details from API (gives us properly populated restaurant/customer)
  const fetchOrder = async () => {
    if (!id) return;
    try {
      const res = await ApiService.getOrderById(id);
      if (res.success && res.data) {
        setApiOrder(transformApiOrder(res.data));
      }
    } catch (err) {
      console.error("Failed to fetch order details:", err);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Join the socket room for this order so we receive payment-confirmed events
  // when the Razorpay webhook fires (QR / Payment Link paid).
  useEffect(() => {
    if (!id) return;
    socketService.joinOrderRoom(id);

    const handlePaymentConfirmedSocket = (data: {
      orderId: string;
      paymentStatus: string;
    }) => {
      if (data.orderId !== id) return;
      console.log("[Socket] payment-confirmed received:", data);
      // Refresh order so displayOrder.paymentStatus becomes "paid"
      fetchOrder();
      setPaymentConfirmed(true);
    };

    socketService.on("payment-confirmed", handlePaymentConfirmedSocket);

    return () => {
      socketService.off("payment-confirmed", handlePaymentConfirmedSocket);
      socketService.leaveOrderRoom(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Start real GPS tracking when this is an active order
  useEffect(() => {
    if (!isActiveOrder) return;

    let cancelled = false;

    const startGPS = async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      // Get immediate fix
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      if (!cancelled) {
        const loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setDriverLoc(loc);
        setDriverLocation(loc); // update store too
        // Broadcast via socket
        if (activeOrder) {
          socketService.updateLocation(activeOrder.id, loc);
        }
      }

      // Watch continuously
      locationWatchRef.current = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.High,
          distanceInterval: 15, // every 15 metres
          timeInterval: 5000, // or every 5 seconds
        },
        (location) => {
          if (cancelled) return;
          const loc = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setDriverLoc(loc);
          setDriverLocation(loc);
          if (activeOrder) {
            socketService.updateLocation(activeOrder.id, loc);
          }
        },
      );
    };

    startGPS();

    return () => {
      cancelled = true;
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveOrder]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
  };

  // Advance turn-by-turn step when driver gets close to step end-point
  useEffect(() => {
    if (!isNavigating || !driverLocation || routeInfo.steps.length === 0)
      return;
    const step = routeInfo.steps[currentStepIdx];
    if (!step) return;
    const dist = haversineM(driverLocation, step.endLocation);
    if (dist < 40 && currentStepIdx < routeInfo.steps.length - 1) {
      setCurrentStepIdx((idx) => idx + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverLocation, isNavigating]);

  const toggleMapCollapse = () => {
    const toValue = isMapCollapsed ? 1 : 0;
    setIsMapCollapsed(!isMapCollapsed);

    Animated.spring(mapHeightAnim, {
      toValue,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  // Merge: prefer API order details for display, but use local store status for flow
  const displayOrder = apiOrder
    ? {
        ...apiOrder,
        // Always use local store status for the flow logic (it's more up-to-date)
        status: isActiveOrder
          ? (activeOrder?.status ?? apiOrder.status)
          : apiOrder.status,
      }
    : isActiveOrder && activeOrder
      ? activeOrder
      : null;

  // Navigate back if order truly not found anymore
  useEffect(() => {
    if (!apiOrder && !activeOrder && id) {
      // Give fetchOrder a chance first — only go back if both are null after a beat
      const timer = setTimeout(() => {
        if (!apiOrder && !activeOrder) {
          router.back();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [apiOrder, activeOrder, id, router]);

  if (!displayOrder) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text className="text-gray-600 mt-4 font-medium">
          Loading order details...
        </Text>
      </SafeAreaView>
    );
  }

  const getCurrentStep = () => {
    switch (displayOrder.status) {
      case "delivery_partner_accepted":
      case "accepted":
        return 1;
      case "delivery_partner_reached":
        return 2;
      case "delivery_partner_picked_up":
      case "picked_up":
        return 3;
      case "delivery_partner_reached_user_dest":
      case "on_the_way":
        return 4;
      case "delivered":
        return 5;
      default:
        return 1;
    }
  };

  const getActionLabel = () => {
    switch (displayOrder.status) {
      case "delivery_partner_accepted":
      case "accepted":
        return "Reached Restaurant";
      case "delivery_partner_reached":
        return "Order Picked Up";
      case "delivery_partner_picked_up":
      case "picked_up":
        return "Reached Dropoff Location";
      case "delivery_partner_reached_user_dest":
      case "on_the_way":
        if (
          displayOrder?.paymentType === "online" ||
          paymentConfirmed ||
          displayOrder?.paymentStatus === "completed" ||
          displayOrder?.paymentStatus === "paid"
        ) {
          return "Complete Order";
        }
        return "Collect Payment";
      default:
        return "Continue";
    }
  };

  const handleAction = async () => {
    if (!isActiveOrder) return;

    setLoading(true);

    try {
      switch (displayOrder.status) {
        case "delivery_partner_accepted":
        case "accepted":
          await updateOrderStatus("delivery_partner_reached");
          break;
        case "delivery_partner_reached":
          await updateOrderStatus("delivery_partner_picked_up");
          break;
        case "delivery_partner_picked_up":
        case "picked_up":
          await updateOrderStatus("delivery_partner_reached_user_dest");
          break;
        case "delivery_partner_reached_user_dest":
        case "on_the_way":
          // Prepaid orders or already-confirmed payment → complete directly
          // paymentStatus "completed" = COD OTP; "paid" = Razorpay QR / Payment Link
          if (
            displayOrder.paymentType === "online" ||
            paymentConfirmed ||
            displayOrder.paymentStatus === "completed" ||
            displayOrder.paymentStatus === "paid"
          ) {
            const success = await updateOrderStatus("delivered");
            if (success) {
              completeOrder();
              Alert.alert("🎉 Success", "Order delivered successfully!", [
                {
                  text: "OK",
                  onPress: () =>
                    setTimeout(() => router.replace("/(tabs)"), 100),
                },
              ]);
            }
          } else {
            // Cash / pay-at-delivery → show payment modal first
            setLoading(false);
            setPaymentModalVisible(true);
            return;
          }
          break;
      }
      // Refresh order display after status change
      await fetchOrder();
    } catch (error) {
      console.error("Update order status error:", error);
      Alert.alert("Error", "Failed to update order status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirmed = async () => {
    setPaymentModalVisible(false);
    setPaymentConfirmed(true);
    setLoading(true);
    try {
      const success = await updateOrderStatus("delivered");
      if (success) {
        completeOrder();
        Alert.alert("🎉 Success", "Order delivered successfully!", [
          {
            text: "OK",
            onPress: () => setTimeout(() => router.replace("/(tabs)"), 100),
          },
        ]);
      } else {
        // Store already showed an alert; reset local state so driver can retry
        setPaymentConfirmed(false);
      }
    } catch (error) {
      console.error("Complete delivery error:", error);
      Alert.alert("Error", "Failed to complete delivery. Please try again.");
      setPaymentConfirmed(false);
    } finally {
      setLoading(false);
    }
  };

  const currentStep = getCurrentStep();

  // Which destination phase are we navigating toward?
  const navPhase: "pickup" | "dropoff" =
    displayOrder?.status &&
    ["delivery_partner_picked_up", "picked_up"].includes(displayOrder.status)
      ? "dropoff"
      : "pickup";

  // Use real GPS for driver marker; fall back to null (shows no driver pin)
  const mapDriverLocation =
    driverLocation ?? activeOrder?.pickupLocation ?? null;

  // Safe fallback: use pickup/drop coords so the map centres on the right city,
  // not the hardcoded India centre. Hide the driver pin until real GPS arrives.
  const safeDriverLoc =
    mapDriverLocation ??
    displayOrder?.pickupLocation ??
    displayOrder?.dropLocation ??
    null;

  // ── Full-screen Navigation Mode ──────────────────────────────────────────
  if (isNavigating && displayOrder && isActiveOrder) {
    const step = routeInfo.steps[currentStepIdx];
    const phaseName =
      navPhase === "pickup"
        ? displayOrder.restaurantName
        : displayOrder.customerName;
    return (
      <View style={{ flex: 1 }}>
        {/* Map fills entire screen */}
        <DeliveryMap
          driverLocation={safeDriverLoc}
          pickupLocation={displayOrder.pickupLocation}
          dropLocation={displayOrder.dropLocation}
          showRoute
          navigationMode
          activePhase={navPhase}
          onRouteLoaded={(info: RouteInfo) => {
            setRouteInfo(info);
            setCurrentStepIdx(0);
          }}
        />

        {/* ── Top: instruction card ── */}
        <SafeAreaView style={navStyles.topOverlay} edges={["top"]}>
          <View style={navStyles.instructionCard}>
            <View style={navStyles.maneuverCircle}>
              <Ionicons
                name={getManeuverIcon(step?.maneuver)}
                size={26}
                color="#fff"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={navStyles.instructionText} numberOfLines={2}>
                {step?.instruction ??
                  (navPhase === "pickup"
                    ? "Head to restaurant"
                    : "Head to customer")}
              </Text>
              {step && (
                <Text style={navStyles.stepDist}>
                  {step.distanceText} ahead
                </Text>
              )}
            </View>
          </View>
        </SafeAreaView>

        {/* ── Bottom: ETA + action ── */}
        <View style={navStyles.bottomSheet}>
          {/* ETA row */}
          <View style={navStyles.etaRow}>
            <View style={navStyles.etaBlock}>
              <Text style={navStyles.etaValue}>
                {routeInfo.etaMin > 0 ? routeInfo.etaMin : "--"}
              </Text>
              <Text style={navStyles.etaLabel}>min</Text>
            </View>
            <View style={navStyles.etaDivider} />
            <View style={navStyles.etaBlock}>
              <Text style={navStyles.etaValue}>
                {routeInfo.distKm > 0 ? routeInfo.distKm : "--"}
              </Text>
              <Text style={navStyles.etaLabel}>km</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={navStyles.phaseTag}>
              <Ionicons
                name={navPhase === "pickup" ? "restaurant" : "person"}
                size={13}
                color="#FF6A00"
                style={{ marginRight: 4 }}
              />
              <Text style={navStyles.phaseText} numberOfLines={1}>
                {phaseName}
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={navStyles.btnRow}>
            <TouchableOpacity
              style={navStyles.exitBtn}
              onPress={() => setIsNavigating(false)}
              activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity
              style={navStyles.actionBtn}
              onPress={handleAction}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={navStyles.actionBtnText}>{getActionLabel()}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-gray-50 px-4 pt-2 pb-3 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white rounded-full items-center justify-center "
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            Order #{String(displayOrder.id).slice(-6)}
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            className="w-10 h-10 bg-white rounded-full items-center justify-center "
            activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={20} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* Map + Progress Tracker - Collapsible Together */}
        <Animated.View
          style={{
            height: mapHeightAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [210, 390], // collapsed = 210px, expanded = 390px
            }),
          }}>
          {/* Map Section */}
          <Animated.View
            style={{
              height: mapHeightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [120, 300], // map height adjusts
              }),
              overflow: "hidden",
            }}>
            <DeliveryMap
              driverLocation={safeDriverLoc}
              pickupLocation={displayOrder.pickupLocation}
              dropLocation={displayOrder.dropLocation}
              showRoute={displayOrder.status !== "accepted"}
              onRouteLoaded={setRouteInfo}
            />

            {/* Map Toggle Button */}
            <TouchableOpacity
              onPress={toggleMapCollapse}
              className="absolute bottom-3 right-3 w-10 h-10 bg-white rounded-full items-center justify-center shadow-xl border-2 border-white"
              activeOpacity={0.7}>
              <Ionicons
                name={isMapCollapsed ? "chevron-down" : "chevron-up"}
                size={20}
                color="#1A1A1A"
              />
            </TouchableOpacity>

            {/* Navigate Button — only when order is active */}
            {isActiveOrder &&
              displayOrder.status !== "delivered" &&
              displayOrder.status !== "cancelled" && (
                <TouchableOpacity
                  onPress={() => {
                    setCurrentStepIdx(0);
                    setIsNavigating(true);
                  }}
                  style={{
                    position: "absolute",
                    bottom: 52,
                    right: 12,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "#FF6A00",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#FF6A00",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 6,
                    elevation: 8,
                  }}
                  activeOpacity={0.8}>
                  <Ionicons name="navigate" size={20} color="#fff" />
                </TouchableOpacity>
              )}
          </Animated.View>

          {/* Progress Tracker - Fixed height, always visible */}
          <View className="bg-gray-50 px-5 py-2" style={{ height: 90 }}>
            <ProgressTracker currentStep={currentStep} steps={STEPS} />
          </View>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          className="bg-gray-50"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#F59E0B"
              colors={["#F59E0B"]}
            />
          }>
          <View className="px-4 pt-4">
            {/* Restaurant Info */}
            <OrderInfoCard
              title="Pickup Location"
              icon="restaurant"
              iconBg="#FFF5EB"
              name={displayOrder.restaurantName}
              address={displayOrder.restaurantAddress}
            />

            {/* Customer Info */}
            <OrderInfoCard
              title="Drop Location"
              icon="location"
              iconBg="#D1FAE5"
              name={displayOrder.customerName}
              address={displayOrder.customerAddress}
              phone={displayOrder.customerPhone}
              showCall
            />

            {/* Order Items */}
            <View className="bg-white rounded-2xl p-4  border border-gray-100 mb-3">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center ">
                  <Ionicons name="fast-food" size={20} color="#3B82F6" />
                </View>
                <Text
                  className="text-sm font-bold text-gray-900 ml-3"
                  numberOfLines={1}>
                  Order Items
                </Text>
              </View>
              {(displayOrder.items || []).map(
                (
                  item: {
                    name:
                      | string
                      | number
                      | bigint
                      | boolean
                      | ReactElement<
                          unknown,
                          string | JSXElementConstructor<any>
                        >
                      | Iterable<ReactNode>
                      | ReactPortal
                      | Promise<
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactPortal
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | null
                          | undefined
                        >
                      | null
                      | undefined;
                    quantity:
                      | string
                      | number
                      | bigint
                      | boolean
                      | ReactElement<
                          unknown,
                          string | JSXElementConstructor<any>
                        >
                      | Iterable<ReactNode>
                      | ReactPortal
                      | Promise<
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactPortal
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | null
                          | undefined
                        >
                      | null
                      | undefined;
                  },
                  index: Key | null | undefined,
                ) => (
                  <View
                    key={index}
                    className="flex-row justify-between py-2 border-b border-gray-100">
                    <View className="flex-row items-center flex-1">
                      <View className="w-7 h-7 bg-amber-50 rounded-lg items-center justify-center mr-2.5">
                        <Text className="font-bold text-[10px] text-amber-600">
                          {item.quantity}x
                        </Text>
                      </View>
                      <Text
                        className="text-xs text-gray-800 font-medium flex-1"
                        numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                  </View>
                ),
              )}
              {(displayOrder.items || []).length === 0 && (
                <Text className="text-xs text-gray-400 py-2">
                  No items found
                </Text>
              )}
            </View>

            {/* Payment & Earnings */}
            <View className="bg-white rounded-2xl p-4  border border-gray-100 mb-3">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-amber-50 rounded-xl items-center justify-center ">
                    <Ionicons name="wallet" size={20} color="#F59E0B" />
                  </View>
                  <Text
                    className="text-sm font-bold text-gray-900 ml-3"
                    numberOfLines={1}>
                    Payment Details
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-xs text-gray-600" numberOfLines={1}>
                  Payment Type
                </Text>
                <View className="px-2.5 py-1 rounded-full bg-gray-100">
                  <Text
                    className="text-xs font-semibold text-gray-800 uppercase"
                    numberOfLines={1}>
                    {displayOrder.paymentType}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-xs text-gray-600" numberOfLines={1}>
                  Distance
                </Text>
                <Text
                  className="text-xs font-semibold text-gray-800"
                  numberOfLines={1}>
                  {displayOrder.distance} km
                </Text>
              </View>
              <View className="flex-row justify-between pt-3 mt-2 bg-green-50 -mx-4 -mb-4 px-4 py-3 rounded-b-2xl">
                <Text
                  className="text-sm font-bold text-gray-900"
                  numberOfLines={1}>
                  Your Earnings
                </Text>
                <Text
                  className="text-lg font-bold text-green-600"
                  numberOfLines={1}>
                  ₹{displayOrder.earnings || 0}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Footer - Only show for active orders */}
        {isActiveOrder &&
          displayOrder.status !== "delivered" &&
          displayOrder.status !== "cancelled" && (
            <ActionFooter
              label={getActionLabel()}
              onPress={handleAction}
              loading={loading}
            />
          )}

        {/* Payment Modal — shown when driver reaches customer with a cash/pay-at-delivery order */}
        <PaymentOptionsModal
          visible={paymentModalVisible}
          orderId={String(displayOrder.id)}
          orderNumber={String(
            (displayOrder as any).orderNumber || displayOrder.id,
          )}
          totalAmount={(displayOrder as any).totalAmount || 0}
          paymentMethod={
            (displayOrder as any).rawPaymentMethod || displayOrder.paymentType
          }
          paymentStatus={(displayOrder as any).paymentStatus || "pending"}
          onPaymentConfirmed={handlePaymentConfirmed}
          onClose={() => setPaymentModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

// ── Navigation overlay styles ────────────────────────────────────────────────

const navStyles = StyleSheet.create({
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  instructionCard: {
    margin: 14,
    backgroundColor: "#1F2937",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  maneuverCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FF6A00",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  instructionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  stepDist: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 3,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 14,
  },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  etaBlock: {
    alignItems: "center",
    minWidth: 48,
  },
  etaValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1F2937",
    lineHeight: 30,
  },
  etaLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  etaDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  phaseTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5EB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 160,
  },
  phaseText: {
    color: "#FF6A00",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  exitBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    flex: 1,
    height: 52,
    backgroundColor: "#FF6A00",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
