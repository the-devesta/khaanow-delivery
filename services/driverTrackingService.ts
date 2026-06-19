/**
 * Driver Tracking Service — Firebase Realtime Database
 * Publishes driver GPS to Firebase so all clients get live updates.
 * The existing socket service is still used for immediate events;
 * Firebase provides persistent, reliable location for the customer map.
 */

import { firebaseConfig } from "@/config/firebase";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
    DatabaseReference,
    getDatabase,
    off,
    onValue,
    ref,
    set,
} from "firebase/database";

// Re-use the same Firebase app instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app, firebaseConfig.databaseURL);

/**
 * Write driver location to Firebase Realtime DB.
 * Path: delivery/partners/{partnerId}/location
 */
export async function updateDriverLocationInFirebase(
  partnerId: string,
  location: { latitude: number; longitude: number },
  orderId?: string,
): Promise<void> {
  try {
    const locationRef = ref(db, `delivery/partners/${partnerId}/location`);
    await set(locationRef, {
      latitude: location.latitude,
      longitude: location.longitude,
      orderId: orderId ?? null,
      updatedAt: Date.now(),
    });
  } catch (err) {
    // Non-fatal — socket already handles real-time location
    console.warn("[DriverTracking] Firebase write failed:", err);
  }
}

/**
 * Subscribe to a driver's location for a given order.
 * Returns an unsubscribe function.
 */
export function subscribeToDriverLocation(
  partnerId: string,
  callback: (location: { latitude: number; longitude: number } | null) => void,
): () => void {
  const locationRef: DatabaseReference = ref(
    db,
    `delivery/partners/${partnerId}/location`,
  );

  onValue(locationRef, (snapshot) => {
    const data = snapshot.val();
    if (
      data &&
      typeof data.latitude === "number" &&
      typeof data.longitude === "number"
    ) {
      callback({ latitude: data.latitude, longitude: data.longitude });
    } else {
      callback(null);
    }
  });

  return () => off(locationRef);
}
