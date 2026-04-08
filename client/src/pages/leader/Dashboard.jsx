import { useState, useEffect } from 'react';
import { KPICard, Badge, PageLoader } from '../../components/common';
import api from '../../services/api';
import { formatDate, getDaysUntil } from '../../utils/helpers';

const LeaderDashboard = () => {
  const [data, setData] = useState(null);
  const [semester, setSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningEngine, setRunningEngine] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const semRes = await api.get('/leader/semester/active/current');
        setSemester(semRes.data.semester);
        const dashRes = await api.get(`/leader/dashboard/${semRes.data.semester._id}`);
        setData(dashRes.data);
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleRunEngine = async () => {
    if (!data?.currentFriday) return alert('No active Friday');
    setRunningEngine(true);
    try {
      const res = await api.post(`/leader/fairness/run/${data.currentFriday._id}`);
      alert(`Fairness engine complete! ${res.data.allocated?.length || 0} students allocated.`);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Engine error');
    } finally { setRunningEngine(false); }
  };

  if (loading) return <PageLoader />;

  if (!semester) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <span className="text-6xl mb-4">📅</span>
        <h2 className="font-heading text-2xl text-white mb-2">No Active Semester</h2>
        <p className="text-text-secondary mb-6">Set up a semester to start managing Friday leaves.</p>
        <a href="/leader/setup" className="btn-primary">Setup Semester</a>
      </div>
    );
  }

  const daysUntilFriday = data?.currentFriday ? getDaysUntil(data.currentFriday.friday_date) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Leader Dashboard</h1>
          <p className="text-text-secondary mt-1">{semester.semester_name}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon="🎓" label="Total Students" value={data?.totalStudents || 0} />
        <KPICard icon="📋" label="Friday Slots" value={data?.currentFriday?.total_slots || 0} />
        <KPICard icon="✋" label="Pending Requests" value={data?.pendingRequests || 0} color="text-warning" />
        <KPICard icon="⚠️" label="Fairness Risk" value={data?.riskCount || 0} color="text-danger" />
      </div>

      {/* Current Friday Card */}
      {data?.currentFriday && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-heading text-white text-lg">This Friday</h3>
              <p className="text-accent font-semibold">{formatDate(data.currentFriday.friday_date)}</p>
              {daysUntilFriday !== null && (
                <p className="text-text-secondary text-sm mt-1">
                  {daysUntilFriday > 0 ? `${daysUntilFriday} days away` : daysUntilFriday === 0 ? 'Today!' : 'Passed'}
                </p>
              )}
              <Badge type={data.currentFriday.status === 'open' ? 'success' : data.currentFriday.status === 'published' ? 'accent' : 'warning'}>
                {data.currentFriday.status}
              </Badge>
            </div>
            <button onClick={handleRunEngine} disabled={runningEngine} 
              className="btn-primary text-lg !px-8 !py-4 animate-pulse-glow">
              {runningEngine ? '⚙️ Running...' : '🎯 Run Fairness Engine'}
            </button>
          </div>
        </div>
      )}

      {/* Allocated Students */}
      {data?.allocations?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-heading text-white mb-4">
            Allocated Students ({data.allocations.length}/{data.currentFriday?.total_slots})
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.allocations.map((a, i) => (
              <div key={a._id} className="bg-elevated border border-border-subtle rounded-xl p-4 flex items-center gap-3 transition-all hover:border-accent/20">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{a.student_id?.name}</p>
                  <p className="text-text-muted text-xs">{a.student_id?.roll_no}</p>
                </div>
                <Badge type={a.confirmed ? 'success' : 'warning'} >
                  {a.confirmed ? 'Confirmed' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {data?.warnings?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-heading text-white mb-4">⚡ Smart Warnings</h3>
          <div className="space-y-2">
            {data.warnings.map((w, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${
                w.severity === 'danger' ? 'bg-danger/5 border-danger/10' :
                w.severity === 'warning' ? 'bg-warning/5 border-warning/10' :
                'bg-accent/5 border-accent/10'
              }`}>
                <span className="text-lg">{w.icon}</span>
                <p className="text-sm text-text-secondary flex-1">{w.message}</p>
                <span className="text-xs text-text-muted">{w.roll_no}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderDashboard;
