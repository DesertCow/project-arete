import { Link } from 'react-router-dom';
import styles from '../styles/Landing.module.css';

const FEATURES = [
  {
    title: 'Knows Your History',
    body: 'Every workout, sleep score, and recovery metric feeds into a coaching brain that actually remembers.',
  },
  {
    title: 'Plans Your Training',
    body: "Periodized plans that adapt to your goals, fitness, schedule, and how you're feeling today.",
  },
  {
    title: 'Grows With You',
    body: 'Five context files evolve over time, so your coach gets smarter the more you train.',
  },
];

const STEPS = [
  'Connect your COROS watch',
  'Set your goals',
  'Talk to your coach',
  'Train, recover, repeat',
];

export default function Landing() {
  return (
    <div className={styles.landing}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Your AI coach. Your data. Your potential.</h1>
        <p className={styles.heroSubline}>
          Arete connects to your COROS watch and builds a coaching relationship that evolves
          with every run, climb, and ride.
        </p>
        <div className={styles.heroActions}>
          <Link to="/demo" className={styles.primaryButton}>
            Try the Demo
          </Link>
          <Link to="/login" className={styles.secondaryButton}>
            Log In
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>What It Does</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureBody}>{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step} className={styles.step}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <span className={styles.stepLabel}>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.demoSection}>
        <h2 className={styles.sectionTitle}>See it in action</h2>
        <p className={styles.demoBody}>
          Four demo athletes with weeks of training history. Chat with their coach, explore
          their data, see how Arete adapts to different sports and goals.
        </p>
        <Link to="/demo" className={styles.primaryButton}>
          Meet the Athletes
        </Link>
      </section>

      <footer className={styles.footer}>
        <p>Built by Clayton Skaggs</p>
        <p>Powered by Claude AI + COROS MCP</p>
        <p>
          <a href="#" className={styles.footerLink}>
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
