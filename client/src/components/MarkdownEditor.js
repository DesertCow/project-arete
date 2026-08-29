import { useState, useEffect, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
import styles from '../styles/MarkdownEditor.module.css';

const MOBILE_QUERY = '(max-width: 767px)';

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(MOBILE_QUERY).matches
    : false;
}

export default function MarkdownEditor({
  content,
  onChange,
  onSave,
  saving = false,
  lastSaved = null,
  dirty = false,
  readOnly = false,
}) {
  // Split is meaningless on a phone, so start in Edit there.
  const [mode, setMode] = useState(() => (isMobileViewport() ? 'edit' : 'split'));
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  const [justSaved, setJustSaved] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (event) => {
      setIsMobile(event.matches);
      // Split cannot be shown on mobile — fall back to the editor.
      if (event.matches) setMode((m) => (m === 'split' ? 'edit' : m));
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Flash "Saved" for a moment after each successful save.
  useEffect(() => {
    if (!lastSaved) return undefined;
    setJustSaved(true);
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [lastSaved]);

  const triggerSave = useCallback(() => {
    if (saving || readOnly) return;
    onSave();
  }, [saving, readOnly, onSave]);

  // Ctrl/Cmd+S saves instead of opening the browser's save dialog.
  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        triggerSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [triggerSave]);

  // Warn before losing unsaved edits.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Tab indents by two spaces rather than leaving the textarea.
  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const el = event.target;
    const { selectionStart, selectionEnd } = el;
    const next = `${content.slice(0, selectionStart)}  ${content.slice(selectionEnd)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = selectionStart + 2;
      el.selectionEnd = selectionStart + 2;
    });
  };

  const saveLabel = saving ? 'Saving…' : justSaved ? 'Saved' : 'Save';
  const showEditor = mode === 'edit' || mode === 'split';
  const showPreview = mode === 'preview' || mode === 'split';

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <div className={styles.modes} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'edit'}
            className={`${styles.modeButton} ${mode === 'edit' ? styles.modeActive : ''}`}
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'preview'}
            className={`${styles.modeButton} ${mode === 'preview' ? styles.modeActive : ''}`}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
          {!isMobile && (
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'split'}
              className={`${styles.modeButton} ${mode === 'split' ? styles.modeActive : ''}`}
              onClick={() => setMode('split')}
            >
              Split
            </button>
          )}
        </div>

        <div className={styles.toolbarRight}>
          {dirty && <span className={styles.unsaved}>Unsaved changes</span>}
          <button
            type="button"
            className={styles.saveButton}
            onClick={triggerSave}
            disabled={saving || readOnly}
          >
            {saveLabel}
          </button>
        </div>
      </div>

      <div className={styles.panes}>
        {showEditor && (
          <textarea
            ref={textareaRef}
            className={`${styles.textarea} ${mode === 'split' ? styles.paneHalf : styles.paneFull}`}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck="false"
            aria-label="Markdown source"
          />
        )}
        {showPreview && (
          <div
            className={`${styles.preview} ${mode === 'split' ? styles.paneHalf : styles.paneFull} markdown-content`}
          >
            <Markdown>{content}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
