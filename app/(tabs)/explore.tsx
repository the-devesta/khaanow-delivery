import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const earningsData = [
  { date: "Today", orders: 12, earnings: 2450, distance: 45.2 },
  { date: "Yesterday", orders: 15, earnings: 3120, distance: 58.7 },
  { date: "Dec 7", orders: 10, earnings: 2100, distance: 38.5 },
  { date: "Dec 6", orders: 14, earnings: 2890, distance: 52.3 },
  { date: "Dec 5", orders: 11, earnings: 2340, distance: 42.1 },
];

export default function EarningsScreen() {
  const colorScheme = useColorScheme();

  const totalWeekEarnings = earningsData.reduce(
    (sum, day) => sum + day.earnings,
    0
  );
  const totalWeekOrders = earningsData.reduce(
    (sum, day) => sum + day.orders,
    0
  );
  const avgPerOrder = Math.round(totalWeekEarnings / totalWeekOrders);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#ffffff" },
        ]}
      >
        <View>
          <ThemedText type="title" style={styles.headerTitle}>
            My Earnings
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Track your performance
          </ThemedText>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-3xl p-6 mb-4">
            <View style={styles.summaryHeader}>
              <IconSymbol
                name="chart.line.uptrend.xyaxis"
                size={32}
                color="#ffffff"
              />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>This Week</Text>
              </View>
            </View>
            <Text className="text-white text-4xl font-bold mt-4">
              ₹{totalWeekEarnings.toLocaleString()}
            </Text>
            <Text className="text-white/80 text-base mt-2">Total Earnings</Text>

            <View style={styles.summaryStats}>
              <View>
                <Text className="text-white text-xl font-semibold">
                  {totalWeekOrders}
                </Text>
                <Text className="text-white/70 text-sm">Deliveries</Text>
              </View>
              <View style={styles.divider} />
              <View>
                <Text className="text-white text-xl font-semibold">
                  ₹{avgPerOrder}
                </Text>
                <Text className="text-white/70 text-sm">Avg/Order</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View className="flex-1 bg-orange-500 rounded-2xl p-4 mr-2">
              <IconSymbol name="flame.fill" size={28} color="#ffffff" />
              <Text className="text-white text-2xl font-bold mt-2">85%</Text>
              <Text className="text-white/90 text-sm mt-1">Rating</Text>
            </View>
            <View className="flex-1 bg-blue-500 rounded-2xl p-4 mx-2">
              <IconSymbol name="timer" size={28} color="#ffffff" />
              <Text className="text-white text-2xl font-bold mt-2">22m</Text>
              <Text className="text-white/90 text-sm mt-1">Avg Time</Text>
            </View>
            <View className="flex-1 bg-green-500 rounded-2xl p-4 ml-2">
              <IconSymbol name="bolt.fill" size={28} color="#ffffff" />
              <Text className="text-white text-2xl font-bold mt-2">124</Text>
              <Text className="text-white/90 text-sm mt-1">Streak</Text>
            </View>
          </View>
        </View>

        {/* Daily Breakdown */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Daily Breakdown
          </ThemedText>

          {earningsData.map((day, index) => (
            <View
              key={index}
              style={[
                styles.earningCard,
                {
                  backgroundColor:
                    colorScheme === "dark" ? "#1f1f1f" : "#ffffff",
                  borderColor: colorScheme === "dark" ? "#333" : "#e5e5e5",
                },
              ]}
            >
              <View style={styles.earningLeft}>
                <ThemedText type="defaultSemiBold" style={styles.dayText}>
                  {day.date}
                </ThemedText>
                <ThemedText style={styles.ordersText}>
                  {day.orders} orders • {day.distance} km
                </ThemedText>
              </View>
              <View style={styles.earningRight}>
                <Text style={styles.amountText}>₹{day.earnings}</Text>
                <View
                  style={[
                    styles.earningBadge,
                    { backgroundColor: "#10b981" + "20" },
                  ]}
                >
                  <Text style={[styles.earningBadgeText, { color: "#10b981" }]}>
                    Completed
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity style={styles.withdrawButton}>
          <IconSymbol name="banknote" size={24} color="#ffffff" />
          <Text style={styles.withdrawText}>Withdraw Earnings</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            💡 Complete more deliveries to increase your earnings and unlock
            bonuses!
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryContainer: {
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  summaryStats: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    gap: 20,
  },
  divider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  quickStats: {
    flexDirection: "row",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 20,
  },
  earningCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  earningLeft: {
    flex: 1,
  },
  dayText: {
    fontSize: 16,
    marginBottom: 4,
  },
  ordersText: {
    fontSize: 13,
    opacity: 0.7,
  },
  earningRight: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 4,
  },
  earningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  earningBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  withdrawButton: {
    backgroundColor: "#6366f1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
  },
  withdrawText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    backgroundColor: "#fef3c7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  footerText: {
    color: "#92400e",
    textAlign: "center",
    fontSize: 14,
  },
});
