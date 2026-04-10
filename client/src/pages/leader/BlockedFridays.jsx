import { useState, useEffect } from 'react';
import { PageLoader } from '../../components/common';
import api from '../../services/api';
import { formatDate, getBlockTypeConfig } from '../../utils/helpers';

const BlockedFridays = () => {
  const [fridays, setFridays] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/superadmin/departments');
        setDepartments(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    if (!selectedDept) {
      setFridays([]);
      return;
    }
    const fetchFridays = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/superadmin/friday/list/${selectedDept}`);
        setFridays(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchFridays();
  }, [selectedDept]);

  const handleBlock = async (id) => {
    const reason = prompt('Block reason:');
    if (!reason) return;
    try {
      await api.put(`/superadmin/friday/${id}/block`, { block_reason: reason, block_type: 'hod_order' });
      // Update local state instead of reload
      setFridays(fridays.map(f => f._id === id ? { ...f, status: 'blocked', block_reason: reason, block_type: 'hod_order' } : f));
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleUnblock = async (id) => {
    const reason = prompt('Reason for unblocking:');
    if (!reason) return;
    try {
      await api.put(`/superadmin/friday/${id}/unblock`, { reason });
      setFridays(fridays.map(f => f._id === id ? { ...f, status: 'open', block_reason: null, block_type: null } : f));
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Blocked Dates</h1>
          <p className="text-text-secondary mt-1">View and manage blocked Fridays per department</p>
        </div>
        <select 
          className="input-field w-full sm:w-auto min-w-[200px]"
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          <option value="">Select Department</option>
          {departments.map(d => (
            <option key={d._id} value={d._id}>{d.name} ({d.institution})</option>
          ))}
        </select>
      </div>

      {!selectedDept && (
        <div className="text-center py-10">
          <p className="text-text-secondary">Please select a department to view the calendar.</p>
        </div>
      )}

      {selectedDept && (
        <>
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
      </>
      )}
    </div>
  );
};

export default BlockedFridays;
