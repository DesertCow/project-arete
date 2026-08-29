import styles from '../styles/DashboardChart.module.css';

export default function DashboardChart({ title, subtitle, children, height = 240 }) {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </header>
      <div className={styles.body} style={{ height }}>
        {children}
      </div>
    </section>
  );
}
