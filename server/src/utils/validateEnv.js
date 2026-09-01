const REQUIRED = [
  { key: 'DATABASE_URL', hint: 'postgresql://user:pass@host:5432/arete' },
  { key: 'JWT_SECRET', hint: 'openssl rand -hex 32' },
  { key: 'ANTHROPIC_API_KEY', hint: 'Anthropic console API key' },
  { key: 'COROS_TOKEN_ENCRYPTION_KEY', hint: '64-char hex — openssl rand -hex 32' },
];

// Only meaningful once the app is publicly reachable.
const REQUIRED_IN_PRODUCTION = [
  { key: 'COROS_CALLBACK_URL', hint: 'https://<your-domain>/api/coros/callback' },
];

const OPTIONAL = [
  { key: 'PORT', fallback: '3001' },
  { key: 'NODE_ENV', fallback: 'development' },
  { key: 'AI_PROVIDER', fallback: 'claude' },
  { key: 'ANTHROPIC_MODEL', fallback: 'claude-sonnet-4-6' },
  { key: 'ALLOWED_EMAIL_DOMAIN', fallback: 'coros.com' },
  {
    key: 'CLIENT_URL',
    fallback: 'http://localhost:3000',
    productionWarning: 'CORS will reject browser requests from your real domain',
  },
];

function isSet(key) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim() !== '';
}

// Placeholders from .env.example are as broken as a missing value, and fail
// far less obviously.
function looksLikePlaceholder(value) {
  return /^<.*>$/.test(String(value).trim());
}

function validateEnv({ logger = console } = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = [];
  const warnings = [];

  const required = [...REQUIRED, ...(isProduction ? REQUIRED_IN_PRODUCTION : [])];

  for (const { key, hint } of required) {
    if (!isSet(key)) {
      missing.push(`${key} is not set (${hint})`);
    } else if (looksLikePlaceholder(process.env[key])) {
      missing.push(`${key} still holds the placeholder ${process.env[key]} (${hint})`);
    }
  }

  if (isSet('COROS_TOKEN_ENCRYPTION_KEY') && !/^[0-9a-fA-F]{64}$/.test(process.env.COROS_TOKEN_ENCRYPTION_KEY)) {
    missing.push('COROS_TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (openssl rand -hex 32)');
  }

  for (const { key, fallback, productionWarning } of OPTIONAL) {
    if (!isSet(key)) {
      const extra = isProduction && productionWarning ? ` — ${productionWarning}` : '';
      warnings.push(`${key} not set, defaulting to "${fallback}"${extra}`);
    }
  }

  if (isProduction && !isSet('CLIENT_URL') && !isSet('RAILWAY_PUBLIC_DOMAIN')) {
    warnings.push('Neither CLIENT_URL nor RAILWAY_PUBLIC_DOMAIN is set — CORS allows localhost only');
  }

  for (const warning of warnings) {
    logger.warn ? logger.warn(warning) : logger.log(`WARN ${warning}`);
  }

  if (missing.length > 0) {
    const detail = missing.map((m) => `  - ${m}`).join('\n');
    throw new Error(`Missing or invalid environment configuration:\n${detail}`);
  }

  return { warnings };
}

module.exports = { validateEnv, REQUIRED, REQUIRED_IN_PRODUCTION, OPTIONAL };
