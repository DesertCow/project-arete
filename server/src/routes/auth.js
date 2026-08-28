const express = require('express');
const bcrypt = require('bcrypt');

const prisma = require('../lib/prisma');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { createSession } = require('../services/tokenService');
const { registerSchema, loginSchema } = require('../schemas/auth');
const { initializeContextFiles } = require('../services/contextManager');

const router = express.Router();

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

// Login failures are deliberately indistinguishable: unknown email, wrong
// password, and demo account all produce this exact response.
const invalidCredentials = {
  error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
};

// Whitelist, not blacklist — new columns on User are not exposed by accident.
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  const { email, password, name } = req.validated;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        error: { code: 'EMAIL_EXISTS', message: 'An account with that email already exists' },
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: 'PRIVATE' },
    });

    await initializeContextFiles(user.id);

    const token = await createSession(user.id);

    return res.status(201).json({ user: publicUser(user), token });
  } catch (err) {
    // Unique constraint — two concurrent registrations for the same email.
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: { code: 'EMAIL_EXISTS', message: 'An account with that email already exists' },
      });
    }
    return next(err);
  }
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.validated;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json(invalidCredentials);
    }

    // Demo accounts hold a placeholder hash and never authenticate. Rejecting
    // here, with the same body as a bad password, keeps the account type hidden.
    if (user.role === 'DEMO') {
      return res.status(401).json(invalidCredentials);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json(invalidCredentials);
    }

    const token = await createSession(user.id);

    return res.json({ user: publicUser(user), token });
  } catch (err) {
    return next(err);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await prisma.session.delete({ where: { id: req.session.id } });
    return res.json({ message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', authenticate, (req, res) => {
  const { id, email, name, role, sportProfile, createdAt } = req.user;
  return res.json({ user: { id, email, name, role, sportProfile, createdAt } });
});

module.exports = router;
