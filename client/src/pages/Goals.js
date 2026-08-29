import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import MarkdownEditor from '../components/MarkdownEditor.js';
import styles from '../styles/Goals.module.css';

export default function Goals() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    api
      .get(`/context/${user.id}/GOALS`)
      .then((res) => {
        if (cancelled) return;
        setContent(res.data.contextFile.content);
        setSavedContent(res.data.contextFile.content);
        setVersion(res.data.contextFile.version);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your goals.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.put(`/context/${user.id}/GOALS`, { content });
      setSavedContent(res.data.contextFile.content);
      setVersion(res.data.contextFile.version);
      setLastSaved(new Date().toISOString());
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save your goals.');
    } finally {
      setSaving(false);
    }
  }, [user, content]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Goals</h1>
          {version !== null && <span className={styles.version}>v{version}</span>}
        </div>
        <p className={styles.description}>
          Your training objectives, target events, milestones, and timeline. Your coach reads
          this before every conversation to keep your training aligned with what matters to you.
        </p>
      </header>

      {loading ? (
        <p className={styles.status}>Loading goals…</p>
      ) : (
        <>
          <MarkdownEditor
            content={content}
            onChange={setContent}
            onSave={save}
            saving={saving}
            lastSaved={lastSaved}
            dirty={content !== savedContent}
          />
          {error && <p className={styles.error}>{error}</p>}
        </>
      )}
    </div>
  );
}
