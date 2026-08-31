const crypto = require('crypto');
const https = require('https');
const pino = require('pino');

const logger = pino({ name: 'corosOAuth' });

// Confirmed against https://mcp.coros.com/.well-known/oauth-authorization-server
const COROS_AUTH = {
  registrationEndpoint: 'https://mcpus.coros.com/connect/register',
  authorizationEndpoint: 'https://mcpus.coros.com/oauth2/authorize',
  tokenEndpoint: 'https://mcpus.coros.com/oauth2/token',
  revocationEndpoint: 'https://mcpus.coros.com/oauth2/revoke',
  scopes: 'openid mcp.tools offline_access',
};

// Obtained via dynamic registration and held in memory. A restart simply
// re-registers on the next connect attempt.
let cachedClientId = null;

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function generateState() {
  return crypto.randomBytes(16).toString('base64url');
}

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = typeof body === 'string' ? body : JSON.stringify(body);
    const isForm = headers['Content-Type'] === 'application/x-www-form-urlencoded';

    const req = https.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': isForm ? 'application/x-www-form-urlencoded' : 'application/json',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...headers,
        },
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.write(postData);
    req.end();
  });
}

async function registerClient(callbackUrl) {
  if (cachedClientId) {
    return cachedClientId;
  }

  const result = await postJson(COROS_AUTH.registrationEndpoint, {
    client_name: 'Project Arete',
    redirect_uris: [callbackUrl],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: COROS_AUTH.scopes,
  });

  if (result.status >= 400 || !result.body?.client_id) {
    logger.error({ status: result.status, body: result.body }, 'COROS client registration failed');
    throw new Error(`COROS client registration failed: ${result.status}`);
  }

  cachedClientId = result.body.client_id;
  logger.info(
    { clientId: cachedClientId },
    'COROS client registered dynamically — cached in memory, re-registers on restart'
  );

  return cachedClientId;
}

function buildAuthorizationUrl(clientId, callbackUrl, state, codeChallenge) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: COROS_AUTH.scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${COROS_AUTH.authorizationEndpoint}?${params.toString()}`;
}

async function exchangeCodeForTokens(code, callbackUrl, clientId, codeVerifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: callbackUrl,
    client_id: clientId,
    code_verifier: codeVerifier,
  }).toString();

  const result = await postJson(COROS_AUTH.tokenEndpoint, body, {
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  if (result.status >= 400 || !result.body?.access_token) {
    // Never log the body here — it can carry tokens on partial success.
    logger.error({ status: result.status }, 'Token exchange failed');
    throw new Error(`Token exchange failed with status ${result.status}`);
  }

  return {
    accessToken: result.body.access_token,
    refreshToken: result.body.refresh_token,
    expiresIn: result.body.expires_in,
    tokenType: result.body.token_type,
    scope: result.body.scope,
    // COROS may return an openid subject we can store as the account id.
    openId: result.body.openId || result.body.open_id || result.body.sub || null,
    idToken: result.body.id_token || null,
  };
}

async function refreshAccessToken(refreshToken, clientId) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  }).toString();

  const result = await postJson(COROS_AUTH.tokenEndpoint, body, {
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  if (result.status >= 400 || !result.body?.access_token) {
    logger.error({ status: result.status }, 'Token refresh failed');
    throw new Error('Token refresh failed');
  }

  return {
    accessToken: result.body.access_token,
    // Not every server rotates the refresh token.
    refreshToken: result.body.refresh_token || refreshToken,
    expiresIn: result.body.expires_in,
  };
}

// COROS does not advertise "none" as a revocation auth method, so this may be
// rejected for a public client. Disconnect must not depend on it.
async function revokeToken(token, clientId) {
  try {
    const body = new URLSearchParams({ token, client_id: clientId }).toString();
    const result = await postJson(COROS_AUTH.revocationEndpoint, body, {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    logger.info({ status: result.status }, 'COROS token revocation attempted');
  } catch (err) {
    logger.warn({ err: err.message }, 'Token revocation failed (non-blocking)');
  }
}

function getClientId() {
  return cachedClientId;
}

// Test seam: lets the suite exercise the flow without hitting COROS.
function _setClientIdForTest(id) {
  cachedClientId = id;
}

module.exports = {
  registerClient,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  generatePKCE,
  generateState,
  getClientId,
  _setClientIdForTest,
  COROS_AUTH,
};
