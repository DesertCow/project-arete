import Markdown from 'react-markdown';
import StatCard from './StatCard.js';
import {
  WeeklyTrainingChart,
  TrainingLoadChart,
  LoadRatioChart,
  HrvChart,
  SleepChart,
  RestingHrChart,
} from './DashboardPanels.js';
import { CHART_COLORS } from '../utils/chartColors.js';
import styles from '../styles/Dashboard.module.css';

function recoveryColor(pct) {
  if (pct > 80) return CHART_COLORS.success;
  if (pct >= 50) return CHART_COLORS.tertiary;
  return CHART_COLORS.danger;
}

function stressColor(category) {
  const key = String(category).toLowerCase();
  if (key === 'relaxed') return CHART_COLORS.success;
  if (key === 'low') return CHART_COLORS.primary;
  if (key === 'medium') return CHART_COLORS.tertiary;
  if (key === 'high') return CHART_COLORS.danger;
  return CHART_COLORS.muted;
}

const GOALS_PREVIEW_LENGTH = 300;

export default function DashboardView({ data, goalsFooter = null }) {
  const rhrSeries = data.restingHR || [];
  const latestRhr = rhrSeries[rhrSeries.length - 1];
  const previousRhr = rhrSeries[rhrSeries.length - 2];
  const rhrDelta = latestRhr && previousRhr ? latestRhr.rhr - previousRhr.rhr : null;

  const stressSeries = data.stressLevel || [];
  const latestStress = stressSeries[stressSeries.length - 1];

  const goalsPreview = data.goals
    ? data.goals.slice(0, GOALS_PREVIEW_LENGTH) +
      (data.goals.length > GOALS_PREVIEW_LENGTH ? '…' : '')
    : null;

  // Every COROS series empty means the watch isn't connected yet — say so once
  // rather than showing six individually-empty charts.
  const hasCorosData =
    (data.weeklyTraining?.length || 0) +
      (data.trainingLoad?.length || 0) +
      (data.hrvTrend?.length || 0) +
      (data.sleepQuality?.length || 0) +
      (data.restingHR?.length || 0) >
    0;

  return (
    <>
      {!hasCorosData && (
        <p className={styles.connectNotice}>
          Connect your COROS watch to see your training data.
        </p>
      )}

      <div className={styles.statRow}>
        <StatCard
          title="Recovery"
          value={`${data.recovery.percentage}%`}
          subtitle={data.recovery.level}
          color={recoveryColor(data.recovery.percentage)}
          icon="🔋"
        />
        <StatCard
          title="Fitness"
          value={data.fitness.vo2max || '—'}
          subtitle={`VO₂max · Running level ${data.fitness.runningLevel} · LT ${data.fitness.thresholdPace}`}
          color={CHART_COLORS.secondary}
          icon="📈"
        />
        <StatCard
          title="Resting HR"
          value={latestRhr ? `${latestRhr.rhr}` : '—'}
          subtitle={latestRhr ? 'bpm' : 'No data'}
          color={CHART_COLORS.danger}
          icon="❤️"
          trend={
            rhrDelta === null || rhrDelta === 0
              ? null
              : rhrDelta > 0
                ? `▲ ${rhrDelta}`
                : `▼ ${Math.abs(rhrDelta)}`
          }
        />
        <StatCard
          title="Stress"
          value={latestStress ? latestStress.avg : '—'}
          subtitle={latestStress ? latestStress.category : 'No data'}
          color={stressColor(latestStress?.category)}
          icon="🧘"
        />
      </div>

      <div className={styles.fullRow}>
        <WeeklyTrainingChart data={data.weeklyTraining || []} />
      </div>

      <div className={styles.chartGrid}>
        <TrainingLoadChart data={data.trainingLoad || []} />
        <LoadRatioChart data={data.trainingLoad || []} />
        <HrvChart data={data.hrvTrend || []} />
        <SleepChart data={data.sleepQuality || []} />
      </div>

      <div className={styles.chartGrid}>
        <RestingHrChart data={data.restingHR || []} />

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Goals</h2>
            {goalsFooter}
          </header>
          {goalsPreview ? (
            <div className={`${styles.panelBody} markdown-content`}>
              <Markdown>{goalsPreview}</Markdown>
            </div>
          ) : (
            <p className={styles.empty}>No goals set yet.</p>
          )}
        </section>
      </div>

      <div className={styles.chartGrid}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Scheduled Workouts</h2>
          </header>
          {data.schedule?.length ? (
            <ul className={styles.list}>
              {data.schedule.map((w, i) => (
                <li key={`${w.date}-${w.name}-${i}`} className={styles.listItem}>
                  <div>
                    <span className={styles.itemTitle}>{w.name}</span>
                    <span className={styles.itemMeta}>
                      {w.distance ? `${w.distance} km · ` : ''}
                      {w.estimatedTime}
                    </span>
                  </div>
                  <span className={styles.itemDate}>{w.date}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>Nothing on the calendar.</p>
          )}
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Coach Workouts</h2>
          </header>
          {data.upcomingWorkouts?.length ? (
            <ul className={styles.list}>
              {data.upcomingWorkouts.map((w) => (
                <li key={w.id} className={styles.listItem}>
                  <div>
                    <span className={styles.itemTitle}>{w.title}</span>
                    <span className={styles.itemMeta}>{w.sportType}</span>
                  </div>
                  <span className={styles.itemDate}>
                    {w.scheduledFor ? String(w.scheduledFor).slice(0, 10) : w.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              No workouts scheduled. Chat with your coach to get started.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
