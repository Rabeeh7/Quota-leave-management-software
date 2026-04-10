import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useFetch = (url) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(url);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!url) return;
    void fetchData();
  }, [url, fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/student/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.read).length);
    } catch {
      console.error('Failed to fetch notifications');
    }
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/student/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      console.error('Failed to mark notifications as read');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await api.get('/student/notifications');
        if (cancelled) return;
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => !n.read).length);
      } catch {
        if (!cancelled) console.error('Failed to fetch notifications');
      }
    };

    void load();
    const interval = setInterval(() => { void load(); }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { notifications, unreadCount, markAllRead, refetch: fetchNotifications };
};
