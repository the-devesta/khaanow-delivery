import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Link } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();

  const menuItems = [
    {
      icon: "person.circle.fill",
      title: "My Profile",
      subtitle: "View and edit profile",
    },
    {
      icon: "doc.text.fill",
      title: "Documents",
      subtitle: "License, ID verification",
    },
    {
      icon: "chart.bar.fill",
      title: "Performance",
      subtitle: "View detailed stats",
    },
    { icon: "gearshape.fill", title: "Settings", subtitle: "App preferences" },
    {
      icon: "questionmark.circle.fill",
      title: "Help & Support",
      subtitle: "Get assistance",
    },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View className="w-24 h-24 bg-orange-500 rounded-full items-center justify-center mb-4">
          <Text className="text-white text-4xl">👤</Text>
        </View>
        <ThemedText type="title" style={styles.name}>
          Delivery Partner
        </ThemedText>
        <ThemedText style={styles.phone}>+91 98765 43210</ThemedText>
        <View className="flex-row gap-4 mt-4">
          <View className="bg-green-500 rounded-xl px-4 py-2">
            <Text className="text-white font-semibold">⭐ 4.8</Text>
          </View>
          <View className="bg-blue-500 rounded-xl px-4 py-2">
            <Text className="text-white font-semibold">🎯 245 Trips</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              {
                backgroundColor: colorScheme === "dark" ? "#1f1f1f" : "#f9fafb",
                borderColor: colorScheme === "dark" ? "#333" : "#e5e7eb",
              },
            ]}
          >
            <IconSymbol name={item.icon as any} size={24} color="#ff6b35" />
            <View style={styles.menuText}>
              <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
              <ThemedText style={styles.menuSubtitle}>
                {item.subtitle}
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>

      <Link href="/" dismissTo style={styles.closeButton}>
        <View className="bg-gray-200 dark:bg-gray-700 rounded-full px-6 py-3">
          <ThemedText type="defaultSemiBold">Close</ThemedText>
        </View>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  name: {
    fontSize: 24,
    marginBottom: 4,
  },
  phone: {
    opacity: 0.7,
    fontSize: 16,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  menuText: {
    flex: 1,
  },
  menuSubtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  closeButton: {
    marginTop: 20,
    alignItems: "center",
  },
});
