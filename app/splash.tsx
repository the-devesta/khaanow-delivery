import { Text, View } from "react-native";
import "../assets/images/logo.png";

export default function SplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gradient-to-br from-orange-500 to-red-600">
      <View className="items-center">
        <Text className="text-6xl mb-4">🚴</Text>
        <Text className="text-white text-4xl font-bold">Khaaonow</Text>
        <Text className="text-white text-xl mt-2 opacity-90">
          Delivery Partner
        </Text>
        <View className="mt-8 bg-white/20 rounded-full px-6 py-3">
          <Text className="text-white font-semibold">Deliver. Earn. Grow.</Text>
        </View>
      </View>
    </View>
  );
}
