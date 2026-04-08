import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, PageLoader } from '../../components/common';
import StudentLayout from '../../components/layout/StudentLayout';
import api from '../../services/api';
import { formatDate, getDaysUntil } from '../../utils/helpers';

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/student/dashboard');
        setData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleConfirm = async (allocId) => {
    try {
      await api.put(`/student/allocation/${allocId}/confirm`);
      window.location.reload();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleRelease = async (allocId) => {
    if (!confirm('Are you sure you want to release this slot?')) return;
    try {
      await api.put(`/student/allocation/${allocId}/release`);
      window.location.reload();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <StudentLayout><PageLoader /></StudentLayout>;

  if (!data?.semester) {
    return (
      <StudentLayout>
        <div className="text-center py-20">
          <span className="text-5xl block mb-4">📅</span>
          <h2 className="font-heading text-xl text-white">No Active Semester</h2>
          <p className="text-text-secondary mt-2">Your department hasn't set up a semester yet.</p>
        </div>
      </StudentLayout>
    );
  }

  const daysLeft = data.nextFriday ? getDaysUntil(data.nextFriday.friday_date) : null;
  const badgeColor = data.fairnessBadge === 'Behind' ? 'danger' : data.fairnessBadge === 'Ahead' ? 'success' : 'accent';

  return (
    <StudentLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Greeting */}
        <div>
          <h1 className="font-heading text-xl text-white">Hey there! 👋</h1>
          <p className="text-text-secondary text-sm">{data.semester.semester_name}</p>
        </div>

        {/* Progress Bar */}
        <div className="glass-card p-4">
          <div className="flex justify-between text-xs text-text-secondary mb-2">
            <span>Semester Progress</span>
            <span>{data.progress}%</span>
          </div>
          <div className="w-full h-2 bg-elevated rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-1000"
              style={{ width: `${data.progress}%` }} />
          </div>
        </div>

        {/* Hero Card */}
        {data.isAllocated ? (
          <div className="bg-gradient-to-br from-accent/20 to-accent-light/10 border border-accent/30 rounded-2xl p-5 animate-slide-up">
            <div className="text-center">
              <span className="text-4xl block mb-2">🎉</span>
              <h2 className="font-heading text-xl text-white mb-1">You got quota leave!</h2>
              <p className="text-accent font-semibold">{formatDate(data.nextFriday?.friday_date)}</p>
              {daysLeft > 0 && (
                <p className="text-text-secondary text-sm mt-1">{daysLeft} days away</p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              {!data.allocation?.confirmed ? (
                <>
                  <button onClick={() => handleConfirm(data.allocation._id)} className="btn-primary flex-1">
                    ✅ Confirm
                  </button>
                  <button onClick={() => handleRelease(data.allocation._id)} className="btn-danger flex-1">
                    ❌ Not Going
                  </button>
                </>
              ) : (
                <div className="w-full text-center py-3 bg-success/10 rounded-xl border border-success/20">
                  <p className="text-success font-semibold">✅ Confirmed</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">My Leaves</p>
                <p className="text-3xl font-bold tabular-nums text-white">
                  {data.profile?.total_leaves ?? 0}
                </p>
                <p className="text-text-muted text-xs mt-1">
                  Class average: {data.classAverage}
                </p>
              </div>
              <div className="text-right">
                <Badge type={badgeColor}>{data.fairnessBadge}</Badge>
                {data.prediction && (
                  <p className="text-text-secondary text-xs mt-2">
                    Queue: #{data.prediction.position}/{data.prediction.total_students}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Next Friday */}
        {data.nextFriday && !data.isAllocated && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-text-secondary text-xs">Next Friday</p>
                <p className="text-white font-semibold">{formatDate(data.nextFriday.friday_date)}</p>
              </div>
              <Badge type={data.nextFriday.status === 'open' ? 'success' : 'warning'}>
                {data.nextFriday.status}
              </Badge>
            </div>

            {data.prediction && (
              <div className={`p-3 rounded-xl border mb-3 ${
                data.prediction.confidence === 'high' ? 'bg-success/5 border-success/20' :
                data.prediction.confidence === 'medium' ? 'bg-warning/5 border-warning/20' :
                'bg-danger/5 border-danger/20'
              }`}>
                <p className="text-sm text-text-secondary">{data.prediction.explanation}</p>
              </div>
            )}

            <div className="flex gap-3">
              {data.myRequest ? (
                <div className="flex-1 text-center py-3 bg-accent/10 rounded-xl border border-accent/20">
                  <p className="text-accent text-sm font-medium">Request submitted: {data.myRequest.request_type}</p>
                </div>
              ) : (
                <>
                  <button onClick={() => navigate('/student/request')} className="btn-primary flex-1">
                    ✋ Request Leave
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Notifications */}
        {data.notifications?.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="font-heading text-white text-sm mb-3">Recent Notifications</h3>
            <div className="space-y-2">
              {data.notifications.map(n => (
                <div key={n._id} className={`p-3 rounded-xl text-sm ${n.read ? 'bg-elevated' : 'bg-accent/5 border border-accent/10'}`}>
                  <p className="text-text-secondary">{n.message}</p>
                  <p className="text-text-muted text-xs mt-1">{formatDate(n.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
