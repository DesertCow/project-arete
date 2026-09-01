import ActivityDetail from './ActivityDetail.js';
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatElevation,
  formatActivityDate,
  getSportIcon,
  showsPace,
} from '../utils/activityFormatters.js';
import styles from '../styles/ActivityCard.module.css';

export default function ActivityCard({
  activity,
  expanded,
  detail,
  detailLoading,
  detailError,
  onViewDetail,
}) {
  // The summary row is built from whatever COROS gave us; empty metrics are
  // dropped rather than rendered as dashes.
  const metrics = [
    formatDuration(activity.duration),
    formatDistance(activity.distance),
    activity.avgHR ? `Avg HR ${activity.avgHR}` : null,
    activity.calories ? `${activity.calories} cal` : null,
  ].filter(Boolean);

  const secondary = [
    activity.elevationGain != null ? `Elevation ${formatElevation(activity.elevationGain)}` : null,
    activity.trainingLoad != null ? `Load ${Math.round(activity.trainingLoad)}` : null,
    showsPace(activity.sportType) && formatPace(activity.avgPace)
      ? `Pace ${formatPace(activity.avgPace)}`
      : null,
  ].filter(Boolean);

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={styles.icon} aria-hidden="true">
          {getSportIcon(activity.sportType)}
        </span>
        <div className={styles.heading}>
          <h2 className={styles.sport}>{activity.sportName}</h2>
          <span className={styles.date}>{formatActivityDate(activity.date)}</span>
        </div>
        {activity.locationName && <span className={styles.location}>{activity.locationName}</span>}
      </div>

      <p className={styles.metrics}>
        {metrics.map((metric, i) => (
          <span key={metric}>
            {i > 0 && <span className={styles.separator}>|</span>}
            {metric}
          </span>
        ))}
      </p>

      {secondary.length > 0 && (
        <p className={styles.secondary}>
          {secondary.map((metric, i) => (
            <span key={metric}>
              {i > 0 && <span className={styles.separator}>|</span>}
              {metric}
            </span>
          ))}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.detailButton}
          onClick={() => onViewDetail(activity.id)}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide Detail' : 'View Detail'}
        </button>
      </div>

      {expanded && (
        <ActivityDetail
          activity={detail || activity}
          loading={detailLoading}
          error={detailError}
        />
      )}
    </article>
  );
}
