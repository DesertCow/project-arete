require('dotenv').config();

const http = require('http');
const pino = require('pino');
const { WebSocketServer } = require('ws');

const { validateEnv } = require('./utils/validateEnv');

// Structured JSON in production so Railway can parse it; pretty locally.
const logger = pino(
  process.env.NODE_ENV === 'production'
    ? { name: 'server' }
    : { name: 'server', transport: { target: 'pino-pretty' } }
);

// Fail fast and loudly rather than 500ing on the first request that needs a
// missing secret. Runs before ./app so nothing else initialises first.
try {
  validateEnv({ logger });
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

const app = require('./app');
const { setupCoachWebSocket } = require('./routes/wsCoach');

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

// Only /ws/coach upgrades; every other upgrade attempt is dropped.
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/ws/coach') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

setupCoachWebSocket(wss);

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Arete server running');
});
