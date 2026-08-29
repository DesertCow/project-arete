// Real data extracted from COROS MCP on 2026-08-28 (Clayton Skaggs / DesertCow).
// Phase 6 replaces this with live MCP calls in dashboardService.js; the
// dashboard API contract does not change.
//
// Shapes are kept exactly as the MCP returned them — snake_case keys, dates as
// "YYYYMMDD" strings, and arrays nested under .days / .records / .assessment.
// The formatters in dashboardService.js normalize all of that.

const userInfo = {
  height_cm: 160.0,
  weight_kg: 64.5,
  birthday: '1989-03-08',
  age: 37,
  gender: 'Male',
  nickname: 'Clayton Skaggs',
};

const recoveryStatus = {
  recovery_pct: 100,
  level: 'Heavy training allowed',
  estimated_full_recovery_hours: 0,
};

const fitnessOverview = {
  vo2max: 45,
  running_level: 68,
  threshold_pace: '5:41 /km',
  predictions: {
    '5k': '27:24',
    '10k': '57:43',
    half_marathon: '2:11:12',
    marathon: '4:41:02',
  },
};

const dailyHealth = {
  resting_hr_bpm: 56,
  hrv_baseline_ms: 42,
  note: 'sleep entries are dated by their wake-up day',
  days: [
    { date: '20260822', steps: 19806, calories_kcal: 1234, exercise_min: 80, floors: 6, stress_avg: 28 },
    { date: '20260823', steps: 11109, calories_kcal: 883, exercise_min: 199, floors: 77, stress_avg: 41 },
    { date: '20260824', steps: 7432, calories_kcal: 588, exercise_min: 177, floors: 37, stress_avg: 34 },
    { date: '20260825', steps: 16337, calories_kcal: 1081, exercise_min: 75, floors: 81, stress_avg: 47 },
    { date: '20260826', steps: 7451, calories_kcal: 474, exercise_min: 0, floors: 2, stress_avg: 38 },
    { date: '20260827', steps: 7361, calories_kcal: 418, exercise_min: 1, floors: 4, stress_avg: 27 },
    { date: '20260828', steps: 2463, calories_kcal: 125, exercise_min: 0, floors: 0, stress_avg: 23 },
  ],
};

const restingHeartRate = {
  days: [
    { date: '20260828', resting_hr_bpm: 56 },
    { date: '20260827', resting_hr_bpm: 57 },
    { date: '20260826', resting_hr_bpm: 60 },
    { date: '20260825', resting_hr_bpm: 60 },
    { date: '20260824', resting_hr_bpm: 57 },
    { date: '20260823', resting_hr_bpm: 54 },
    { date: '20260822', resting_hr_bpm: 56 },
  ],
};

const sleepData = {
  note: 'each record is dated by its wake-up day',
  days: [
    { date: '20260822', sleep_score: 54, main_sleep_min: 562, deep_sleep_ratio: 0.1, light_sleep_ratio: 0.59, rem_ratio: 0.24, awake_ratio: 0.07, awake_time_min: 42, naps_total_min: 137 },
    { date: '20260823', sleep_score: 41, main_sleep_min: 361, deep_sleep_ratio: 0.02, light_sleep_ratio: 0.71, rem_ratio: 0.16, awake_ratio: 0.11, awake_time_min: 44, naps_total_min: 0 },
    { date: '20260824', sleep_score: 72, main_sleep_min: 395, deep_sleep_ratio: 0.15, light_sleep_ratio: 0.57, rem_ratio: 0.19, awake_ratio: 0.09, awake_time_min: 41, naps_total_min: 0 },
    { date: '20260825', sleep_score: 74, main_sleep_min: 417, deep_sleep_ratio: 0.13, light_sleep_ratio: 0.58, rem_ratio: 0.26, awake_ratio: 0.03, awake_time_min: 14, naps_total_min: 0 },
    { date: '20260826', sleep_score: 57, main_sleep_min: 486, deep_sleep_ratio: 0.07, light_sleep_ratio: 0.58, rem_ratio: 0.3, awake_ratio: 0.05, awake_time_min: 23, naps_total_min: 126 },
    { date: '20260827', sleep_score: 91, main_sleep_min: 416, deep_sleep_ratio: 0.16, light_sleep_ratio: 0.52, rem_ratio: 0.28, awake_ratio: 0.04, awake_time_min: 16, naps_total_min: 131 },
    { date: '20260828', sleep_score: 91, main_sleep_min: 554, deep_sleep_ratio: 0.16, light_sleep_ratio: 0.54, rem_ratio: 0.28, awake_ratio: 0.02, awake_time_min: 13, naps_total_min: 0 },
  ],
};

