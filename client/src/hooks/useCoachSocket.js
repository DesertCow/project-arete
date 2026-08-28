import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

export default function useCoachSocket() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const retryCount = useRef(0);
  const retryTimer = useRef(null);
  // Chunks land faster than React commits state, so accumulate in a ref and
  // mirror into state purely for rendering.
  const streamBuffer = useRef('');
  // Set on unmount so a closing socket does not schedule a reconnect.
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (unmounted.current) return;

    const token = localStorage.getItem('arete_token');
    if (!token) return;

    // Don't stack sockets if one is already live or in flight.
    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host =
      process.env.NODE_ENV === 'production' ? window.location.host : 'localhost:3001';
    const ws = new WebSocket(`${protocol}://${host}/ws/coach?token=${token}`);

    setConnectionState('connecting');

    ws.onopen = () => {
      setConnectionState('connected');
      retryCount.current = 0;
      setError(null);
    };

    ws.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.type === 'start') {
        streamBuffer.current = '';
        setStreamingContent('');
        setIsStreaming(true);
        return;
      }

      if (payload.type === 'chunk') {
        streamBuffer.current += payload.text || '';
        setStreamingContent(streamBuffer.current);
        return;
      }

      if (payload.type === 'done') {
        const finalText = streamBuffer.current;
        streamBuffer.current = '';
        setIsStreaming(false);
        setStreamingContent('');
        if (finalText) {
          setMessages((prev) => [
            ...prev,
            {
              id: `local-coach-${Date.now()}`,
              role: 'COACH',
              content: finalText,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
        return;
      }

      if (payload.type === 'error') {
        streamBuffer.current = '';
        setIsStreaming(false);
        setStreamingContent('');
        const message = payload.error?.message || 'Coach request failed';
        setError(message);
        setMessages((prev) => [
          ...prev,
          {
            id: `local-error-${Date.now()}`,
            role: 'SYSTEM',
            content: message,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    };

    ws.onclose = () => {
      if (unmounted.current) return;

      setConnectionState('disconnected');
      setIsStreaming(false);

      if (retryCount.current < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * 2 ** retryCount.current;
        retryCount.current += 1;
        retryTimer.current = setTimeout(connect, delay);
      } else {
        setError('Lost connection to coach. Reload the page to retry.');
      }
    };

    ws.onerror = () => {
      // onclose always follows; reconnect is handled there.
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    unmounted.current = false;
    connect();

    return () => {
      unmounted.current = true;
      clearTimeout(retryTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback(
    (message, mode = 'conversation') => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        setError('Not connected to coach. Reconnecting...');
        retryCount.current = 0;
        connect();
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: 'USER',
          content: message,
          createdAt: new Date().toISOString(),
        },
      ]);

      setError(null);
      wsRef.current.send(JSON.stringify({ message, mode }));
    },
    [connect]
  );

  const setInitialMessages = useCallback((msgs) => {
    setMessages(msgs);
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    connectionState,
    error,
    sendMessage,
    setInitialMessages,
  };
}
