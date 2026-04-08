import { useState, useEffect } from 'react';
import { PageLoader } from '../../components/common';
import api from '../../services/api';
import { formatDate, getBlockTypeConfig } from '../../utils/helpers';

const BlockedFridays = () => {
  const [fridays, setFridays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const semRes = await api.get('/leader/semester/active/current');
        const res = await api.get(`/leader/friday/list/${semRes.data.semester._id}`);
        setFridays(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleBlock = async (id) => {
    const reason = prompt('Block reason:');
    if (!reason) return;
    try {
      await api.put(`/leader/friday/${id}/block`, { block_reason: reason, block_type: 'hod_order' });
      window.location.reload();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleUnblock = async (id) => {
    const reason = prompt('Reason for unblocking:');
    if (!reason) return;
    try {
      await api.put(`/leader/friday/${id}/unblock`, { reason });
      window.location.reload();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <PageLoader />;

  const getStatusColor = (f) => {
    if (f.status === 'blocked') {
      const config = getBlockTypeConfig(f.block_type);
      return `${config.bg} ${config.color}`;
    }
    if (f.status === 'passed') return 'bg-neutral/10 text-neutral';
    if (f.status === 'published') return 'bg-success/10 text-success';
    return 'bg-success/10 text-success';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Semester Calendar</h1>
        <p className="text-text-secondary mt-1">View and manage blocked Fridays</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { color: 'bg-success', label: 'Open' },
          { color: 'bg-danger', label: 'Exam' },
          { color: 'bg-warning', label: 'Holiday' },
          { color: 'bg-neutral', label: 'Break/Passed' },
          { color: 'bg-blue-400', label: 'Tour' },
          { color: 'bg-purple-400', label: 'HOD Order' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${l.color}`} />
            <span className="text-xs text-text-secondary">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {fridays.map(f => {
          const config = f.block_type ? getBlockTypeConfig(f.block_type) : null;
          const isBlocked = f.status === 'blocked';
          const isPassed = f.status === 'passed';

          return (
            <div key={f._id}
              className={`rounded-xl border p-4 transition-all cursor-pointer hover:scale-[1.02] ${
                isBlocked
                  ? 'bg-elevated border-border-subtle opacity-80'
                  : isPassed
                    ? 'bg-elevated/50 border-border-subtle opacity-50'
                    : 'bg-elevated border-success/20 hover:border-success/40'
              }`}
              onClick={() => isBlocked ? handleUnblock(f._id) : !isPassed && handleBlock(f._id)}
            >
              <p className="text-white font-semibold text-sm">{formatDate(f.friday_date)}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {config && <span className="text-sm">{config.icon}</span>}
                <span className={`text-xs font-medium ${
                  isBlocked ? (config?.color || 'text-danger') :
                  isPassed ? 'text-neutral' : 'text-success'
                }`}>
                  {isBlocked ? (config?.label || 'Blocked') : isPassed ? 'Passed' : 'Open'}
                </span>
              </div>
              {f.block_reason && (
                <p className="text-text-muted text-xs mt-1 truncate">{f.block_reason}</p>
              )}
              {!isBlocked && !isPassed && (
                <p className="text-text-muted text-xs mt-1">{f.request_count || 0} requests</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BlockedFridays;
