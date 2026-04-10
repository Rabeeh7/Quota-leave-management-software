import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('quota_token');
    localStorage.removeItem('quota_user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('quota_token');
    const savedUser = localStorage.getItem('quota_user');

    if (!token || !savedUser) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const bootstrap = async () => {
      try {
        const res = await api.get('/auth/me');
        if (cancelled) return;
        setUser(res.data);
        localStorage.setItem('quota_user', JSON.stringify(res.data));
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    const { token, user: userData } = res.data;

    localStorage.setItem('quota_token', token);
    localStorage.setItem('quota_user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'superadmin',
    isLeader: user?.role === 'leader',
    isStudent: user?.role === 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
