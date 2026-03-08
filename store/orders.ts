import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ApiService } from "../services/api";
import { socketService } from "../services/socket";

export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Parses any backend location shape into { latitude, longitude }.
 * Handles:
 *   - GeoJSON:  { type: "Point", coordinates: [lng, lat] }
 *   - Flat:     { latitude, longitude }  or  { lat, lng }
 *   - Nested:   { coordinates: [lng, lat] }  (without type)
 *   - Array:    [lng, lat]
 */
function parseLocation(loc: any): Location | undefined {
  if (!loc) return undefined;

  // Array form [lng, lat]
  if (Array.isArray(loc)) {
    if (loc.length >= 2 && typeof loc[0] === "number") {
      return { latitude: loc[1], longitude: loc[0] };
    }
    return undefined;
  }

  if (typeof loc !== "object") return undefined;

  // GeoJSON or { coordinates: [lng, lat] }
  if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    return { latitude: loc.coordinates[1], longitude: loc.coordinates[0] };
  }

  // Flat { latitude, longitude }
  if (typeof loc.latitude === "number" && typeof loc.longitude === "number") {
    return { latitude: loc.latitude, longitude: loc.longitude };
  }

  // Flat { lat, lng }
  if (typeof loc.lat === "number" && typeof loc.lng === "number") {
    return { latitude: loc.lat, longitude: loc.lng };
  }

  return undefined;
}

/**
 * Calculate distance between two points in km using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivery_partner_accepted"
  | "delivery_partner_reached"
  | "delivery_partner_picked_up"
  | "delivery_partner_reached_user_dest";

export type MissedReason = "timeout" | "taken" | "cancelled";

export interface Order {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  distance: number;
  estimatedTime: string;
  earnings: number;
  totalAmount?: number;
  items: { name: string; quantity: number }[];
  paymentType: "cash" | "online";
  paymentStatus?: "pending" | "completed" | "paid" | "failed";
  status: OrderStatus;
  createdAt: Date;
  pickupLocation?: Location;
  dropLocation?: Location;
  preparationTime?: number;
  acceptanceTimeoutSeconds?: number;
  cancellationReason?: string | null;
  autoCancelled?: boolean;
}

/** An order the partner saw but didn't accept in time */
export interface MissedOrder {
  order: Order;
  missedAt: Date;
  /** 15 minutes after missedAt — when this card should disappear */
  expiresAt: Date;
  /** Why it was missed: timer ran out, taken by someone else, or cancelled by restaurant */
  reason: MissedReason;
  /** Still available in backend — partner can accept it via API poll */
  stillAvailable: boolean;
}

interface OrderState {
  activeOrder: Order | null;
  incomingOrder: Order | null;
  pendingOrder: Order | null;
  /** Epoch ms when the current pendingOrder was first received. Used to restore the countdown timer after app restart. */
  pendingOrderReceivedAt: number | null;
  orderHistory: Order[];
  driverLocation: Location;
  availableOrders: Order[];
  missedOrders: MissedOrder[];
  loading: boolean;

  // Actions
  initializeSocket: () => void;
  setIncomingOrder: (order: Order | null) => void;
  acceptOrder: (orderId: string) => Promise<void>;
  rejectOrder: (orderId: string) => void;
  updateOrderStatus: (status: OrderStatus) => Promise<boolean>;
  completeOrder: () => void;
  setDriverLocation: (location: Location) => void;
  simulateDriverMovement: () => void;
  fetchAvailableOrders: () => Promise<void>;
  fetchAssignedOrders: () => Promise<void>;
  fetchOrderHistory: (page?: number) => Promise<void>;
  updateLocation: (latitude: number, longitude: number) => Promise<void>;
  dismissMissedOrder: (orderId: string) => void;
  acceptMissedOrder: (orderId: string) => Promise<void>;
  pruneMissedOrders: () => void;
  /** Called after AsyncStorage hydration to fix serialized Dates and expire stale timers. */
  restorePersistedState: () => void;
}

