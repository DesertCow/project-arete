// Shape helpers shared by the dashboard formatters and the coaching formatter,
// so field-name handling lives in exactly one place.

// MCP returns dates as "YYYYMMDD"; everything downstream wants ISO.
function normalizeDate(value) {
  if (!value) return null;
  const raw = String(value);
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

// Each MCP tool nests its array under a different key (days / records /
// assessment), and a bare array is possible too.
function toArray(payload, ...keys) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

function byDateAscending(rows) {
  return [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function byDateDescending(rows) {
  return [...rows].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// "2026-08-28" -> "Aug 28"
function shortDate(iso) {
  if (!iso) return '';
  const [, month, day] = String(iso).split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[Number(month) - 1] || ''} ${Number(day)}`;
}

function minutesToHm(minutes) {
  const total = Number(minutes) || 0;
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

// COROS reports only an average; the band labels match its own scale.
function stressLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'unknown';
  if (n <= 25) return 'Relaxed';
  if (n <= 50) return 'Low';
  if (n <= 75) return 'Medium';
  return 'High';
}

function pct(ratio) {
  const n = Number(ratio);
  if (!Number.isFinite(n)) return null;
  // Ratios arrive 0-1, but tolerate a server that already sends percentages.
  return Math.round(n <= 1 ? n * 100 : n);
}

module.exports = {
  normalizeDate,
  toArray,
  byDateAscending,
  byDateDescending,
  shortDate,
  minutesToHm,
  stressLabel,
  pct,
};
