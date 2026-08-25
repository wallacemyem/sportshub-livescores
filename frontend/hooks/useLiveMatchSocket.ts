'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { LiveDelta, Match } from '@/types';

type DeltaListener = (delta: LiveDelta) => void;

export function useLiveMatchSocket(activeMatchId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastDelta, setLastDelta] = useState<LiveDelta | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<DeltaListener>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const subscribe = useCallback((listener: DeltaListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      // Determine backend WS URL (Host port 18443)
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const wsUrl = `ws://${host}:18443/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          // Subscribe to match if provided
          if (activeMatchId) {
            ws.send(JSON.stringify({
              action: 'SUBSCRIBE',
              topic: `match:${activeMatchId}`,
            }));
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'DELTA' && msg.data) {
              const delta: LiveDelta = msg.data;
              setLastDelta(delta);
              listenersRef.current.forEach((listener) => listener(delta));
            }
          } catch (e) {
            // Non-JSON or keep-alive message
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          // Auto-reconnect with backoff
          reconnectTimeoutRef.current = setTimeout(connect, 2500);
        };

        ws.onerror = () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (err) {
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [activeMatchId]);

  return { isConnected, lastDelta, subscribe };
}
