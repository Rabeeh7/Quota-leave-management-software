import { useState, useEffect } from 'react';
import { Badge, PageLoader } from '../../components/common';
import StudentLayout from '../../components/layout/StudentLayout';
import api from '../../services/api';
import { formatDate } from '../../utils/helpers';

const History = () => {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/student/history?filter=${filter}`);
        setData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [filter]);

  if (loading) return <StudentLayout><PageLoader /></StudentLayout>;

  return (
    <StudentLayout>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="font-heading text-xl text-white">Leave History</h1>
          <p className="text-text-secondary text-sm">Your past leave requests and outcomes</p>
        </div>

        {/* Summary */}
        {data?.summary && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-elevated p-3 rounded-xl text-center">
              <p className="text-xl font-bold tabular-nums text-white">{data.summary.total}</p>
              <p className="text-text-muted text-[10px]">Total</p>
            </div>
            <div className="bg-elevated p-3 rounded-xl text-center">
              <p className="text-xl font-bold tabular-nums text-success">{data.summary.approved}</p>
              <p className="text-text-muted text-[10px]">Approved</p>
            </div>
            <div className="bg-elevated p-3 rounded-xl text-center">
              <p className="text-xl font-bold tabular-nums text-danger">{data.summary.denied}</p>
              <p className="text-text-muted text-[10px]">Denied</p>
            </div>
            <div className="bg-elevated p-3 rounded-xl text-center">
              <p className="text-xl font-bold tabular-nums text-warning">{data.summary.emergencies}</p>
              <p className="text-text-muted text-[10px]">Emergency</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex bg-elevated rounded-xl p-1">
          {['all', 'month', 'semester'].map(f => (
            <button key={f} onClick={() => { setLoading(true); setFilter(f); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-accent text-white' : 'text-text-secondary'
              }`}>{f === 'month' ? 'This Month' : f === 'semester' ? 'Semester' : 'All Time'}</button>
          ))}
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {data?.requests?.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl block mb-2">📜</span>
              <p className="text-text-muted">No leave history found</p>
            </div>
          ) : (
            data?.requests?.map(r => (
              <div key={r._id} className="glass-card p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                  r.status === 'approved' ? 'bg-success/10' :
                  r.status === 'denied' ? 'bg-danger/10' :
                  r.status === 'released' ? 'bg-neutral/10' :
                  'bg-warning/10'
                }`}>
                  {r.status === 'approved' ? '✅' : r.status === 'denied' ? '❌' : r.status === 'released' ? '🔓' : '⏳'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">
                    {formatDate(r.friday_id?.friday_date)}
                  </p>
                  {r.reason && <p className="text-text-muted text-xs truncate">{r.reason}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge type={
                    r.status === 'approved' ? 'success' :
                    r.status === 'denied' ? 'danger' :
                    r.status === 'released' ? 'neutral' : 'warning'
                  }>{r.status}</Badge>
                  <Badge type={r.request_type === 'emergency' ? 'danger' : r.request_type === 'swap' ? 'warning' : 'accent'}>
                    {r.request_type}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default History;
