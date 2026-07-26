import { MissedOrder, useOrderStore } from "@/store/orders";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

interface Props {
  missed: MissedOrder;
}

function useCountdown(expiresAt: Date) {
  const calcRemaining = () =>
    Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(calcRemaining);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setSeconds(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return seconds;
}

export default function MissedOrderCard({ missed }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { acceptMissedOrder, dismissMissedOrder, loading } = useOrderStore();
  const secondsLeft = useCountdown(missed.expiresAt);
  const [accepting, setAccepting] = useState(false);

  const minutesLeft = Math.ceil(secondsLeft / 60);
  const isExpired = secondsLeft <= 0;
  const canAccept =
    missed.stillAvailable && missed.reason === "timeout" && !isExpired;

  const handleAccept = async () => {
    setAccepting(true);
    await acceptMissedOrder(missed.order.id);
    setAccepting(false);
    if (useOrderStore.getState().activeOrder?.id === missed.order.id) {
      router.push(`/orders/${missed.order.id}`);
    }
  };

  const handleReject = () => {
    Alert.alert(t("missedOrder.rejectTitle"), t("missedOrder.rejectMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("missedOrder.reject"),
        style: "destructive",
        onPress: () => dismissMissedOrder(missed.order.id),
      },
    ]);
  };

  // Status badge config
  const badgeConfig = (() => {
    if (isExpired)
      return {
        bg: "#F3F4F6",
        text: "#9CA3AF",
        label: t("missedOrder.expired"),
        icon: "time-outline" as const,
      };
    if (missed.reason === "taken")
      return {
        bg: "#FEE2E2",
        text: "#EF4444",
        label: t("missedOrder.takenByAnother"),
        icon: "person-outline" as const,
      };
    if (missed.reason === "cancelled")
      return {
        bg: "#FEE2E2",
        text: "#EF4444",
        label: t("missedOrder.cancelled"),
        icon: "close-circle-outline" as const,
      };
    // timeout — still potentially available
    return {
      bg: "#FEF3C7",
      text: "#D97706",
      label: t("missedOrder.missed"),
      icon: "alert-circle-outline" as const,
    };
  })();

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 28,
        marginBottom: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: canAccept ? "#FCD34D" : "#F3F4F6",
      }}>
      <View style={{ padding: 16 }}>
        {/* Header row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}>
          {/* Badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: badgeConfig.bg,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 50,
            }}>
            <Ionicons
              name={badgeConfig.icon}
              size={13}
              color={badgeConfig.text}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: badgeConfig.text,
                marginLeft: 4,
              }}>
              {badgeConfig.label}
            </Text>
          </View>

          {/* Countdown / dismiss */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {!isExpired && missed.reason === "timeout" && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F3F4F6",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 50,
                }}>
                <Ionicons name="hourglass-outline" size={12} color="#6B7280" />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#6B7280",
                    marginLeft: 3,
                  }}>
                  {minutesLeft}m left
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Route info */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 12,
          }}>
          {/* Icons column */}
          <View
            style={{ alignItems: "center", marginRight: 10, paddingTop: 4 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "#FFF5EB",
                alignItems: "center",
                justifyContent: "center",
              }}>
              <Ionicons name="restaurant" size={14} color="#FF6A00" />
            </View>
            <View
              style={{
                width: 2,
                height: 14,
                backgroundColor: "#E5E7EB",
                marginVertical: 3,
              }}
            />
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "#D1FAE5",
                alignItems: "center",
                justifyContent: "center",
              }}>
              <Ionicons name="location" size={14} color="#10B981" />
            </View>
          </View>

          {/* Text column */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 11,
                color: "#9CA3AF",
                fontWeight: "600",
                marginBottom: 2,
              }}>
              {t("missedOrder.pickup")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#1A1A1A",
                marginBottom: 8,
              }}
              numberOfLines={1}>
              {missed.order.restaurantName}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#9CA3AF",
                fontWeight: "600",
                marginBottom: 2,
              }}>
              {t("missedOrder.drop")}
            </Text>
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: "#1A1A1A" }}
              numberOfLines={1}>
              {missed.order.customerName}
            </Text>
            <Text
              style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}
              numberOfLines={1}>
              {missed.order.customerAddress}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 12,
          }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
              padding: 10,
              alignItems: "center",
            }}>
            <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>
              {t("missedOrder.distance")}
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "800",
                color: "#1A1A1A",
                marginTop: 2,
              }}>
              {missed.order.distance > 0
                ? `${missed.order.distance.toFixed(1)} km`
                : "—"}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
              padding: 10,
              alignItems: "center",
            }}>
            <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>
              {t("missedOrder.estTime")}
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "800",
                color: "#1A1A1A",
                marginTop: 2,
              }}>
              {missed.order.estimatedTime}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "#D1FAE5",
              borderRadius: 12,
              padding: 10,
              alignItems: "center",
            }}>
            <Text style={{ fontSize: 11, color: "#059669", fontWeight: "600" }}>
              {t("missedOrder.earnings")}
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "800",
                color: "#059669",
                marginTop: 2,
              }}>
              ₹
              {missed.order.earnings > 0
                ? missed.order.earnings.toFixed(0)
                : "—"}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        {canAccept ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Reject button */}
            <TouchableOpacity
              onPress={handleReject}
              disabled={accepting || loading}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: "#FEE2E2",
                borderRadius: 16,
                paddingVertical: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                opacity: accepting || loading ? 0.6 : 1,
              }}>
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text
                style={{
                  color: "#EF4444",
                  fontWeight: "800",
                  fontSize: 14,
                  marginLeft: 6,
                }}>
                {t("missedOrder.reject")}
              </Text>
            </TouchableOpacity>

            {/* Accept button */}
            <TouchableOpacity
              onPress={handleAccept}
              disabled={accepting || loading}
              activeOpacity={0.85}
              style={{
                flex: 2,
                backgroundColor: "#F59E0B",
                borderRadius: 16,
                paddingVertical: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                opacity: accepting || loading ? 0.7 : 1,
              }}>
              {accepting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: 14,
                      marginLeft: 6,
                    }}>
                    {t("missedOrder.accept")}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.75)",
                      fontSize: 12,
                      marginLeft: 4,
                      fontWeight: "600",
                    }}>
                    ({t("missedOrder.minutesLeft", { count: minutesLeft })})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => dismissMissedOrder(missed.order.id)}
            activeOpacity={0.8}
            style={{
              backgroundColor: "#F3F4F6",
              borderRadius: 16,
              paddingVertical: 10,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
            }}>
            <Ionicons name="trash-outline" size={14} color="#6B7280" />
            <Text
              style={{
                color: "#6B7280",
                fontWeight: "700",
                fontSize: 13,
                marginLeft: 6,
              }}>
              {t("missedOrder.dismiss")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
