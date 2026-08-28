const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { apiLimiter } = require('./middleware/rateLimiter');
const authRouter = require('./routes/auth');
const contextRouter = require('./routes/context');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '1mb' }));

// Mounted ahead of the limiter so uptime probes are never throttled.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/context', contextRouter);

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Keeps unexpected failures inside the { error: { code, message } } contract.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  req.log?.error?.(err);
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
});

module.exports = app;
