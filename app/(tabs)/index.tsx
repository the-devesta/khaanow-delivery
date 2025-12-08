import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Mock data for orders
const mockOrders = [
  {
    id: 1,
    restaurant: "Burger Palace",
    customer: "John Doe",
    status: "ready",
    distance: "2.3 km",
    amount: 450,
    items: 3,
  },
  {
    id: 2,
    restaurant: "Pizza Corner",
    customer: "Jane Smith",
    status: "preparing",
    distance: "1.8 km",
    amount: 780,
    items: 2,
  },
  {
    id: 3,
    restaurant: "Desi Dhaba",
    customer: "Mike Johnson",
    status: "ready",
    distance: "3.5 km",
    amount: 620,
    items: 4,
  },
];

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState(mockOrders);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "#10b981";
      case "preparing":
        return "#f59e0b";
      case "picked":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

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
            Active Orders
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {orders.length} orders available
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => setIsOnline(!isOnline)}
          style={[
            styles.statusButton,
            { backgroundColor: isOnline ? "#10b981" : "#ef4444" },
          ]}
        >
          <Text style={styles.statusText}>
            {isOnline ? "🟢 Online" : "🔴 Offline"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View className="flex-1 bg-blue-500 rounded-2xl p-4 mr-2">
          <IconSymbol name="shippingbox.fill" size={24} color="#ffffff" />
          <Text className="text-white text-2xl font-bold mt-2">12</Text>
          <Text className="text-white/80 text-sm">Today's Deliveries</Text>
        </View>
        <View className="flex-1 bg-green-500 rounded-2xl p-4 ml-2">
          <IconSymbol name="dollarsign.circle.fill" size={24} color="#ffffff" />
          <Text className="text-white text-2xl font-bold mt-2">₹2,450</Text>
          <Text className="text-white/80 text-sm">Today's Earnings</Text>
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {orders.map((order) => (
          <View
            key={order.id}
            style={[
              styles.orderCard,
              {
                backgroundColor: colorScheme === "dark" ? "#1f1f1f" : "#ffffff",
                borderColor: colorScheme === "dark" ? "#333" : "#e5e5e5",
              },
            ]}
          >
            <View style={styles.orderHeader}>
              <View>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.restaurantName}
                >
                  {order.restaurant}
                </ThemedText>
                <ThemedText style={styles.customerName}>
                  → {order.customer}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(order.status) },
                  ]}
                >
                  {order.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.orderDetails}>
              <View style={styles.detailItem}>
                <IconSymbol
                  name="mappin.circle.fill"
                  size={18}
                  color={Colors[colorScheme ?? "light"].icon}
                />
                <ThemedText style={styles.detailText}>
                  {order.distance}
                </ThemedText>
              </View>
              <View style={styles.detailItem}>
                <IconSymbol
                  name="bag.fill"
                  size={18}
                  color={Colors[colorScheme ?? "light"].icon}
                />
                <ThemedText style={styles.detailText}>
                  {order.items} items
                </ThemedText>
              </View>
              <View style={styles.detailItem}>
                <IconSymbol
                  name="indianrupeesign.circle.fill"
                  size={18}
                  color={Colors[colorScheme ?? "light"].icon}
                />
                <ThemedText style={styles.detailText}>
                  ₹{order.amount}
                </ThemedText>
              </View>
            </View>

            <TouchableOpacity style={styles.acceptButton}>
              <Text style={styles.acceptButtonText}>Accept Order</Text>
              <IconSymbol name="arrow.right" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ))}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  ordersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 18,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 14,
  },
  acceptButton: {
    backgroundColor: "#ff6b35",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
