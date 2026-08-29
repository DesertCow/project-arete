const hardcodedData = require('../data/hardcodedCorosData');
const prisma = require('../lib/prisma');
const { getAllContextFiles } = require('./contextManager');

// MCP returns dates as "YYYYMMDD"; charts want a sortable ISO date.
function normalizeDate(value) {
  if (!value) return null;
  const raw = String(value);
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

// The MCP nests its arrays under different keys per tool (days / records /
// assessment), and a future live call may hand back a bare array.
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

function formatRecovery(data) {
  const source = data || {};
  const hours = source.estimated_full_recovery_hours;
  return {
    percentage: source.recovery_pct ?? source.recoveryPercentage ?? source.recovery ?? 0,
    level: source.level ?? source.levelDescription ?? 'Unknown',
    eta:
      source.estimatedRecoveryTime ??
      source.eta ??
      (hours != null ? `${hours}h` : '0h'),
  };
}

function formatFitness(data) {
  const source = data || {};
  const predictions = source.predictions ?? source.racePredictions ?? {};
  return {
    vo2max: source.vo2max ?? source.vo2Max ?? 0,
    runningLevel: source.running_level ?? source.runningLevel ?? 0,
    thresholdPace: source.threshold_pace ?? source.thresholdPace ?? '--:--',
    racePredictions: {
      fiveK: predictions['5k'] ?? predictions['5K'] ?? source.fiveKPrediction ?? '--:--',
      tenK: predictions['10k'] ?? predictions['10K'] ?? source.tenKPrediction ?? '--:--',
      halfMarathon:
        predictions.half_marathon ?? predictions.halfMarathon ?? source.halfMarathonPrediction ?? '--:--',
      marathon: predictions.marathon ?? source.marathonPrediction ?? '--:--',
    },
  };
}

function formatWeeklyTraining(payload) {
  const records = toArray(payload, 'records');
  return byDateAscending(
    records.map((r) => ({
      date: normalizeDate(r.date || r.startDate),
      sportType: r.sport_type_code ?? r.sportType ?? 0,
      sportName: r.sport_type ?? r.sportName ?? 'Activity',
      location: r.location ?? r.locationName ?? '',
      // Seconds on the wire; minutes is what the chart axis wants.
      duration: Math.round((r.duration_sec ?? r.duration ?? 0) / 60),
      distance: r.distance_km ?? r.distance ?? 0,
      calories: r.calories_kcal ?? r.calories ?? 0,
      avgHR: r.avg_hr_bpm ?? r.avgHR ?? r.avgHeartRate ?? 0,
      pace: r.avg_pace ?? null,
    }))
  );
}

function formatTrainingLoad(payload) {
  const rows = toArray(payload, 'days');
  return byDateAscending(
    rows.map((d) => ({
      date: normalizeDate(d.date),
      shortTermLoad: d.short_term_load ?? d.shortTermLoad ?? d.stl ?? 0,
      longTermLoad: d.long_term_load ?? d.longTermLoad ?? d.ltl ?? 0,
      loadRatio: d.load_ratio ?? d.loadRatio ?? d.ratio ?? 0,
      comment: d.comment ?? '',
    }))
  );
}

function formatHrvTrend(payload) {
  const rows = toArray(payload, 'assessment', 'days');
  return byDateAscending(
    rows.map((d) => {
      const range = d.normal_range ?? {};
      return {
        date: normalizeDate(d.date),
        avg: d.hrv_avg_ms ?? d.avgHrv ?? d.avg ?? 0,
        baseline: d.baseline_ms ?? d.baseline ?? 0,
        normalRangeMin: range.low ?? d.normalRangeMin ?? 0,
        normalRangeMax: range.high ?? d.normalRangeMax ?? 0,
        evaluation: d.evaluation ?? '',
      };
    })
  );
}

function formatSleepQuality(payload) {
  const rows = toArray(payload, 'days');
  return byDateAscending(
    rows.map((d) => ({
      date: normalizeDate(d.date),
      sleepScore: d.sleep_score ?? d.sleepScore ?? d.score ?? 0,
      duration: d.main_sleep_min ?? d.mainSleepDuration ?? d.duration ?? 0,
      // Ratios arrive 0-1; percentages read better in a tooltip.
      deep: Math.round((d.deep_sleep_ratio ?? d.deepSleepRatio ?? d.deep ?? 0) * 100),
      light: Math.round((d.light_sleep_ratio ?? d.lightSleepRatio ?? d.light ?? 0) * 100),
      rem: Math.round((d.rem_ratio ?? d.remSleepRatio ?? d.rem ?? 0) * 100),
      awake: Math.round((d.awake_ratio ?? d.awakeSleepRatio ?? d.awake ?? 0) * 100),
    }))
  );
}

function formatRestingHR(payload) {
  const rows = toArray(payload, 'days');
  return byDateAscending(
    rows.map((d) => ({
      date: normalizeDate(d.date),
      rhr: d.resting_hr_bpm ?? d.restingHeartRate ?? d.rhr ?? d.value ?? 0,
    }))
  );
}

function formatDailyHealth(payload) {
  const rows = toArray(payload, 'days');
  return byDateAscending(
    rows.map((d) => ({
      date: normalizeDate(d.date),
      steps: d.steps ?? 0,
      calories: d.calories_kcal ?? d.calories ?? 0,
      exerciseMinutes: d.exercise_min ?? d.exerciseMinutes ?? d.exerciseDuration ?? 0,
      stressAvg: d.stress_avg ?? d.stressAvg ?? 0,
    }))
  );
}

function formatStressLevel(payload) {
  const rows = toArray(payload, 'days');
  return byDateAscending(
    rows.map((d) => ({
      date: normalizeDate(d.date),
      avg: d.avg_stress ?? d.avgStress ?? d.avg ?? 0,
      category: d.level ?? d.category ?? d.stressCategory ?? 'Unknown',
    }))
  );
}

function formatSchedule(payload) {
  const rows = toArray(payload, 'scheduled_workouts');
  return byDateAscending(
    rows.map((w) => ({
      date: normalizeDate(w.date),
      name: w.name ?? 'Workout',
      distance: w.distance_km ?? w.distance ?? 0,
      estimatedTime: w.estimated_time ?? w.estimatedTime ?? '',
      trainingLoad: w.training_load ?? w.trainingLoad ?? 0,
    }))
  );
}

// Phase 6: check user.corosAccessToken and call MCP when connected.
function getCorosData() {
  return hardcodedData || {};
}

async function getDashboardData(userId) {
  const corosData = getCorosData(userId);

  const contextFiles = await getAllContextFiles(userId);
  const goalsFile = contextFiles.find((f) => f.fileType === 'GOALS');

  const workouts = await prisma.generatedWorkout.findMany({
    where: { userId },
    orderBy: { scheduledFor: 'asc' },
    take: 5,
  });

  return {
    recovery: formatRecovery(corosData.recoveryStatus),
    fitness: formatFitness(corosData.fitnessOverview),
    weeklyTraining: formatWeeklyTraining(corosData.sportRecords),
    trainingLoad: formatTrainingLoad(corosData.trainingLoad),
    hrvTrend: formatHrvTrend(corosData.sleepHrv),
    sleepQuality: formatSleepQuality(corosData.sleepData),
    restingHR: formatRestingHR(corosData.restingHeartRate),
    dailyHealth: formatDailyHealth(corosData.dailyHealth),
    stressLevel: formatStressLevel(corosData.stressLevel),
    goals: goalsFile?.content || null,
    upcomingWorkouts: workouts,
    schedule: formatSchedule(corosData.trainingSchedule),
  };
}

module.exports = { getDashboardData };
