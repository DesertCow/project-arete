import {
  formatDuration,
  formatDistance,
  formatPace,
  formatElevation,
  showsPace,
} from '../utils/activityFormatters.js';
import styles from '../styles/ActivityDetail.module.css';

// Only cells with a value are rendered — a grid of dashes tells the athlete
// nothing about a climb that has no pace or a run that has no power meter.
function buildMetrics(activity) {
  const pace = showsPace(activity.sportType) ? formatPace(activity.avgPace) : null;

  return [
    ['Duration', formatDuration(activity.duration)],
    ['Distance', formatDistance(activity.distance)],
    ['Avg Pace', pace],
    ['Avg Speed', activity.avgSpeed ? `${activity.avgSpeed.toFixed(1)} km/h` : null],
    ['Avg HR', activity.avgHR ? `${activity.avgHR} bpm` : null],
    ['Max HR', activity.maxHR ? `${activity.maxHR} bpm` : null],
    ['Calories', activity.calories ? `${activity.calories}` : null],
    ['Elevation ↑', formatElevation(activity.elevationGain)],
    ['Elevation ↓', formatElevation(activity.elevationLoss)],
    ['Training Load', activity.trainingLoad != null ? `${Math.round(activity.trainingLoad)}` : null],
    ['Aerobic TE', activity.aerobicTE != null ? activity.aerobicTE.toFixed(1) : null],
    ['Anaerobic TE', activity.anaerobicTE != null ? activity.anaerobicTE.toFixed(1) : null],
    ['Training Focus', activity.trainingFocus],
    ['Cadence', activity.avgCadence != null ? `${Math.round(activity.avgCadence)} spm` : null],
    ['Power', activity.avgPower != null ? `${Math.round(activity.avgPower)} W` : null],
    ['Performance', activity.performanceRating],
  ].filter(([, value]) => value != null && value !== '');
}

export default function ActivityDetail({ activity, loading, error }) {
  if (loading) {
    return (
      <div className={styles.detail} aria-busy="true">
        <div className="skeleton skeleton-text" style={{ width: '70%' }} />
        <div className="skeleton skeleton-text" style={{ width: '55%' }} />
      </div>
    );
  }

  const metrics = buildMetrics(activity);

  return (
    <div className={styles.detail}>
      {error && <p className={styles.error}>{error}</p>}
      {metrics.length === 0 ? (
        <p className={styles.empty}>No detailed metrics available for this activity.</p>
      ) : (
        <dl className={styles.grid}>
          {metrics.map(([label, value]) => (
            <div key={label} className={styles.cell}>
              <dt className={styles.label}>{label}</dt>
              <dd className={styles.value}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
