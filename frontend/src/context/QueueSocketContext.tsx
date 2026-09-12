"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { WS_BASE_URL } from "@/lib/constants";

export interface QueueEvent {
  type: "TOKEN_CALLED" | "FARMER_ARRIVED" | "TOKEN_PROCESSING" | "PROCUREMENT_COMPLETED" | "COUNTERS_UPDATED" | "NEW_BOOKING" | "PAYMENT_STATUS_UPDATED";
  centre_id?: number;
  token_id?: number;
  token_number?: number;
  token_display?: string;
  counter_number?: number;
  active_counters?: number;
  receipt_number?: string;
  amount?: number;
  total_waiting?: number;
  timestamp: string;
}

interface QueueSocketContextType {
  isConnected: boolean;
  lastEvent: QueueEvent | null;
  activeCentreId: number;
  setActiveCentreId: (id: number) => void;
  latestNotification: string | null;
  clearNotification: () => void;
}

const QueueSocketContext = createContext<QueueSocketContextType | undefined>(undefined);

export function QueueSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<QueueEvent | null>(null);
  const [activeCentreId, setActiveCentreId] = useState<number>(1);
  const [latestNotification, setLatestNotification] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsUrl = `${WS_BASE_URL}/queue/${activeCentreId}`;
      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data: QueueEvent = JSON.parse(event.data);
            setLastEvent(data);

            if (data.type === "TOKEN_CALLED") {
              setLatestNotification(`🔔 Token ${data.token_display} called at Counter #${data.counter_number}!`);
            } else if (data.type === "PROCUREMENT_COMPLETED") {
              setLatestNotification(`✅ Procurement completed for ${data.token_display} (Receipt #${data.receipt_number})`);
            } else if (data.type === "COUNTERS_UPDATED") {
              setLatestNotification(`⚙️ Active counters changed to ${data.active_counters}`);
            }
          } catch {
            // Ignore non-JSON ping responses
          }
        };

        socket.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          // Auto-reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          if (!isMounted) return;
          setIsConnected(false);
          socket.close();
        };
      } catch {
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [activeCentreId]);

  const clearNotification = () => setLatestNotification(null);

  return (
    <QueueSocketContext.Provider
      value={{
        isConnected,
        lastEvent,
        activeCentreId,
        setActiveCentreId,
        latestNotification,
        clearNotification,
      }}
    >
      {children}
    </QueueSocketContext.Provider>
  );
}

export function useQueueSocket() {
  const context = useContext(QueueSocketContext);
  if (!context) {
    throw new Error("useQueueSocket must be used within a QueueSocketProvider");
  }
  return context;
}
