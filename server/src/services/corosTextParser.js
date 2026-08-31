// COROS MCP tools answer with human-readable reports rather than JSON. These
// parsers turn each report back into the structured shapes the dashboard
// formatters expect (the same shapes as data/hardcodedCorosData.js), so the
// live and fallback paths stay interchangeable.

function num(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

// "8h 39min" / "50 min" / "1h 58min" -> minutes
function hmToMinutes(text) {
  if (!text) return null;
  const h = /(\d+)\s*h/.exec(text);
  const m = /(\d+)\s*min/.exec(text);
  if (!h && !m) return null;
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

// "1:07:27" -> seconds, "14:35" -> seconds
function clockToSeconds(text) {
  if (!text) return null;
  const parts = String(text).trim().split(':').map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

// Pulls "Label: value" from a report body.
function field(text, label) {
  const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, 'im');
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

function isEmptyReport(text) {
  return !text || /^No .*(found|data)/im.test(text.trim());
}

// --- individual tools ------------------------------------------------------

function parseRecoveryStatus(text) {
  if (isEmptyReport(text)) return {};
  return {
    recovery_pct: num((field(text, 'Recovery') || '').replace('%', '')),
    level: field(text, 'Level'),
    estimated_full_recovery_hours: num((field(text, 'Estimated Full Recovery') || '').replace('h', '')),
  };
}

function parseFitnessOverview(text) {
  if (isEmptyReport(text)) return {};
  return {
    vo2max: num(field(text, 'VO2max')),
    running_level: num(field(text, 'Running Level')),
    threshold_pace: field(text, 'Threshold Pace'),
    predictions: {
      '5k': field(text, '5 km Prediction'),
      '10k': field(text, '10 km Prediction'),
      half_marathon: field(text, 'Half Marathon Prediction'),
      marathon: field(text, 'Marathon Prediction'),
    },
  };
}

// Blocks keyed by a bare "YYYY-MM-DD" line.
function splitIsoDateBlocks(text) {
  const blocks = [];
  const re = /^(\d{4}-\d{2}-\d{2}):?\s*$/gm;
  let match;
  const marks = [];
  while ((match = re.exec(text)) !== null) marks.push({ date: match[1], start: match.index + match[0].length });
  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length ? text.lastIndexOf('\n', marks[i + 1].start - marks[i + 1].date.length) : text.length;
    blocks.push({ date: mark.date.replace(/-/g, ''), body: text.slice(mark.start, end) });
  });
  return blocks;
}

function parseSleepData(text) {
  if (isEmptyReport(text)) return { days: [] };
  const days = splitIsoDateBlocks(text).map(({ date, body }) => ({
    date,
    sleep_score: num(field(body, 'Sleep Score')),
    main_sleep_min: hmToMinutes(field(body, 'Main Sleep')),
    deep_sleep_ratio: (num((field(body, 'Deep Sleep Ratio') || '').replace('%', '')) ?? 0) / 100,
    light_sleep_ratio: (num((field(body, 'Light Sleep Ratio') || '').replace('%', '')) ?? 0) / 100,
    rem_ratio: (num((field(body, 'REM Ratio') || '').replace('%', '')) ?? 0) / 100,
    awake_ratio: (num((field(body, 'Awake Ratio') || '').replace('%', '')) ?? 0) / 100,
    awake_time_min: hmToMinutes(field(body, 'Awake Time')),
    naps_total_min: hmToMinutes(field(body, 'Naps Total')) ?? 0,
  }));
  return { days: days.filter((d) => d.sleep_score != null) };
}

function parseSleepHrv(text) {
  if (isEmptyReport(text)) return { assessment: [] };
  // Only the assessment section matters; the time series below it is noise.
  const seriesAt = text.search(/^.*Time Series.*$/m);
  const body = seriesAt === -1 ? text : text.slice(0, seriesAt);

  const assessment = [];
  const re = /^(\d{4}-\d{2}-\d{2}):\s*\n\s*HRV Avg:\s*(\d+)\s*ms(?:\s*—\s*([^\n]+))?\n(?:\s*Normal Range:\s*(\d+)\s*-\s*(\d+)\s*ms\n)?(?:\s*Baseline:\s*(\d+)\s*ms)?/gm;
  let m;
  while ((m = re.exec(body)) !== null) {
    assessment.push({
      date: m[1].replace(/-/g, ''),
      hrv_avg_ms: num(m[2]),
      evaluation: m[3] ? m[3].trim() : null,
      normal_range: { low: num(m[4]), high: num(m[5]) },
      baseline_ms: num(m[6]),
    });
  }
  return { assessment };
}

function parseTrainingLoad(text) {
  if (isEmptyReport(text)) return { days: [] };
  const days = splitIsoDateBlocks(text).map(({ date, body }) => ({
    date,
    comment: field(body, 'Comment'),
    short_term_load: num(field(body, 'Short-Term Load')),
    long_term_load: num(field(body, 'Long-Term Load')),
    load_ratio: num(field(body, 'Load Ratio')),
  }));
  return { days: days.filter((d) => d.short_term_load != null || d.load_ratio != null) };
}

function parseRestingHeartRate(text) {
  if (isEmptyReport(text)) return { days: [] };
  const days = [];
  const re = /^(\d{4}-\d{2}-\d{2}):\s*(\d+)\s*bpm\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    days.push({ date: m[1].replace(/-/g, ''), resting_hr_bpm: num(m[2]) });
  }
  return { days };
}

function parseStressLevel(text) {
  if (isEmptyReport(text)) return { days: [] };
  const days = [];
  const re = /^(\d{4}-\d{2}-\d{2}):\s*\n\s*Average Stress:\s*(\d+)\s*(?:\(([^)]+)\))?/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    days.push({ date: m[1].replace(/-/g, ''), avg_stress: num(m[2]), level: m[3] || null });
  }
  return { days };
}

