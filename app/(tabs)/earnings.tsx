import EarningBarChart from "@/components/earnings/EarningBarChart";
import EarningListItem from "@/components/earnings/EarningListItem";
import EarningSummaryCard from "@/components/earnings/EarningSummaryCard";
import {
  ApiService,
  DeliveryPayoutLedger,
  DeliveryPayoutPeriod,
  DeliveryPayoutSettlement,
} from "@/services/api";
import { useOrderStore } from "@/store/orders";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
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
  orders: any[];
}

const formatMoney = (value?: number | null) =>
  `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;

const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const { orderHistory, fetchOrderHistory } = useOrderStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DayGroup | null>(null);
  const seeAllSheetRef = useRef<BottomSheetModal>(null);
  const dayDetailSheetRef = useRef<BottomSheetModal>(null);
  const payoutSheetRef = useRef<BottomSheetModal>(null);
  const [selectedSettlement, setSelectedSettlement] =
    useState<DeliveryPayoutSettlement | null>(null);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d">("7d");
  const [ledgerPeriod, setLedgerPeriod] = useState<DeliveryPayoutPeriod>("week");
  const [ledger, setLedger] = useState<DeliveryPayoutLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [payout, setPayout] = useState<{
    nextPayoutAmount: number;
    nextPayoutDate: string;
    method: string;
    destination: string;
    withdrawalAvailable: boolean;
  } | null>(null);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const loadPayout = useCallback(async () => {
    setLedgerLoading(true);
    const [earningsRes, ledgerRes] = await Promise.all([
      ApiService.getEarnings("week"),
      ApiService.getPayoutLedger(ledgerPeriod),
    ]);
    if (earningsRes.success && earningsRes.data?.payout) {
      setPayout(earningsRes.data.payout);
    }
    if (ledgerRes.success && ledgerRes.data) {
      setLedger(ledgerRes.data);
      setPayout({
        nextPayoutAmount: ledgerRes.data.summary.payableAmount,
        nextPayoutDate:
          ledgerRes.data.summary.nextPayoutDate || new Date().toISOString(),
        method: "Bank/UPI",
        destination: "Registered payout account",
        withdrawalAvailable: ledgerRes.data.summary.payableAmount > 0,
      });
    }
    setLedgerLoading(false);
  }, [ledgerPeriod]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrderHistory();
      loadPayout();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchOrderHistory, loadPayout]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOrderHistory(), loadPayout()]);
    setRefreshing(false);
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
    () =>
      ledger?.orders?.length
        ? ledger.orders.map((order) => ({
            ...order,
            id: order.id,
            createdAt: order.deliveredAt,
            status: "delivered",
            earnings: order.earning,
            paymentType: order.paymentMethod === "cash" ? "cash" : "online",
            distance: order.distanceKm ?? 0,
          }))
        : orderHistory.filter((o) => o.status === "delivered"),
    [ledger, orderHistory],
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
                    Admin Payable
                  </Text>
                  <Text className="text-xs text-[#9CA3AF] mt-0.5">
                    {ledger?.summary.nextPayoutDate
                      ? `Next cycle: ${formatDate(ledger.summary.nextPayoutDate)}`
                      : "Net amount after paid settlements and COD cash held"}
                  </Text>
                </View>
              </View>
              <Text className="text-xl font-extrabold text-[#10B981]">
                {formatMoney(
                  ledger?.summary.payableAmount ??
                    payout?.nextPayoutAmount ??
                    weeklyEarnings,
                )}
              </Text>
            </View>
            <View className="mb-3 rounded-2xl bg-[#F8FAFC] p-3">
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs font-medium text-[#6B7280]">
                  Gross rider earnings pending
                </Text>
                <Text className="text-xs font-extrabold text-[#1A1A1A]">
                  {formatMoney(
                    ledger?.summary.grossPayableAmount ??
                      ledger?.summary.payableAmount ??
                      payout?.nextPayoutAmount ??
                      0,
                  )}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs font-medium text-[#F97316]">
                  Less COD cash currently with you
                </Text>
                <Text className="text-xs font-extrabold text-[#F97316]">
                  -{formatMoney(ledger?.summary.cashAdjustedAmount ?? 0)}
                </Text>
              </View>
              <View className="flex-row justify-between border-t border-white pt-2">
                <Text className="text-xs font-bold text-[#10B981]">
                  Admin payable after cash adjustment
                </Text>
                <Text className="text-sm font-extrabold text-[#10B981]">
                  {formatMoney(
                    ledger?.summary.payableAmount ??
                      payout?.nextPayoutAmount ??
                      weeklyEarnings,
                  )}
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {([
                ["Paid", ledger?.summary.paidAmount ?? 0, "#10B981"],
                ["Scheduled", ledger?.summary.scheduledAmount ?? 0, "#F59E0B"],
                ["This period", ledger?.summary.periodEarned ?? weeklyEarnings, "#3B82F6"],
              ] as const).map(([label, amount, color]) => (
                <View key={label} className="flex-1 min-w-[95px] rounded-2xl bg-gray-50 p-3">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                    {label}
                  </Text>
                  <Text className="mt-1 text-base font-extrabold" style={{ color }}>
                    {formatMoney(amount)}
                  </Text>
                </View>
              ))}
            </View>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-xs text-[#6B7280] flex-1">
                {ledgerLoading
                  ? "Loading latest settlement ledger…"
                  : `${ledger?.summary.deliveredOrders ?? completedOrders.length} completed deliveries total`}
              </Text>
              <TouchableOpacity
                onPress={requestWithdrawal}
                disabled={requestingPayout || !(payout?.withdrawalAvailable)}
                className={`px-4 py-2 rounded-full ${
                  payout?.withdrawalAvailable ? "bg-[#10B981]" : "bg-gray-200"
                }`}>
                <Text className="text-white text-xs font-bold">
                  {requestingPayout ? "Requesting" : "Request"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Cash in hand ── */}
        <View className="px-6 mt-4">
          <View className="bg-white rounded-[28px] p-5 border border-orange-100">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-orange-50 rounded-2xl items-center justify-center mr-3">
                  <Ionicons name="cash-outline" size={20} color="#F97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-[#1A1A1A]">
                    Cash in Hand
                  </Text>
                  <Text className="text-xs text-[#9CA3AF] mt-0.5">
                    COD cash collected minus cash handed to admin
                  </Text>
                </View>
              </View>
              <Text className="text-xl font-extrabold text-[#F97316]">
                {formatMoney(ledger?.cash.cashInHand ?? 0)}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1 rounded-2xl bg-orange-50 p-3">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-orange-500">
                    Collected
                </Text>
                <Text className="mt-1 text-base font-extrabold text-[#1A1A1A]">
                  {formatMoney(ledger?.cash.totalCollected ?? 0)}
                </Text>
                <Text className="mt-0.5 text-[10px] text-[#9CA3AF]">
                  {ledger?.cash.deliveredCashOrders ?? 0} COD orders
                </Text>
              </View>
              <View className="flex-1 rounded-2xl bg-green-50 p-3">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-green-600">
                  Handed to admin
                </Text>
                <Text className="mt-1 text-base font-extrabold text-[#1A1A1A]">
                  {formatMoney(ledger?.cash.totalRemitted ?? 0)}
                </Text>
                <Text className="mt-0.5 text-[10px] text-[#9CA3AF]">
                  Clears after admin records remittance
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Admin payout transactions ── */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center justify-between mb-4 ml-1">
            <Text className="text-lg font-bold text-[#1A1A1A]">
              Admin Payout Transactions
            </Text>
            <View className="flex-row bg-white rounded-full p-1">
              {(["week", "month", "all"] as DeliveryPayoutPeriod[]).map((period) => (
                <TouchableOpacity
                  key={period}
                  onPress={() => setLedgerPeriod(period)}
                  className={`px-3 py-1.5 rounded-full ${
                    ledgerPeriod === period ? "bg-[#FFF7ED]" : ""
                  }`}>
                  <Text
                    className={`text-xs font-bold ${
                      ledgerPeriod === period ? "text-[#F97316]" : "text-[#9CA3AF]"
                    }`}>
                    {period === "week" ? "Week" : period === "month" ? "Month" : "All"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {(ledger?.settlements ?? []).length === 0 ? (
            <View className="bg-white rounded-[28px] p-6 border border-dashed border-gray-200 items-center">
              <Ionicons name="receipt-outline" size={34} color="#D1D5DB" />
              <Text className="mt-3 text-sm font-bold text-[#6B7280]">
                No admin payouts yet
              </Text>
                <Text className="mt-1 text-xs text-[#9CA3AF] text-center">
                Paid settlements and proof screenshots will appear here after admin marks delivery payouts paid.
              </Text>
            </View>
          ) : (
            ledger?.settlements.map((settlement) => (
              <TouchableOpacity
                key={settlement.id}
                activeOpacity={0.75}
                onPress={() => {
                  setSelectedSettlement(settlement);
                  requestAnimationFrame(() => payoutSheetRef.current?.present());
                }}
                className="mb-3 rounded-[24px] border border-gray-100 bg-white p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-extrabold text-[#1A1A1A]">
                      {formatMoney(settlement.amount)}
                    </Text>
                    <Text className="mt-1 text-xs text-[#9CA3AF]">
                      {formatDate(settlement.periodStart)} → {formatDate(settlement.periodEnd)}
                    </Text>
                    <Text className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                      {settlement.source === "legacy_payout"
                        ? "Legacy payout"
                        : `${settlement.cycle ?? "manual"} settlement`}
                    </Text>
                    {settlement.proofUrl && (
                      <Text className="mt-1 text-xs font-bold text-[#F97316]">
                        Payment proof available
                      </Text>
                    )}
                  </View>
                  <View
                    className={`rounded-full px-3 py-1 ${
                      settlement.status === "paid" ? "bg-green-50" : "bg-orange-50"
                    }`}>
                    <Text
                      className={`text-xs font-bold ${
                        settlement.status === "paid" ? "text-[#10B981]" : "text-[#F97316]"
                      }`}>
                      {settlement.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── Cash remittance transactions ── */}
        <View className="px-6 mt-6">
          <Text className="text-lg font-bold text-[#1A1A1A] mb-4 ml-1">
            Cash Paid to Admin
          </Text>
          {(ledger?.cash.remittances ?? []).length === 0 ? (
            <View className="bg-white rounded-[28px] p-6 border border-dashed border-gray-200 items-center">
              <Ionicons name="cash-outline" size={34} color="#D1D5DB" />
              <Text className="mt-3 text-sm font-bold text-[#6B7280]">
                No cash remittance yet
              </Text>
              <Text className="mt-1 text-xs text-[#9CA3AF] text-center">
                When admin records cash received from you, it appears here and reduces cash in hand.
              </Text>
            </View>
          ) : (
            ledger?.cash.remittances.map((entry) => (
              <View
                key={entry.id}
                className="mb-3 rounded-[22px] border border-gray-100 bg-white p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-extrabold text-[#1A1A1A]">
                      {formatMoney(entry.amount)}
                    </Text>
                    <Text className="mt-1 text-xs text-[#9CA3AF]">
                      {formatDateTime(entry.remittedAt)}
                    </Text>
                    {!!entry.notes && (
                      <Text className="mt-1 text-xs text-[#6B7280]">
                        {entry.notes}
                      </Text>
                    )}
                  </View>
                  <View className="rounded-full bg-green-50 px-3 py-1">
                    <Text className="text-xs font-bold text-[#10B981]">
                      RECEIVED
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
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
                onPress={() => seeAllSheetRef.current?.present()}>
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
                  requestAnimationFrame(() =>
                    dayDetailSheetRef.current?.present(),
                  );
                }}
              />
            ))
          )}
        </View>
      </ScrollView>

      <BottomSheetModal
        ref={seeAllSheetRef}
        snapPoints={["55%", "88%"]}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
          />
        )}>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-xl font-extrabold text-[#1A1A1A]">
              All Earnings
            </Text>
            <TouchableOpacity
              onPress={() => seeAllSheetRef.current?.dismiss()}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
              activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {allDayGroups.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4 text-sm">
                No earnings yet
              </Text>
            </View>
          ) : (
            allDayGroups.map((group, index) => (
              <EarningListItem
                key={`${group.date}-${index}`}
                date={group.date}
                amount={group.amount}
                orderCount={group.orderCount}
                onPress={() => {
                  seeAllSheetRef.current?.dismiss();
                  setSelectedGroup(group);
                  setTimeout(() => dayDetailSheetRef.current?.present(), 220);
                }}
              />
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={dayDetailSheetRef}
        snapPoints={["62%", "90%"]}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
          />
        )}>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">
                Earnings for
              </Text>
              <Text className="text-xl font-extrabold text-[#1A1A1A]">
                {selectedGroup?.date ?? "Selected day"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => dayDetailSheetRef.current?.dismiss()}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
              activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {!!selectedGroup && (
            <View className="mb-5 bg-[#FFFBEB] rounded-2xl p-4 flex-row border border-amber-100">
              <View className="flex-1 items-center border-r border-amber-200">
                <Text className="text-2xl font-extrabold text-[#1A1A1A]">
                  {formatMoney(selectedGroup.amount)}
                </Text>
                <Text className="text-xs text-[#6B7280] font-medium mt-0.5">
                  Total Earned
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-2xl font-extrabold text-[#1A1A1A]">
                  {selectedGroup.orderCount}
                </Text>
                <Text className="text-xs text-[#6B7280] font-medium mt-0.5">
                  Deliveries
                </Text>
              </View>
            </View>
          )}

          <Text className="text-sm font-bold text-[#6B7280] uppercase tracking-widest mb-3">
            Orders
          </Text>
          {(selectedGroup?.orders ?? []).map((order, idx) => {
            const deliveredAt = order.deliveredAt || order.createdAt;
            const paymentType =
              order.paymentType || (order.paymentMethod === "cash" ? "cash" : "online");
            return (
              <View
                key={order.id ?? order.orderNumber ?? idx}
                className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-xs font-bold text-[#9CA3AF] tracking-wide">
                    #{order.orderNumber || String(order.id).slice(-8).toUpperCase()}
                  </Text>
                  <View className="bg-[#D1FAE5] px-3 py-1 rounded-full">
                    <Text className="text-xs font-bold text-[#10B981]">
                      Delivered
                    </Text>
                  </View>
                </View>

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
                    <Text className="text-xs text-[#9CA3AF]" numberOfLines={1}>
                      {formatDateTime(deliveredAt)}
                      {order.slabLabel ? ` · ${order.slabLabel}` : ""}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 rounded-2xl bg-gray-50 p-3">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-xs text-[#6B7280]">Order amount</Text>
                    <Text className="text-xs font-bold text-[#1A1A1A]">
                      {formatMoney(order.totalAmount)}
                    </Text>
                  </View>
                  {!!order.couponDiscount && (
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-xs text-[#F97316]">
                        Coupon {order.couponCode ? `· ${order.couponCode}` : ""}
                      </Text>
                      <Text className="text-xs font-bold text-[#F97316]">
                        -{formatMoney(order.couponDiscount)}
                      </Text>
                    </View>
                  )}
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-xs text-[#6B7280]">Cash collected</Text>
                    <Text className="text-xs font-bold text-[#1A1A1A]">
                      {formatMoney(order.cashCollected ?? 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-[#6B7280]">Your earning</Text>
                    <Text className="text-sm font-extrabold text-[#10B981]">
                      {formatMoney(order.earnings ?? order.earning ?? 0)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between pt-3">
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        paymentType === "online" ? "#DBEAFE" : "#D1FAE5",
                    }}>
                    <Text
                      className="text-[10px] font-bold"
                      style={{
                        color: paymentType === "online" ? "#3B82F6" : "#10B981",
                      }}>
                      {paymentType === "online" ? "Online" : "Cash"}
                    </Text>
                  </View>
                  {!!order.distance && (
                    <Text className="text-xs text-[#9CA3AF] font-medium">
                      {Number(order.distance).toFixed(1)} km
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={payoutSheetRef}
        snapPoints={["45%", "78%"]}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
          />
        )}>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-extrabold text-[#1A1A1A]">
                Payout receipt
              </Text>
              <Text className="mt-1 text-xs text-[#9CA3AF]">
                {formatDate(selectedSettlement?.periodStart)} →{" "}
                {formatDate(selectedSettlement?.periodEnd)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => payoutSheetRef.current?.dismiss()}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
              activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {!!selectedSettlement && (
            <View className="rounded-[24px] bg-gray-50 p-4">
              {[
                ["Amount", formatMoney(selectedSettlement.amount)],
                ["Status", selectedSettlement.status.toUpperCase()],
                [
                  "Type",
                  selectedSettlement.source === "legacy_payout"
                    ? "Legacy payout"
                    : `${selectedSettlement.cycle ?? "manual"} settlement`,
                ],
                ["Paid at", formatDateTime(selectedSettlement.paidAt)],
                ["Created", formatDateTime(selectedSettlement.createdAt)],
              ].map(([label, value]) => (
                <View
                  key={label}
                  className="flex-row justify-between border-b border-white py-3 last:border-0">
                  <Text className="flex-1 pr-3 text-sm font-medium text-[#6B7280]">
                    {label}
                  </Text>
                  <Text className="text-sm font-extrabold text-[#1A1A1A]">
                    {value}
                  </Text>
                </View>
              ))}
              {!!selectedSettlement.notes && (
                <Text className="mt-4 text-sm text-[#6B7280]">
                  {selectedSettlement.notes}
                </Text>
              )}
              {!!selectedSettlement.breakdown && (
                <View className="mt-4 rounded-2xl bg-white p-3">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">
                    Settlement breakdown
                  </Text>
                  {[
                    ["Orders", selectedSettlement.breakdown.orderCount ?? "—"],
                    [
                      "Delivery earnings",
                      formatMoney(selectedSettlement.breakdown.deliveryEarnings ?? 0),
                    ],
                    [
                      "Gross order value",
                      formatMoney(selectedSettlement.breakdown.grossAmount ?? 0),
                    ],
                  ].map(([label, value]) => (
                    <View key={label} className="flex-row justify-between py-1">
                      <Text className="text-xs text-[#6B7280]">{label}</Text>
                      <Text className="text-xs font-bold text-[#1A1A1A]">
                        {value}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {selectedSettlement.proofUrl ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(selectedSettlement.proofUrl!)}
                  className="mt-5 flex-row items-center justify-center rounded-2xl bg-[#F97316] py-4">
                  <Ionicons name="image-outline" size={20} color="white" />
                  <Text className="ml-2 font-bold text-white">
                    Open payment proof
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text className="mt-5 text-center text-sm text-[#9CA3AF]">
                  No proof screenshot attached yet.
                </Text>
              )}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}
