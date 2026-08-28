require('dotenv').config();

const pino = require('pino');
const app = require('./app');

const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty' } }
);

const port = process.env.PORT || 3001;

app.listen(port, () => {
  logger.info(`Arete server listening on port ${port}`);
});