const sleepHrv = {
  assessment: [
    { date: '20260828', hrv_avg_ms: 42, evaluation: 'Normal', normal_range: { low: 35, high: 47 }, baseline_ms: 41 },
    { date: '20260827', hrv_avg_ms: 35, evaluation: 'Below normal', normal_range: { low: 36, high: 46 }, baseline_ms: 41 },
    { date: '20260826', hrv_avg_ms: 34, evaluation: 'Below normal', normal_range: { low: 37, high: 47 }, baseline_ms: 42 },
    { date: '20260825', hrv_avg_ms: 41, evaluation: 'Normal', normal_range: { low: 37, high: 47 }, baseline_ms: 42 },
    { date: '20260824', hrv_avg_ms: 47, evaluation: 'Above normal', normal_range: { low: 36, high: 46 }, baseline_ms: 41 },
    { date: '20260823', hrv_avg_ms: 43, evaluation: 'Normal', normal_range: { low: 36, high: 47 }, baseline_ms: 41 },
    { date: '20260822', hrv_avg_ms: 40, evaluation: 'Normal', normal_range: { low: 35, high: 47 }, baseline_ms: 41 },
  ],
};

const stressLevel = {
  days: [
    { date: '20260828', avg_stress: 23, level: 'Relaxed' },
    { date: '20260827', avg_stress: 27, level: 'Low' },
    { date: '20260826', avg_stress: 38, level: 'Low' },
    { date: '20260825', avg_stress: 47, level: 'Low' },
    { date: '20260824', avg_stress: 34, level: 'Low' },
    { date: '20260823', avg_stress: 41, level: 'Low' },
    { date: '20260822', avg_stress: 28, level: 'Low' },
  ],
  _note: "breakdown categories always return 'No data' from the MCP — only avg_stress is populated",
};

const trainingLoad = {
  days: [
    { date: '20260828', comment: 'Maintaining', short_term_load: 47, long_term_load: 53, load_ratio: 0.88 },
    { date: '20260827', comment: 'Optimized', short_term_load: 54, long_term_load: 54, load_ratio: 1.0 },
    { date: '20260826', comment: 'Optimized', short_term_load: 64, long_term_load: 56, load_ratio: 1.14 },
    { date: '20260825', comment: 'Optimized', short_term_load: 74, long_term_load: 57, load_ratio: 1.29 },
    { date: '20260824', comment: 'Optimized', short_term_load: 58, long_term_load: 54, load_ratio: 1.07 },
    { date: '20260823', comment: 'Optimized', short_term_load: 65, long_term_load: 55, load_ratio: 1.18 },
    { date: '20260822', comment: 'Optimized', short_term_load: 69, long_term_load: 56, load_ratio: 1.23 },
    { date: '20260821', comment: 'Maintaining', short_term_load: 41, long_term_load: 51, load_ratio: 0.8 },
    { date: '20260820', comment: 'Maintaining', short_term_load: 48, long_term_load: 53, load_ratio: 0.9 },
    { date: '20260819', comment: 'Optimized', short_term_load: 56, long_term_load: 54, load_ratio: 1.03 },
    { date: '20260818', comment: 'Optimized', short_term_load: 66, long_term_load: 55, load_ratio: 1.2 },
    { date: '20260817', comment: 'Optimized', short_term_load: 75, long_term_load: 56, load_ratio: 1.33 },
    { date: '20260816', comment: 'Optimized', short_term_load: 56, long_term_load: 53, load_ratio: 1.05 },
    { date: '20260815', comment: 'Optimized', short_term_load: 66, long_term_load: 54, load_ratio: 1.22 },
    { date: '20260814', comment: 'Optimized', short_term_load: 53, long_term_load: 52, load_ratio: 1.01 },
    { date: '20260813', comment: 'Optimized', short_term_load: 62, long_term_load: 54, load_ratio: 1.14 },
    { date: '20260812', comment: 'Optimized', short_term_load: 61, long_term_load: 53, load_ratio: 1.15 },
    { date: '20260811', comment: 'Optimized', short_term_load: 71, long_term_load: 55, load_ratio: 1.29 },
    { date: '20260810', comment: 'Optimized', short_term_load: 79, long_term_load: 55, load_ratio: 1.43 },
    { date: '20260809', comment: 'Excessive', short_term_load: 92, long_term_load: 57, load_ratio: 1.61 },
    { date: '20260808', comment: 'Excessive', short_term_load: 107, long_term_load: 58, load_ratio: 1.84 },
    { date: '20260807', comment: 'Decreasing', short_term_load: 19, long_term_load: 49, load_ratio: 0.38 },
    { date: '20260806', comment: 'Decreasing', short_term_load: 23, long_term_load: 51, load_ratio: 0.45 },
    { date: '20260805', comment: 'Performance', short_term_load: 26, long_term_load: 52, load_ratio: 0.5 },
    { date: '20260804', comment: 'Performance', short_term_load: 31, long_term_load: 54, load_ratio: 0.57 },
    { date: '20260803', comment: 'Performance', short_term_load: 36, long_term_load: 56, load_ratio: 0.64 },
    { date: '20260802', comment: 'Performance', short_term_load: 42, long_term_load: 57, load_ratio: 0.73 },
    { date: '20260801', comment: 'Maintaining', short_term_load: 49, long_term_load: 59, load_ratio: 0.83 },
    { date: '20260731', comment: 'Maintaining', short_term_load: 57, long_term_load: 61, load_ratio: 0.93 },
    { date: '20260730', comment: 'Optimized', short_term_load: 67, long_term_load: 64, load_ratio: 1.04 },
  ],
};

