const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: { code: 'NO_TOKEN', message: 'Authentication required' } });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res
      .status(401)
      .json({ error: { code: 'NO_TOKEN', message: 'Authentication required' } });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' },
    });
  }

  try {
    // The session row is the revocation list: logout deletes it, which kills the
    // token even though the JWT itself is still within its 24h validity window.
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired or been revoked',
        },
      });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res
        .status(401)
        .json({ error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' } });
    }

    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
