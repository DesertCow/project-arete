const {
  normalizeDate,
  toArray,
  byDateDescending,
  shortDate,
  minutesToHm,
  stressLabel,
  pct,
} = require('../utils/corosShapes');

// Field names mirror the ones dashboardService already normalizes; the second
// and third alternatives cover camelCase variants the MCP may return.
function formatRecovery(data) {
  if (!data) return null;
  const percentage = data.recovery_pct ?? data.recoveryPercentage ?? data.recovery;
  const level = data.level ?? data.levelDescription;
  const hours = data.estimated_full_recovery_hours ?? data.estimatedRecoveryHours;

  if (percentage == null && !level) return null;

  const eta = hours ? ` (full recovery in ~${hours}h)` : '';
  return `Recovery: ${percentage ?? '?'}% — ${level || 'unknown'}${eta}`;
}

function formatSleep(data) {
  const rows = byDateDescending(toArray(data, 'days'));
  const night = rows[0];
  if (!night) return null;

  const score = night.sleep_score ?? night.sleepScore ?? night.score;
  const minutes = night.main_sleep_min ?? night.mainSleepDuration ?? night.duration;
  const deep = pct(night.deep_sleep_ratio ?? night.deepSleepRatio);
  const rem = pct(night.rem_ratio ?? night.remSleepRatio);
  const awake = pct(night.awake_ratio ?? night.awakeSleepRatio);

  const parts = [];
  if (score != null) parts.push(`score ${score}`);
  if (minutes != null) parts.push(minutesToHm(minutes));
  if (deep != null) parts.push(`deep ${deep}%`);
  if (rem != null) parts.push(`REM ${rem}%`);
  if (awake != null) parts.push(`awake ${awake}%`);
  if (parts.length === 0) return null;

  const when = shortDate(normalizeDate(night.date));
  return `Last night's sleep${when ? ` (${when})` : ''}: ${parts.join(', ')}`;
}

function formatHrv(data) {
  const rows = byDateDescending(toArray(data, 'assessment', 'days'));
  const night = rows[0];
  if (!night) return null;

  const avg = night.hrv_avg_ms ?? night.avgHrv ?? night.avg;
  if (avg == null) return null;

  const baseline = night.baseline_ms ?? night.baseline;
  const range = night.normal_range ?? {};
  const low = range.low ?? night.normalRangeMin;
  const high = range.high ?? night.normalRangeMax;
  const evaluation = night.evaluation ?? '';

  const context = [];
  if (baseline != null) context.push(`baseline ${baseline}`);
  if (low != null && high != null) context.push(`range ${low}-${high}`);

  const suffix = context.length ? ` (${context.join(', ')})` : '';
  const verdict = evaluation ? ` — ${evaluation}` : '';
  return `Last night's HRV: ${avg}ms${suffix}${verdict}`;
}

function formatDailyHealth(data) {
  const rows = byDateDescending(toArray(data, 'days')).slice(0, 3);
  if (rows.length === 0) return null;

  const lines = rows.map((d) => {
    const steps = Number(d.steps ?? 0).toLocaleString('en-US');
    const cal = d.calories_kcal ?? d.calories ?? 0;
    const exercise = d.exercise_min ?? d.exerciseMinutes ?? 0;
    const stress = d.stress_avg ?? d.stressAvg;
    const stressPart = stress != null ? `, stress ${stress} (${stressLabel(stress)})` : '';
    return `- ${shortDate(normalizeDate(d.date))}: ${steps} steps, ${cal} cal, ${exercise} exercise min${stressPart}`;
  });

  return `Recent daily health (${rows.length} days):\n${lines.join('\n')}`;
}

