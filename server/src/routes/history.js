const express = require('express');

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { syncActivities, fetchActivityDetail } = require('../services/activitySyncService');

const router = express.Router();
router.use(authenticate);

// Only the fields the list view renders; rawSummary and rawDetail stay on the
// server, where they exist for re-parsing rather than display.
const LIST_FIELDS = {
  id: true,
  sportType: true,
  sportName: true,
  date: true,
  duration: true,
  distance: true,
  calories: true,
  avgHR: true,
  maxHR: true,
  avgPace: true,
  elevationGain: true,
  trainingLoad: true,
  locationName: true,
  detailFetched: true,
  startTimestamp: true,
};

// GET /api/history — the stored log, straight from the database. This never
// touches MCP; syncing is an explicit user action.
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const where = { userId: req.user.id };

    const sportType = parseInt(req.query.sportType, 10);
    if (Number.isFinite(sportType)) where.sportType = sportType;

    // Multiple codes for a category filter ("Running" covers 100–103).
    if (req.query.sportTypes) {
      const codes = String(req.query.sportTypes)
        .split(',')
        .map((c) => parseInt(c, 10))
        .filter(Number.isFinite);
      if (codes.length) where.sportType = { in: codes };
    }

    const start = req.query.startDate && new Date(req.query.startDate);
    const end = req.query.endDate && new Date(req.query.endDate);
    if (start && !Number.isNaN(start.getTime())) where.date = { ...where.date, gte: start };
    if (end && !Number.isNaN(end.getTime())) where.date = { ...where.date, lte: end };

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: [{ date: 'desc' }, { startTimestamp: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: LIST_FIELDS,
      }),
      prisma.activity.count({ where }),
    ]);

    // Freshness is about the whole log, so it ignores the active filters.
    const lastSync = await prisma.activity.findFirst({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return res.json({
      activities,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      lastSync: lastSync?.updatedAt || null,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/history/sync — pull from COROS. { fullSync: true } widens the
// window from 30 to 90 days.
router.post('/sync', async (req, res, next) => {
  try {
    const fullSync = req.body?.fullSync === true;
    const result = await syncActivities(req.user.id, { fullSync });

    if (result.error) {
      return res.status(400).json({ error: { code: 'SYNC_FAILED', message: result.error } });
    }

    return res.json({
      synced: result.synced,
      existing: result.existing,
      total: result.total,
      message:
        result.synced > 0
          ? `Synced ${result.synced} new ${result.synced === 1 ? 'activity' : 'activities'}`
          : 'All activities are up to date',
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/history/:activityId — one activity, with detail fetched from MCP on
// first access and cached in the row from then on.
router.get('/:activityId', async (req, res, next) => {
  try {
    let activity = await prisma.activity.findFirst({
      where: { id: req.params.activityId, userId: req.user.id },
    });

    if (!activity) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Activity not found' } });
    }

    if (!activity.detailFetched) {
      activity = (await fetchActivityDetail(req.user.id, activity.id)) || activity;
    }

    const { rawSummary, rawDetail, ...visible } = activity;
    return res.json({ activity: visible });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
