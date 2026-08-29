import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import DashboardView from '../components/DashboardView.js';
import styles from '../styles/Dashboard.module.css';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/coros/dashboard');
      setData(res.data);
    } catch {
      setError('Could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <button type="button" className={styles.refresh} onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {loading && !data && <p className={styles.status}>Loading your data…</p>}

      {error && (
        <div className={styles.status}>
          <p className={styles.error}>{error}</p>
          <button type="button" className={styles.retry} onClick={load}>
            Retry
          </button>
        </div>
      )}

      {data && (
        <DashboardView
          data={data}
          goalsFooter={
            <Link to="/goals" className={styles.link}>
              View all →
            </Link>
          }
        />
      )}
    </div>
  );
}
