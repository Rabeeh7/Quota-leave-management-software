import { useState, useEffect } from 'react';
import { KPICard, Badge, PageLoader } from '../../components/common';
import api from '../../services/api';
import { formatDate } from '../../utils/helpers';

const SuperAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [analyticsRes, requestsRes, deptsRes] = await Promise.all([
          api.get('/superadmin/analytics'),
          api.get('/superadmin/requests?status=pending'),
          api.get('/superadmin/departments'),
        ]);
        setData({ ...analyticsRes.data, departments: deptsRes.data });
        setRequests(requestsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.post(`/superadmin/departments/approve/${id}`);
      setRequests(prev => prev.filter(r => r._id !== id));
      setData(prev => ({ ...prev, pending_requests: prev.pending_requests - 1 }));
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/superadmin/departments/reject/${id}`);
      setRequests(prev => prev.filter(r => r._id !== id));
      setData(prev => ({ ...prev, pending_requests: prev.pending_requests - 1 }));
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Super Admin Dashboard</h1>
        <p className="text-text-secondary mt-1">Overview of all departments and requests</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon="🏛️" label="Total Departments" value={data?.total_departments || 0} />
        <KPICard icon="🎓" label="Total Students" value={data?.total_students || 0} />
        <KPICard icon="📅" label="Active Semesters" value={data?.active_semesters || 0} />
        <KPICard icon="📨" label="Pending Requests" value={data?.pending_requests || 0} color="text-warning" />
      </div>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-heading text-lg text-white mb-4">🔔 Pending Department Requests</h2>
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r._id} className="bg-elevated p-4 rounded-xl border border-border-subtle flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-white font-medium">{r.department_name}</p>
                  <p className="text-text-secondary text-sm">{r.institution} • {r.requester_name}</p>
                  <p className="text-text-muted text-xs mt-1">{r.requester_email} • Class size: {r.class_size || 'N/A'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(r._id)} className="btn-primary !px-4 !py-2 text-sm">Approve</button>
                  <button onClick={() => handleReject(r._id)} className="btn-danger !px-4 !py-2 text-sm">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Departments Table */}
      <div className="glass-card p-5">
        <h2 className="font-heading text-lg text-white mb-4">All Departments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-text-secondary font-medium pb-3 pr-4">Department</th>
                <th className="text-left text-text-secondary font-medium pb-3 pr-4">Institution</th>
                <th className="text-left text-text-secondary font-medium pb-3 pr-4">Students</th>
                <th className="text-left text-text-secondary font-medium pb-3 pr-4">Admin</th>
                <th className="text-left text-text-secondary font-medium pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {data?.departments?.map(dept => (
                <tr key={dept._id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-4">
                    <p className="text-white font-medium">{dept.name}</p>
                    <p className="text-text-muted text-xs">{dept.code}</p>
                  </td>
                  <td className="py-3 pr-4 text-text-secondary">{dept.institution}</td>
                  <td className="py-3 pr-4 text-white font-semibold tabular-nums">{dept.student_count}</td>
                  <td className="py-3 pr-4 text-text-secondary">{dept.leader?.name || '—'}</td>
                  <td className="py-3">
                    <Badge type={dept.status === 'active' ? 'success' : dept.status === 'suspended' ? 'danger' : 'warning'}>
                      {dept.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
