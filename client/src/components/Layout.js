import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import styles from '../styles/Layout.module.css';

const AUTHED_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/coach', label: 'Coach' },
  { to: '/goals', label: 'Goals' },
  { to: '/health', label: 'Health' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
];

const PUBLIC_LINKS = [
  { to: '/demo', label: 'Demo' },
  { to: '/login', label: 'Login' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const links = user ? AUTHED_LINKS : PUBLIC_LINKS;

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink;

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <Link to={user ? '/dashboard' : '/'}>Arete</Link>
        </div>

        <button
          type="button"
          className={styles.menuToggle}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.menuIcon} aria-hidden="true">
            {menuOpen ? '✕' : '☰'}
          </span>
        </button>

        <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ''}`}>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}

          {user && (
            <div className={styles.navUser}>
              <span className={styles.userName}>{user.name}</span>
              <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