function parseDailyHealth(text) {
  if (isEmptyReport(text)) return { days: [] };
  const days = [];
  // Header carries the current resting HR / HRV baseline.
  const restingHr = num((/Resting HR:\s*(\d+)/i.exec(text) || [])[1]);
  const hrvBaseline = num((/HRV Baseline:\s*(\d+)/i.exec(text) || [])[1]);

  const blocks = text.split(/^---\s*(\d{8})\s*---$/m);
  for (let i = 1; i < blocks.length; i += 2) {
    const date = blocks[i];
    const body = blocks[i + 1] || '';
    days.push({
      date,
      steps: num((/Steps:\s*([\d,]+)/i.exec(body) || [])[1]),
      calories_kcal: num((/Calories:\s*([\d,]+)/i.exec(body) || [])[1]),
      exercise_min: num((/Exercise:\s*([\d,]+)/i.exec(body) || [])[1]),
      floors: num((/Floors:\s*([\d,]+)/i.exec(body) || [])[1]),
      stress_avg: num((/Stress:\s*Avg\s*([\d.]+)/i.exec(body) || [])[1]),
    });
  }
  return { days, resting_hr_bpm: restingHr, hrv_baseline_ms: hrvBaseline };
}

function parseSportRecords(text) {
  if (isEmptyReport(text)) return { records: [], total_records: 0 };
  const records = [];
  // "1. Trail Run — 2026-08-25" opens each numbered entry.
  const entries = text.split(/^\s*\d+\.\s+/m).slice(1);

  for (const entry of entries) {
    const head = /^(.+?)\s+—\s+(\d{4}-\d{2}-\d{2})/.exec(entry);
    if (!head) continue;

    const duration = (/Duration:\s*([\d:]+)/i.exec(entry) || [])[1];
    const distance = (/Distance:\s*([\d.]+)\s*km/i.exec(entry) || [])[1];
    const pace = (/Average Pace:\s*([^|\n]+)/i.exec(entry) || [])[1];
    const hr = (/Avg HR:\s*(\d+)/i.exec(entry) || [])[1];
    const cal = (/Calories:\s*([\d,]+)/i.exec(entry) || [])[1];
    const code = (/SportType:\s*(\d+)/i.exec(entry) || [])[1];
    const label = (/LabelId:\s*(\d+)/i.exec(entry) || [])[1];

    records.push({
      sport_type: head[1].trim(),
      sport_type_code: num(code),
      date: head[2],
      location: (field(entry, 'Location') || '').split('|')[0].trim() || null,
      duration_sec: clockToSeconds(duration),
      distance_km: num(distance),
      avg_pace: pace ? pace.trim() : null,
      avg_hr_bpm: num(hr),
      calories_kcal: num(cal),
      label_id: label || null,
    });
  }
  return { records, total_records: records.length };
}

function parseTrainingSchedule(text) {
  if (isEmptyReport(text)) return { scheduled_workouts: [] };
  const scheduled_workouts = [];
  const entries = text.split(/^\s*\d+\.\s+/m).slice(1);
  const source = entries.length ? entries : splitIsoDateBlocks(text).map((b) => `${b.date}\n${b.body}`);

  for (const entry of source) {
    const date = (/(\d{4}-\d{2}-\d{2})/.exec(entry) || [])[1];
    if (!date) continue;
    scheduled_workouts.push({
      date,
      name: (field(entry, 'Name') || (/^(.+?)\s+—\s+\d{4}-\d{2}-\d{2}/.exec(entry) || [])[1] || 'Workout').trim(),
      distance_km: num((/Distance:\s*([\d.]+)\s*km/i.exec(entry) || [])[1]),
      estimated_time: (/Estimated Time:\s*([\d:]+)/i.exec(entry) || [])[1] || null,
      training_load: num((/Training Load:\s*(\d+)/i.exec(entry) || [])[1]),
    });
  }
  return { scheduled_workouts };
}

function parseUserInfo(text) {
  if (isEmptyReport(text)) return {};
  const birthday = field(text, 'Birthday') || '';
  return {
    height_cm: num((field(text, 'Height') || '').replace('cm', '')),
    weight_kg: num((field(text, 'Weight') || '').replace('kg', '')),
    birthday: (/(\d{4}-\d{2}-\d{2})/.exec(birthday) || [])[1] || null,
    age: num((/Age:\s*(\d+)/.exec(birthday) || [])[1]),
    gender: field(text, 'Gender'),
    nickname: field(text, 'Nickname'),
  };
}

const PARSERS = {
  queryRecoveryStatus: parseRecoveryStatus,
  queryFitnessAssessmentOverview: parseFitnessOverview,
  querySleepData: parseSleepData,
  querySleepHrv: parseSleepHrv,
  queryTrainingLoadAssessment: parseTrainingLoad,
  queryRestingHeartRate: parseRestingHeartRate,
  queryStressLevel: parseStressLevel,
  queryDailyHealthData: parseDailyHealth,
  querySportRecords: parseSportRecords,
  queryTrainingSchedule: parseTrainingSchedule,
  queryUserInfo: parseUserInfo,
};

// Text goes through the matching parser; anything already structured (or from
// an unknown tool) passes through untouched.
function parseCorosReport(toolName, value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  const parser = PARSERS[toolName];
  if (!parser) return value;
  try {
    return parser(value);
  } catch (err) {
    return null;
  }
}

module.exports = {
  parseCorosReport,
  PARSERS,
  hmToMinutes,
  clockToSeconds,
};
