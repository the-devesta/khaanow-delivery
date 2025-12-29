import { create } from "zustand";
import { ApiService } from "../services/api";

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
  availableOrders: Order[];
  loading: boolean;
  
  // Actions
  setIncomingOrder: (order: Order | null) => void;
  acceptOrder: (orderId: string) => Promise<void>;
  rejectOrder: (orderId: string) => void;
  updateOrderStatus: (status: OrderStatus) => Promise<void>;
  completeOrder: () => void;
  setDriverLocation: (location: Location) => void;
  simulateDriverMovement: () => void;
  fetchAvailableOrders: () => Promise<void>;
  fetchAssignedOrders: () => Promise<void>;
  fetchOrderHistory: (page?: number) => Promise<void>;
  updateLocation: (latitude: number, longitude: number) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  activeOrder: null,
  incomingOrder: null,
  pendingOrder: null,
  orderHistory: [],
  driverLocation: { latitude: 28.5355, longitude: 77.3910 },
  availableOrders: [],
  loading: false,

  setIncomingOrder: (order) => set({ incomingOrder: order, pendingOrder: order }),

  acceptOrder: async (orderId: string) => {
    try {
      set({ loading: true });
      
      const response = await ApiService.acceptOrder(orderId);
      
      if (response.success) {
        const { pendingOrder } = get();
        if (pendingOrder && pendingOrder.id === orderId) {
          set({
            activeOrder: { ...pendingOrder, status: "accepted" },
            incomingOrder: null,
            pendingOrder: null,
            driverLocation: pendingOrder.pickupLocation || { latitude: 28.5355, longitude: 77.3910 },
          });
        }
      } else {
        console.error('Failed to accept order:', response.message);
      }
    } catch (error) {
      console.error('Accept order error:', error);
    } finally {
      set({ loading: false });
    }
  },

  rejectOrder: (orderId: string) => {
    const { pendingOrder } = get();
    if (pendingOrder && pendingOrder.id === orderId) {
      set({ incomingOrder: null, pendingOrder: null });
    }
  },

  updateOrderStatus: async (status: OrderStatus) => {
    try {
      const { activeOrder } = get();
      if (!activeOrder) return;
      
      set({ loading: true });
      
      const response = await ApiService.updateOrderStatus(activeOrder.id, status);
      
      if (response.success) {
        set({ activeOrder: { ...activeOrder, status } });
      } else {
        console.error('Failed to update order status:', response.message);
      }
    } catch (error) {
      console.error('Update order status error:', error);
    } finally {
      set({ loading: false });
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

  fetchAvailableOrders: async () => {
    try {
      set({ loading: true });
      
      const response = await ApiService.getAvailableOrders();
      
      if (response.success && response.data) {
        // Transform API data to Order format
        const orders: Order[] = response.data.map((order: any) => ({
          id: order._id || order.id,
          restaurantName: order.restaurant?.name || 'Unknown Restaurant',
          restaurantAddress: order.restaurant?.address || '',
          customerName: order.user?.name || 'Customer',
          customerAddress: order.deliveryAddress?.fullAddress || '',
          customerPhone: order.user?.phone || '',
          distance: order.distance || 0,
          estimatedTime: order.estimatedDeliveryTime || '30 min',
          earnings: order.deliveryFee || 0,
          items: order.items?.map((item: any) => ({
            name: item.food?.name || item.name,
            quantity: item.quantity,
          })) || [],
          paymentType: order.paymentMethod === 'card' ? 'online' : 'cash',
          status: order.status,
          createdAt: new Date(order.createdAt),
          pickupLocation: order.restaurant?.location,
          dropLocation: order.deliveryAddress?.location,
        }));
        
        set({ availableOrders: orders });
      }
    } catch (error) {
      console.error('Fetch available orders error:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchAssignedOrders: async () => {
    try {
      set({ loading: true });
      
      const response = await ApiService.getAssignedOrders();
      
      if (response.success && response.data) {
        // Get active order (first assigned order)
        if (response.data.length > 0) {
          const order = response.data[0];
          const transformedOrder: Order = {
            id: order._id || order.id,
            restaurantName: order.restaurant?.name || 'Unknown Restaurant',
            restaurantAddress: order.restaurant?.address || '',
            customerName: order.user?.name || 'Customer',
            customerAddress: order.deliveryAddress?.fullAddress || '',
            customerPhone: order.user?.phone || '',
            distance: order.distance || 0,
            estimatedTime: order.estimatedDeliveryTime || '30 min',
            earnings: order.deliveryFee || 0,
            items: order.items?.map((item: any) => ({
              name: item.food?.name || item.name,
              quantity: item.quantity,
            })) || [],
            paymentType: order.paymentMethod === 'card' ? 'online' : 'cash',
            status: order.status,
            createdAt: new Date(order.createdAt),
            pickupLocation: order.restaurant?.location,
            dropLocation: order.deliveryAddress?.location,
          };
          
          set({ activeOrder: transformedOrder });
        }
      }
    } catch (error) {
      console.error('Fetch assigned orders error:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchOrderHistory: async (page = 1) => {
    try {
      set({ loading: true });
      
      const response = await ApiService.getOrderHistory(page);
      
      if (response.success && response.data) {
        const orders: Order[] = response.data.map((order: any) => ({
          id: order._id || order.id,
          restaurantName: order.restaurant?.name || 'Unknown Restaurant',
          restaurantAddress: order.restaurant?.address || '',
          customerName: order.user?.name || 'Customer',
          customerAddress: order.deliveryAddress?.fullAddress || '',
          customerPhone: order.user?.phone || '',
          distance: order.distance || 0,
          estimatedTime: order.estimatedDeliveryTime || '30 min',
          earnings: order.deliveryFee || 0,
          items: order.items?.map((item: any) => ({
            name: item.food?.name || item.name,
            quantity: item.quantity,
          })) || [],
          paymentType: order.paymentMethod === 'card' ? 'online' : 'cash',
          status: order.status,
          createdAt: new Date(order.createdAt),
          pickupLocation: order.restaurant?.location,
          dropLocation: order.deliveryAddress?.location,
        }));
        
        set({ orderHistory: orders });
      }
    } catch (error) {
      console.error('Fetch order history error:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateLocation: async (latitude: number, longitude: number) => {
    try {
      await ApiService.updateLocation(latitude, longitude);
      set({ driverLocation: { latitude, longitude } });
    } catch (error) {
      console.error('Update location error:', error);
    }
  },
}));

