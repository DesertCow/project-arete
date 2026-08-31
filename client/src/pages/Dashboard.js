import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import DashboardView from '../components/DashboardView.js';
import { SkeletonCards } from '../components/Skeleton.js';
import { readApiError } from '../utils/apiError.js';
import { formatLastUpdated } from '../utils/formatTime.js';
import styles from '../styles/Dashboard.module.css';
import usePageTitle from '../hooks/usePageTitle.js';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  // Re-render the relative timestamp as it ages.
  const [, setTick] = useState(0);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/coros/dashboard${forceRefresh ? '?refresh=true' : ''}`);
      setData(res.data);
      if (forceRefresh) {
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 2000);
      }
    } catch (err) {
      setError(readApiError(err, 'Could not load your dashboard.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep "5 min ago" honest without refetching.
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.headerRight}>
          <span className={styles.freshness}>
            {data
              ? data.lastUpdated
                ? `Last updated: ${formatLastUpdated(data.lastUpdated)}`
                : 'Using sample data'
              : ''}
          </span>
          <button
            type="button"
            className={styles.refresh}
            onClick={() => load(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Updating…' : justUpdated ? 'Updated' : 'Refresh'}
          </button>
        </div>
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

      {refreshing && <div className={styles.refreshBar} aria-hidden="true" />}

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
