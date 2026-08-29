import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { readApiError } from '../utils/apiError.js';
import styles from '../styles/Login.module.css';
import usePageTitle from '../hooks/usePageTitle.js';

export default function Login() {
  usePageTitle('Log In');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      // Surface the domain restriction as its own explanatory message rather
      // than a bare permission error.
      if (err.response?.data?.error?.code === 'REGISTRATION_RESTRICTED') {
        setError(
          `${err.response.data.error.message} If you have a COROS email address, use it to sign up.`
        );
      } else {
        setError(readApiError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsRegister((value) => !value);
    setError('');
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>{isRegister ? 'Create your account' : 'Welcome back'}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          {isRegister && (
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Register' : 'Log In'}
          </button>
        </form>

        <p className={styles.toggle}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button type="button" className={styles.toggleButton} onClick={toggleMode}>
            {isRegister ? 'Log in' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}
