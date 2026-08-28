import Markdown from 'react-markdown';
import { formatMessageTime } from '../utils/formatTime.js';
import styles from '../styles/ChatMessage.module.css';

export default function ChatMessage({ role, content, createdAt, isStreaming = false }) {
  if (role === 'SYSTEM') {
    return (
      <div className={styles.systemRow}>
        <p className={styles.systemText}>{content}</p>
      </div>
    );
  }

  const isUser = role === 'USER';

  return (
    <div className={isUser ? styles.userRow : styles.coachRow}>
      <div className={isUser ? styles.userBubble : styles.coachBubble}>
        {isUser ? (
          <p className={styles.userText}>{content}</p>
        ) : (
          <div className="markdown-content">
            <Markdown>{content}</Markdown>
            {isStreaming && <span className={styles.cursor} aria-hidden="true" />}
          </div>
        )}
      </div>
      {createdAt && !isStreaming && (
        <span className={styles.timestamp}>{formatMessageTime(createdAt)}</span>
      )}
    </div>
  );
}