// ── Helper: transform a raw backend order into our Order shape ───────────────
function transformSocketOrder(order: any): Order {
  const earnings =
    order.estimatedDeliveryFee ||
    order.deliveryFee ||
    Math.max(50, (order.totalAmount || 0) * 0.1);

  const _pickupLoc =
    parseLocation(order.restaurant?.location) ??
    parseLocation(order.restaurantId?.location) ??
    parseLocation(order.restaurantId?.address?.location) ??
    parseLocation(order.restaurantId?.address?.coordinates) ??
    // Order document stores flat restaurantAddress: { latitude, longitude }
    (order.restaurantAddress?.latitude != null &&
    order.restaurantAddress?.longitude != null
      ? {
          latitude: Number(order.restaurantAddress.latitude),
          longitude: Number(order.restaurantAddress.longitude),
        }
      : undefined);

  const _dropLoc =
    parseLocation(order.deliveryAddress?.location) ??
    parseLocation(order.deliveryAddress?.coordinates) ??
    (order.deliveryAddress?.latitude != null
      ? {
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude,
        }
      : undefined);

  const result: Order = {
    id: order._id || order.id,
    restaurantName:
      order.restaurant?.restaurantName ||
      order.restaurant?.name ||
      order.restaurantId?.restaurantName ||
      order.restaurantId?.name ||
      "Unknown",
    restaurantAddress:
      order.restaurant?.address?.street ||
      order.restaurant?.address ||
      order.restaurantAddress?.fullAddress ||
      order.restaurantId?.address?.street ||
      "",
    customerName:
      order.user?.name ||
      order.userId?.name ||
      order.customer?.name ||
      "Customer",
    customerAddress:
      order.deliveryAddress?.fullAddress || order.deliveryAddress?.street || "",
    customerPhone:
      order.user?.phone || order.userId?.phone || order.customer?.phone || "",
    distance: order.deliveryInfo?.distanceKm ?? order.distance ?? 0,
    estimatedTime: (() => {
      const raw = order.deliveryInfo?.durationMinutes;
      if (!raw) return "—";
      const mins = raw > 120 ? Math.ceil(raw / 60) : Math.ceil(raw);
      return `${mins} min`;
    })(),
    earnings,
    totalAmount: order.totalAmount,
    items:
      order.items?.map((item: any) => ({
        name: item.food?.name || item.name,
        quantity: item.quantity,
      })) || [],
    paymentType: (order.paymentMethod === "card" ? "online" : "cash") as
      | "cash"
      | "online",
    status: order.status,
    preparationTime: order.preparationTime,
    acceptanceTimeoutSeconds: order.acceptanceTimeoutSeconds,
    createdAt: new Date(order.createdAt),
    pickupLocation: _pickupLoc,
    dropLocation: _dropLoc,
  };

  // Calculate distance if missing or zero from backend
  if ((!result.distance || result.distance === 0) && _pickupLoc && _dropLoc) {
    result.distance = parseFloat(
      calculateDistance(
        _pickupLoc.latitude,
        _pickupLoc.longitude,
        _dropLoc.latitude,
        _dropLoc.longitude,
      ).toFixed(1),
    );
  }

  return result;
}

