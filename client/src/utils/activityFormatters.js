// Rendering helpers for stored activities. Every one returns null when there is
// nothing worth showing, so callers can omit the field rather than print a dash.

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPace(secondsPerKm) {
  if (!secondsPerKm || secondsPerKm <= 0) return null;
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export function formatDistance(meters) {
  if (!meters || meters <= 0) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

export function formatElevation(meters) {
  if (meters == null) return null;
  return `${meters >= 0 ? '+' : '−'}${Math.abs(Math.round(meters))}m`;
}

// Activity dates are stored anchored to UTC midnight for the calendar day COROS
// reported, so they are read back in UTC — local rendering would slide western
// timezones onto the previous day.
export function formatActivityDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// "Just now" / "5 min ago" / "2 hours ago" / "Aug 25" for the sync freshness label.
export function formatRelativeTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const SPORT_ICONS = {
  100: '🏃', 101: '🏃', 102: '🏃', 103: '🏃',
  104: '🥾', 105: '🥾',
  200: '🚴', 201: '🚴',
  300: '🏊', 301: '🏊',
  400: '🏋️', 401: '🏋️', 402: '💪',
  500: '⛷️', 501: '🏂', 502: '⛷️', 503: '⛷️',
  800: '🧗', 801: '🧗', 802: '🧗',
  900: '🚶', 901: '🪢', 902: '🪜', 904: '🧘',
  10000: '🏅',
};

export function getSportIcon(sportType) {
  return SPORT_ICONS[sportType] || '🏅';
}

// Pace only means something where COROS reports it per kilometre — running,
// hiking and walking. Climbing and lifting get distance without pace.
const PACE_SPORTS = new Set([100, 101, 102, 103, 104, 105, 900, 902]);

export function showsPace(sportType) {
  return PACE_SPORTS.has(sportType);
}
