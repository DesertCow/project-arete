import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate any stored token before trusting it.
  useEffect(() => {
    const token = localStorage.getItem('arete_token');
    if (token) {
      api
        .get('/auth/me', { skipAuthRedirect: true })
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('arete_token');
          localStorage.removeItem('arete_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('arete_token', res.data.token);
    localStorage.setItem('arete_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('arete_token', res.data.token);
    localStorage.setItem('arete_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', null, { skipAuthRedirect: true });
    } catch {
      // Clear local state even if the server call fails.
    }
    localStorage.removeItem('arete_token');
    localStorage.removeItem('arete_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
