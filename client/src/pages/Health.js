import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import MarkdownEditor from '../components/MarkdownEditor.js';
import { SkeletonLines } from '../components/Skeleton.js';
import { readApiError } from '../utils/apiError.js';
import { appendInjury, appendWeight, appendIllness } from '../utils/contextFile.js';
import styles from '../styles/Health.module.css';
import usePageTitle from '../hooks/usePageTitle.js';

const EMPTY_INJURY = { bodyPart: '', description: '', severity: 'mild' };

export default function Health() {
  usePageTitle('Health Profile');
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(null);

  // Only one quick-log form is open at a time.
  const [openForm, setOpenForm] = useState(null);
  const [injury, setInjury] = useState(EMPTY_INJURY);
  const [weight, setWeight] = useState('');
  const [illness, setIllness] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    api
      .get(`/context/${user.id}/HEALTH_PROFILE`)
      .then((res) => {
        if (cancelled) return;
        setContent(res.data.contextFile.content);
        setSavedContent(res.data.contextFile.content);
        setVersion(res.data.contextFile.version);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your health profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Takes the content explicitly so quick-log can save the freshly appended
  // text without waiting for a state round-trip.
  const save = useCallback(
    async (contentToSave) => {
      if (!user) return;
      const body = typeof contentToSave === 'string' ? contentToSave : content;
      setSaving(true);
      setError(null);
      try {
        const res = await api.put(`/context/${user.id}/HEALTH_PROFILE`, { content: body });
        setSavedContent(res.data.contextFile.content);
        setVersion(res.data.contextFile.version);
        setLastSaved(new Date().toISOString());
      } catch (err) {
        setError(readApiError(err, 'Could not save your health profile.'));
      } finally {
        setSaving(false);
      }
    },
    [user, content]
  );

  const toggleForm = (name) => {
    setOpenForm((current) => (current === name ? null : name));
    setInjury(EMPTY_INJURY);
    setWeight('');
    setIllness('');
  };

  const commit = async (nextContent) => {
    setContent(nextContent);
    setOpenForm(null);
    await save(nextContent);
  };

  const submitInjury = async (event) => {
    event.preventDefault();
    if (!injury.bodyPart.trim() || !injury.description.trim()) return;
    await commit(appendInjury(content, injury));
    setInjury(EMPTY_INJURY);
  };

  const submitWeight = async (event) => {
    event.preventDefault();
    if (!weight) return;
    await commit(appendWeight(content, weight));
    setWeight('');
  };

  const submitIllness = async (event) => {
    event.preventDefault();
    if (!illness.trim()) return;
    await commit(appendIllness(content, illness.trim()));
    setIllness('');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Health Profile</h1>
          {version !== null && <span className={styles.version}>v{version}</span>}
        </div>
        <p className={styles.description}>
          Your baseline metrics, injury history, and health conditions. Your coach checks this
          before every session to keep recommendations safe and appropriate.
        </p>
      </header>

      {loading ? (
        <div className={styles.status} aria-busy="true" aria-label="Loading">
          <div className="skeleton skeleton-heading" />
          <SkeletonLines count={6} />
        </div>
      ) : (
        <>
          <div className={styles.quickLog}>
            <span className={styles.quickLabel}>Quick log</span>
            <button
              type="button"
              className={`${styles.quickButton} ${openForm === 'injury' ? styles.quickActive : ''}`}
              onClick={() => toggleForm('injury')}
            >
              Log Injury
            </button>
            <button
              type="button"
              className={`${styles.quickButton} ${openForm === 'weight' ? styles.quickActive : ''}`}
              onClick={() => toggleForm('weight')}
            >
              Log Weight
            </button>
            <button
              type="button"
              className={`${styles.quickButton} ${openForm === 'illness' ? styles.quickActive : ''}`}
              onClick={() => toggleForm('illness')}
            >
              Log Illness
            </button>
          </div>

          {openForm === 'injury' && (
            <form className={styles.form} onSubmit={submitInjury}>
              <div className={styles.formRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Body part</span>
                  <input
                    type="text"
                    value={injury.bodyPart}
                    onChange={(e) => setInjury({ ...injury, bodyPart: e.target.value })}
                    placeholder="left knee"
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Description</span>
                  <input
                    type="text"
                    value={injury.description}
                    onChange={(e) => setInjury({ ...injury, description: e.target.value })}
                    placeholder="mild pain on descents"
                    required
                  />
                </label>
                <label className={styles.fieldNarrow}>
                  <span className={styles.fieldLabel}>Severity</span>
                  <select
                    className={styles.select}
                    value={injury.severity}
                    onChange={(e) => setInjury({ ...injury, severity: e.target.value })}
                  >
                    <option value="mild">mild</option>
                    <option value="moderate">moderate</option>
                    <option value="severe">severe</option>
                  </select>
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.submitButton} disabled={saving}>
                  Log injury
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setOpenForm(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {openForm === 'weight' && (
            <form className={styles.form} onSubmit={submitWeight}>
              <div className={styles.formRow}>
                <label className={styles.fieldNarrow}>
                  <span className={styles.fieldLabel}>Weight (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="78"
                    required
                  />
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.submitButton} disabled={saving}>
                  Log weight
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setOpenForm(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {openForm === 'illness' && (
            <form className={styles.form} onSubmit={submitIllness}>
              <div className={styles.formRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Description</span>
                  <input
                    type="text"
                    value={illness}
                    onChange={(e) => setIllness(e.target.value)}
                    placeholder="mild cold, sore throat"
                    required
                  />
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.submitButton} disabled={saving}>
                  Log illness
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setOpenForm(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

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
