import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import DashboardChart from './DashboardChart.js';
import {
  CHART_COLORS,
  AXIS_STYLE,
  GRID_COLOR,
  TOOLTIP_STYLE,
  getSportColor,
  shortDate,
} from '../utils/chartColors.js';

function EmptyChart({ label }) {
  return <p className="chart-empty">{label}</p>;
}

export function WeeklyTrainingChart({ data }) {
  // Last 7 sessions keeps the axis readable.
  const recent = data.slice(-7);
  return (
    <DashboardChart title="Recent Training" subtitle="minutes per session">
      {recent.length === 0 ? (
        <EmptyChart label="No activities recorded." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={recent} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={shortDate}
              formatter={(value, name, entry) => {
                const p = entry.payload;
                const dist = p.distance ? ` · ${p.distance} km` : '';
                return [`${value} min${dist}`, p.sportName];
              }}
            />
            <Bar dataKey="duration" radius={[3, 3, 0, 0]}>
              {recent.map((d) => (
                <Cell key={`${d.date}-${d.sportName}`} fill={getSportColor(d.sportType)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </DashboardChart>
  );
}

export function TrainingLoadChart({ data }) {
  return (
    <DashboardChart title="Training Load" subtitle="30 days · short vs long term">
      {data.length === 0 ? (
        <EmptyChart label="No training load data." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: GRID_COLOR }} minTickGap={24} />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={shortDate}
              formatter={(value, name, entry) =>
                name === 'shortTermLoad'
                  ? [`${value} (ratio ${entry.payload.loadRatio} · ${entry.payload.comment})`, 'Short term']
                  : [value, 'Long term']
              }
            />
            <Legend wrapperStyle={{ fontSize: '0.78rem' }} formatter={(v) => (v === 'shortTermLoad' ? 'Short term' : 'Long term')} />
            <Line type="monotone" dataKey="shortTermLoad" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="longTermLoad" stroke={CHART_COLORS.secondary} strokeWidth={2} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </DashboardChart>
  );
}

export function LoadRatioChart({ data }) {
  // Zone bands come from the COROS load-ratio interpretation.
  return (
    <DashboardChart title="Load Ratio" subtitle="<0.8 detraining · 1.0–1.3 optimized · >1.3 overreaching">
      {data.length === 0 ? (
        <EmptyChart label="No load ratio data." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <ReferenceArea y1={0} y2={0.8} fill={CHART_COLORS.muted} fillOpacity={0.12} />
            <ReferenceArea y1={0.8} y2={1.0} fill={CHART_COLORS.secondary} fillOpacity={0.1} />
            <ReferenceArea y1={1.0} y2={1.3} fill={CHART_COLORS.success} fillOpacity={0.14} />
            <ReferenceArea y1={1.3} y2={2} fill={CHART_COLORS.danger} fillOpacity={0.14} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: GRID_COLOR }} minTickGap={24} />
            <YAxis domain={[0, 2]} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip {...TOOLTIP_STYLE} labelFormatter={shortDate} formatter={(value, name, entry) => [`${value} — ${entry.payload.comment}`, 'Load ratio']} />
            <Line type="monotone" dataKey="loadRatio" stroke={CHART_COLORS.tertiary} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </DashboardChart>
  );
}

export function HrvChart({ data }) {
  // Recharts stacks areas, so the band is drawn as min + (max - min).
  const withBand = data.map((d) => ({
    ...d,
    bandBase: d.normalRangeMin,
    bandSize: Math.max(d.normalRangeMax - d.normalRangeMin, 0),
  }));

  return (
    <DashboardChart title="HRV Trend" subtitle="7 days · shaded = normal range">
      {data.length === 0 ? (
        <EmptyChart label="No HRV data." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={withBand} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
            <YAxis domain={['dataMin - 6', 'dataMax + 6']} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={shortDate}
              formatter={(value, name, entry) =>
                name === 'avg' ? [`${value} ms — ${entry.payload.evaluation}`, 'HRV'] : null
              }
            />
            <Area type="monotone" dataKey="bandBase" stackId="band" stroke="none" fill="transparent" />
            <Area type="monotone" dataKey="bandSize" stackId="band" stroke="none" fill={CHART_COLORS.secondary} fillOpacity={0.14} />
            <ReferenceLine
              y={data[data.length - 1]?.baseline}
              stroke={CHART_COLORS.muted}
              strokeDasharray="4 3"
              label={{ value: 'baseline', position: 'insideTopRight', fill: '#666', fontSize: 10 }}
            />
            <Line type="monotone" dataKey="avg" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </DashboardChart>
  );
}

function sleepScoreColor(score) {
  if (score >= 80) return CHART_COLORS.success;
  if (score >= 60) return CHART_COLORS.tertiary;
  return CHART_COLORS.danger;
}

export function SleepChart({ data }) {
  return (
    <DashboardChart title="Sleep Quality" subtitle="7 days · score out of 100">
      {data.length === 0 ? (
        <EmptyChart label="No sleep data." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
            <YAxis domain={[0, 100]} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={shortDate}
              formatter={(value, name, entry) => {
                const p = entry.payload;
                const h = Math.floor(p.duration / 60);
                const m = p.duration % 60;
                return [`${value} · ${h}h ${m}m (deep ${p.deep}%, REM ${p.rem}%)`, 'Sleep score'];
              }}
            />
            <Bar dataKey="sleepScore" radius={[3, 3, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.date} fill={sleepScoreColor(d.sleepScore)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </DashboardChart>
  );
}

export function RestingHrChart({ data }) {
  return (
    <DashboardChart title="Resting Heart Rate" subtitle="7 days · bpm">
      {data.length === 0 ? (
        <EmptyChart label="No resting HR data." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
            <YAxis domain={['dataMin - 3', 'dataMax + 3']} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip {...TOOLTIP_STYLE} labelFormatter={shortDate} formatter={(value) => [`${value} bpm`, 'Resting HR']} />
            <Line type="monotone" dataKey="rhr" stroke={CHART_COLORS.danger} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </DashboardChart>
  );
}
