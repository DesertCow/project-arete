const path = require('path');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { apiLimiter } = require('./middleware/rateLimiter');
const authRouter = require('./routes/auth');
const contextRouter = require('./routes/context');
const coachRouter = require('./routes/coach');
const demoRouter = require('./routes/demo');
const settingsRouter = require('./routes/settings');
const corosRouter = require('./routes/coros');

const app = express();

// Railway terminates TLS at a proxy; without this req.ip is the proxy's address
// and every visitor shares one rate-limit bucket.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
// Browsers send an Origin per host, so localhost and the LAN address are
// distinct origins even though they reach the same dev server.
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header: curl, server-to-server, same-origin navigation.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Mounted ahead of the limiter so uptime probes are never throttled.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public demo: mounted ahead of apiLimiter because it enforces its own
// per-IP cooldown and session cap.
app.use('/api/demo', demoRouter);

app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/context', contextRouter);
app.use('/api/coach', coachRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/coros', corosRouter);

// In production the API server also serves the built client.
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  // SPA fallback: any non-API, non-WS path returns index.html so client-side
  // routes survive a hard refresh.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
      return next();
    }
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Scoped to /api so it cannot swallow client-side routes in production.
app.use('/api', (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found' } });
});

// Keeps unexpected failures inside the { error: { code, message } } contract.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
});

module.exports = app;
