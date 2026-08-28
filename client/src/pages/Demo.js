import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import styles from '../styles/Demo.module.css';

const ATHLETE_STORIES = {
  'Maria Chen': {
    sport: 'Marathon Runner',
    tagline: 'Night-shift nurse training for her first Portland Marathon.',
    details:
      'Balancing 12-hour shifts with a 16-week training plan. Currently in Build 2 phase, working toward her first 20-miler.',
    icon: '🏃‍♀️',
  },
  'James Hartley': {
    sport: 'Alpine Climber',
    tagline: 'Software engineer preparing for The Diamond on Longs Peak.',
    details:
      'Combining trad climbing with trail running to build approach fitness for a single-day car-to-car push in September.',
    icon: '🧗',
  },
  'Sofia Reyes': {
    sport: 'Triathlete',
    tagline: 'Project manager tackling her first Olympic-distance triathlon.',
    details:
      'Former college swimmer learning to ride and run. Building confidence on the bike while maintaining swim speed.',
    icon: '🏊‍♀️',
  },
  'Marcus Webb': {
    sport: 'Comeback Runner',
    tagline: 'High school coach rebuilding after an Achilles rupture.',
    details:
      'Six months post-surgery, running 3 days a week with strict load management. Every mile is earned.',
    icon: '💪',
  },
};

export default function Demo() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/demo/users')
      .then((res) => {
        if (!cancelled) setUsers(res.data.users);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the demo athletes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Meet the Athletes</h1>
        <p className={styles.subtitle}>
          Four demo athletes with weeks of training history. Chat with their coach and see how
          Arete adapts to different sports and goals.
        </p>
      </header>

      {loading && <p className={styles.status}>Loading athletes…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && (
        <div className={styles.grid}>
          {users.map((user) => {
            const story = ATHLETE_STORIES[user.name] || {};
            const firstName = user.name.split(' ')[0];
            return (
              <article key={user.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.icon} aria-hidden="true">
                    {story.icon || '🏅'}
                  </span>
                  <div>
                    <h2 className={styles.name}>{user.name}</h2>
                    <span className={styles.sportTag}>
                      {story.sport || user.sportProfile?.primarySport}
                    </span>
                  </div>
                </div>

                <p className={styles.tagline}>{story.tagline}</p>
                <p className={styles.details}>{story.details}</p>

                <ul className={styles.stats}>
                  <li>
                    <span className={styles.statLabel}>Primary</span>
                    <span className={styles.statValue}>
                      {user.sportProfile?.primarySport || '—'}
                    </span>
                  </li>
                  <li>
                    <span className={styles.statLabel}>Experience</span>
                    <span className={styles.statValue}>
                      {user.sportProfile?.experience || '—'}
                    </span>
                  </li>
                </ul>

                <Link to={`/demo/${user.id}`} className={styles.cta}>
                  Meet {firstName}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
