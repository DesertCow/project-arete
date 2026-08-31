const pino = require('pino');

const prisma = require('../lib/prisma');
const { encrypt, decrypt } = require('./encryption');
const { refreshAccessToken, getClientId } = require('./corosOAuth');

const logger = pino({ name: 'corosMcp' });

const MCP_URL = process.env.COROS_MCP_SERVER_URL || 'https://mcp.coros.com/mcp';

// MVP: one MCP client per call. This should be pooled in production — the
// connect/close handshake per tool call is the dominant cost here.
//
// COROS speaks Streamable HTTP, not SSE: a GET to /mcp with a valid token
// returns 405, because the endpoint only accepts POST. Streamable HTTP posts
// JSON-RPC and reads the response body, so it is the correct transport here.
async function withMcpClient(accessToken, fn) {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StreamableHTTPClientTransport } = await import(
    '@modelcontextprotocol/sdk/client/streamableHttp.js'
  );

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const client = new Client({ name: 'arete', version: '1.0.0' });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close().catch(() => {});
  }
}

function looksUnauthorized(err) {
  // StreamableHTTPError carries the status on `code`; the SDK's UnauthorizedError
  // and plain fetch failures only put it in the message.
  if (err?.code === 401 || err?.status === 401) return true;
  const message = String(err?.message || err);
  return /401|unauthorized|invalid_token|expired/i.test(message);
}

// Runs a batch of tool calls on one connection, refreshing the token once if
// COROS rejects it. On a second failure the tokens are cleared so the user is
// shown the disconnected state rather than stale data.
async function callMcpTools(user, calls) {
  if (!user?.corosAccessToken) return null;

  let accessToken;
  try {
    accessToken = decrypt(user.corosAccessToken);
  } catch (err) {
    logger.error({ userId: user.id }, 'Stored COROS token could not be decrypted');
    return null;
  }

  const run = (token) =>
    withMcpClient(token, async (client) => {
      const out = {};
      for (const [key, { name, args }] of Object.entries(calls)) {
        try {
          const result = await client.callTool({ name, arguments: args || {} });
          out[key] = parseToolResult(result);
        } catch (err) {
          // One failing tool must not lose the whole dashboard.
          logger.warn({ tool: name, err: err.message }, 'MCP tool call failed');
          out[key] = null;
        }
      }
      return out;
    });

  try {
    return await run(accessToken);
  } catch (err) {
    if (!looksUnauthorized(err) || !user.corosRefreshToken) {
      logger.warn({ err: err.message, userId: user.id }, 'MCP call failed');
      return null;
    }

    logger.info({ userId: user.id }, 'Access token rejected — refreshing');
    try {
      const refreshed = await refreshAccessToken(decrypt(user.corosRefreshToken), getClientId());
      await prisma.user.update({
        where: { id: user.id },
        data: {
          corosAccessToken: encrypt(refreshed.accessToken),
          corosRefreshToken: encrypt(refreshed.refreshToken),
        },
      });
      return await run(refreshed.accessToken);
    } catch (refreshErr) {
      logger.warn(
        { err: refreshErr.message, userId: user.id },
        'Refresh failed — clearing COROS connection'
      );
      await prisma.user
        .update({
          where: { id: user.id },
          data: { corosAccessToken: null, corosRefreshToken: null, corosOpenId: null },
        })
        .catch(() => {});
      return null;
    }
  }
}

// MCP returns { content: [{ type: 'text', text: '...' }] }. The COROS tools put
// a human-readable *report* in that text block — not JSON — and the text is
// itself JSON-encoded, so a naive JSON.parse yields a bare string that silently
// fails every downstream field lookup. Unwrap to the report text and hand back
// structured data only when a tool genuinely returns some.
function parseToolResult(result) {
  if (result?.structuredContent) return result.structuredContent;

  const block = result?.content?.find?.((c) => c.type === 'text');
  if (!block) return result ?? null;

  let value = block.text;
  try {
    const parsed = JSON.parse(value);
    // An object/array means real structured data; a string means the JSON
    // encoding was just wrapping the report text.
    if (parsed && typeof parsed === 'object') return parsed;
    if (typeof parsed === 'string') value = parsed;
  } catch {
    // Plain text already.
  }
  return typeof value === 'string' ? value.trim() : value;
}

module.exports = { callMcpTools, parseToolResult, MCP_URL };
