"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RealtimeEvent = {
  type: string;
  data: unknown;
  timestamp: string;
};

export type OnChainEventData = {
  id: string;
  eventName: string;
  contract: string;
  txHash: string;
  blockNumber: string;
  args: Record<string, unknown>;
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

type Options = {
  enabled?: boolean;
  onEvent?: (event: RealtimeEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  channels?: string[];
};

const WS_URL = (process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace("http", "ws") ?? "ws://localhost:4000") + "/ws";
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL_MS = 30000;

export function useRealtimeEvents(options: Options = {}) {
  const { enabled = true, onEvent, onConnect, onDisconnect, channels = ["all"] } = options;

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      setStatus("connecting");
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[ws] Conectado a 0xLeaked realtime");
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
        onConnect?.();

        ws.send(JSON.stringify({ type: "subscribe", channels }));

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as RealtimeEvent;

          if (msg.type === "pong") return;
          if (msg.type === "connected" || msg.type === "subscribed") return;

          setLastEvent(msg);
          setEvents((prev) => [msg, ...prev].slice(0, 100));
          onEvent?.(msg);
        } catch {
          console.warn("[ws] Mensaje inválido recibido");
        }
      };

      ws.onclose = () => {
        console.log("[ws] Desconectado");
        setStatus("disconnected");
        clearTimers();
        onDisconnect?.();

        if (enabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttemptsRef.current, 5);
          console.log(`[ws] Reconectando en ${delay}ms (intento ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        console.error("[ws] Error:", error);
        setStatus("error");
      };
    } catch (err) {
      console.error("[ws] Error creando conexión:", err);
      setStatus("error");
    }
  }, [enabled, channels, onConnect, onDisconnect, onEvent, clearTimers]);

  const disconnect = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, [clearTimers]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    status,
    events,
    lastEvent,
    isConnected: status === "connected",
    connect,
    disconnect,
    clearEvents
  };
}

export function useOnChainEvents(options: Omit<Options, "channels"> = {}) {
  const [onChainEvents, setOnChainEvents] = useState<OnChainEventData[]>([]);

  const handleEvent = useCallback((event: RealtimeEvent) => {
    if (event.type === "onchain_event") {
      const data = event.data as OnChainEventData;
      setOnChainEvents((prev) => [data, ...prev].slice(0, 50));
    }
    options.onEvent?.(event);
  }, [options]);

  const result = useRealtimeEvents({
    ...options,
    channels: ["onchain"],
    onEvent: handleEvent
  });

  return {
    ...result,
    onChainEvents
  };
}
