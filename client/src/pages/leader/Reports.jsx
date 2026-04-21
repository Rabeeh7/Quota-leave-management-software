import { useState, useEffect } from 'react';
import { PageLoader, Badge } from '../../components/common';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../../services/api';

const COLORS = ['#E84D1A', '#16A34A', '#D97706', '#2563EB'];

const Reports = () => {
  const [report, setReport] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const semRes = await api.get('/leader/semester/active/current');
        if (semRes.data.semester) {
          const res = await api.get(`/rotation/report/${semRes.data.semester._id}`);
          setReport(res.data);
        }
        const logsRes = await api.get('/leader/audit-log');
        setLogs(logsRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <PageLoader />;
  if (!report) return <div className="text-text-muted text-center py-20">No report data available</div>;

  const chartData = report.students?.map(s => ({
    name: s.roll_no || s.name?.substring(0, 8),
    leaves: s.total_leaves,
    average: report.average
  })) || [];

  const behindStudents = report.students?.filter(s => s.risk_level === 'behind') || [];
  const emergencyStudents = report.students?.filter(s => s.emergency_count >= 2) || [];

  const riskData = [
    { name: 'Behind', value: report.students?.filter(s => s.risk_level === 'behind').length || 0 },
    { name: 'Equal', value: report.students?.filter(s => s.risk_level === 'equal').length || 0 },
    { name: 'Ahead', value: report.students?.filter(s => s.risk_level === 'ahead').length || 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Rotation Reports</h1>
        <p className="text-text-secondary mt-1">Class average: {report.average} leaves per student</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Leave Count Chart */}
        <div className="glass-card p-5">
          <h3 className="font-heading text-white mb-4">Leave Count per Student</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={60} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Bar dataKey="leaves" fill="#E84D1A" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="glass-card p-5">
          <h3 className="font-heading text-white mb-4">Rotation Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={90} innerRadius={50} paddingAngle={3} label={(e) => `${e.name}: ${e.value}`}>
                  <Cell fill="#DC2626" />
                  <Cell fill="#16A34A" />
                  <Cell fill="#2563EB" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Students Below Average */}
      {behindStudents.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-heading text-white mb-4">⚠️ Students Below Average</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {behindStudents.map(s => (
              <div key={s.student_id} className="bg-danger/5 border border-danger/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{s.name}</p>
                    <p className="text-text-muted text-xs">{s.roll_no}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-danger font-bold tabular-nums">{s.vs_average}</p>
                    <p className="text-text-muted text-xs">vs avg</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Abusers */}
      {emergencyStudents.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-heading text-white mb-4">🚨 Repeated Emergency Usage</h3>
          <div className="space-y-2">
            {emergencyStudents.map(s => (
              <div key={s.student_id} className="bg-warning/5 border border-warning/10 rounded-xl p-3 flex items-center justify-between">
                <span className="text-white text-sm">{s.name} ({s.roll_no})</span>
                <Badge type="danger">{s.emergency_count} emergencies</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* System-wide Audit Logging */}
      {logs.length > 0 && (
        <div className="glass-card overflow-x-auto mt-6">
          <h3 className="font-heading text-white p-5 border-b border-border-subtle">Audit Logs</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-elevated/30">
                <th className="text-left text-text-secondary font-medium p-4">Date</th>
                <th className="text-left text-text-secondary font-medium p-4">Action</th>
                <th className="text-left text-text-secondary font-medium p-4">Target Student</th>
                <th className="text-left text-text-secondary font-medium p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {logs.map(log => (
                <tr key={log._id} className="hover:bg-white/[0.02]">
                  <td className="p-4 text-text-muted">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-4 text-white font-medium">{log.action}</td>
                  <td className="p-4 text-text-secondary">{log.target_student?.name || '—'}</td>
                  <td className="p-4 text-text-secondary text-xs">{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Reports;
