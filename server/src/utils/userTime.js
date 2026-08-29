const DEFAULT_TIMEZONE = 'America/New_York';

function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    // Throws RangeError on an unknown IANA zone.
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function resolveTimeZone(user) {
  const timeZone = user?.sportProfile?.location?.timezone;
  return isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
}

// "Saturday, August 29, 2026" + "03:57 AM MST", rendered in the athlete's zone.
function formatUserDateTime(timeZone, now = new Date()) {
  const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;

  const dateLine = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(now);

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(now);

  const pick = (type) => timeParts.find((p) => p.type === type)?.value || '';
  const timeLine =
    `${pick('hour')}:${pick('minute')} ${pick('dayPeriod')} ${pick('timeZoneName')}`.trim();

  // ISO date in the athlete's zone, so the coach can do exact day math.
  const isoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return `${dateLine}\n${timeLine}\nISO date: ${isoDate} (${zone})`;
}

function getUserDateTime(user, now = new Date()) {
  return formatUserDateTime(resolveTimeZone(user), now);
}

module.exports = {
  DEFAULT_TIMEZONE,
  isValidTimeZone,
  resolveTimeZone,
  formatUserDateTime,
  getUserDateTime,
};
