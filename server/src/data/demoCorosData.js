// Synthetic COROS data for the four demo athletes. Each dataset is written to
// match that athlete's profile and context files in prisma/seed.js — Maria's
// night-shift sleep dips, James's alpine-day load spike, Sofia's work-stress
// week, Marcus's deliberately small comeback volume.
//
// Shapes match what the MCP returns (snake_case keys, "YYYYMMDD" dates, arrays
// nested under .days / .records / .assessment), so every formatter in
// dashboardService.js works on demo and live data alike.
//
// The window is 2026-08-25 → 2026-08-31 for daily metrics and 2026-08-02 →
// 2026-08-31 for training load, the same range across all four athletes.
//
// Derived values (pace, load ratio, awake minutes, stress and HRV labels) are
// computed by the builders below rather than typed in, so a dataset cannot
// contradict itself.

const WEEK = ['20260825', '20260826', '20260827', '20260828', '20260829', '20260830', '20260831'];
const LOAD_START = '20260802';
const LOAD_DAYS = 30;

// --- derivation helpers ----------------------------------------------------

function isoDate(ymd) {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function addDays(ymd, offset) {
  const date = new Date(`${isoDate(ymd)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// Sports COROS reports a per-kilometre pace for. A ride gets a speed, a swim a
// per-100m split, and a climb neither — all of which come back as no pace here.
const PACE_SPORTS = new Set([100, 101, 102, 103, 104, 900, 902]);

// "6:29 /km", matching the string COROS puts in a sport record.
function paceLabel(sportCode, durationSec, distanceKm) {
  if (!PACE_SPORTS.has(sportCode) || !durationSec || !distanceKm) return null;
  const perKm = Math.round(durationSec / distanceKm);
  return `${Math.floor(perKm / 60)}:${String(perKm % 60).padStart(2, '0')} /km`;
}

// Bands taken from the labels COROS returned in the captured reference sample.
function stressLabel(avg) {
  if (avg < 25) return 'Relaxed';
  if (avg < 34) return 'Low';
  return 'Medium';
}

function hrvEvaluation(value, low, high) {
  if (value < low) return 'Below normal';
  if (value > high) return 'Above normal';
  return 'Normal';
}

function loadComment(ratio) {
  if (ratio < 0.5) return 'Decreasing';
  if (ratio < 0.8) return 'Performance';
  if (ratio < 1.0) return 'Maintaining';
  if (ratio <= 1.5) return 'Optimized';
  return 'Excessive';
}

// --- section builders ------------------------------------------------------

// rows: [sleepScore, mainSleepMin, deep, light, rem, awake, napsMin]
function buildSleep(rows) {
  return {
    note: 'each record is dated by its wake-up day',
    days: rows.map(([score, minutes, deep, light, rem, awake, naps = 0], i) => ({
      date: WEEK[i],
      sleep_score: score,
      main_sleep_min: minutes,
      deep_sleep_ratio: deep,
      light_sleep_ratio: light,
      rem_ratio: rem,
      awake_ratio: awake,
      awake_time_min: Math.round(minutes * awake),
      naps_total_min: naps,
    })),
  };
}

function buildHrv(values, baseline, low, high) {
  return {
    assessment: values.map((hrv, i) => ({
      date: WEEK[i],
      hrv_avg_ms: hrv,
      evaluation: hrvEvaluation(hrv, low, high),
      normal_range: { low, high },
      baseline_ms: baseline,
    })),
  };
}

function buildStress(values) {
  return {
    days: values.map((avg, i) => ({ date: WEEK[i], avg_stress: avg, level: stressLabel(avg) })),
  };
}

function buildRestingHr(values) {
  return { days: values.map((bpm, i) => ({ date: WEEK[i], resting_hr_bpm: bpm })) };
}

// rows: [steps, calories, exerciseMin, floors, stressAvg]
function buildDailyHealth(rows, restingHr, hrvBaseline) {
  return {
    resting_hr_bpm: restingHr,
    hrv_baseline_ms: hrvBaseline,
    days: rows.map(([steps, calories, exercise, floors, stress], i) => ({
      date: WEEK[i],
      steps,
      calories_kcal: calories,
      exercise_min: exercise,
      floors,
      stress_avg: stress,
    })),
  };
}

// stl/ltl are 30-day series, oldest first. The ratio is always derived, so it
// can never drift from the two loads it summarises.
function buildTrainingLoad(stl, ltl) {
  return {
    days: stl.map((shortTerm, i) => {
      const longTerm = ltl[i];
      const ratio = Math.round((shortTerm / longTerm) * 100) / 100;
      return {
        date: addDays(LOAD_START, i),
        comment: loadComment(ratio),
        short_term_load: shortTerm,
        long_term_load: longTerm,
        load_ratio: ratio,
      };
    }),
  };
}

// rows: [date, sportName, sportCode, location, distanceKm, durationSec, avgHr,
//        calories, elevationGainM?]
// Pace is derived; a null distance yields a null pace, which is how COROS
// reports climbs, swims and rides.
function buildRecords(rows) {
  const records = rows.map(
    ([date, sport, code, location, distanceKm, durationSec, avgHr, calories, elevation]) => ({
      sport_type: sport,
      sport_type_code: code,
      date: isoDate(date),
      location,
      duration_sec: durationSec,
      distance_km: distanceKm,
      avg_pace: paceLabel(code, durationSec, distanceKm),
      avg_hr_bpm: avgHr,
      calories_kcal: calories,
      // Not rendered by the dashboard today; carried because vertical is the
      // point of half of James's week.
      elevation_gain_m: elevation ?? null,
    })
  );
  return { total_records: records.length, records };
}

// rows: [date, name, distanceKm, estimatedTime, trainingLoad]
// Rest days are the absence of a workout, not a zero-length one, so they are
// simply not listed — the same way COROS returns a schedule.
function buildSchedule(rows) {
  return {
    scheduled_workouts: rows.map(([date, name, distanceKm, estimatedTime, trainingLoad]) => ({
      date: isoDate(date),
      name,
      distance_km: distanceKm,
      estimated_time: estimatedTime,
      training_load: trainingLoad,
    })),
  };
}

// --- Maria Chen — marathon build, Portland ---------------------------------
// Nurse on 3x12h night shifts. The signature of her week is sleep: two 5-hour
// post-shift nights with naps bolted on, against 7.5-8h on her days off.

const maria = {
  userInfo: {
    height_cm: 165,
    weight_kg: 61,
    birthday: '1994-02-19',
    age: 32,
    nickname: 'Maria Chen',
  },
  recoveryStatus: {
    recovery_pct: 85,
    level: 'Moderate training allowed',
    estimated_full_recovery_hours: 8,
  },
  fitnessOverview: {
    vo2max: 42,
    running_level: 54,
    threshold_pace: '5:52 /km',
    predictions: {
      '5k': '27:33',
      '10k': '57:12',
      half_marathon: '2:06:45',
      marathon: '4:24:00',
    },
  },
  restingHeartRate: buildRestingHr([58, 60, 59, 57, 56, 58, 57]),
  sleepHrv: buildHrv([38, 35, 40, 44, 42, 39, 43], 42, 34, 52),
  stressLevel: buildStress([34, 38, 22, 20, 31, 41, 24]),
  sleepData: buildSleep([
    [62, 330, 0.14, 0.58, 0.21, 0.07, 45], // post-shift
    [58, 300, 0.12, 0.6, 0.2, 0.08, 60], // post-shift
    [78, 450, 0.19, 0.55, 0.22, 0.04],
    [82, 480, 0.21, 0.54, 0.22, 0.03],
    [71, 390, 0.16, 0.58, 0.21, 0.05], // pre-shift
    [55, 300, 0.13, 0.59, 0.2, 0.08, 55], // post-shift
    [80, 450, 0.2, 0.55, 0.22, 0.03],
  ]),
  dailyHealth: buildDailyHealth(
    [
      [3200, 180, 0, 3, 34],
      [2800, 160, 32, 2, 38],
      [8400, 520, 62, 6, 22],
      [9100, 580, 48, 7, 20],
      [5200, 320, 28, 4, 31],
      [4800, 290, 60, 3, 41],
      [14200, 980, 108, 12, 24],
    ],
    57,
    42
  ),
  // Two base weeks near 1.0, a big week into 1.4, a stepback, then the ramp
  // into the next build.
  trainingLoad: buildTrainingLoad(
    [
      38, 40, 36, 42, 43, 39, 38, 40, 42, 38, 41, 43, 40, 38,
      55, 58, 61, 61, 63, 62, 60,
      43, 42, 41, 43, 44, 42,
      46, 52, 57,
    ],
    [
      40, 40, 40, 41, 41, 41, 41, 41, 42, 42, 42, 42, 42, 42,
      43, 43, 44, 44, 45, 45, 46,
      47, 47, 47, 46, 46, 46,
      45, 46, 47,
    ]
  ),
  sportRecords: buildRecords([
    ['20260826', 'Outdoor Run', 100, 'Portland Easy Run', 5.1, 1920, 138, 310],
    ['20260827', 'Outdoor Run', 100, 'Willamette Medium Long Run', 14.8, 5760, 148, 890],
    ['20260828', 'Outdoor Run', 100, 'Tempo — 5.6 km at marathon pace', 11.4, 3900, 162, 720],
    ['20260829', 'Outdoor Run', 100, 'Easy Run + Strides', 6.0, 2520, 132, 360],
    ['20260830', 'Yoga', 904, 'Yoga', null, 3600, 82, 180],
    ['20260831', 'Outdoor Run', 100, 'Forest Park Long Run', 27.4, 10320, 152, 1620],
  ]),
  trainingSchedule: buildSchedule([
    ['20260902', 'Easy Run', 8, '50:00', 62],
    ['20260903', 'Medium Long Run', 16, '1:42:00', 128],
    ['20260904', 'Tempo — 6 km at marathon pace', 12, '1:15:00', 145],
    ['20260905', 'Easy Run + Strides', 8, '52:00', 65],
    ['20260906', 'Yoga / Cross-Train', null, '60:00', 20],
    ['20260907', 'Long Run — first 18 miler', 29, '3:15:00', 235],
  ]),
};

// --- James Hartley — alpine climber, Boulder --------------------------------
// Climbing and vertical, not mileage. The week runs on a seven-day cycle with a
// big alpine day at the end of it, which is what the load spikes are.

const james = {
  userInfo: {
    height_cm: 178,
    weight_kg: 72,
    birthday: '1998-06-14',
    age: 28,
    nickname: 'James Hartley',
  },
  recoveryStatus: {
    recovery_pct: 92,
    level: 'Heavy training allowed',
    estimated_full_recovery_hours: 4,
  },
  fitnessOverview: {
    vo2max: 52,
    running_level: 72,
    threshold_pace: '4:48 /km',
    predictions: {
      '5k': '21:45',
      '10k': '45:30',
      half_marathon: '1:42:00',
      marathon: '3:35:00',
    },
  },
  restingHeartRate: buildRestingHr([52, 54, 53, 51, 50, 52, 51]),
  sleepHrv: buildHrv([52, 48, 55, 62, 65, 58, 60], 58, 45, 72),
  stressLevel: buildStress([22, 28, 18, 20, 16, 42, 24]),
  sleepData: buildSleep([
    [82, 450, 0.22, 0.54, 0.21, 0.03],
    [78, 420, 0.2, 0.56, 0.2, 0.04],
    [85, 480, 0.24, 0.52, 0.21, 0.03],
    [80, 450, 0.21, 0.55, 0.21, 0.03],
    [88, 480, 0.23, 0.53, 0.22, 0.02], // rest day
    [68, 360, 0.16, 0.58, 0.19, 0.07], // short night before the alpine start
    [84, 480, 0.22, 0.54, 0.21, 0.03],
  ]),
  dailyHealth: buildDailyHealth(
    [
      [9200, 620, 95, 48, 22],
      [11400, 780, 180, 92, 28],
      [12800, 850, 135, 124, 18],
      [7600, 480, 45, 36, 20],
      [4200, 280, 0, 8, 16],
      [18500, 1420, 320, 168, 42],
      [5800, 340, 45, 30, 24],
    ],
    51,
    58
  ),
  // Sustained moderate load with a spike every seventh day, each one an alpine
  // or long-vertical day. The ratio stays inside Optimized throughout.
  trainingLoad: buildTrainingLoad(
    [
      62, 58, 55, 58, 62, 58, 56,
      82, 76, 70, 66, 68, 62, 58,
      84, 78, 72, 68, 70, 64, 60,
      86, 80, 74, 70, 72, 66, 60,
      85, 72,
    ],
    [
      55, 55, 55, 56, 56, 56, 56,
      56, 57, 57, 57, 57, 57, 57,
      57, 58, 58, 58, 58, 58, 58,
      58, 59, 59, 59, 59, 59, 58,
      58, 58,
    ]
  ),
  sportRecords: buildRecords([
    ['20260825', 'Trail Run', 102, 'Chautauqua Trail', 8.4, 3300, 142, 620, 549],
    ['20260826', 'Outdoor Climb', 802, 'Eldorado Canyon — 4 pitches', 2.1, 10800, 108, 980, 150],
    ['20260827', 'Trail Run', 102, 'Bear Peak', 16.2, 8100, 148, 1450, 1036],
    ['20260828', 'Indoor Climb', 800, 'Movement Boulder — 4x4 circuit', null, 2700, 118, 420],
    ['20260830', 'Mountain Climb', 105, 'Longs Peak — Keyhole recon', 23.3, 33600, 128, 4200, 1554],
    ['20260831', 'Hike', 104, 'Green Mountain recovery hike', 4.8, 2700, 98, 320, 300],
  ]),
  trainingSchedule: buildSchedule([
    ['20260901', 'Recovery Trail Run', 6.5, '45:00', 55],
    ['20260902', 'Gym — Hangboard + Core', null, '60:00', 35],
    ['20260903', 'Trail Run — Bear Peak', 14, '1:55:00', 145],
    ['20260904', 'Indoor Climb — 4x4 Circuits', null, '75:00', 60],
    ['20260906', 'Alpine Day — Longs Peak (Keyhole)', 24, '9:00:00', 320],
    ['20260907', 'Recovery Hike', 5, '50:00', 30],
  ]),
};

// --- Sofia Reyes — first Olympic triathlon, Austin --------------------------
// Three disciplines and a demanding job. Her limiter this week is work stress:
// it shows up in the mid-week HRV floor, the sleep dip and the stress average
// before it shows up in the training.

const sofia = {
  userInfo: {
    height_cm: 168,
    weight_kg: 64,
    birthday: '1991-07-30',
    age: 35,
    nickname: 'Sofia Reyes',
  },
  recoveryStatus: {
    recovery_pct: 78,
    level: 'Moderate to light training recommended',
    estimated_full_recovery_hours: 14,
  },
  fitnessOverview: {
    vo2max: 39,
    running_level: 42,
    threshold_pace: '6:15 /km',
    predictions: {
      '5k': '29:48',
      '10k': '1:02:30',
      half_marathon: '2:18:00',
      marathon: '4:52:00',
    },
  },
  restingHeartRate: buildRestingHr([60, 62, 63, 61, 59, 60, 58]),
  sleepHrv: buildHrv([35, 30, 28, 34, 40, 36, 42], 38, 28, 48),
  stressLevel: buildStress([32, 45, 48, 35, 28, 30, 25]),
  sleepData: buildSleep([
    [74, 420, 0.19, 0.56, 0.21, 0.04],
    [65, 360, 0.15, 0.59, 0.2, 0.06], // work stress
    [62, 330, 0.14, 0.6, 0.19, 0.07], // worst night of the week
    [78, 450, 0.2, 0.55, 0.22, 0.03],
    [76, 420, 0.18, 0.57, 0.21, 0.04],
    [72, 390, 0.17, 0.57, 0.21, 0.05],
    [82, 480, 0.22, 0.54, 0.21, 0.03],
  ]),
  dailyHealth: buildDailyHealth(
    [
      [7800, 440, 65, 4, 32],
      [6200, 380, 70, 3, 45],
      [8400, 480, 48, 5, 48],
      [7200, 420, 72, 4, 35],
      [3800, 220, 0, 2, 28],
      [9600, 620, 95, 6, 30],
      [8200, 490, 55, 5, 25],
    ],
    58,
    38
  ),
  // A gradual three-discipline build: no spikes, because the volume is spread
  // across swim, bike and run rather than concentrated in one long day.
  trainingLoad: buildTrainingLoad(
    [
      34, 36, 30, 38, 40, 35, 33,
      38, 40, 31, 41, 43, 38, 34,
      40, 42, 38, 43, 45, 40, 36,
      42, 44, 40, 42, 44, 41, 36,
      45, 45,
    ],
    [
      35, 35, 35, 36, 36, 36, 36,
      36, 37, 37, 37, 37, 37, 37,
      37, 38, 38, 38, 38, 38, 38,
      38, 38, 38, 38, 38, 38, 38,
      38, 38,
    ]
  ),
  sportRecords: buildRecords([
    ['20260825', 'Pool Swim', 300, 'Austin Aquatic Center', 2.8, 3300, 142, 520],
    ['20260826', 'Outdoor Bike', 200, 'Shoal Creek Loop', 29.3, 3900, 138, 640],
    ['20260827', 'Outdoor Run', 100, 'Lady Bird Lake Trail', 6.7, 2880, 145, 470],
    ['20260828', 'Pool Swim', 300, 'Austin Aquatic Center', 2.2, 2700, 136, 400],
    ['20260828', 'Outdoor Run', 100, 'Brick Run off the bike', 1.8, 720, 155, 130],
    ['20260830', 'Outdoor Bike', 200, 'Parmer Lane long ride', 42.3, 5700, 142, 980],
    ['20260831', 'Outdoor Run', 100, 'Long Run', 7.8, 3300, 148, 510],
  ]),
  trainingSchedule: buildSchedule([
    ['20260901', 'Pool Swim — Technique', 2.4, '50:00', 42],
    ['20260902', 'Bike — Tempo Intervals', 32, '1:10:00', 78],
    ['20260903', 'Easy Run', 6.5, '48:00', 52],
    ['20260904', 'Swim + Brick Run', 2.0, '60:00', 65],
    ['20260906', 'Long Bike', 48, '1:50:00', 105],
    ['20260907', 'Long Run', 9.5, '1:08:00', 72],
  ]),
};

// --- Marcus Webb — Achilles comeback, Nashville -----------------------------
// Six months post-surgery. Everything here is deliberately small: runs under
// 5 km, load a third of the other athletes', cross-training on the days between.
// Recovery sits at 100% precisely because the volume is so low.

const marcus = {
  userInfo: {
    height_cm: 180,
    weight_kg: 79,
    birthday: '1981-04-03',
    age: 45,
    nickname: 'Marcus Webb',
  },
  recoveryStatus: {
    recovery_pct: 100,
    level: 'Heavy training allowed',
    estimated_full_recovery_hours: 0,
  },
  fitnessOverview: {
    vo2max: 44,
    running_level: 60,
    threshold_pace: '5:20 /km',
    // COROS extrapolates these from very little running; they are well short of
    // what he ran before the rupture.
    predictions: {
      '5k': '24:12',
      '10k': '50:30',
      half_marathon: '1:52:00',
      marathon: '3:58:00',
    },
  },
  restingHeartRate: buildRestingHr([56, 55, 54, 55, 53, 54, 52]),
  sleepHrv: buildHrv([42, 44, 48, 45, 50, 46, 52], 45, 35, 58),
  stressLevel: buildStress([20, 18, 22, 19, 16, 24, 18]),
  sleepData: buildSleep([
    [80, 450, 0.2, 0.56, 0.21, 0.03],
    [82, 450, 0.21, 0.55, 0.21, 0.03],
    [78, 420, 0.19, 0.57, 0.2, 0.04],
    [86, 480, 0.23, 0.53, 0.22, 0.02],
    [84, 450, 0.22, 0.54, 0.21, 0.03],
    [76, 420, 0.18, 0.57, 0.2, 0.05],
    [85, 480, 0.22, 0.54, 0.21, 0.03],
  ]),
  dailyHealth: buildDailyHealth(
    [
      [6800, 380, 42, 3, 20],
      [5200, 320, 28, 2, 18],
      [7400, 440, 55, 4, 22],
      [5800, 360, 30, 3, 19],
      [4200, 260, 30, 2, 16],
      [6200, 390, 35, 3, 24],
      [4800, 300, 30, 2, 18],
    ],
    52,
    45
  ),
  // A controlled staircase with a deload in the second week. The absolute
  // numbers are the story: a third of what the other three carry.
  trainingLoad: buildTrainingLoad(
    [
      17, 18, 16, 19, 20, 18, 17,
      15, 16, 14, 15, 16, 15, 14,
      19, 20, 18, 21, 22, 20, 19,
      22, 23, 21, 24, 25, 23, 22,
      24, 25,
    ],
    [
      21, 21, 21, 21, 21, 21, 21,
      21, 21, 20, 20, 20, 20, 20,
      20, 20, 21, 21, 21, 21, 21,
      21, 21, 22, 22, 22, 22, 22,
      22, 22,
    ]
  ),
  sportRecords: buildRecords([
    ['20260825', 'Indoor Bike', 201, 'Stationary bike — easy spin', null, 2520, 118, 380],
    ['20260826', 'Outdoor Run', 100, 'Shelby Bottoms easy — Achilles 1/1/1', 4.7, 1680, 138, 300],
    ['20260827', 'Strength', 402, 'Single-leg RDLs, calf raises, core', null, 3300, 105, 240],
    ['20260828', 'Outdoor Run', 100, 'Easy run — Achilles 0/1/1', 4.5, 1800, 142, 290],
    ['20260829', 'Walk', 900, 'Neighborhood walk', 3.2, 1800, 88, 160],
    ['20260830', 'Outdoor Run', 100, 'Easy run — Achilles 1/1/1', 5.1, 1920, 136, 330],
    ['20260831', 'Gym Cardio', 400, 'Pool running', null, 1800, 125, 260],
  ]),
  trainingSchedule: buildSchedule([
    ['20260901', 'Bike + Eccentric Calf Work', null, '45:00', 32],
    ['20260902', 'Easy Run', 5.2, '30:00', 38],
    ['20260903', 'Strength + Eccentrics', null, '55:00', 25],
    ['20260904', 'Easy Run', 6.0, '35:00', 44],
    ['20260906', 'Easy Run — longest of the week', 6.8, '40:00', 52],
    ['20260907', 'Pool Running', null, '40:00', 30],
  ]),
};

const DEMO_DATA_BY_EMAIL = {
  'maria@demo.arete': maria,
  'james@demo.arete': james,
  'sofia@demo.arete': sofia,
  'marcus@demo.arete': marcus,
};

// Also the sample data a real account sees before it connects a watch, which is
// why the fallback is a complete athlete rather than an empty object.
function getDemoData(userEmail) {
  return DEMO_DATA_BY_EMAIL[userEmail] || maria;
}

module.exports = { getDemoData, DEMO_DATA_BY_EMAIL };
