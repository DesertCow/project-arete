import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import useCoachSocket from '../hooks/useCoachSocket.js';
import ChatMessage from '../components/ChatMessage.js';
import ContextViewer from '../components/ContextViewer.js';
import styles from '../styles/Coach.module.css';

const CONNECTION_LABELS = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Reconnecting…',
};

// Treat "within this many px of the bottom" as the user following along.
const SCROLL_STICK_THRESHOLD = 120;

export default function Coach() {
  const { user } = useAuth();
  const {
    messages,
    isStreaming,
    streamingContent,
    connectionState,
    error,
    sendMessage,
    setInitialMessages,
  } = useCoachSocket();

  const [input, setInput] = useState('');
  const [contextOpen, setContextOpen] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const shouldStick = useRef(true);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.get(`/coach/history/${user.id}`);
      setInitialMessages(res.data.messages);
    } catch {
      setHistoryError('Could not load your chat history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [user, setInitialMessages]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Only auto-scroll when the user is already near the bottom, so scrolling up
  // to read history is not yanked back down mid-stream.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStick.current = distanceFromBottom < SCROLL_STICK_THRESHOLD;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && shouldStick.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingContent, historyLoading]);

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const canSend = input.trim().length > 0 && !isStreaming;

  const submit = () => {
    if (!canSend) return;
    shouldStick.current = true;
    sendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (event) => {
    // Enter sends; Shift+Enter falls through to insert a newline.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const startCheckin = () => {
    if (isStreaming) return;
    shouldStick.current = true;
    sendMessage('I want to do a life check-in.', 'checkin');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Coach</h1>
          <span className={styles.connection}>
            <span
              className={`${styles.dot} ${styles[connectionState] || ''}`}
              aria-hidden="true"
            />
            {CONNECTION_LABELS[connectionState] || connectionState}
          </span>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerButton}
            onClick={startCheckin}
            disabled={isStreaming || connectionState !== 'connected'}
          >
            Check-in
          </button>
          <button
            type="button"
            className={styles.headerButton}
            onClick={() => setContextOpen((open) => !open)}
            aria-expanded={contextOpen}
          >
            Context
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <section className={styles.chatColumn}>
          <div className={styles.messages} ref={scrollRef} onScroll={handleScroll}>
            {historyLoading && <p className={styles.notice}>Loading conversation…</p>}

            {historyError && (
              <div className={styles.notice}>
                <p className={styles.errorText}>{historyError}</p>
                <button type="button" className={styles.retryButton} onClick={loadHistory}>
                  Retry
                </button>
              </div>
            )}

            {!historyLoading && !historyError && messages.length === 0 && (
              <p className={styles.notice}>
                No messages yet. Ask your coach anything, or start a check-in.
              </p>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                createdAt={message.createdAt}
              />
            ))}

            {isStreaming && (
              <ChatMessage role="COACH" content={streamingContent} isStreaming />
            )}
          </div>

          <div className={styles.inputBar}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              rows={1}
              placeholder="Type a message…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoGrow(e.target);
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className={styles.sendButton}
              onClick={submit}
              disabled={!canSend}
            >
              Send
            </button>
          </div>

          {error && <p className={styles.inlineError}>{error}</p>}
        </section>

        <ContextViewer isOpen={contextOpen} onClose={() => setContextOpen(false)} />
      </div>
    </div>
  );
}
