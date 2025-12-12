import { useAuthStore } from "@/store/auth";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

export default function Index() {
  const { isAuthenticated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure auth is initialized
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return null;
  }

  return <Redirect href="/splash" />;
}
