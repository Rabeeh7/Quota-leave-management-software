import { useState, useEffect, useCallback } from 'react';
import { Badge, PageLoader, EmptyState } from '../../components/common';
import api from '../../services/api';
import { formatDate } from '../../utils/helpers';

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchRequests = useCallback(async () => {
    try {
      const url = filter === 'all' ? '/superadmin/requests' : `/superadmin/requests?status=${filter}`;
      const res = await api.get(url);
      setRequests(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id) => {
    try {
      await api.post(`/superadmin/departments/approve/${id}`);
      fetchRequests();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleReject = async (id) => {
    if (!confirm('Reject this request?')) return;
    try {
      await api.post(`/superadmin/departments/reject/${id}`);
      fetchRequests();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Department Requests</h1>
          <p className="text-text-secondary mt-1">Manage incoming department applications</p>
        </div>
        <div className="flex bg-elevated rounded-xl p-1 gap-1">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                filter === f ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {requests.length === 0 ? (
        <EmptyState icon="📭" title="No requests found" message="Department applications will appear here." />
      ) : (
        <div className="grid gap-4">
          {requests.map(r => (
            <div key={r._id} className="glass-card-hover p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-heading text-lg text-white">{r.department_name}</h3>
                    <Badge type={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-text-secondary mb-1">🏛️ {r.institution}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-text-muted mt-2">
                    <p>👤 {r.requester_name}</p>
                    <p>📧 {r.requester_email}</p>
                    <p>📱 {r.requester_phone || '—'}</p>
                    <p>👥 Class size: {r.class_size || 'N/A'}</p>
                  </div>
                  {r.message && <p className="text-text-secondary text-sm mt-2 italic">"{r.message}"</p>}
                  <p className="text-text-muted text-xs mt-2">Submitted: {formatDate(r.created_at)}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 sm:flex-col">
                    <button onClick={() => handleApprove(r._id)} className="btn-primary !px-5 !py-2 text-sm">Approve</button>
                    <button onClick={() => handleReject(r._id)} className="btn-danger !px-5 !py-2 text-sm">Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Requests;
