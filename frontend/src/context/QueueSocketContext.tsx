"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { WS_BASE_URL } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";

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

export type ConnectionStatus = "connected" | "connecting" | "reconnecting" | "fallback";

interface QueueSocketContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastEvent: QueueEvent | null;
  activeCentreId: number;
  setActiveCentreId: (id: number) => void;
  latestNotification: string | null;
  clearNotification: () => void;
  playAlertSound: () => void;
}

const QueueSocketContext = createContext<QueueSocketContextType | undefined>(undefined);

function triggerChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.28); // D6

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.05);
    osc1.stop(ctx.currentTime + 0.7);
    osc2.stop(ctx.currentTime + 0.7);
  } catch {
    // Audio synthesis blocked if user hasn't interacted with page yet
  }
}

export function QueueSocketProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [lastEvent, setLastEvent] = useState<QueueEvent | null>(null);
  const [activeCentreId, setActiveCentreId] = useState<number>(1);
  const [latestNotification, setLatestNotification] = useState<string | null>(null);
  const { showToast } = useToast();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const playAlertSound = useCallback(() => {
    triggerChime();
  }, []);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setConnectionStatus("connecting");
      const wsUrl = `${WS_BASE_URL}/queue/${activeCentreId}`;

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isMounted) return;
          setConnectionStatus("connected");
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
          }
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data: QueueEvent = JSON.parse(event.data);
            setLastEvent(data);

            if (data.type === "TOKEN_CALLED") {
              const msg = `🔔 Token ${data.token_display || `#${data.token_number}`} called at Counter #${data.counter_number}!`;
              setLatestNotification(msg);
              showToast(msg, "info", "Queue Movement");
              triggerChime();
            } else if (data.type === "PROCUREMENT_COMPLETED") {
              const msg = `✅ Procurement completed for ${data.token_display || `#${data.token_number}`} (Receipt #${data.receipt_number || "REC"})`;
              setLatestNotification(msg);
              showToast(msg, "success", "Procurement Verified");
            } else if (data.type === "COUNTERS_UPDATED") {
              const msg = `⚙️ Active counters changed to ${data.active_counters}`;
              setLatestNotification(msg);
              showToast(msg, "warning", "Counter Pace Updated");
            }
          } catch {
            // Ignore non-JSON heartbeat pings
          }
        };

        socket.onclose = () => {
          if (!isMounted) return;
          setConnectionStatus("reconnecting");
          // If disconnected for more than 4s, notify fallback mode
          if (!fallbackTimerRef.current) {
            fallbackTimerRef.current = setTimeout(() => {
              if (isMounted) setConnectionStatus("fallback");
            }, 4000);
          }
          // Auto-reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          if (!isMounted) return;
          socket.close();
        };
      } catch {
        setConnectionStatus("fallback");
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
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [activeCentreId, showToast]);

  const clearNotification = () => setLatestNotification(null);

  return (
    <QueueSocketContext.Provider
      value={{
        isConnected: connectionStatus === "connected",
        connectionStatus,
        lastEvent,
        activeCentreId,
        setActiveCentreId,
        latestNotification,
        clearNotification,
        playAlertSound,
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

