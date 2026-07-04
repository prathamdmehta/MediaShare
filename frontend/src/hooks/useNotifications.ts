// src/hooks/useNotifications.ts

import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";

export function useNotifications() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { increment } = useNotificationStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    // SSE connection — browser keeps this open automatically
    const url = `/api/v1/notifications/stream`;

    // We pass the token as a query param because
    // EventSource doesn't support custom headers
    const evtSource = new EventSource(`${url}?token=${token}`);

    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "share_received") {
          increment();
        }
        // heartbeat and connected events are ignored
      } catch {}
    };

    evtSource.onerror = () => {
      // Browser automatically reconnects on error
    };

    return () => {
      evtSource.close();
    };
  }, [isAuthenticated]);
}
