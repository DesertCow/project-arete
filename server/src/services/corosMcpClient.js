const pino = require('pino');

const prisma = require('../lib/prisma');
const { callMcpTools } = require('./corosMcp');

const logger = pino({ name: 'corosMcpClient' });

// Coaching needs current state, not the dashboard's full history, so this is a
// narrower and shallower set of calls.
const COACHING_TOOL_CALLS = {
  recovery: { name: 'queryRecoveryStatus' },
  sleep: { name: 'querySleepData', args: { days: 1 } },
  hrv: { name: 'querySleepHrv', args: { days: 1 } },
  dailyHealth: { name: 'queryDailyHealthData', args: { days: 3 } },
  recentActivities: { name: 'querySportRecords', args: { days: 7 } },
  trainingLoad: { name: 'queryTrainingLoadAssessment', args: { days: 7 } },
  fitness: { name: 'queryFitnessAssessmentOverview' },
};

const coachingDataCache = new Map();
const COACHING_DATA_TTL_MS = 15 * 60 * 1000;

// Returns null when the athlete has no COROS connection, or when the whole
// batch fails. Individual tool failures come back as null values inside the
// object — callMcpTools isolates them.
async function fetchCoachingData(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.corosAccessToken) return null;
  if (user.role === 'DEMO') return null;

  const results = await callMcpTools(user, COACHING_TOOL_CALLS);
  if (!results) return null;

  const keys = Object.keys(COACHING_TOOL_CALLS);
  logger.info(
    {
      userId,
      fetched: keys.filter((k) => results[k] != null).length,
      failed: keys.filter((k) => results[k] == null).length,
    },
    'MCP coaching data fetched'
  );

  return results;
}

async function fetchCoachingDataCached(userId) {
  const cached = coachingDataCache.get(userId);
  if (cached && Date.now() - cached.fetchedAt < COACHING_DATA_TTL_MS) {
    logger.info({ userId }, 'MCP coaching data cache hit');
    return cached.data;
  }

  const data = await fetchCoachingData(userId);
  if (data) {
    coachingDataCache.set(userId, { data, fetchedAt: Date.now() });
  }
  return data;
}

// Called on disconnect so a reconnected account never sees the old athlete's
// numbers.
function invalidateCoachingData(userId) {
  coachingDataCache.delete(userId);
}

module.exports = {
  fetchCoachingData,
  fetchCoachingDataCached,
  invalidateCoachingData,
  COACHING_TOOL_CALLS,
  COACHING_DATA_TTL_MS,
};
