import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import DashboardView from '../components/DashboardView.js';
import { SkeletonCards } from '../components/Skeleton.js';
import { readApiError } from '../utils/apiError.js';
import styles from '../styles/Dashboard.module.css';
import usePageTitle from '../hooks/usePageTitle.js';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/coros/dashboard');
      setData(res.data);
    } catch (err) {
      setError(readApiError(err, 'Could not load your dashboard.'));
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

      {loading && !data && (
        <div aria-busy="true" aria-label="Loading dashboard">
          <SkeletonCards count={4} className={styles.statRow} />
          <div className="skeleton skeleton-chart" />
          <div className={styles.chartGrid}>
            <div className="skeleton skeleton-chart" />
            <div className="skeleton skeleton-chart" />
          </div>
        </div>
      )}

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
