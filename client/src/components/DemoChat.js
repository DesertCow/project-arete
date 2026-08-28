import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import ChatMessage from './ChatMessage.js';
import styles from '../styles/DemoChat.module.css';

const MAX_DEMO_MESSAGES = 10;
const SCROLL_STICK_THRESHOLD = 120;

export default function DemoChat({ userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(MAX_DEMO_MESSAGES);
  const [cooldown, setCooldown] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState(null);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const shouldStick = useRef(true);

  // Tick the cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    shouldStick.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_STICK_THRESHOLD;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && shouldStick.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  const canSend = input.trim().length > 0 && !loading && cooldown === 0 && !limitReached;

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || cooldown > 0 || limitReached) return;

    // The server keeps no demo state, so the client carries the transcript.
    const history = messages
      .filter((m) => m.role === 'USER' || m.role === 'COACH')
      .map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content }))
      .slice(-20);

    shouldStick.current = true;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'USER', content: text },
    ]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setError(null);
    setLoading(true);

    try {
      const res = await api.post(`/demo/${userId}/message`, { message: text, history });
      setMessages((prev) => [
        ...prev,
        { id: `c-${Date.now()}`, role: 'COACH', content: res.data.response },
      ]);
      setRemaining((prev) =>
        typeof res.data.remaining === 'number' ? res.data.remaining : Math.max(prev - 1, 0)
      );
    } catch (err) {
      const apiError = err.response?.data?.error;
      if (apiError?.code === 'DEMO_COOLDOWN') {
        const wait =
          apiError.waitSeconds ?? Number((apiError.message.match(/(\d+)\s*second/) || [])[1]) ?? 30;
        setCooldown(wait);
      } else if (apiError?.code === 'DEMO_LIMIT_REACHED') {
        setLimitReached(true);
        setRemaining(0);
      } else {
        setError(apiError?.message || 'The coach could not respond. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, cooldown, limitReached, messages, userId]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className={styles.chat}>
      <div className={styles.messages} ref={scrollRef} onScroll={handleScroll}>
        {messages.length === 0 && !loading && (
          <p className={styles.empty}>
            Ask about today&apos;s training, recovery, or the plan ahead.
          </p>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} role={message.role} content={message.content} />
        ))}

        {loading && (
          <div className={styles.thinking}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        )}
      </div>

      {limitReached ? (
        <div className={styles.limitBox}>
          <p className={styles.limitTitle}>You&apos;ve used all {MAX_DEMO_MESSAGES} demo messages.</p>
          <p className={styles.limitBody}>Create a free account for unlimited AI coaching.</p>
          <Link to="/login" className={styles.registerButton}>
            Register
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.inputBar}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              rows={1}
              placeholder={cooldown > 0 ? `Wait ${cooldown}s…` : 'Type a message…'}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoGrow(e.target);
              }}
              onKeyDown={handleKeyDown}
              disabled={loading || cooldown > 0}
            />
            <button type="button" className={styles.sendButton} onClick={send} disabled={!canSend}>
              Send
            </button>
          </div>

          <div className={styles.meta}>
            <span className={styles.counter}>
              {remaining}/{MAX_DEMO_MESSAGES} messages remaining
            </span>
            {cooldown > 0 && <span className={styles.cooldown}>Wait {cooldown}s…</span>}
            {error && <span className={styles.error}>{error}</span>}
          </div>
        </>
      )}
    </div>
  );
}
