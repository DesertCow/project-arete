import styles from '../styles/StatCard.module.css';

export default function StatCard({ title, value, subtitle, color, icon, trend }) {
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className={styles.valueRow}>
        <span className={styles.value} style={color ? { color } : undefined}>
          {value}
        </span>
        {trend && <span className={styles.trend}>{trend}</span>}
      </div>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </div>
  );
}
