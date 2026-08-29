import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle.js';
import styles from '../styles/NotFound.module.css';

export default function NotFound() {
  usePageTitle('Page Not Found');

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.body}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className={styles.actions}>
        <Link to="/" className={styles.primary}>
          Go Home
        </Link>
        <Link to="/demo" className={styles.secondary}>
          Try the Demo
        </Link>
      </div>
    </div>
  );
}
