// Human-readable renderings of the stored activity metrics. The client has its
// own copy in utils/activityFormatters.js; this one exists for server-side use
// (logs, and the activity summaries the coach prompt reads).

// 4047 -> "1:07:27", 875 -> "14:35"
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// 492 -> "8:12/km"
function formatPace(secondsPerKm) {
  if (!secondsPerKm || secondsPerKm <= 0) return '--:--';
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

// Metres in, kilometres out once it is worth it.
function formatDistance(meters) {
  if (!meters || meters <= 0) return '0';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

module.exports = { formatDuration, formatPace, formatDistance };
