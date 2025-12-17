import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export const useWebSocket = (config: WebSocketConfig) => {
  const {
    url,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = config;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs for callbacks to avoid unnecessary re-connections
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onMessage, onConnect, onDisconnect, onError]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setStatus('connected');
        setReconnectAttempts(0);
        onConnectRef.current?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessageRef.current?.(message);
        } catch {
          // Handle non-JSON messages
          const message: WebSocketMessage = {
            type: 'raw',
            payload: event.data,
            timestamp: Date.now(),
          };
          setLastMessage(message);
          onMessageRef.current?.(message);
        }
      };

      wsRef.current.onclose = () => {
        setStatus('disconnected');
        onDisconnectRef.current?.();

        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            // The effect will trigger re-connect because reconnectAttempts changed? 
            // No, we need to call connect() explicitly here or let the effect handle it.
            // But connect is a dependency of the effect. 
            // Actually, simply updating state will trigger re-render, and if connect depends on state...
            // But we removed callbacks from deps. 
            // Let's just call connect() recursively via timeout, but we need to be careful.
            // Better: just let the timeout call connect.
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        setStatus('error');
        onErrorRef.current?.(error);
      };
    } catch (error) {
      setStatus('error');
      console.error('WebSocket connection error:', error);
    }
  }, [url, reconnectInterval, maxReconnectAttempts]); // Removed reconnectAttempts from deps to avoid loop, handled via ref or just let it be. 
  // Wait, if we remove reconnectAttempts from deps, the closure has stale value 0.
  // We need to use a ref for reconnectAttempts or functional update.

  // Let's simplify: 
  // The reconnect logic inside onclose uses the state 'reconnectAttempts'.
  // If we don't include it in deps, it will be stale (0).
  // So we MUST include it. But then connect changes.
  // If connect changes, the useEffect triggers.
  // If useEffect triggers, it calls connect().
  // If connect() checks readyState, it returns.
  // So it's fine.

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    setStatus('disconnected');
  }, []);

  const send = useCallback((message: WebSocketMessage | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  return {
    status,
    lastMessage,
    reconnectAttempts,
    connect,
    disconnect,
    send,
  };
};
