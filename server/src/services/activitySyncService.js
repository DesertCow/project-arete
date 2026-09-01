const pino = require('pino');

const prisma = require('../lib/prisma');
const { callMcpTools } = require('./corosMcp');
const { parseSportRecords, parseActivityDetail } = require('./corosTextParser');
const { SPORT_TYPES } = require('../constants/sportTypes');

const logger = pino({ name: 'activitySyncService' });

const DEFAULT_LOOKBACK_DAYS = 30;
const FULL_SYNC_LOOKBACK_DAYS = 90;
const RECORD_LIMIT = 50;
// A 90-day window on an athlete training daily can exceed the default page, and
// records past the limit are dropped silently, so the full sync asks for more.
const FULL_SYNC_RECORD_LIMIT = 200;

// Display names for the codes in constants/sportTypes.js. Derived Title Case
// would read as "Xc Ski" / "Gps Cardio", so the labels are spelled out.
const SPORT_NAMES = {
  [SPORT_TYPES.OUTDOOR_RUN]: 'Outdoor Run',
  [SPORT_TYPES.INDOOR_RUN]: 'Indoor Run',
  [SPORT_TYPES.TRAIL_RUN]: 'Trail Run',
  [SPORT_TYPES.TRACK_RUN]: 'Track Run',
  [SPORT_TYPES.HIKE]: 'Hike',
  [SPORT_TYPES.MOUNTAIN_CLIMB]: 'Mountain Climb',
  [SPORT_TYPES.OUTDOOR_BIKE]: 'Outdoor Bike',
  [SPORT_TYPES.INDOOR_BIKE]: 'Indoor Bike',
  [SPORT_TYPES.POOL_SWIM]: 'Pool Swim',
  [SPORT_TYPES.OPEN_WATER]: 'Open Water Swim',
  [SPORT_TYPES.GYM_CARDIO]: 'Gym Cardio',
  [SPORT_TYPES.GPS_CARDIO]: 'GPS Cardio',
  [SPORT_TYPES.STRENGTH]: 'Strength',
  [SPORT_TYPES.SKI]: 'Ski',
  [SPORT_TYPES.SNOWBOARD]: 'Snowboard',
  [SPORT_TYPES.XC_SKI]: 'XC Ski',
  [SPORT_TYPES.ALPINE_TOURING]: 'Alpine Touring',
  [SPORT_TYPES.INDOOR_SINGLE_PITCH]: 'Indoor Climbing',
  [SPORT_TYPES.BOULDERING]: 'Bouldering',
  [SPORT_TYPES.OUTDOOR_CLIMB]: 'Outdoor Climb',
  [SPORT_TYPES.WALK]: 'Walk',
  [SPORT_TYPES.JUMP_ROPE]: 'Jump Rope',
  [SPORT_TYPES.STAIR_CLIMBING]: 'Stair Climbing',
  [SPORT_TYPES.YOGA]: 'Yoga',
  [SPORT_TYPES.TRIATHLON]: 'Triathlon',
};

function getSportNameFromType(sportType) {
  return SPORT_NAMES[sportType] || `Activity (${sportType})`;
}