const MISSED_ORDER_TTL_MS = 15 * 60 * 1000; // 15 minutes accept window (controls Accept button)
/** How long missed-order cards stay visible in "Pending Requests" before auto-pruning. */
const MISSED_ORDER_DISPLAY_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      activeOrder: null,
      incomingOrder: null,
      pendingOrder: null,
      pendingOrderReceivedAt: null,
      orderHistory: [],
      driverLocation: { latitude: 0, longitude: 0 },
      availableOrders: [],
      missedOrders: [],
      loading: false,

      // ── Socket initialization ────────────────────────────────────────────────────
      initializeSocket: () => {
        socketService.connect();

        socketService.on("new-delivery-available", (order: any) => {
          console.log("🔔 New delivery available:", order._id);
          const transformedOrder = transformSocketOrder(order);

          // Guard: don't set the same order twice (socket can fire duplicates)
          const { pendingOrder: existingPending } = get();
          if (existingPending?.id === order._id) {
            console.log(
              "🔔 Duplicate new-delivery-available ignored:",
              order._id,
            );
            return;
          }
          set({
            incomingOrder: transformedOrder,
            pendingOrder: transformedOrder,
            pendingOrderReceivedAt: Date.now(),
          });
        });

        socketService.on("order-taken", (data: { orderId: string }) => {
          console.log("⚠️ Order taken by another driver:", data.orderId);
          const { pendingOrder, missedOrders } = get();

          const update: Partial<ReturnType<typeof get>> = {};

          // If this was the pending modal order, move it to missed with reason "taken"
          if (pendingOrder && pendingOrder.id === data.orderId) {
            const now = new Date();
            const missedEntry: MissedOrder = {
              order: pendingOrder,
              missedAt: now,
              expiresAt: new Date(now.getTime() + MISSED_ORDER_TTL_MS),
              reason: "taken",
              stillAvailable: false,
            };
            update.missedOrders = [
              missedEntry,
              ...missedOrders.filter((m) => m.order.id !== data.orderId),
            ];
            update.incomingOrder = null;
            update.pendingOrder = null;
            update.pendingOrderReceivedAt = null;
          }

          if (Object.keys(update).length > 0) set(update as any);
        });

        socketService.on("order-updated", (updatedOrder: any) => {
          console.log(
            "📦 Order updated:",
            updatedOrder._id,
            updatedOrder.status,
          );
          const { activeOrder, pendingOrder, missedOrders } = get();

          if (activeOrder && activeOrder.id === updatedOrder._id) {
            set({
              activeOrder: { ...activeOrder, status: updatedOrder.status },
            });
          }

          // If the order is already in missedOrders, update it in-place so it
          // gets the correct status (e.g. "cancelled") and appears in history.
          const hasMissedEntry = missedOrders.some(
            (m) => m.order.id === updatedOrder._id,
          );
          if (hasMissedEntry) {
            set({
              missedOrders: missedOrders.map((m) =>
                m.order.id !== updatedOrder._id
                  ? m
                  : {
                      ...m,
                      order: { ...m.order, status: updatedOrder.status },
                      reason:
                        updatedOrder.status === "cancelled"
                          ? ("cancelled" as MissedReason)
                          : m.reason,
                      stillAvailable:
                        updatedOrder.status === "cancelled" ||
                        updatedOrder.status === "delivered"
                          ? false
                          : m.stillAvailable,
                    },
              ),
            });
            return;
          }

          // If the pending order got cancelled, move it to missed with reason "cancelled"
          if (pendingOrder && pendingOrder.id === updatedOrder._id) {
            if (
              updatedOrder.status === "cancelled" ||
              updatedOrder.status === "delivered"
            ) {
              const now = new Date();
              const missedEntry: MissedOrder = {
                order: pendingOrder,
                missedAt: now,
                expiresAt: new Date(now.getTime() + MISSED_ORDER_TTL_MS),
                reason: "cancelled",
                stillAvailable: false,
              };
              set({
                missedOrders: [
                  missedEntry,
                  ...missedOrders.filter(
                    (m) => m.order.id !== updatedOrder._id,
                  ),
                ],
                incomingOrder: null,
                pendingOrder: null,
                pendingOrderReceivedAt: null,
              });
            } else {
              set({
                pendingOrder: { ...pendingOrder, status: updatedOrder.status },
              });
            }
          }
        });
      },

      setIncomingOrder: (order) =>
        set({
          incomingOrder: order,
          pendingOrder: order,
          pendingOrderReceivedAt: order ? Date.now() : null,
        }),

      // ── Accept order ─────────────────────────────────────────────────────────────
      acceptOrder: async (orderId: string) => {
        try {
          set({ loading: true });

          const response = await ApiService.acceptOrder(orderId);

          if (response.success) {
            const { pendingOrder, missedOrders } = get();
            const acceptedOrderData = response.data;

            const baseOrder =
              pendingOrder ||
              (acceptedOrderData
                ? {
                    id: acceptedOrderData.id || acceptedOrderData._id,
                  }
                : null);

            if (baseOrder) {
              // Prefer the full populated order from the API response to get restaurant/customer names
              const newActiveOrder: Order = acceptedOrderData
                ? {
                    ...transformSocketOrder(acceptedOrderData),
                    status: "delivery_partner_accepted" as OrderStatus,
                  }
                : {
                    ...(baseOrder as Order),
                    status: "delivery_partner_accepted" as OrderStatus,
                  };

              const pickup = newActiveOrder.pickupLocation || {
                latitude: 28.5355,
                longitude: 77.391,
              };

              // Remove from missedOrders if it was there
              set({
                activeOrder: newActiveOrder,
                incomingOrder: null,
                pendingOrder: null,
                pendingOrderReceivedAt: null,
                missedOrders: missedOrders.filter(
                  (m) => m.order.id !== orderId,
                ),
                driverLocation: pickup,
              });

              socketService.joinOrderRoom(orderId);
            } else {
              await get().fetchAssignedOrders();
            }
          } else {
            console.error("Failed to accept order:", response.message);
            const errorMsg = response.message || "Failed to accept order";
            if (
              errorMsg.includes("not found") ||
              errorMsg.includes("already assigned")
            ) {
              // Mark missed order as no longer available
              const { missedOrders } = get();
              set({
                incomingOrder: null,
                pendingOrder: null,
                pendingOrderReceivedAt: null,
                missedOrders: missedOrders.map((m) =>
                  m.order.id === orderId ? { ...m, stillAvailable: false } : m,
                ),
              });
            }
            Alert.alert("Order Unavailable", errorMsg);
          }
        } catch (error: any) {
          console.error("Accept order error:", error);
          const errorMsg =
            error?.response?.data?.message ||
            error?.message ||
            "An unexpected error occurred";
          if (
            error?.response?.status === 404 ||
            errorMsg.includes("not found") ||
            errorMsg.includes("already assigned")
          ) {
            const { missedOrders } = get();
            set({
              incomingOrder: null,
              pendingOrder: null,
              pendingOrderReceivedAt: null,
              missedOrders: missedOrders.map((m) =>
                m.order.id === orderId ? { ...m, stillAvailable: false } : m,
              ),
            });
            Alert.alert(
              "Order Unavailable",
              "This order has expired or been assigned to another delivery partner.",
            );
          } else {
            Alert.alert("Error", errorMsg);
          }
        } finally {
          set({ loading: false });
        }
      },

      // ── Reject order (timeout or manual rejection) ───────────────────────────────
      rejectOrder: (orderId: string) => {
        const { pendingOrder, missedOrders } = get();
        if (pendingOrder && pendingOrder.id === orderId) {
          const now = new Date();
          const missedEntry: MissedOrder = {
            order: pendingOrder,
            missedAt: now,
            expiresAt: new Date(now.getTime() + MISSED_ORDER_TTL_MS),
            reason: "timeout",
            stillAvailable: true, // might still be available for 15 min
          };
          set({
            incomingOrder: null,
            pendingOrder: null,
            pendingOrderReceivedAt: null,
            missedOrders: [
              missedEntry,
              ...missedOrders.filter((m) => m.order.id !== orderId),
            ],
          });
        }
      },

      // ── Dismiss a missed order card manually ─────────────────────────────────────
      dismissMissedOrder: (orderId: string) => {
        const { missedOrders } = get();
        set({
          missedOrders: missedOrders.filter((m) => m.order.id !== orderId),
        });
      },

      // ── Accept a missed order (from the dashboard card) ──────────────────────────
      acceptMissedOrder: async (orderId: string) => {
        const { missedOrders } = get();
        const missed = missedOrders.find((m) => m.order.id === orderId);
        if (!missed) return;

        // Check if still within 15-minute window
        if (new Date() > missed.expiresAt) {
          Alert.alert(
            "Order Expired",
            "This order request has expired and can no longer be accepted.",
          );
          set({
            missedOrders: missedOrders.filter((m) => m.order.id !== orderId),
          });
          return;
        }

        // Set as pending and try to accept
        set({ pendingOrder: missed.order });
        await get().acceptOrder(orderId);
      },

      // ── Prune expired missed orders ───────────────────────────────────────────────
      pruneMissedOrders: () => {
        const now = Date.now();
        const { missedOrders } = get();
        // Keep cards until MISSED_ORDER_DISPLAY_TTL_MS (4h) from when they were missed.
        // expiresAt only controls the Accept button, not when the card disappears.
        const filtered = missedOrders.filter(
          (m) => m.missedAt.getTime() + MISSED_ORDER_DISPLAY_TTL_MS > now,
        );
        if (filtered.length !== missedOrders.length) {
          set({ missedOrders: filtered });
        }
      },

      updateOrderStatus: async (status: OrderStatus): Promise<boolean> => {
        try {
          const { activeOrder } = get();
          if (!activeOrder) return false;

          set({ loading: true });

          const response = await ApiService.updateOrderStatus(
            activeOrder.id,
            status,
          );

          if (response.success) {
            set({ activeOrder: { ...activeOrder, status } });
            return true;
          } else {
            console.error("Failed to update order status:", response.message);
            Alert.alert(
              "Update Failed",
              response.message ||
                "Failed to update order status. Please try again.",
            );
            return false;
          }
        } catch (error: any) {
          console.error("Update order status error:", error);
          const msg =
            error?.response?.data?.message ||
            "Failed to update order status. Please try again.";
          Alert.alert("Error", msg);
          return false;
        } finally {
          set({ loading: false });
        }
      },

      completeOrder: () => {
        const { activeOrder, orderHistory } = get();
        if (activeOrder) {
          set({
            activeOrder: null,
            orderHistory: [
              { ...activeOrder, status: "delivered" },
              ...orderHistory,
            ],
          });
        }
      },

      setDriverLocation: (location) => set({ driverLocation: location }),

      simulateDriverMovement: () => {
        const { driverLocation, activeOrder } = get();
        if (!activeOrder) return;

        const target =
          activeOrder.status === "delivery_partner_picked_up" ||
          activeOrder.status === "delivery_partner_reached_user_dest"
            ? activeOrder.dropLocation
            : activeOrder.pickupLocation;

        if (!target) return;

        const latDiff = (target.latitude - driverLocation.latitude) * 0.1;
        const lngDiff = (target.longitude - driverLocation.longitude) * 0.1;

        set({
          driverLocation: {
            latitude: driverLocation.latitude + latDiff,
            longitude: driverLocation.longitude + lngDiff,
          },
        });
      },

      fetchAvailableOrders: async () => {
        try {
          set({ loading: true });

          const response = await ApiService.getAvailableOrders();

          if (response.success && response.data) {
            const orders: Order[] = response.data.map((order: any) =>
              transformSocketOrder(order),
            );

            const { missedOrders, pendingOrder, activeOrder, orderHistory } =
              get();
            const availableIds = new Set(orders.map((o) => o.id));

            // Orders that WERE available (stillAvailable:true) but are now gone
            // from the API — need to fetch their real status (cancelled/taken/etc.)
            const justDropped = missedOrders.filter(
              (m) =>
                m.reason === "timeout" &&
                m.stillAvailable &&
                !availableIds.has(m.order.id),
            );

            // Update stillAvailable on existing missed orders
            let updatedMissed = missedOrders.map((m) => ({
              ...m,
              stillAvailable:
                m.reason === "timeout" && availableIds.has(m.order.id),
            }));

            // Fetch actual statuses for orders that just dropped from available list
            for (const missed of justDropped) {
              try {
                const res = await ApiService.getOrderById(missed.order.id);
                const actualStatus: OrderStatus =
                  res.success && res.data?.status
                    ? res.data.status
                    : ("cancelled" as OrderStatus);
                updatedMissed = updatedMissed.map((m) =>
                  m.order.id !== missed.order.id
                    ? m
                    : {
                        ...m,
                        order: { ...m.order, status: actualStatus },
                        reason:
                          actualStatus === "cancelled"
                            ? ("cancelled" as MissedReason)
                            : m.reason,
                      },
                );
              } catch {
                // If fetch fails, mark as expired/cancelled so it shows in history
                updatedMissed = updatedMissed.map((m) =>
                  m.order.id !== missed.order.id
                    ? m
                    : {
                        ...m,
                        order: {
                          ...m.order,
                          status: "cancelled" as OrderStatus,
                        },
                        reason: "cancelled" as MissedReason,
                      },
                );
              }
            }

            // IDs already being tracked (pending modal, active delivery, missed cards, history)
            const trackedIds = new Set<string>(
              [
                ...updatedMissed.map((m) => m.order.id),
                pendingOrder?.id,
                activeOrder?.id,
                ...orderHistory.map((o) => o.id),
              ].filter((id): id is string => Boolean(id)),
            );

            // Add orders the partner hasn't seen yet to missedOrders so they
            // appear in "Pending Requests" and can be accepted.
            const unseenMissed: MissedOrder[] = orders
              .filter((o) => !trackedIds.has(o.id))
              .map((o) => ({
                order: o,
                missedAt: o.createdAt,
                // expiresAt controls the Accept button – 15 min from order creation
                expiresAt: new Date(
                  o.createdAt.getTime() + MISSED_ORDER_TTL_MS,
                ),
                reason: "timeout" as MissedReason,
                stillAvailable: true,
              }));

            set({
              availableOrders: orders,
              missedOrders: [...unseenMissed, ...updatedMissed],
            });
          }
        } catch (error) {
          console.error("Fetch available orders error:", error);
        } finally {
          set({ loading: false });
        }
      },

      fetchAssignedOrders: async () => {
        try {
          set({ loading: true });

          const response = await ApiService.getAssignedOrders();

          if (response.success && response.data) {
            if (response.data.length > 0) {
              const transformedOrder = transformSocketOrder(response.data[0]);

              if (transformedOrder.status !== "delivered") {
                set({ activeOrder: transformedOrder });
                socketService.joinOrderRoom(transformedOrder.id);
              } else {
                const { activeOrder: currentActive } = get();
                if (currentActive?.id === transformedOrder.id) {
                  set({ activeOrder: null });
                }
              }
            }
          }
        } catch (error) {
          console.error("Fetch assigned orders error:", error);
        } finally {
          set({ loading: false });
        }
      },

      fetchOrderHistory: async (page = 1) => {
        try {
          set({ loading: true });

          const response = await ApiService.getOrderHistory(page);

          console.log(
            "📦 [History] Raw API response:",
            JSON.stringify({
              success: response.success,
              count: response.data?.length ?? 0,
              pagination: (response as any).pagination,
              firstItem: response.data?.[0] ?? null,
            }),
          );

          if (response.success && response.data) {
            console.log(
              "📋 [History] All statuses:",
              response.data.map((o: any) => ({
                id: String(o._id || o.id).slice(-6),
                status: o.status,
                reason: o.cancellationReason ?? null,
              })),
            );
            const orders: Order[] = response.data.map((order: any) => ({
              id: String(order._id || order.id),
              restaurantName:
                order.restaurantName ||
                order.restaurant?.name ||
                (order.restaurantId as any)?.name ||
                "Restaurant",
              restaurantAddress:
                order.restaurantAddress?.fullAddress ||
                order.restaurant?.address?.street ||
                "",
              customerName:
                order.customerName || order.userId?.name || "Customer",
              customerAddress:
                order.customerAddress ||
                order.deliveryAddress?.fullAddress ||
                "",
              customerPhone: order.customerPhone || order.userId?.phone || "",
              distance: order.deliveryInfo?.distanceKm || order.distance || 0,
              estimatedTime: "30 min",
              earnings:
                order.earnings ||
                order.estimatedDeliveryFee ||
                order.deliveryFee ||
                Math.max(50, (order.totalAmount || 0) * 0.1),
              totalAmount: order.totalAmount,
              items:
                order.items?.map((item: any) => ({
                  name: item.food?.name || item.name || "Item",
                  quantity: item.quantity,
                })) || [],
              paymentType:
                order.paymentMethod === "card"
                  ? ("online" as const)
                  : ("cash" as const),
              status: order.status || "delivered",
              cancellationReason: order.cancellationReason || null,
              autoCancelled: order.autoCancelled || false,
              preparationTime: order.preparationTime,
              createdAt: new Date(order.createdAt),
              pickupLocation: undefined,
              dropLocation: undefined,
            }));

            set({ orderHistory: orders });
            console.log(
              "✅ [History] Stored orderHistory count:",
              orders.length,
              "| statuses:",
              orders.map((o) => o.status),
            );
          } else {
            console.warn(
              "⚠️ [History] API returned no data:",
              JSON.stringify(response),
            );
          }
        } catch (error) {
          console.error("Fetch order history error:", error);
        } finally {
          set({ loading: false });
        }
      },

      updateLocation: async (latitude: number, longitude: number) => {
        try {
          const { activeOrder } = get();

          await ApiService.updateLocation(latitude, longitude);
          set({ driverLocation: { latitude, longitude } });

          if (activeOrder) {
            socketService.updateLocation(activeOrder.id, {
              latitude,
              longitude,
            });
          }
        } catch (error) {
          console.error("Update location error:", error);
        }
      },

      // ── Fix serialized Dates + expire stale timers after AsyncStorage hydration ─
      restorePersistedState: () => {
        const {
          missedOrders,
          pendingOrder,
          pendingOrderReceivedAt,
          activeOrder,
          orderHistory,
        } = get();
        const now = Date.now();

        // Revive Date objects (JSON.stringify turns them into strings)
        const fixedMissed: MissedOrder[] = (missedOrders || [])
          .map((m) => ({
            ...m,
            missedAt: new Date(m.missedAt),
            expiresAt: new Date(m.expiresAt),
            order: { ...m.order, createdAt: new Date(m.order.createdAt) },
          }))
          // prune only orders older than the 4-hour display window
          .filter(
            (m) => m.missedAt.getTime() + MISSED_ORDER_DISPLAY_TTL_MS > now,
          );

        let fixedPending: Order | null = pendingOrder
          ? { ...pendingOrder, createdAt: new Date(pendingOrder.createdAt) }
          : null;
        let fixedReceivedAt = pendingOrderReceivedAt;
        let updatedMissed = fixedMissed;

        // If the acceptance timer has expired while app was closed, move to missed
        if (fixedPending && fixedReceivedAt) {
          const elapsed = (now - fixedReceivedAt) / 1000;
          const timeout = fixedPending.acceptanceTimeoutSeconds ?? 30;
          if (elapsed >= timeout) {
            const expiredAt = fixedReceivedAt + timeout * 1000;
            const expiresAt = new Date(expiredAt + MISSED_ORDER_TTL_MS);
            if (expiresAt.getTime() > now) {
              const missed: MissedOrder = {
                order: fixedPending,
                missedAt: new Date(expiredAt),
                expiresAt,
                reason: "timeout",
                stillAvailable: false,
              };
              updatedMissed = [
                missed,
                ...fixedMissed.filter((m) => m.order.id !== fixedPending!.id),
              ];
            }
            fixedPending = null;
            fixedReceivedAt = null;
          }
        }

        set({
          missedOrders: updatedMissed,
          pendingOrder: fixedPending,
          incomingOrder: fixedPending,
          pendingOrderReceivedAt: fixedReceivedAt,
          activeOrder: activeOrder
            ? { ...activeOrder, createdAt: new Date(activeOrder.createdAt) }
            : null,
          orderHistory: (orderHistory || []).map((o) => ({
            ...o,
            createdAt: new Date(o.createdAt),
          })),
        });
        console.log("✅ Persisted state restored:", {
          pendingOrder: fixedPending?.id ?? null,
          missedOrders: updatedMissed.length,
        });
      },
    }),
    {
      name: "delivery-order-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeOrder: state.activeOrder,
        pendingOrder: state.pendingOrder,
        pendingOrderReceivedAt: state.pendingOrderReceivedAt,
        missedOrders: state.missedOrders,
        orderHistory: state.orderHistory,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.restorePersistedState();
      },
    },
  ),
);
