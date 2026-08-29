const express = require('express');

const prisma = require('../lib/prisma');
const { validate } = require('../middleware/validate');
const { demoMessageSchema } = require('../schemas/demo');
const { loadContextForPrompt } = require('../services/contextManager');
const { buildCoachSystemPrompt } = require('../services/coachPrompt');
const { getCoachResponse } = require('../services/ai');
const { getWeatherForPrompt } = require('../services/weatherService');
const { parseContextUpdate } = require('../services/coachService');
const { getDashboardData } = require('../services/dashboardService');

const router = express.Router();

// `|| default` would treat a configured 0 as unset, making the cooldown
// impossible to disable. Fall back only when the value is absent or unparseable.
function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const COOLDOWN_MS = envInt('DEMO_RATE_LIMIT_COOLDOWN_MS', 30000);
const MAX_MESSAGES = envInt('DEMO_RATE_LIMIT_MAX', 10);

// Per-IP, in-memory. Resets on restart, which is fine for a public demo.
const demoSessions = new Map();

function demoRateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const session = demoSessions.get(ip) || { count: 0, lastMessage: 0 };

  if (now - session.lastMessage < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - session.lastMessage)) / 1000);
    return res.status(429).json({
      error: {
        code: 'DEMO_COOLDOWN',
        message: `Please wait ${waitSec} seconds between demo messages.`,
        waitSeconds: waitSec,
      },
    });
  }

  if (session.count >= MAX_MESSAGES) {
    return res.status(429).json({
      error: {
        code: 'DEMO_LIMIT_REACHED',
        message: `Demo is limited to ${MAX_MESSAGES} messages. Create an account for unlimited coaching.`,
      },
    });
  }

  session.count += 1;
  session.lastMessage = now;
  demoSessions.set(ip, session);
  req.demoRemaining = Math.max(MAX_MESSAGES - session.count, 0);
  next();
}

async function findDemoUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'DEMO') return null;
  return user;
}

router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'DEMO' },
      select: { id: true, name: true, email: true, sportProfile: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});

router.get('/:userId', async (req, res, next) => {
  try {
    const user = await findDemoUser(req.params.userId);
    if (!user) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Demo athlete not found' } });
    }

    const contextFiles = await prisma.contextFile.findMany({
      where: { userId: user.id },
      select: { id: true, fileType: true, content: true, version: true },
    });

    // Match the canonical prompt ordering rather than DB order.
    const order = [
      'COACH_MEMORY',
      'GOALS',
      'TRAINING_PLAN',
      'TRAINING_HISTORY',
      'HEALTH_PROFILE',
    ];
    contextFiles.sort((a, b) => order.indexOf(a.fileType) - order.indexOf(b.fileType));

    return res.json({
      user: { id: user.id, name: user.name, sportProfile: user.sportProfile },
      contextFiles,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:userId/dashboard', async (req, res, next) => {
  try {
    const user = await findDemoUser(req.params.userId);
    if (!user) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Demo athlete not found' } });
    }
    const data = await getDashboardData(user.id);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

router.post(
  '/:userId/message',
  // Existence is checked before the limiter so a bad id cannot burn a message.
  async (req, res, next) => {
    try {
      const user = await findDemoUser(req.params.userId);
      if (!user) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Demo athlete not found' } });
      }
      req.demoUser = user;
      return next();
    } catch (err) {
      return next(err);
    }
  },
  demoRateLimiter,
  validate(demoMessageSchema),
  async (req, res, next) => {
    try {
      const { message, history } = req.validated;

      const context = await loadContextForPrompt(req.demoUser.id);

      // Best-effort: a weather failure must not fail the demo turn.
      const location = req.demoUser.sportProfile?.location;
      const weatherText =
        location?.lat && location?.lon
          ? await getWeatherForPrompt(location.lat, location.lon, location.city)
          : null;

      const systemPrompt = buildCoachSystemPrompt(context.formatted, 'conversation', weatherText);

      const messages = [...history, { role: 'user', content: message }];

      const raw = await getCoachResponse(systemPrompt, messages);

      // Demo context is frozen: strip the update block, never apply it.
      const { userFacingText } = parseContextUpdate(raw);

      return res.json({ response: userFacingText, remaining: req.demoRemaining });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
