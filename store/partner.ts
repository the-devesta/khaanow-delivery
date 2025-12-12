import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface PartnerState {
  isOnline: boolean;
  todayEarnings: number;
  completedOrders: number;
  activeOrder: {
    id: string;
    restaurantName: string;
    customerName: string;
    deliveryAddress: string;
    orderValue: number;
    status: "accepted" | "picked_up" | "delivering";
    estimatedTime: string;
  } | null;
  
  // Actions
  toggleOnline: () => void;
  setOnlineStatus: (status: boolean) => void;
  setActiveOrder: (order: PartnerState["activeOrder"]) => void;
  completeOrder: () => void;
  updateEarnings: (amount: number) => void;
  initializeStore: () => Promise<void>;
}

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set, get) => ({
      isOnline: false,
      todayEarnings: 0,
      completedOrders: 0,
      activeOrder: null,

      toggleOnline: () => {
        set((state) => ({ isOnline: !state.isOnline }));
      },

      setOnlineStatus: (status: boolean) => {
        set({ isOnline: status });
      },

      setActiveOrder: (order) => {
        set({ activeOrder: order });
      },

      completeOrder: () => {
        const { activeOrder, completedOrders, todayEarnings } = get();
        if (activeOrder) {
          set({
            activeOrder: null,
            completedOrders: completedOrders + 1,
            todayEarnings: todayEarnings + activeOrder.orderValue,
          });
        }
      },

      updateEarnings: (amount: number) => {
        set((state) => ({
          todayEarnings: state.todayEarnings + amount,
        }));
      },

      initializeStore: async () => {
        try {
          const stored = await AsyncStorage.getItem("partner-storage");
          if (stored) {
            const data = JSON.parse(stored);
            set(data.state);
          }
        } catch (error) {
          console.error("Failed to initialize partner store:", error);
        }
      },
    }),
    {
      name: "partner-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
