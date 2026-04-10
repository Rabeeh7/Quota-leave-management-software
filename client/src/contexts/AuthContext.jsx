import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('quota_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(() => !!localStorage.getItem('quota_token'));

  const logout = useCallback(() => {
    localStorage.removeItem('quota_token');
    localStorage.removeItem('quota_user');
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('quota_token');

    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          localStorage.setItem('quota_user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    }
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
