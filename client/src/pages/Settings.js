import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { readApiError } from '../utils/apiError.js';
import styles from '../styles/Settings.module.css';

const DEFAULT_TIMEZONE = 'America/New_York';

const API_ORIGIN =
  process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

const COROS_ERRORS = {
  auth: 'Your session expired. Log in again, then retry connecting COROS.',
  demo: 'Demo accounts cannot connect a COROS account.',
  denied: 'COROS access was declined. Nothing was connected.',
  expired: 'That connection attempt timed out. Please try again.',
  exchange: 'COROS could not complete the connection. Please try again.',
  default: 'Could not connect your COROS account. Please try again.',
};

// Common US zones cover the athletes we have; any other IANA name can be typed
// in and the server validates it.
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
];
import usePageTitle from '../hooks/usePageTitle.js';

export default function Settings() {
  usePageTitle('Settings');

  const { user } = useAuth();
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);

  const [searchParams, setSearchParams] = useSearchParams();
  const [coros, setCoros] = useState({ connected: false, corosOpenId: null });
  const [corosBusy, setCorosBusy] = useState(false);
  const [corosNotice, setCorosNotice] = useState(null);
  const [corosError, setCorosError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => {
        if (cancelled) return;
        const location = res.data.user.sportProfile?.location;
        if (location) {
          setCity(location.city ?? '');
          setLat(location.lat != null ? String(location.lat) : '');
          setLon(location.lon != null ? String(location.lon) : '');
          if (location.timezone) setTimezone(location.timezone);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCorosStatus = useCallback(async () => {
    try {
      const res = await api.get('/coros/status');
      setCoros(res.data);
    } catch {
      // Status is informational; a failure just leaves the card in its
      // disconnected state rather than blocking the page.
    }
  }, []);

  useEffect(() => {
    loadCorosStatus();
  }, [loadCorosStatus]);

  // The OAuth callback returns here with ?coros=connected|error.
  useEffect(() => {
    const result = searchParams.get('coros');
    if (!result) return;

    if (result === 'connected') {
      setCorosNotice('COROS account connected. Live training data is active.');
      loadCorosStatus();
    } else {
      setCorosError(COROS_ERRORS[searchParams.get('reason')] || COROS_ERRORS.default);
    }

    // Clear the query string so a refresh does not replay the banner.
    searchParams.delete('coros');
    searchParams.delete('reason');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, loadCorosStatus]);

  const connectCoros = () => {
    const token = localStorage.getItem('arete_token');
    if (!token) return;
    // Full navigation, not XHR: /connect answers with a 302 to COROS.
    window.location.href = `${API_ORIGIN}/coros/connect?token=${encodeURIComponent(token)}`;
  };

  const disconnectCoros = async () => {
    setCorosBusy(true);
    setCorosError(null);
    setCorosNotice(null);
    try {
      await api.post('/coros/disconnect');
      setCoros({ connected: false, corosOpenId: null });
      setCorosNotice('COROS account disconnected.');
    } catch (err) {
      setCorosError(readApiError(err, 'Could not disconnect your COROS account.'));
    } finally {
      setCorosBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus(null);
    setError(null);

    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!city.trim() || Number.isNaN(latNum) || Number.isNaN(lonNum) || lat === '' || lon === '') {
      setError('Enter a city name and both coordinates.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/settings/profile', {
        location: { city: city.trim(), lat: latNum, lon: lonNum, timezone },
      });
      setStatus('Location saved. Your coach will use this forecast.');
    } catch (err) {
      setError(readApiError(err, 'Could not save your location.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.description}>
          {user?.name ? `Signed in as ${user.name}. ` : ''}
          More settings arrive in later phases — for now, set your training location.
        </p>
      </header>

      {loading ? (
        <p className={styles.status}>Loading settings…</p>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Training location</h2>
          <p className={styles.cardHint}>
            Your coach pulls a 3-day forecast for these coordinates to advise on timing, heat,
            and whether to train indoors. US locations only (National Weather Service).
          </p>

          <form onSubmit={submit} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>City</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Portland, OR"
              />
            </label>

            <div className={styles.coords}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Latitude</span>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="45.5152"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Longitude</span>
                <input
                  type="number"
                  step="any"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="-122.6784"
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Timezone</span>
              <select
                className={styles.select}
                value={TIMEZONES.includes(timezone) ? timezone : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') setTimezone(e.target.value);
                }}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace('America/', '').replace('Pacific/', '').replace('_', ' ')}
                  </option>
                ))}
                {!TIMEZONES.includes(timezone) && (
                  <option value="custom">{timezone} (custom)</option>
                )}
              </select>
            </label>

            <p className={styles.helper}>
              Your coach uses this to know what day and time it is where you are.
            </p>

            <p className={styles.helper}>
              Need coordinates? Find your spot on{' '}
              <a href="https://www.google.com/maps" target="_blank" rel="noreferrer">
                Google Maps
              </a>
              , right-click it, and copy the two numbers — latitude first.
            </p>

            {status && <p className={styles.success}>{status}</p>}
            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? 'Saving…' : 'Save location'}
            </button>
          </form>
        </section>
      )}

      <section className={styles.card}>
        <header className={styles.cardHead}>
          <h2 className={styles.cardTitle}>COROS Account</h2>
          {coros.connected && (
            <span className={styles.connected}>
              <span className={styles.dot} aria-hidden="true" /> Connected
            </span>
          )}
        </header>

        {coros.connected ? (
          <>
            <p className={styles.cardHint}>
              Your COROS account is connected. Live training data is active.
            </p>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={disconnectCoros}
              disabled={corosBusy}
            >
              {corosBusy ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </>
        ) : (
          <>
            <p className={styles.cardHint}>
              Connect your COROS account to enable live training data, recovery metrics, and
              personalized coaching.
            </p>
            <button type="button" className={styles.saveButton} onClick={connectCoros}>
              Connect COROS
            </button>
            <p className={styles.helper}>
              Your COROS login happens on COROS&apos;s website. We never see your password.
            </p>
          </>
        )}

        {corosNotice && <p className={styles.success}>{corosNotice}</p>}
        {corosError && <p className={styles.error}>{corosError}</p>}
      </section>
    </div>
  );
}
