import io, { Socket } from "socket.io-client";
import { API_BASE_URL } from "./api"; // Ensure this exports the base URL

// Remove /api from the URL to get the base socket URL
const SOCKET_URL = API_BASE_URL.replace("/api", "");

class SocketService {
  private socket: Socket | null = null;
  private listeners: { [key: string]: Function[] } = {};
  /** Order rooms to rejoin automatically after reconnection */
  private activeRooms: Set<string> = new Set();
  /** Authenticated partner ID — sent when joining the delivery-partners room */
  private partnerId: string | null = null;

  setPartnerId(id: string) {
    this.partnerId = id;
    // If already connected, rejoin with the ID so the server records it
    if (this.socket?.connected) {
      this.socket.emit("join-delivery-updates", id);
    }
  }

  connect() {
    if (this.socket?.connected) return;

    // If socket exists but is disconnected, just reconnect it
    if (this.socket) {
      this.socket.connect();
      return;
    }

    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000, // start retrying after 1 s
      reconnectionDelayMax: 15000, // back off up to 15 s
      reconnectionAttempts: Infinity, // never give up
      timeout: 20000,
      // Try WebSocket first to avoid the XHR-poll error on flaky networks;
      // falls back to long-polling if WebSocket is unavailable.
      transports: ["websocket", "polling"],
      extraHeaders: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);

      // Always rejoin the delivery-partners broadcast room, passing partnerId so server tracks us
      this.socket?.emit("join-delivery-updates", this.partnerId ?? undefined);

      // Rejoin any specific order rooms we were in before disconnect
      this.activeRooms.forEach((orderId) => {
        this.socket?.emit("join-order", orderId);
        console.log("Rejoined order room:", orderId);
      });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    this.socket.io.on("reconnect_attempt", (attempt) => {
      console.log(`Socket reconnect attempt #${attempt}`);
    });

    this.socket.io.on("reconnect", (attempt) => {
      console.log(`Socket reconnected after ${attempt} attempt(s)`);
    });

    // Handle generic events from the server via onAny
    this.socket.onAny((event, ...args) => {
      if (this.listeners[event]) {
        this.listeners[event].forEach((callback) => callback(...args));
      }
    });
  }

  /** Call this when the app comes to the foreground to ensure we\'re connected. */
  ensureConnected() {
    if (!this.socket || !this.socket.connected) {
      console.log("Socket not connected — reconnecting…");
      this.connect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinOrderRoom(orderId: string) {
    this.activeRooms.add(orderId);
    if (this.socket?.connected) {
      this.socket.emit("join-order", orderId);
      console.log(`Joined order room: ${orderId}`);
    }
  }

  leaveOrderRoom(orderId: string) {
    this.activeRooms.delete(orderId);
  }

  updateLocation(
    orderId: string,
    location: { latitude: number; longitude: number },
    heading: number = 0,
  ) {
    if (this.socket?.connected) {
      this.socket.emit("update-location", {
        orderId,
        location,
        heading,
      });
    }
  }

  // Event Listeners
  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    // Deduplicate: don\'t register the same callback twice
    if (!this.listeners[event].includes(callback)) {
      this.listeners[event].push(callback);
    }
  }

  off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback,
      );
    }
  }
}

export const socketService = new SocketService();
