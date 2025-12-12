import { create } from "zustand";

export interface Location {
  latitude: number;
  longitude: number;
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

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
  items: { name: string; quantity: number }[];
  paymentType: "cash" | "online";
  status: OrderStatus;
  createdAt: Date;
  pickupLocation?: Location;
  dropLocation?: Location;
}

interface OrderState {
  activeOrder: Order | null;
  incomingOrder: Order | null;
  pendingOrder: Order | null;
  orderHistory: Order[];
  driverLocation: Location;
  
  // Actions
  setIncomingOrder: (order: Order | null) => void;
  acceptOrder: (orderId: string) => void;
  rejectOrder: (orderId: string) => void;
  updateOrderStatus: (status: OrderStatus) => void;
  completeOrder: () => void;
  setDriverLocation: (location: Location) => void;
  simulateDriverMovement: () => void;
  
  // Mock data generator
  simulateNewOrder: () => void;
}

const mockOrders: Omit<Order, "id" | "status" | "createdAt">[] = [
  {
    restaurantName: "Spice Garden",
    restaurantAddress: "Shop 12, Sector 18, Noida",
    customerName: "Rahul Sharma",
    customerAddress: "B-204, Palm Greens, Sector 22, Noida",
    customerPhone: "+91 98765 43210",
    distance: 3.2,
    estimatedTime: "25 min",
    earnings: 85,
    items: [
      { name: "Chicken Biryani", quantity: 2 },
      { name: "Raita", quantity: 1 },
    ],
    paymentType: "online",
    pickupLocation: { latitude: 28.5355, longitude: 77.3910 },
    dropLocation: { latitude: 28.5470, longitude: 77.4010 },
  },
  {
    restaurantName: "Pizza Paradise",
    restaurantAddress: "GF-34, Mall Road, Noida",
    customerName: "Priya Verma",
    customerAddress: "A-101, Sky Heights, Sector 15, Noida",
    customerPhone: "+91 87654 32109",
    distance: 2.8,
    estimatedTime: "20 min",
    earnings: 95,
    items: [
      { name: "Margherita Pizza", quantity: 1 },
      { name: "Garlic Bread", quantity: 1 },
    ],
    paymentType: "cash",
    pickupLocation: { latitude: 28.5380, longitude: 77.3950 },
    dropLocation: { latitude: 28.5510, longitude: 77.4050 },
  },
  {
    restaurantName: "Burger Junction",
    restaurantAddress: "Shop 5, Food Court, Sector 16, Noida",
    customerName: "Amit Patel",
    customerAddress: "C-302, Green Valley, Sector 19, Noida",
    customerPhone: "+91 76543 21098",
    distance: 4.5,
    estimatedTime: "30 min",
    earnings: 110,
    items: [
      { name: "Classic Burger", quantity: 3 },
      { name: "Fries", quantity: 2 },
      { name: "Coke", quantity: 3 },
    ],
    paymentType: "online",
    pickupLocation: { latitude: 28.5400, longitude: 77.3980 },
    dropLocation: { latitude: 28.5550, longitude: 77.4100 },
  },
];

export const useOrderStore = create<OrderState>((set, get) => ({
  activeOrder: null,
  incomingOrder: null,
  pendingOrder: null,
  orderHistory: [],
  driverLocation: { latitude: 28.5355, longitude: 77.3910 },

  setIncomingOrder: (order) => set({ incomingOrder: order, pendingOrder: order }),

  acceptOrder: (orderId: string) => {
    const { pendingOrder } = get();
    if (pendingOrder && pendingOrder.id === orderId) {
      set({
        activeOrder: { ...pendingOrder, status: "accepted" },
        incomingOrder: null,
        pendingOrder: null,
        driverLocation: pendingOrder.pickupLocation || { latitude: 28.5355, longitude: 77.3910 },
      });
    }
  },

  rejectOrder: (orderId: string) => {
    const { pendingOrder } = get();
    if (pendingOrder && pendingOrder.id === orderId) {
      set({ incomingOrder: null, pendingOrder: null });
    }
  },

  updateOrderStatus: (status) => {
    const { activeOrder } = get();
    if (activeOrder) {
      set({ activeOrder: { ...activeOrder, status } });
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

    const target = activeOrder.status === "picked_up" || activeOrder.status === "accepted"
      ? activeOrder.pickupLocation
      : activeOrder.dropLocation;

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

  simulateNewOrder: () => {
    const randomOrder =
      mockOrders[Math.floor(Math.random() * mockOrders.length)];
    const order: Order = {
      ...randomOrder,
      id: `ORD${Date.now()}`,
      status: "pending",
      createdAt: new Date(),
    };
    set({ incomingOrder: order, pendingOrder: order });
  },
}));