function formatActivities(data) {
  const rows = byDateDescending(toArray(data, 'records')).slice(0, 8);
  if (rows.length === 0) return 'Recent activities (7 days): none recorded';

  const lines = rows.map((r) => {
    const name = r.sport_type ?? r.sportName ?? 'Activity';
    const bits = [];
    const km = r.distance_km ?? r.distance;
    if (km) bits.push(`${km} km`);
    const seconds = r.duration_sec ?? r.duration;
    if (seconds) bits.push(`${Math.round(seconds / 60)} min`);
    const hr = r.avg_hr_bpm ?? r.avgHR;
    if (hr) bits.push(`avg HR ${hr}`);
    const cal = r.calories_kcal ?? r.calories;
    if (cal) bits.push(`${cal} cal`);
    return `- ${shortDate(normalizeDate(r.date))}: ${name}${bits.length ? `, ${bits.join(', ')}` : ''}`;
  });

  return `Recent activities (7 days):\n${lines.join('\n')}`;
}

function formatTrainingLoad(data) {
  const rows = byDateDescending(toArray(data, 'days'));
  const latest = rows[0];
  if (!latest) return null;

  const stl = latest.short_term_load ?? latest.shortTermLoad;
  const ltl = latest.long_term_load ?? latest.longTermLoad;
  const ratio = latest.load_ratio ?? latest.loadRatio;
  if (stl == null && ltl == null && ratio == null) return null;

  const comment = latest.comment ? ` — ${latest.comment}` : '';
  return `Training load: STL ${stl ?? '?'} / LTL ${ltl ?? '?'} / ratio ${ratio ?? '?'}${comment}`;
}

function formatFitness(data) {
  if (!data) return null;
  const vo2 = data.vo2max ?? data.vo2Max;
  const level = data.running_level ?? data.runningLevel;
  const threshold = data.threshold_pace ?? data.thresholdPace;
  const predictions = data.predictions ?? data.racePredictions ?? {};
  const fiveK = predictions['5k'] ?? predictions['5K'];

  const parts = [];
  if (vo2 != null) parts.push(`VO2max ${vo2}`);
  if (level != null) parts.push(`Running Level ${level}`);
  if (threshold) parts.push(`Threshold Pace ${threshold}`);
  if (fiveK) parts.push(`5K prediction ${fiveK}`);
  if (parts.length === 0) return null;

  return `Fitness: ${parts.join(', ')}`;
}

// COROS tools answer with a formatted report rather than JSON. That text is
// already what a coach wants to read, so pass it straight through; the object
// formatters below still handle any tool that returns structured data.
const TEXT_SECTION_LABELS = {
  recovery: 'Recovery',
  sleep: 'Sleep',
  hrv: 'HRV',
  dailyHealth: 'Daily health',
  recentActivities: 'Recent activities',
  trainingLoad: 'Training load',
  fitness: 'Fitness',
};

// Some reports append a raw per-reading time series (HRV emits 30-80 rows a
// day). The assessment above it is what coaching needs; the rows are pure token
// cost, so drop everything from that heading onward.
function stripTimeSeries(text) {
  const marker = /^.*Time Series.*$/m;
  const match = text.match(marker);
  if (!match) return text;
  return text.slice(0, match.index).trimEnd();
}

function sectionFor(key, value, objectFormatter) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const text = stripTimeSeries(value.trim());
    if (!text) return null;
    // The report carries its own heading, so don't double-label it.
    return text;
  }
  return objectFormatter(value);
}

function formatMcpDataForPrompt(mcpData) {
  if (!mcpData) return null;

  const sections = [
    sectionFor('recovery', mcpData.recovery, formatRecovery),
    sectionFor('sleep', mcpData.sleep, formatSleep),
    sectionFor('hrv', mcpData.hrv, formatHrv),
    sectionFor('dailyHealth', mcpData.dailyHealth, formatDailyHealth),
    sectionFor('recentActivities', mcpData.recentActivities, formatActivities),
    sectionFor('trainingLoad', mcpData.trainingLoad, formatTrainingLoad),
    sectionFor('fitness', mcpData.fitness, formatFitness),
  ].filter(Boolean);

  if (sections.length === 0) return null;

  return `=== LIVE COROS DATA (real-time from watch) ===\n${sections.join('\n\n')}`;
}

module.exports = {
  formatMcpDataForPrompt,
  TEXT_SECTION_LABELS,
  formatRecovery,
  formatSleep,
  formatHrv,
  formatDailyHealth,
  formatActivities,
  formatTrainingLoad,
  formatFitness,
};
