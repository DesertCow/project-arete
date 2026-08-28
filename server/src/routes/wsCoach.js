const jwt = require('jsonwebtoken');
const pino = require('pino');

const prisma = require('../lib/prisma');
const { handleCoachMessageStream } = require('../services/coachService');

const logger = pino({ name: 'wsCoach' });

function setupCoachWebSocket(wss) {
  wss.on('connection', async (ws, req) => {
    // Authentication below is async, but a client typically sends its first
    // message the instant the socket opens. Attach the listener synchronously
    // and queue anything that arrives before auth finishes, or that message is
    // silently dropped and the client waits forever.
    const pending = [];
    let handleIncoming = (data) => pending.push(data);
    ws.on('message', (data) => handleIncoming(data));

    // Browsers cannot set headers on a WebSocket handshake, so the token
    // arrives as a query parameter.
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      ws.close(4001, 'Invalid token');
      return;
    }

    let user;
    try {
      const session = await prisma.session.findUnique({ where: { token } });
      if (!session || session.expiresAt < new Date()) {
        ws.close(4001, 'Session expired');
        return;
      }

      user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        ws.close(4001, 'User not found');
        return;
      }
    } catch (err) {
      logger.error({ err }, 'WebSocket auth lookup failed');
      ws.close(4001, 'Authentication failed');
      return;
    }

    logger.info({ userId: user.id }, 'WebSocket coach session opened');

    let isProcessing = false;

    const onMessage = async (data) => {
      if (isProcessing) {
        ws.send(
          JSON.stringify({
            type: 'error',
            error: { code: 'BUSY', message: 'Still processing your previous message' },
          })
        );
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        ws.send(
          JSON.stringify({
            type: 'error',
            error: { code: 'INVALID_JSON', message: 'Message must be valid JSON' },
          })
        );
        return;
      }

      const { message, mode } = parsed;
      if (!message || typeof message !== 'string' || message.length === 0) {
        ws.send(
          JSON.stringify({
            type: 'error',
            error: { code: 'INVALID_MESSAGE', message: 'Message is required' },
          })
        );
        return;
      }

      isProcessing = true;
      ws.send(JSON.stringify({ type: 'start' }));

      try {
        await handleCoachMessageStream(
          user.id,
          message.slice(0, 10000),
          mode || 'conversation',
          (chunk) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ type: 'chunk', text: chunk }));
            }
          }
        );

        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'done' }));
        }
      } catch (err) {
        logger.error({ err, userId: user.id }, 'Coach stream error');
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'error',
              error: { code: 'COACH_ERROR', message: 'Failed to get coach response' },
            })
          );
        }
      } finally {
        isProcessing = false;
      }
    };

    // Auth is done: take over from the queue and drain what arrived early.
    handleIncoming = onMessage;
    for (const queued of pending.splice(0)) {
      await onMessage(queued);
    }

    ws.on('close', () => {
      logger.info({ userId: user.id }, 'WebSocket coach session closed');
    });
  });
}

module.exports = { setupCoachWebSocket };
