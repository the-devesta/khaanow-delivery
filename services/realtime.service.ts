import { firebaseConfig } from "@/config/firebase";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase, off, onChildAdded, onValue, ref } from "firebase/database";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app, firebaseConfig.databaseURL);

type RealtimeEnvelope<T = any> = {
  payload?: T;
  updatedAt?: number;
  taken?: boolean;
  orderId?: string;
};

function unwrap<T = any>(value: RealtimeEnvelope<T> | T): T {
  return ((value as RealtimeEnvelope<T>)?.payload ?? value) as T;
}

export function subscribeToDeliveryRealtime(handlers: {
  onAvailableOrder?: (order: any, updatedAt?: number) => void;
  onOrderTaken?: (orderId: string) => void;
  onOrderUpdated?: (order: any) => void;
}) {
  const unsubscribers: Array<() => void> = [];

  const availableRef = ref(db, "delivery/availableOrders");
  onChildAdded(availableRef, (snapshot) => {
    const data = snapshot.val() as RealtimeEnvelope;
    const order = unwrap(data);
    if (order?._id || order?.id) {
      handlers.onAvailableOrder?.(order, data?.updatedAt);
    }
  });
  unsubscribers.push(() => off(availableRef));

  const takenRef = ref(db, "delivery/orderTaken");
  onChildAdded(takenRef, (snapshot) => {
    const data = snapshot.val() as RealtimeEnvelope;
    const orderId = data?.orderId || snapshot.key;
    if (orderId) handlers.onOrderTaken?.(orderId);
  });
  unsubscribers.push(() => off(takenRef));

  const ordersRef = ref(db, "orders");
  onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    Object.values(data).forEach((entry: any) => {
      const order = entry?.payload;
      if (order?._id || order?.id) handlers.onOrderUpdated?.(order);
    });
  });
  unsubscribers.push(() => off(ordersRef));

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export function subscribeToOrderPayment(
  orderId: string,
  onPaymentConfirmed: () => void,
) {
  const paymentRef = ref(db, `events/orders/${orderId}/payment-confirmed`);
  onValue(paymentRef, (snapshot) => {
    if (snapshot.exists()) onPaymentConfirmed();
  });

  return () => off(paymentRef);
}
