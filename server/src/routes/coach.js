const express = require('express');

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { coachMessageSchema } = require('../schemas/coach');
const { handleCoachMessage } = require('../services/coachService');

const router = express.Router();
router.use(authenticate);

// Non-streaming message (fallback for clients that can't use WebSocket).
router.post('/message', validate(coachMessageSchema), async (req, res, next) => {
  try {
    const response = await handleCoachMessage(req.user.id, req.validated.message);
    return res.json({ response });
  } catch (err) {
    return next(err);
  }
});

router.post('/checkin', async (req, res, next) => {
  try {
    const response = await handleCoachMessage(
      req.user.id,
      'I want to do a life check-in.',
      'checkin'
    );
    return res.json({ response });
  } catch (err) {
    return next(err);
  }
});

router.get('/history/:userId', async (req, res, next) => {
  const { userId } = req.params;

  if (req.user.id !== userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
    });
  }

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return res.json({ messages });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
