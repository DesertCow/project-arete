import { useState, useEffect, useCallback } from 'react';
import Markdown from 'react-markdown';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import styles from '../styles/ContextViewer.module.css';

const FILE_LABELS = {
  COACH_MEMORY: 'Coach Memory',
  GOALS: 'Goals',
  TRAINING_PLAN: 'Training Plan',
  TRAINING_HISTORY: 'Training History',
  HEALTH_PROFILE: 'Health Profile',
};

export default function ContextViewer({ isOpen, onClose }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({ GOALS: true });

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/context/${user.id}`);
      setFiles(res.data.contextFiles);
    } catch {
      setError('Could not load context files.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch on open, so the panel always reflects the latest coach updates.
  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, fetchFiles]);

  if (!isOpen) return null;

  const toggleSection = (fileType) =>
    setExpanded((prev) => ({ ...prev, [fileType]: !prev[fileType] }));

  return (
    <aside className={styles.panel} aria-label="Context files">
      <header className={styles.header}>
        <h2 className={styles.title}>Context</h2>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={fetchFiles}
            disabled={loading}
            title="Refresh"
          >
            Refresh
          </button>
          <button type="button" className={styles.iconButton} onClick={onClose} title="Close">
            ✕
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {loading && <p className={styles.status}>Loading…</p>}
        {error && (
          <div className={styles.status}>
            <p className={styles.error}>{error}</p>
            <button type="button" className={styles.retryButton} onClick={fetchFiles}>
              Retry
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          files.map((file) => {
            const isExpanded = !!expanded[file.fileType];
            return (
              <section key={file.id} className={styles.section}>
                <button
                  type="button"
                  className={styles.sectionHeader}
                  onClick={() => toggleSection(file.fileType)}
                  aria-expanded={isExpanded}
                >
                  <span className={styles.chevron}>{isExpanded ? '▾' : '▸'}</span>
                  <span>{FILE_LABELS[file.fileType] || file.fileType}</span>
                  <span className={styles.version}>v{file.version}</span>
                </button>
                {isExpanded && (
                  <div className={`${styles.sectionBody} markdown-content`}>
                    <Markdown>{file.content}</Markdown>
                  </div>
                )}
              </section>
            );
          })}
      </div>
    </aside>
  );
}
