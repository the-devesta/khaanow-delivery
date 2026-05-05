import { Order } from "@/store/orders";
import {
  IOSGlassSurface,
  supportsLiquidGlass,
} from "@/components/ui/ios-liquid-glass";
import { playRingtone, stopRingtone } from "@/utils/ringtone";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

// Must swipe this far (px) to trigger accept
const SWIPE_THRESHOLD = width * 0.5;
// Max visible travel of the thumb
const TRACK_WIDTH = width - 48 - 8; // modal padding (24*2) - track padding (4*2)
const THUMB_SIZE = 56;
const MAX_THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - 4;

interface OrderRequestModalProps {
  order: Order | null;
  onAccept: () => void;
  onReject: () => void;
  /** Override initial countdown (seconds). Pass remaining time when restoring from persisted state. */
  initialTimeLeft?: number;
}

export default function OrderRequestModal({
  order,
  onAccept,
  onReject,
  initialTimeLeft,
}: OrderRequestModalProps) {
  const visible = order !== null;
  const timeoutSeconds = order?.acceptanceTimeoutSeconds || 30;
  const [timeLeft, setTimeLeft] = useState(
    initialTimeLeft !== undefined ? initialTimeLeft : timeoutSeconds,
  );

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Slide-in animation for the entire modal panel
  const slideAnim = useRef(new Animated.Value(height)).current;
  // Drag-to-dismiss offset
  const dragY = useRef(new Animated.Value(0)).current;
  // Combined translateY for the sheet
  const sheetY = Animated.add(slideAnim, dragY);
  // Pulse animation for the timer circle
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Swipe thumb position (clamped 0 → MAX_THUMB_TRAVEL)
  const swipeX = useRef(new Animated.Value(0)).current;
  // Background fill width as thumb moves
  const fillWidth = swipeX.interpolate({
    inputRange: [0, MAX_THUMB_TRAVEL],
    outputRange: [THUMB_SIZE, TRACK_WIDTH],
    extrapolate: "clamp",
  });
  // Thumb opacity feedback during drag
  const thumbOpacity = swipeX.interpolate({
    inputRange: [0, MAX_THUMB_TRAVEL],
    outputRange: [1, 0.85],
    extrapolate: "clamp",
  });

  // ── Ringtone ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      playRingtone();
    } else {
      stopRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [visible]);

  // ── Slide-in animation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      // Restore remaining time when the order is being shown after app relaunch
      setTimeLeft(
        initialTimeLeft !== undefined ? initialTimeLeft : timeoutSeconds,
      );
      swipeX.setValue(0);
      dragY.setValue(0);

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 60,
        friction: 11,
      }).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      dragY.setValue(0);
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 280,
        useNativeDriver: false,
      }).start();
    }
  }, [visible]);

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !order) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Use setTimeout to avoid state update during render
          setTimeout(() => {
            onReject();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, order?.id, timeoutSeconds, onReject]);

  // ── Drag-to-dismiss (pill handle) ────────────────────────────────────────────
  const dismissPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5 && g.dy > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          Animated.timing(slideAnim, {
            toValue: height,
            duration: 220,
            useNativeDriver: false,
          }).start(() => {
            dragY.setValue(0);
            stopRingtone();
            onReject();
          });
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: false,
            tension: 80,
            friction: 10,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  // ── Smooth swipe-to-accept ──────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // Grab the gesture only when the user starts moving horizontally
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        // Freeze at current value so spring-back starts from current position
        swipeX.stopAnimation();
        swipeX.extractOffset();
      },
      onPanResponderMove: (_, g) => {
        // Only allow left-to-right drag, clamp to track width
        const clamped = Math.max(0, Math.min(g.dx, MAX_THUMB_TRAVEL));
        swipeX.setValue(clamped);
      },
      onPanResponderRelease: (_, g) => {
        swipeX.flattenOffset();

        const draggedFar = g.dx >= SWIPE_THRESHOLD;
        const fastSwipe = g.vx > 0.8; // velocity override

        if (draggedFar || fastSwipe) {
          // Flash to end, then accept
          Animated.timing(swipeX, {
            toValue: MAX_THUMB_TRAVEL,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            stopRingtone();
            onAccept();
            swipeX.setValue(0);
          });
        } else {
          // Spring back smoothly
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 120,
            friction: 10,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        swipeX.flattenOffset();
        Animated.spring(swipeX, {
          toValue: 0,
          useNativeDriver: false,
          tension: 120,
          friction: 10,
        }).start();
      },
    }),
  ).current;

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}>
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            transform: [{ translateY: sheetY }],
          }}>
          <IOSGlassSurface
            shape="rect"
            cornerRadius={40}
            intensity={supportsLiquidGlass ? 42 : 0}
            fallbackBackgroundColor={
              supportsLiquidGlass ? "rgba(255,255,255,0.78)" : "#ffffff"
            }
            fallbackBorderColor="rgba(255,255,255,0.72)"
            style={{
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: 28,
            }}>
            {/* Drag handle + close row */}
            <View
              {...dismissPan.panHandlers}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                position: "relative",
              }}>
              {/* Pill handle */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#D1D5DB",
                }}
              />
              {/* X button */}
              <TouchableOpacity
                onPress={() => {
                  stopRingtone();
                  onReject();
                }}
                style={{
                  position: "absolute",
                  right: 0,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.7}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {/* Timer */}
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <Animated.View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#FFF5EB",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                  transform: [{ scale: pulseAnim }],
                }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "bold",
                    color: "#FF6A00",
                  }}>
                  {formatTime(timeLeft)}
                </Text>
              </Animated.View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#1A1A1A",
                }}>
                New Order Request
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                Accept within {formatTime(timeLeft)}
              </Text>
            </View>

            {/* Order Info */}
            <View
              style={{
                backgroundColor: "#FAFAFA",
                borderRadius: 20,
                padding: 16,
                marginBottom: 20,
              }}>
              {/* Restaurant */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: "#FFF5EB",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <Ionicons name="restaurant" size={20} color="#FF6A00" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text
                    style={{ fontSize: 12, color: "#6B7280", marginBottom: 2 }}>
                    Pickup
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}>
                    {order.restaurantName}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#6B7280" }}
                    numberOfLines={1}>
                    {order.restaurantAddress}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: "#E5E7EB",
                  marginVertical: 4,
                }}
              />

              {/* Customer */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 12,
                }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: "#D1FAE5",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <Ionicons name="location" size={20} color="#10B981" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text
                    style={{ fontSize: 12, color: "#6B7280", marginBottom: 2 }}>
                    Drop
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}>
                    {order.customerName}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#6B7280" }}
                    numberOfLines={1}>
                    {order.customerAddress}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginBottom: 24,
                gap: 8,
              }}>
              <View
                style={{
                  flex: 1,
                  minWidth: "30%",
                  backgroundColor: "#FAFAFA",
                  borderRadius: 20,
                  padding: 16,
                }}>
                <Text
                  style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                  Distance
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#1A1A1A",
                  }}>
                  {order.distance > 0 ? `${order.distance.toFixed(1)} km` : "—"}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  minWidth: "30%",
                  backgroundColor: "#FAFAFA",
                  borderRadius: 20,
                  padding: 16,
                }}>
                <Text
                  style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                  Time
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#1A1A1A",
                  }}>
                  {order.estimatedTime && order.estimatedTime !== "—"
                    ? order.estimatedTime
                    : "~30 min"}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  minWidth: "30%",
                  backgroundColor: "#D1FAE5",
                  borderRadius: 20,
                  padding: 16,
                }}>
                <Text
                  style={{ fontSize: 12, color: "#10B981", marginBottom: 4 }}>
                  Earnings
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#10B981",
                  }}>
                  ₹
                  {order.earnings > 0
                    ? order.earnings.toFixed(0)
                    : order.totalAmount
                      ? Math.max(50, order.totalAmount * 0.1).toFixed(0)
                      : "—"}
                </Text>
              </View>
              {order.preparationTime ? (
                <View
                  style={{
                    flex: 1,
                    minWidth: "30%",
                    backgroundColor: "#FFF5EB",
                    borderRadius: 20,
                    padding: 16,
                  }}>
                  <Text
                    style={{ fontSize: 12, color: "#FF6A00", marginBottom: 4 }}>
                    Prep Time
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: "#FF6A00",
                    }}>
                    {order.preparationTime} min
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Swipe to Accept Track */}
            <View
              style={{
                height: 64,
                backgroundColor: "#FFF0E6",
                borderRadius: 32,
                marginBottom: 16,
                overflow: "hidden",
                position: "relative",
                justifyContent: "center",
              }}>
              {/* Animated fill behind thumb */}
              <Animated.View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: fillWidth,
                  backgroundColor: "#FF6A00",
                  borderRadius: 32,
                  opacity: 0.15,
                }}
              />

              {/* Label */}
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: "#FF6A00",
                    letterSpacing: 0.3,
                  }}>
                  Swipe to Accept →
                </Text>
              </View>

              {/* Draggable Thumb */}
              <Animated.View
                {...panResponder.panHandlers}
                style={{
                  position: "absolute",
                  left: 4,
                  top: 4,
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  backgroundColor: "#FF6A00",
                  borderRadius: THUMB_SIZE / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ translateX: swipeX }],
                  opacity: thumbOpacity,
                  shadowColor: "#FF6A00",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 6,
                }}>
                <Ionicons name="chevron-forward" size={26} color="white" />
              </Animated.View>
            </View>

            {/* Reject */}
            <TouchableOpacity
              onPress={() => {
                stopRingtone();
                onReject();
              }}
              style={{
                backgroundColor: "#FEE2E2",
                borderRadius: 32,
                paddingVertical: 16,
                alignItems: "center",
              }}
              activeOpacity={0.75}>
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: "#EF4444" }}>
                Reject Order
              </Text>
            </TouchableOpacity>
          </IOSGlassSurface>
        </Animated.View>
      </View>
    </Modal>
  );
}
