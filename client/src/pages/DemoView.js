import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api.js';
import DemoChat from '../components/DemoChat.js';
import DemoContextPanel from '../components/DemoContextPanel.js';
import styles from '../styles/DemoView.module.css';

const SPORT_LABELS = {
  'Maria Chen': 'Marathon Runner',
  'James Hartley': 'Alpine Climber',
  'Sofia Reyes': 'Triathlete',
  'Marcus Webb': 'Comeback Runner',
};

export default function DemoView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileTab, setMobileTab] = useState('chat');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/demo/${id}`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('We could not find that athlete.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <p className={styles.status}>Loading athlete…</p>;
  }

  if (error || !data) {
    return (
      <div className={styles.errorState}>
        <h1 className={styles.errorTitle}>Athlete not found</h1>
        <p className={styles.errorBody}>{error}</p>
        <Link to="/demo" className={styles.backButton}>
          Back to Athletes
        </Link>
      </div>
    );
  }

  const sport = SPORT_LABELS[data.user.name] || data.user.sportProfile?.primarySport;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/demo" className={styles.backLink}>
          ← Back to Athletes
        </Link>
        <div className={styles.identity}>
          <h1 className={styles.name}>{data.user.name}</h1>
          <span className={styles.sport}>{sport}</span>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'chat'}
          className={`${styles.tab} ${mobileTab === 'chat' ? styles.tabActive : ''}`}
          onClick={() => setMobileTab('chat')}
        >
          Chat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'context'}
          className={`${styles.tab} ${mobileTab === 'context' ? styles.tabActive : ''}`}
          onClick={() => setMobileTab('context')}
        >
          Context
        </button>
      </div>

      <div className={styles.body}>
        <div
          className={`${styles.chatPane} ${mobileTab === 'chat' ? styles.paneVisible : styles.paneHidden}`}
        >
          <DemoChat userId={data.user.id} />
        </div>
        <div
          className={`${styles.contextPane} ${mobileTab === 'context' ? styles.paneVisible : styles.paneHidden}`}
        >
          <DemoContextPanel contextFiles={data.contextFiles} />
        </div>
      </div>
    </div>
  );
}
