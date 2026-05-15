import EarningBarChart from "@/components/earnings/EarningBarChart";
import EarningListItem from "@/components/earnings/EarningListItem";
import EarningSummaryCard from "@/components/earnings/EarningSummaryCard";
import { ApiService } from "@/services/api";
import { Order, useOrderStore } from "@/store/orders";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DayGroup {
  date: string; // e.g. "Mar 3, 2026"
  rawDate: Date;
  amount: number;
  orderCount: number;
  orders: Order[];
}

// ─── Day-Detail Modal ─────────────────────────────────────────────────────────

function DayDetailModal({
  visible,
  group,
  onClose,
}: {
  visible: boolean;
  group: DayGroup | null;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!group) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          opacity: fadeAnim,
        }}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FAFAFA",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          maxHeight: "80%",
          transform: [{ translateY: slideAnim }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 20,
        }}>
        {/* Handle */}
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 bg-gray-200 rounded-full" />
        </View>

        {/* Header */}
        <View className="px-6 pt-4 pb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">
              Earnings for
            </Text>
            <Text className="text-xl font-extrabold text-[#1A1A1A]">
              {group.date}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
            activeOpacity={0.7}>
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Summary Strip */}
        <View className="mx-6 mb-5 bg-gradient-to-r from-amber-50 to-green-50 rounded-2xl p-4 flex-row border border-amber-100">
          <View className="flex-1 items-center border-r border-amber-200">
            <Text className="text-2xl font-extrabold text-[#1A1A1A]">
              ₹{group.amount.toLocaleString()}
            </Text>
            <Text className="text-xs text-[#6B7280] font-medium mt-0.5">
              Total Earned
            </Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-extrabold text-[#1A1A1A]">
              {group.orderCount}
            </Text>
            <Text className="text-xs text-[#6B7280] font-medium mt-0.5">
              Deliveries
            </Text>
          </View>
        </View>

        {/* Order List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <Text className="text-sm font-bold text-[#6B7280] uppercase tracking-widest mb-3">
            Orders
          </Text>
          {group.orders.map((order, idx) => {
            const time = new Date(order.createdAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
            return (
              <View
                key={order.id ?? idx}
                className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 ">
                {/* Row 1: ID + Status */}
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-xs font-bold text-[#9CA3AF] tracking-wide">
                    #{String(order.id).slice(-8).toUpperCase()}
                  </Text>
                  <View className="bg-[#D1FAE5] px-3 py-1 rounded-full">
                    <Text className="text-xs font-bold text-[#10B981]">
                      Delivered
                    </Text>
                  </View>
                </View>

                {/* Row 2: Restaurant */}
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-[#FFFBEB] rounded-xl items-center justify-center mr-2.5">
                    <Ionicons name="restaurant" size={15} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-bold text-[#1A1A1A]"
                      numberOfLines={1}>
                      {order.restaurantName}
                    </Text>
                    {!!order.restaurantAddress && (
                      <Text
                        className="text-xs text-[#9CA3AF]"
                        numberOfLines={1}>
                        {order.restaurantAddress}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Row 3: Customer */}
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 bg-[#D1FAE5] rounded-xl items-center justify-center mr-2.5">
                    <Ionicons name="location" size={15} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-semibold text-[#374151]"
                      numberOfLines={1}>
                      {order.customerName}
                    </Text>
                    {!!order.customerAddress && (
                      <Text
                        className="text-xs text-[#9CA3AF]"
                        numberOfLines={1}>
                        {order.customerAddress}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Row 4: Meta + Earnings */}
                <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
                  <View className="flex-row items-center gap-3">
                    {/* Time */}
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                      <Text className="text-xs text-[#9CA3AF] font-medium">
                        {time}
                      </Text>
                    </View>
                    {/* Distance */}
                    {order.distance > 0 && (
                      <View className="flex-row items-center gap-1">
                        <Ionicons
                          name="navigate-outline"
                          size={11}
                          color="#9CA3AF"
                        />
                        <Text className="text-xs text-[#9CA3AF] font-medium">
                          {order.distance} km
                        </Text>
                      </View>
                    )}
                    {/* Payment */}
                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          order.paymentType === "online"
                            ? "#DBEAFE"
                            : "#D1FAE5",
                      }}>
                      <Text
                        className="text-[10px] font-bold"
                        style={{
                          color:
                            order.paymentType === "online"
                              ? "#3B82F6"
                              : "#10B981",
                        }}>
                        {order.paymentType === "online" ? "Online" : "Cash"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-base font-extrabold text-[#10B981]">
                    ₹{order.earnings || 0}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── See All Modal ────────────────────────────────────────────────────────────

function SeeAllModal({
  visible,
  groups,
  onClose,
  onSelectGroup,
}: {
  visible: boolean;
  groups: DayGroup[];
  onClose: () => void;
  onSelectGroup: (g: DayGroup) => void;
}) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          opacity: fadeAnim,
        }}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FAFAFA",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          maxHeight: "85%",
          transform: [{ translateY: slideAnim }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 20,
        }}>
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 bg-gray-200 rounded-full" />
        </View>
        <View className="px-6 pt-4 pb-5 flex-row items-center justify-between">
          <Text className="text-xl font-extrabold text-[#1A1A1A]">
            All Earnings
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
            activeOpacity={0.7}>
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {groups.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4 text-sm">
                No earnings yet
              </Text>
            </View>
          ) : (
            groups.map((g, i) => (
              <EarningListItem
                key={i}
                date={g.date}
                amount={g.amount}
                orderCount={g.orderCount}
                onPress={() => {
                  onClose();
                  setTimeout(() => onSelectGroup(g), 320);
                }}
              />
            ))
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const { orderHistory, fetchOrderHistory } = useOrderStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DayGroup | null>(null);
  const [showSeeAll, setShowSeeAll] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d">("7d");
  const [payout, setPayout] = useState<{
    nextPayoutAmount: number;
    nextPayoutDate: string;
    method: string;
    destination: string;
    withdrawalAvailable: boolean;
  } | null>(null);
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    fetchOrderHistory();
    loadPayout();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOrderHistory(), loadPayout()]);
    setRefreshing(false);
  };

  const loadPayout = async () => {
    const res = await ApiService.getEarnings("week");
    if (res.success && res.data?.payout) {
      setPayout(res.data.payout);
    }
  };

  const requestWithdrawal = async () => {
    if (!payout?.nextPayoutAmount) return;
    Alert.alert(
      "Request Withdrawal",
      `Request withdrawal of ₹${payout.nextPayoutAmount.toLocaleString()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request",
          onPress: async () => {
            setRequestingPayout(true);
            const res = await ApiService.requestPayoutWithdrawal(
              payout.nextPayoutAmount,
            );
            setRequestingPayout(false);
            Alert.alert(res.success ? "Requested" : "Failed", res.message);
          },
        },
      ],
    );
  };

  const completedOrders = useMemo(
    () => orderHistory.filter((o) => o.status === "delivered"),
    [orderHistory],
  );

  // Group by day
  const allDayGroups: DayGroup[] = useMemo(() => {
    const map = new Map<string, DayGroup>();
    completedOrders.forEach((order) => {
      const d = new Date(order.createdAt);
      const key = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const earnings = order.earnings || 0;
      const existing = map.get(key);
      if (existing) {
        existing.amount += earnings;
        existing.orderCount++;
        existing.orders.push(order);
      } else {
        map.set(key, {
          date: key,
          rawDate: d,
          amount: earnings,
          orderCount: 1,
          orders: [order],
        });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => b.rawDate.getTime() - a.rawDate.getTime(),
    );
  }, [completedOrders]);

  // Recent 7 groups shown in screen
  const recentGroups = allDayGroups.slice(0, 7);

  // Week / Month chart data
  const chartData = useMemo(() => {
    const days = chartPeriod === "7d" ? 7 : 30;
    const dayLabels =
      chartPeriod === "7d"
        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        : Array.from({ length: 30 }, (_, i) => String(i + 1));

    const result: { label: string; value: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayOrders = completedOrders.filter((o) => {
        const od = new Date(o.createdAt);
        od.setHours(0, 0, 0, 0);
        return od.getTime() === date.getTime();
      });

      const label =
        chartPeriod === "7d"
          ? dayLabels[date.getDay()]
          : String(date.getDate());

      result.push({
        label,
        value: dayOrders.reduce((s, o) => s + (o.earnings || 0), 0),
      });
    }
    return result;
  }, [completedOrders, chartPeriod]);

  // Summary numbers
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEarnings = completedOrders
    .filter((o) => {
      const d = new Date(o.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    })
    .reduce((s, o) => s + (o.earnings || 0), 0);

  const todayDeliveries = completedOrders.filter((o) => {
    const d = new Date(o.createdAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }).length;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const weeklyEarnings = completedOrders
    .filter((o) => new Date(o.createdAt) >= weekStart)
    .reduce((s, o) => s + (o.earnings || 0), 0);

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <View className="flex-1 bg-[#F3E0D9]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#F59E0B"
            colors={["#F59E0B"]}
          />
        }
        contentContainerStyle={{
          paddingBottom: 110,
          paddingTop: insets.top + 10,
        }}>
        {/* ── Header ── */}
        <View className="px-6 pb-5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1">
              <Text className="text-sm font-medium text-[#7A7A7A] uppercase tracking-wider">
                Earnings Overview
              </Text>
              <Text className="text-3xl font-extrabold text-[#1A1A1A] mt-1">
                Track Income 💰
              </Text>
            </View>
            <TouchableOpacity
              className="w-12 h-12 bg-white rounded-full items-center justify-center "
              activeOpacity={0.7}>
              <Ionicons name="download-outline" size={24} color="#F59E0B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero Card – Today's Earnings ── */}
        <View className="px-6 mt-2">
          <View className="bg-white rounded-[32px] p-1 ">
            <View className="bg-gray-50 rounded-[28px] overflow-hidden">
              <EarningSummaryCard
                title="Today's Earnings"
                amount={todayEarnings}
                subtitle={`From ${todayDeliveries} ${todayDeliveries === 1 ? "delivery" : "deliveries"} today`}
                icon="trending-up"
                iconColor="#F59E0B"
                iconBg="#FFFBEB"
                trend={{ value: "Live", isPositive: true }}
              />
            </View>
          </View>
        </View>

        {/* ── Mini Stats ── */}
        <View className="px-6 mt-4 flex-row gap-4">
          <View className="flex-1 bg-white rounded-[28px] p-5  relative overflow-hidden">
            <View className="absolute right-0 top-0 w-16 h-16 bg-[#3B82F6]/10 rounded-full -mr-6 -mt-6" />
            <View className="w-10 h-10 bg-[#DBEAFE] rounded-2xl items-center justify-center mb-3">
              <Ionicons name="calendar" size={20} color="#3B82F6" />
            </View>
            <Text className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wide">
              This Week
            </Text>
            <Text className="text-2xl font-extrabold text-[#1A1A1A]">
              ₹{weeklyEarnings.toLocaleString()}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-[28px] p-5  relative overflow-hidden">
            <View className="absolute right-0 top-0 w-16 h-16 bg-[#10B981]/10 rounded-full -mr-6 -mt-6" />
            <View className="w-10 h-10 bg-[#D1FAE5] rounded-2xl items-center justify-center mb-3">
              <Ionicons name="checkmark-done" size={20} color="#10B981" />
            </View>
            <Text className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wide">
              Completed
            </Text>
            <Text className="text-2xl font-extrabold text-[#1A1A1A]">
              {completedOrders.length}
            </Text>
          </View>
        </View>

        {/* ── Payout Visibility ── */}
        <View className="px-6 mt-4">
          <View className="bg-white rounded-[28px] p-5 border border-gray-100">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-[#ECFDF5] rounded-2xl items-center justify-center mr-3">
                  <Ionicons name="card-outline" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-[#1A1A1A]">
                    Weekly Payout
                  </Text>
                  <Text className="text-xs text-[#9CA3AF] mt-0.5">
                    {payout?.nextPayoutDate
                      ? `Next: ${new Date(payout.nextPayoutDate).toLocaleDateString("en-IN")}`
                      : "Calculated from delivered orders"}
                  </Text>
                </View>
              </View>
              <Text className="text-xl font-extrabold text-[#10B981]">
                ₹{(payout?.nextPayoutAmount || weeklyEarnings).toLocaleString()}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-[#6B7280] flex-1">
                {payout
                  ? `${payout.method} • ${payout.destination}`
                  : "Bank/UPI destination loads from profile"}
              </Text>
              <TouchableOpacity
                onPress={requestWithdrawal}
                disabled={requestingPayout || !(payout?.withdrawalAvailable)}
                className={`px-4 py-2 rounded-full ${
                  payout?.withdrawalAvailable ? "bg-[#10B981]" : "bg-gray-200"
                }`}>
                <Text className="text-white text-xs font-bold">
                  {requestingPayout ? "Requesting" : "Withdraw"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Chart ── */}
        <View className="px-6 mt-6">
          <View className="bg-white rounded-[32px] p-6 ">
            {/* Period Toggle */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-[#1A1A1A]">
                Earnings Chart
              </Text>
              <View className="flex-row bg-gray-100 rounded-full p-1">
                {(["7d", "30d"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setChartPeriod(p)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 50,
                      backgroundColor:
                        chartPeriod === p ? "#FFF" : "transparent",
                    }}
                    activeOpacity={0.7}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: chartPeriod === p ? "#F59E0B" : "#9CA3AF",
                      }}>
                      {p === "7d" ? "7 Days" : "30 Days"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {completedOrders.length === 0 ? (
              <View className="items-center py-10">
                <Ionicons name="bar-chart-outline" size={48} color="#E5E7EB" />
                <Text className="text-sm text-[#9CA3AF] mt-3">
                  No earnings data yet
                </Text>
                <Text className="text-xs text-[#D1D5DB] mt-1">
                  Complete deliveries to see your chart
                </Text>
              </View>
            ) : (
              <EarningBarChart data={chartData} maxValue={maxValue} />
            )}
          </View>
        </View>

        {/* ── Earnings History ── */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center justify-between mb-4 ml-1">
            <Text className="text-lg font-bold text-[#1A1A1A]">
              Earnings History
            </Text>
            {allDayGroups.length > 7 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowSeeAll(true)}>
                <Text className="text-sm font-bold text-[#F59E0B]">
                  See All ({allDayGroups.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {recentGroups.length === 0 ? (
            <View className="bg-white rounded-[42px] p-8  items-center">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="wallet-outline" size={36} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-bold text-[#1A1A1A] mb-2">
                No Earnings Yet
              </Text>
              <Text className="text-sm text-[#7A7A7A] text-center max-w-[200px] leading-5">
                Complete your first delivery to start earning!
              </Text>
            </View>
          ) : (
            recentGroups.map((group, index) => (
              <EarningListItem
                key={index}
                date={group.date}
                amount={group.amount}
                orderCount={group.orderCount}
                onPress={() => {
                  setSelectedGroup(group);
                  setShowDayDetail(true);
                }}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── See All Modal ── */}
      <SeeAllModal
        visible={showSeeAll}
        groups={allDayGroups}
        onClose={() => setShowSeeAll(false)}
        onSelectGroup={(g) => {
          setSelectedGroup(g);
          setShowDayDetail(true);
        }}
      />

      {/* ── Day Detail Modal ── */}
      <DayDetailModal
        visible={showDayDetail}
        group={selectedGroup}
        onClose={() => setShowDayDetail(false)}
      />
    </View>
  );
}
