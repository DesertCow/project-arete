// Cache lifetime in seconds, per COROS MCP tool.
const CACHE_TTL = {
  queryUserInfo: 86400,
  queryDevices: 86400,
  queryFitnessAssessmentOverview: 86400,
  queryRecoveryStatus: 900,
  querySleepData: 3600,
  querySleepHrv: 3600,
  queryRestingHeartRate: 3600,
  queryDailyHealthData: 900,
  queryStressLevel: 900,
  queryTrainingLoadAssessment: 3600,
  querySportRecords: 300,
  queryTrainingSchedule: 3600,
};

module.exports = { CACHE_TTL };
