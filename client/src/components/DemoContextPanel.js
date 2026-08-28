import { useState } from 'react';
import Markdown from 'react-markdown';
import styles from '../styles/DemoContextPanel.module.css';

const FILE_LABELS = {
  COACH_MEMORY: 'Coach Memory',
  GOALS: 'Goals',
  TRAINING_PLAN: 'Training Plan',
  TRAINING_HISTORY: 'Training History',
  HEALTH_PROFILE: 'Health Profile',
};

export default function DemoContextPanel({ contextFiles = [] }) {
  const [expanded, setExpanded] = useState({ GOALS: true });

  const toggle = (fileType) =>
    setExpanded((prev) => ({ ...prev, [fileType]: !prev[fileType] }));

  return (
    <aside className={styles.panel} aria-label="Athlete context files">
      <h2 className={styles.title}>Context</h2>
      <div className={styles.body}>
        {contextFiles.map((file) => {
          const isExpanded = !!expanded[file.fileType];
          return (
            <section key={file.fileType} className={styles.section}>
              <button
                type="button"
                className={styles.sectionHeader}
                onClick={() => toggle(file.fileType)}
                aria-expanded={isExpanded}
              >
                <span className={styles.chevron}>{isExpanded ? '▾' : '▸'}</span>
                <span>{FILE_LABELS[file.fileType] || file.fileType}</span>
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
