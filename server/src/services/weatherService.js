const https = require('https');
const pino = require('pino');

const logger = pino({ name: 'weatherService' });

// NWS requires a User-Agent identifying the app and a contact.
const USER_AGENT = 'Arete-Coach/1.0 (github.com/DesertCow/project-arete)';

// Grid lookups are stable for a coordinate, so they never expire.
// Forecasts refresh hourly.
const gridCache = new Map();
const forecastCache = new Map();
const FORECAST_TTL_MS = 60 * 60 * 1000;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' },
        timeout: 8000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(new Error(`NWS returned ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error('NWS returned invalid JSON'));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('NWS request timed out'));
    });
  });
}

async function getGridPoint(lat, lon) {
  // Four decimals keeps the cache key stable across equivalent inputs.
  const key = `${parseFloat(lat).toFixed(4)},${parseFloat(lon).toFixed(4)}`;

  if (gridCache.has(key)) {
    return gridCache.get(key);
  }

  const data = await fetchJson(`https://api.weather.gov/points/${key}`);
  const grid = {
    gridId: data.properties.gridId,
    gridX: data.properties.gridX,
    gridY: data.properties.gridY,
  };

  gridCache.set(key, grid);
  logger.info({ lat, lon, grid }, 'NWS grid point resolved');
  return grid;
}

async function getForecast(gridId, gridX, gridY) {
  const key = `${gridId}/${gridX},${gridY}`;
  const cached = forecastCache.get(key);

  if (cached && Date.now() - cached.fetchedAt < FORECAST_TTL_MS) {
    return cached.data;
  }

  const data = await fetchJson(
    `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast`
  );
  const periods = data.properties.periods;

  forecastCache.set(key, { data: periods, fetchedAt: Date.now() });
  logger.info({ gridId, gridX, gridY, periods: periods.length }, 'NWS forecast fetched');
  return periods;
}

// Six periods is three days of day/night pairs.
function formatForecastForPrompt(periods, locationName) {
  if (!periods || periods.length === 0) {
    return null;
  }

  const lines = periods.slice(0, 6).map((p) => {
    const precip = p.probabilityOfPrecipitation?.value;
    const precipStr = precip != null ? `, Precip ${precip}%` : '';
    return `${p.name}: ${p.temperature}°${p.temperatureUnit}, ${p.shortForecast}, Wind ${p.windSpeed} ${p.windDirection}${precipStr}`;
  });

  return `=== WEATHER (${locationName}) ===\n${lines.join('\n')}`;
}

// Never throws: weather is an enhancement, not a dependency of coaching.
async function getWeatherForPrompt(lat, lon, locationName) {
  try {
    const grid = await getGridPoint(lat, lon);
    const periods = await getForecast(grid.gridId, grid.gridX, grid.gridY);
    return formatForecastForPrompt(periods, locationName || `${lat}, ${lon}`);
  } catch (err) {
    logger.warn(
      { err: err.message, lat, lon },
      'Weather fetch failed — coaching continues without weather'
    );
    return null;
  }
}

module.exports = {
  getWeatherForPrompt,
  getGridPoint,
  getForecast,
  formatForecastForPrompt,
};