const sportRecords = {
  total_records: 13,
  records: [
    { sport_type: 'Trail Run', sport_type_code: 102, date: '2026-08-25', location: 'Park City Trail Run', duration_sec: 4047, distance_km: 8.23, avg_pace: '8:12 /km', avg_hr_bpm: 159, calories_kcal: 654 },
    { sport_type: 'Outdoor Run', sport_type_code: 100, date: '2026-08-24', location: 'Salt Lake County Run', duration_sec: 875, distance_km: 0.899, avg_pace: '16:13 /km', avg_hr_bpm: 129, calories_kcal: 104 },
    { sport_type: 'Outdoor Climb', sport_type_code: 802, date: '2026-08-24', location: 'Alta Outdoor Climb', duration_sec: 9571, distance_km: 1.32, avg_pace: null, avg_hr_bpm: 101, calories_kcal: 162 },
    { sport_type: 'Outdoor Run', sport_type_code: 100, date: '2026-08-23', location: 'Salt Lake County Run', duration_sec: 919, distance_km: 0.597, avg_pace: '25:40 /km', avg_hr_bpm: 122, calories_kcal: 94 },
    { sport_type: 'Outdoor Climb', sport_type_code: 802, date: '2026-08-23', location: 'Salt Lake County Outdoor Climb', duration_sec: 8558, distance_km: 2.05, avg_pace: null, avg_hr_bpm: 99, calories_kcal: 7 },
    { sport_type: 'Outdoor Run', sport_type_code: 100, date: '2026-08-23', location: 'Alta Run', duration_sec: 1933, distance_km: 0.975, avg_pace: '33:03 /km', avg_hr_bpm: 137, calories_kcal: 263 },
    { sport_type: 'Outdoor Run', sport_type_code: 100, date: '2026-08-22', location: 'Chandler Run', duration_sec: 4488, distance_km: 10.05, avg_pace: '7:26 /km', avg_hr_bpm: 162, calories_kcal: 829 },
    { sport_type: 'Bouldering', sport_type_code: 801, date: '2026-08-18', location: 'Bouldering', duration_sec: 1739, distance_km: null, avg_pace: null, avg_hr_bpm: 103, calories_kcal: 133 },
    { sport_type: 'Outdoor Run', sport_type_code: 100, date: '2026-08-17', location: 'Chandler Run', duration_sec: 4804, distance_km: 9.88, avg_pace: '8:06 /km', avg_hr_bpm: 156, calories_kcal: 816 },
    { sport_type: 'Outdoor Run', sport_type_code: 100, date: '2026-08-15', location: 'Chandler Run', duration_sec: 5086, distance_km: 10.36, avg_pace: '8:11 /km', avg_hr_bpm: 146, calories_kcal: 770 },
    { sport_type: 'Outdoor Run', sport_type_code: 100, date: '2026-08-13', location: 'Chandler Run', duration_sec: 2778, distance_km: 5.26, avg_pace: '8:49 /km', avg_hr_bpm: 142, calories_kcal: 403 },
    { sport_type: 'Outdoor Run', sport_type_code: 100, date: '2026-08-11', location: 'Chandler Run', duration_sec: 1278, distance_km: 2.47, avg_pace: '8:37 /km', avg_hr_bpm: 140, calories_kcal: 181 },
    { sport_type: 'Trail Run', sport_type_code: 102, date: '2026-08-08', location: 'Vertigo Nights 20k Race', duration_sec: 10129, distance_km: 20.68, avg_pace: '8:10 /km', avg_hr_bpm: 170, calories_kcal: 1806 },
  ],
};

const trainingSchedule = {
  scheduled_workouts: [
    { date: '2026-08-29', name: 'Long Trail Run', distance_km: 20.36, estimated_time: '2:30:00', training_load: 255 },
    { date: '2026-08-30', name: 'ATe Test', distance_km: 5.66, estimated_time: '30:00', training_load: 175 },
    { date: '2026-08-30', name: 'Long City Run', distance_km: 14.25, estimated_time: '1:45:00', training_load: 178 },
  ],
  _note: 'No workouts scheduled for Aug 31 – Sep 5',
};

module.exports = {
  userInfo,
  recoveryStatus,
  fitnessOverview,
  dailyHealth,
  restingHeartRate,
  sleepData,
  sleepHrv,
  stressLevel,
  trainingLoad,
  sportRecords,
  trainingSchedule,
};
