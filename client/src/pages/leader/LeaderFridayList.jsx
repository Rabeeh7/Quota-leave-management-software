import { useState, useEffect } from 'react';
import { Badge, PageLoader } from '../../components/common';
import api from '../../services/api';
import { formatDate } from '../../utils/helpers';

const LeaderFridayList = () => {
  const [loading, setLoading] = useState(true);
  const [fridays, setFridays] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const semRes = await api.get('/leader/semester/active/current');
        const semester = semRes.data?.semester;
        if (!semester?._id) {
          setMessage('No active semester. Set one up first.');
          return;
        }
        const res = await api.get(`/leader/friday/list/${semester._id}`);
        setFridays(res.data || []);
      } catch (err) {
        console.error(err);
        setMessage('Could not load Friday list.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Friday List</h1>
        <p className="text-text-secondary mt-1">All Fridays for the active semester</p>
      </div>

      {message && (
        <div className="glass-card p-5 text-text-secondary text-center">{message}</div>
      )}

      {!message && fridays.length === 0 && (
        <div className="glass-card p-5 text-text-secondary text-center">No Friday records yet.</div>
      )}

      <div className="space-y-2">
        {fridays.map((f) => (
          <div key={f._id} className="glass-card p-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-white font-medium">{formatDate(f.friday_date)}</p>
              <p className="text-text-muted text-xs mt-1">
                Allocations: {f.allocation_count ?? 0} · Pending requests: {f.request_count ?? 0}
              </p>
            </div>
            <Badge type={f.status === 'open' ? 'success' : f.status === 'published' ? 'accent' : 'warning'}>
              {f.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderFridayList;
