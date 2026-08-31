const express = require('express');
const jwt = require('jsonwebtoken');
const pino = require('pino');

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { getDashboardData, invalidateDashboard } = require('../services/dashboardService');
const { invalidateCoachingData } = require('../services/corosMcpClient');
const { encrypt } = require('../services/encryption');
const {
  registerClient,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  revokeToken,
  generatePKCE,
  generateState,
  getClientId,
} = require('../services/corosOAuth');

const logger = pino({ name: 'corosRoutes' });
const router = express.Router();

// The OAuth handshake spans two requests with a redirect between them, so the
// PKCE verifier is held in memory keyed by state. Short-lived by design; a
// restart just means the user retries.
const pendingOAuthFlows = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingOAuthFlows) {
    if (now - data.createdAt > OAUTH_STATE_TTL_MS) {
      pendingOAuthFlows.delete(state);
    }
  }
}, 60 * 1000);
sweeper.unref();

function callbackUrl() {
  if (process.env.COROS_CALLBACK_URL) return process.env.COROS_CALLBACK_URL;
  const base = process.env.SERVER_URL || 'http://localhost:3001';
  return `${base}/api/coros/callback`;
}

function frontendUrl(pathAndQuery) {
  const base = process.env.CLIENT_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${pathAndQuery}`;
}

// ---------------------------------------------------------------------------
// Dashboard (authenticated)
// ---------------------------------------------------------------------------
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const data = await getDashboardData(req.user.id, forceRefresh);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// Connection status (authenticated)
// ---------------------------------------------------------------------------
router.get('/status', authenticate, (req, res) => {
  return res.json({
    connected: !!req.user.corosAccessToken,
    corosOpenId: req.user.corosOpenId || null,
  });
});

// ---------------------------------------------------------------------------
// Start the OAuth flow (browser navigation, so the JWT arrives as ?token=)
// ---------------------------------------------------------------------------
router.get('/connect', async (req, res) => {
  // This is a top-level browser navigation, not an XHR, so no Authorization
  // header is available. The token is accepted from the query string instead.
  const header = req.headers.authorization;
  const token =
    header && header.startsWith('Bearer ') ? header.slice(7).trim() : req.query.token;

  if (!token) {
    return res.redirect(frontendUrl('/settings?coros=error&reason=auth'));
  }

  let userId;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      return res.redirect(frontendUrl('/settings?coros=error&reason=auth'));
    }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.redirect(frontendUrl('/settings?coros=error&reason=auth'));
    }
    if (user.role === 'DEMO') {
      return res.redirect(frontendUrl('/settings?coros=error&reason=demo'));
    }
    userId = user.id;
  } catch {
    return res.redirect(frontendUrl('/settings?coros=error&reason=auth'));
  }

  try {
    const redirectUri = callbackUrl();
    const clientId = await registerClient(redirectUri);
    const { verifier, challenge } = generatePKCE();
    const state = generateState();

    pendingOAuthFlows.set(state, { userId, codeVerifier: verifier, createdAt: Date.now() });

    const authUrl = buildAuthorizationUrl(clientId, redirectUri, state, challenge);
    logger.info({ userId }, 'Starting COROS OAuth flow');
    return res.redirect(authUrl);
  } catch (err) {
    logger.error({ err: err.message }, 'Could not start COROS OAuth flow');
    return res.redirect(frontendUrl('/settings?coros=error&reason=start'));
  }
});

// ---------------------------------------------------------------------------
// OAuth callback — no auth; the user is identified by the stored state.
// ---------------------------------------------------------------------------
router.get('/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    logger.warn({ oauthError }, 'COROS returned an OAuth error');
    return res.redirect(frontendUrl('/settings?coros=error&reason=denied'));
  }

  if (!code || !state) {
    return res.redirect(frontendUrl('/settings?coros=error&reason=invalid'));
  }

  const pending = pendingOAuthFlows.get(state);
  if (!pending) {
    logger.warn('COROS callback with unknown or expired state');
    return res.redirect(frontendUrl('/settings?coros=error&reason=expired'));
  }
  // Single use, whatever happens next.
  pendingOAuthFlows.delete(state);

  if (Date.now() - pending.createdAt > OAUTH_STATE_TTL_MS) {
    return res.redirect(frontendUrl('/settings?coros=error&reason=expired'));
  }

  try {
    const tokens = await exchangeCodeForTokens(
      code,
      callbackUrl(),
      getClientId(),
      pending.codeVerifier
    );

    await prisma.user.update({
      where: { id: pending.userId },
      data: {
        corosAccessToken: encrypt(tokens.accessToken),
        corosRefreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        corosOpenId: tokens.openId || null,
      },
    });

    logger.info({ userId: pending.userId }, 'COROS account connected');
    return res.redirect(frontendUrl('/settings?coros=connected'));
  } catch (err) {
    logger.error({ err: err.message, userId: pending.userId }, 'COROS token exchange failed');
    return res.redirect(frontendUrl('/settings?coros=error&reason=exchange'));
  }
});

// ---------------------------------------------------------------------------
// Disconnect (authenticated)
// ---------------------------------------------------------------------------
router.post('/disconnect', authenticate, async (req, res, next) => {
  try {
    const { decrypt } = require('../services/encryption');

    // Best-effort revoke; local disconnect proceeds regardless.
    if (req.user.corosAccessToken && getClientId()) {
      try {
        await revokeToken(decrypt(req.user.corosAccessToken), getClientId());
      } catch (err) {
        logger.warn({ err: err.message }, 'Revocation skipped');
      }
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { corosAccessToken: null, corosRefreshToken: null, corosOpenId: null },
    });

    // Drop cached watch data so the UI and coach immediately stop using it.
    invalidateDashboard(req.user.id);
    invalidateCoachingData(req.user.id);

    logger.info({ userId: req.user.id }, 'COROS account disconnected');
    return res.json({ disconnected: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
module.exports.pendingOAuthFlows = pendingOAuthFlows;
