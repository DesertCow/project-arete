const express = require('express');

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateProfileSchema } = require('../schemas/settings');

const router = express.Router();
router.use(authenticate);

// Merge, don't replace: setting a location must not wipe primarySport or
// secondarySports that the athlete already has.
router.patch('/profile', validate(updateProfileSchema), async (req, res, next) => {
  try {
    if (req.user.role === 'DEMO') {
      return res.status(403).json({
        error: { code: 'DEMO_READ_ONLY', message: 'Demo account settings are read-only.' },
      });
    }

    const existing = req.user.sportProfile || {};
    const sportProfile = { ...existing, ...req.validated };

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { sportProfile },
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sportProfile: user.sportProfile,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
