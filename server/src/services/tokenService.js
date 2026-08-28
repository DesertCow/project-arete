const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

async function createSession(userId) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // `iat` has one-second resolution, so two sessions minted for the same user in
  // the same second would otherwise be byte-identical and collide with the
  // unique index on Session.token. jti makes every token distinct.
  const token = jwt.sign({ userId, jti: crypto.randomUUID() }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });

  await prisma.session.create({ data: { userId, token, expiresAt } });

  return token;
}

module.exports = { createSession };
