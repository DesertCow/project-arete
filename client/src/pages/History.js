import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import ActivityCard from '../components/ActivityCard.js';
import { SkeletonCards } from '../components/Skeleton.js';
import { readApiError } from '../utils/apiError.js';
import { formatRelativeTime } from '../utils/activityFormatters.js';
import usePageTitle from '../hooks/usePageTitle.js';
import styles from '../styles/History.module.css';

// Filtering by category rather than by raw code — an athlete thinks "running",
// not "100, 101, 102, 103".
const SPORT_FILTERS = [
  { value: 'all', label: 'All Sports', codes: null },
  { value: 'run', label: 'Running', codes: [100, 101, 102, 103] },
  { value: 'hike', label: 'Hiking', codes: [104, 105] },
  { value: 'climb', label: 'Climbing', codes: [800, 801, 802] },
  { value: 'bike', label: 'Cycling', codes: [200, 201] },
  { value: 'swim', label: 'Swimming', codes: [300, 301] },
  { value: 'gym', label: 'Gym & Strength', codes: [400, 401, 402] },
  { value: 'snow', label: 'Snow Sports', codes: [500, 501, 502, 503] },
  { value: 'other', label: 'Walk & Yoga', codes: [900, 901, 902, 904] },
];

const RANGE_FILTERS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const PAGE_SIZE = 20;

function startDateFor(range) {
  if (range === 'all') return null;
  const date = new Date();
  date.setDate(date.getDate() - Number(range));
  return date.toISOString();
}

export default function History() {
  usePageTitle('Training History');
  const { user } = useAuth();
  const isDemo = user?.role === 'DEMO';

  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [sport, setSport] = useState('all');
  const [range, setRange] = useState('30');

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [confirmFullSync, setConfirmFullSync] = useState(false);

  // One card is expanded at a time; its detail is cached here so re-opening it
  // costs nothing.
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const query = useMemo(() => {
    const params = { page, limit: PAGE_SIZE };
    const codes = SPORT_FILTERS.find((f) => f.value === sport)?.codes;
    if (codes) params.sportTypes = codes.join(',');
    const start = startDateFor(range);
    if (start) params.startDate = start;
    return params;
  }, [page, sport, range]);

  const load = useCallback(async () => {
    if (isDemo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/history', { params: query });
      setActivities(res.data.activities);
      setPagination(res.data.pagination);
      setLastSync(res.data.lastSync);
    } catch (err) {
      setError(readApiError(err, 'Could not load your training history.'));
    } finally {
      setLoading(false);
    }
  }, [isDemo, query]);

  useEffect(() => {
    load();
  }, [load]);

  // A filter change invalidates the current page number.
  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
    setExpandedId(null);
  };

  const runSync = async (fullSync) => {
    setSyncing(true);
    setSyncMessage(null);
    setError(null);
    setConfirmFullSync(false);
    try {
      const res = await api.post('/history/sync', { fullSync });
      setSyncMessage(res.data.message);
      setPage(1);
      // Fresh rows may not match the current page/filter, so refetch rather
      // than merging optimistically.
      await load();
    } catch (err) {
      setError(readApiError(err, 'Sync failed. Please try again.'));
    } finally {
      setSyncing(false);
    }
  };

  const viewDetail = async (activityId) => {
    if (expandedId === activityId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(activityId);
    setDetailError(null);
    if (details[activityId]) return;

    setDetailLoading(true);
    try {
      const res = await api.get(`/history/${activityId}`);
      setDetails((current) => ({ ...current, [activityId]: res.data.activity }));
      // detailFetched may have flipped, and the list row should reflect it.
      setActivities((current) =>
        current.map((a) => (a.id === activityId ? { ...a, ...res.data.activity } : a))
      );
    } catch (err) {
      setDetailError(readApiError(err, 'Could not load the full detail for this activity.'));
    } finally {
      setDetailLoading(false);
    }
  };

  if (isDemo) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Training History</h1>
        </header>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Training history is not available in the demo.</p>
          <p className={styles.emptyText}>
            The demo runs on a fixed snapshot of athlete data. Create an account and connect a COROS
            watch to sync your own training log.
          </p>
        </div>
      </div>
    );
  }

  const filtered = sport !== 'all' || range !== 'all';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Training History</h1>
        <div className={styles.headerRight}>
          <span className={styles.lastSync}>
            {lastSync ? `Last synced: ${formatRelativeTime(lastSync)}` : 'Never synced'}
          </span>
          <button
            type="button"
            className={styles.syncButton}
            onClick={() => runSync(false)}
            disabled={syncing}
          >
            {syncing ? 'Syncing…' : 'Sync Latest'}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setConfirmFullSync(true)}
            disabled={syncing}
          >
            Full Sync
          </button>
        </div>
      </header>

      {confirmFullSync && (
        <div className={styles.confirm}>
          <span>This will sync up to 90 days of history. Continue?</span>
          <button type="button" className={styles.syncButton} onClick={() => runSync(true)}>
            Continue
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setConfirmFullSync(false)}
          >
            Cancel
          </button>
        </div>
      )}

      <div className={styles.filters}>
        <label className={styles.filter}>
          <span className={styles.filterLabel}>Sport</span>
          <select className={styles.select} value={sport} onChange={changeFilter(setSport)}>
            {SPORT_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filter}>
          <span className={styles.filterLabel}>Range</span>
          <select className={styles.select} value={range} onChange={changeFilter(setRange)}>
            {RANGE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        {syncMessage && <span className={styles.syncMessage}>{syncMessage}</span>}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <SkeletonCards count={4} className={styles.list} />
      ) : activities.length === 0 ? (
        <div className={styles.empty}>
          {filtered && pagination.total === 0 && lastSync ? (
            <>
              <p className={styles.emptyTitle}>No activities match these filters.</p>
              <p className={styles.emptyText}>Widen the sport or date range to see more.</p>
            </>
          ) : (
            <>
              <p className={styles.emptyTitle}>No training history yet.</p>
              <p className={styles.emptyText}>
                Connect your COROS watch and sync to see your workouts.
              </p>
              <button
                type="button"
                className={styles.syncButton}
                onClick={() => runSync(false)}
                disabled={syncing}
              >
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                expanded={expandedId === activity.id}
                detail={details[activity.id]}
                detailLoading={detailLoading && expandedId === activity.id}
                detailError={expandedId === activity.id ? detailError : null}
                onViewDetail={viewDetail}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
              >
                ← Previous
              </button>
              <span className={styles.pageStatus}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