// yyyyMMdd — the range format querySportRecords expects (passing `days` there
// silently falls back to a week, see dashboardService).
function ymd(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

// COROS reports a calendar day, not an instant. Anchoring at UTC midnight keeps
// the stored day stable regardless of where the server runs; the client renders
// it back in UTC for the same reason.
function toUtcDate(isoDay) {
  if (!isoDay) return null;
  const parsed = new Date(`${isoDay}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// COROS gives the precise window as unix seconds ("startTimestamp=1788228162").
function fromEpochSeconds(seconds) {
  if (!seconds) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Every activity needs a stable key for the upsert. COROS supplies one; when it
// does not, a key derived from the immutable summary fields keeps the sync
// idempotent instead of inserting a duplicate on every run.
function activityKey(record) {
  if (record.label_id) return String(record.label_id);
  return `derived:${record.date}:${record.sport_type_code ?? 'x'}:${record.duration_sec ?? 0}`;
}

function toRow(record) {
  return {
    corosLabelId: activityKey(record),
    sportType: record.sport_type_code ?? SPORT_TYPES.ALL,
    sportName: record.sport_type || getSportNameFromType(record.sport_type_code),
    date: toUtcDate(record.date),
    startTimestamp: fromEpochSeconds(record.start_epoch_sec),
    endTimestamp: fromEpochSeconds(record.end_epoch_sec),
    duration: record.duration_sec ?? 0,
    // COROS reports kilometres; the column is metres.
    distance: record.distance_km != null ? Math.round(record.distance_km * 1000) : null,
    calories: record.calories_kcal ?? null,
    avgHR: record.avg_hr_bpm ?? null,
    avgPace: record.avg_pace_sec_per_km ?? null,
    startLat: record.start_lat ?? null,
    startLon: record.start_lon ?? null,
    locationName: record.location || null,
    rawSummary: record.raw_text || null,
    // Elevation, training load and the training effects only exist in the
    // detail report, so they stay null until a card is opened.
  };
}

// querySportRecords answers with a prose report; parseSportRecords turns it
// back into records. A structured payload (a future MCP change, or the cached
// shape) passes straight through.
function readRecords(payload) {
  if (payload == null) return null;
  if (typeof payload === 'string') return parseSportRecords(payload).records;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.records)) return payload.records;
  return null;
}

// Fetches recent activities from COROS and stores the ones we do not have.
// Returns { synced, existing, total } — or an { error } the route turns into a
// 400, so a missing connection reads as a user-fixable state, not a crash.
async function syncActivities(userId, options = {}) {
  const { days = DEFAULT_LOOKBACK_DAYS, fullSync = false } = options;
  const lookbackDays = fullSync ? FULL_SYNC_LOOKBACK_DAYS : days;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { synced: 0, existing: 0, total: 0, error: 'User not found' };
  if (user.role === 'DEMO') {
    return { synced: 0, existing: 0, total: 0, error: 'Demo accounts cannot sync COROS data' };
  }
  if (!user.corosAccessToken) {
    return { synced: 0, existing: 0, total: 0, error: 'COROS not connected' };
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  // callMcpTools owns the connection, the token refresh, and per-tool failure
  // isolation, so the sync never handles raw tokens itself.
  const results = await callMcpTools(user, {
    sportRecords: {
      name: 'querySportRecords',
      args: {
        startDate: ymd(startDate),
        endDate: ymd(endDate),
        limit: fullSync ? FULL_SYNC_RECORD_LIMIT : RECORD_LIMIT,
      },
    },
  });

  if (!results || results.sportRecords == null) {
    return { synced: 0, existing: 0, total: 0, error: 'Could not reach COROS. Try again shortly.' };
  }

  const records = readRecords(results.sportRecords);
  if (!records) {
    logger.warn(
      { userId, raw: String(results.sportRecords).slice(0, 2000) },
      'querySportRecords returned an unrecognised shape'
    );
    return { synced: 0, existing: 0, total: 0, error: 'COROS returned data we could not read' };
  }
  if (records.length === 0 && typeof results.sportRecords === 'string') {
    // Either a genuinely empty window or a report format we no longer match —
    // log the text so the parser can be corrected against it.
    logger.info(
      { userId, raw: results.sportRecords.slice(0, 2000) },
      'querySportRecords parsed to zero activities'
    );
  }

  const rows = records.map(toRow).filter((row) => row.date);

  // Knowing up front which ids we already hold makes the new/existing counts
  // exact — Prisma's upsert cannot report which branch it took.
  const known = new Set(
    (
      await prisma.activity.findMany({
        where: { userId, corosLabelId: { in: rows.map((r) => r.corosLabelId) } },
        select: { corosLabelId: true },
      })
    ).map((a) => a.corosLabelId)
  );

  let synced = 0;
  let existing = 0;

  for (const row of rows) {
    const wasKnown = known.has(row.corosLabelId);
    try {
      await prisma.activity.upsert({
        where: { userId_corosLabelId: { userId, corosLabelId: row.corosLabelId } },
        // Summary fields can be corrected upstream (a renamed activity, a
        // location that resolved later), but never clobber detail we fetched.
        update: {
          sportName: row.sportName,
          locationName: row.locationName,
          rawSummary: row.rawSummary,
        },
        create: { userId, ...row },
      });
      if (wasKnown) existing += 1;
      else synced += 1;
    } catch (err) {
      logger.warn(
        { userId, corosLabelId: row.corosLabelId, err: err.message },
        'Failed to upsert activity'
      );
    }
  }

  logger.info({ userId, synced, existing, total: rows.length }, 'Activity sync complete');
  return { synced, existing, total: rows.length };
}

// Lazily pulls the full metric set for one activity, the first time it is
// opened. Returns the activity unchanged when the detail call fails, so the
// summary data still renders.
async function fetchActivityDetail(userId, activityId) {
  const activity = await prisma.activity.findFirst({ where: { id: activityId, userId } });
  if (!activity) return null;
  if (activity.detailFetched) return activity;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.corosAccessToken || user.role === 'DEMO') return activity;
  // A derived key is ours, not COROS's — there is nothing to look up with it.
  if (activity.corosLabelId.startsWith('derived:')) return activity;

  const results = await callMcpTools(user, {
    detail: {
      name: 'getActivityDetail',
      args: { labelId: activity.corosLabelId, sportType: activity.sportType },
    },
  });

  const payload = results?.detail;
  if (payload == null) {
    logger.warn({ userId, activityId }, 'getActivityDetail returned nothing');
    return activity;
  }

  const detail = typeof payload === 'string' ? parseActivityDetail(payload) : payload;
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);

  // Nothing parsed out means the report format moved; keep the raw text so it
  // can be re-parsed later, and do not mark detail as fetched.
  const parsedAnything = Object.values(detail || {}).some((v) => v != null);
  if (!parsedAnything) {
    logger.warn({ userId, activityId, raw: raw.slice(0, 2000) }, 'Activity detail did not parse');
    return prisma.activity.update({ where: { id: activityId }, data: { rawDetail: raw } });
  }

  try {
    return await prisma.activity.update({
      where: { id: activityId },
      data: {
        avgCadence: detail.avg_cadence ?? activity.avgCadence,
        avgPower: detail.avg_power ?? activity.avgPower,
        elevationGain: detail.elevation_gain_m ?? activity.elevationGain,
        elevationLoss: detail.elevation_loss_m ?? activity.elevationLoss,
        trainingLoad: detail.training_load ?? activity.trainingLoad,
        aerobicTE: detail.aerobic_te ?? activity.aerobicTE,
        anaerobicTE: detail.anaerobic_te ?? activity.anaerobicTE,
        trainingFocus: detail.training_focus ?? activity.trainingFocus,
        performanceRating: detail.performance_rating ?? activity.performanceRating,
        maxHR: detail.max_hr_bpm ?? activity.maxHR,
        avgPace: detail.avg_pace_sec_per_km ?? activity.avgPace,
        detailFetched: true,
        rawDetail: raw,
      },
    });
  } catch (err) {
    logger.warn({ userId, activityId, err: err.message }, 'Failed to store activity detail');
    return activity;
  }
}

module.exports = { syncActivities, fetchActivityDetail, getSportNameFromType };
