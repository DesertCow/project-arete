import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import MarkdownEditor from '../components/MarkdownEditor.js';
import { SkeletonLines } from '../components/Skeleton.js';
import { readApiError } from '../utils/apiError.js';
import styles from '../styles/Goals.module.css';
import usePageTitle from '../hooks/usePageTitle.js';

export default function Goals() {
  usePageTitle('Goals');
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
      setError(readApiError(err, 'Could not save your goals.'));
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
        <div className={styles.status} aria-busy="true" aria-label="Loading">
          <div className="skeleton skeleton-heading" />
          <SkeletonLines count={6} />
        </div>
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
