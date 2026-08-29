export const CHART_COLORS = {
  primary: '#2a7d6e',
  secondary: '#3b82a0',
  tertiary: '#c9a227',
  danger: '#c45555',
  success: '#4a9a6a',
  muted: '#666666',

  running: '#2a7d6e',
  trail_run: '#35957f',
  hiking: '#c9a227',
  climbing: '#c45555',
  cycling: '#3b82a0',
  swimming: '#5b9bd5',
  strength: '#8b5cf6',
  other: '#666666',
};

export const SPORT_COLOR_MAP = {
  100: CHART_COLORS.running,
  101: CHART_COLORS.running,
  102: CHART_COLORS.trail_run,
  104: CHART_COLORS.hiking,
  200: CHART_COLORS.cycling,
  300: CHART_COLORS.swimming,
  800: CHART_COLORS.climbing,
  801: CHART_COLORS.climbing,
  802: CHART_COLORS.climbing,
  900: CHART_COLORS.hiking,
  402: CHART_COLORS.strength,
};

export function getSportColor(sportType) {
  return SPORT_COLOR_MAP[sportType] || CHART_COLORS.other;
}

// Shared axis/grid/tooltip styling so every chart reads as one system.
export const AXIS_STYLE = { fontSize: 11, fill: '#a0a0a0' };
export const GRID_COLOR = '#222222';

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#161616',
    border: '1px solid #333333',
    borderRadius: '6px',
    fontSize: '0.82rem',
  },
  labelStyle: { color: '#e5e5e5', marginBottom: '0.25rem' },
  itemStyle: { color: '#a0a0a0' },
};

// "2026-08-25" -> "Aug 25" for compact axis ticks.
export function shortDate(iso) {
  if (!iso) return '';
  const [, month, day] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[Number(month) - 1] || ''} ${Number(day)}`;
}
