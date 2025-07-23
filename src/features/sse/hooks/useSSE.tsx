/**
 * React Hook for Server-Sent Events
 * @author Muhammad Asad
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEEventHandler } from "../types";

interface UseSSEOptions {
  url?: string;
  reconnect?: boolean;
  reconnectDelay?: number;
  onOpen?: () => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

interface UseSSEReturn {
  connected: boolean;
  clientId: string | null;
  addEventListener: (event: string, handler: SSEEventHandler) => void;
  removeEventListener: (event: string, handler: SSEEventHandler) => void;
  close: () => void;
  reconnect: () => void;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    url = "/api/sse",
    reconnect = true,
    reconnectDelay = 1000,
    onOpen,
    onError,
    onClose,
  } = options;

  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<Map<string, Set<SSEEventHandler>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current || eventSourceRef.current) return;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!mountedRef.current) return;
        console.log("[SSE] Connection established");
        setConnected(true);
        onOpen?.();
      };

      eventSource.onerror = (error) => {
        if (!mountedRef.current) return;
        console.error("[SSE] Connection error:", error);
        setConnected(false);
        onError?.(error);
        
        cleanup();
        
        if (reconnect && mountedRef.current) {
          console.log(`[SSE] Reconnecting in ${reconnectDelay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectDelay);
        }
      };

      // Handle all registered event types
      const allEventTypes = new Set<string>();
      handlersRef.current.forEach((_, eventType) => allEventTypes.add(eventType));
      
      // Always listen for system events AND common events
      ["connected", "ping", "error", "message"].forEach(eventType => allEventTypes.add(eventType));
      
      allEventTypes.forEach((eventType) => {
        eventSource.addEventListener(eventType, (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data as string) as unknown;
            
            // Extract clientId from connected event
            if (eventType === 'connected' && typeof data === 'object' && data !== null && 'clientId' in data) {
              setClientId((data as any).clientId);
            }
            
            const handlers = handlersRef.current.get(eventType);
            
            if (handlers) {
              handlers.forEach((handler) => {
                handler({ event: eventType, data });
              });
            }
          } catch (error) {
            console.error(`[SSE] Error parsing event data for ${eventType}:`, error);
          }
        });
      });
    } catch (error) {
      console.error("[SSE] Failed to create EventSource:", error);
      onError?.(error as Event);
    }
  }, [url, reconnect, reconnectDelay, onOpen, onError, cleanup]);

  const addEventListener = useCallback((event: string, handler: SSEEventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);
  }, []);

  const removeEventListener = useCallback((event: string, handler: SSEEventHandler) => {
    const handlers = handlersRef.current.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        handlersRef.current.delete(event);
      }
    }
  }, []);

  const close = useCallback(() => {
    cleanup();
    onClose?.();
  }, [cleanup, onClose]);

  const reconnectManually = useCallback(() => {
    cleanup();
    connect();
  }, [cleanup, connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [connect, cleanup]);

  return {
    connected,
    clientId,
    addEventListener,
    removeEventListener,
    close,
    reconnect: reconnectManually,
  };
}