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
    if (!confirm('Are you sure you want to release this spot? It will be made available for swapping.')) return;
    try {
      await api.put(`/student/allocation/${allocId}/release`);
      window.location.reload();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleAcceptSwap = async (allocId, requesterId) => {
    if (!confirm('Are you sure? This will lock in the swap and they will take your spot.')) return;
    try {
      await api.post(`/fairness/swap/accept`, { allocationId: allocId, requesterId });
      alert("Swap automatically approved!");
      window.location.reload();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <StudentLayout><PageLoader /></StudentLayout>;

  if (!data?.semester) {
    return (
      <StudentLayout>
        <div className="text-center py-20 animate-fade-in">
          <h2 className="font-heading text-xl text-white">No Active Semester</h2>
          <p className="text-text-secondary mt-2">Your department hasn't set up a semester yet.</p>
        </div>
      </StudentLayout>
    );
  }

  const daysLeft = data.nextFriday ? getDaysUntil(data.nextFriday.friday_date) : null;

  return (
    <StudentLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Greeting */}
        <div>
          <h1 className="font-heading text-xl text-white">Hey there!</h1>
          <p className="text-text-secondary text-sm">{data.semester.semester_name}</p>
        </div>

        {/* Progress Bar */}
        <div className="glass-card p-4">
          <div className="flex justify-between text-xs text-text-secondary mb-2">
            <span>Rotation Progress</span>
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
              <h2 className="font-heading text-xs uppercase tracking-widest text-white mb-2">My Next Quota Date</h2>
              <p className="text-4xl font-black text-accent">{formatDate(data.nextFriday?.friday_date)}</p>
              {daysLeft > 0 && (
                <p className="text-text-secondary text-sm mt-2">{daysLeft} days away</p>
              )}
            </div>
            
            {data.allocation?.status === 'allocated' && (
              <div className="flex gap-3 mt-5">
                <button onClick={() => handleConfirm(data.allocation._id)} className="btn-primary flex-1 py-3 text-lg font-semibold">
                  Accept Spot
                </button>
                <button onClick={() => handleRelease(data.allocation._id)} className="btn-danger flex-1 py-3 font-semibold">
                  Reject Spot
                </button>
              </div>
            )}

            {data.allocation?.status === 'confirmed' && (
              <div className="mt-5 text-center py-3 bg-success/10 rounded-xl border border-success/20">
                <p className="text-success font-semibold">Spot Confirmed</p>
              </div>
            )}

            {data.allocation?.status === 'spot_available' && (
              <div className="mt-6 border-t border-accent/20 pt-4">
                <p className="text-sm text-text-secondary mb-3">You rejected this spot. It is available for swaps.</p>
                {data.allocation.swap_requests && data.allocation.swap_requests.length > 0 ? (
                  <div className="space-y-3">
                    <p className="font-semibold text-white">Incoming Swap Requests:</p>
                    {data.allocation.swap_requests.map((reqUser) => (
                      <div key={reqUser._id} className="flex items-center justify-between bg-elevated border border-border/50 p-3 rounded-lg">
                        <div>
                          <p className="text-white text-sm font-medium">{reqUser.name}</p>
                          <p className="text-text-muted text-xs">{reqUser.roll_no}</p>
                        </div>
                        <div className="flex gap-2">
                          {reqUser.phone && (
                            <a href={`https://wa.me/${reqUser.phone}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs px-3">
                              WhatsApp
                            </a>
                          )}
                          <button onClick={() => handleAcceptSwap(data.allocation._id, reqUser._id)} className="bg-success text-white px-3 py-1 text-xs rounded-lg font-medium hover:bg-success/80">
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">No one has requested your spot yet.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-5">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-border-subtle pb-4">
                <div>
                  <p className="text-text-secondary text-sm">Quota Used</p>
                  <p className="text-3xl font-bold tabular-nums text-white">
                    {data.profile?.total_leaves ?? 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-text-secondary text-sm">Queue Position</p>
                  <p className="text-lg font-semibold text-white">
                    {data.prediction ? `#${data.prediction.position}` : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm pt-2">
                <span className="text-text-secondary">Class Average Quota</span>
                <span className="text-white font-medium">{data.classAverage}</span>
              </div>
            </div>
          </div>
        )}

        {/* Next Friday (if not allocated) */}
        {data.nextFriday && !data.isAllocated && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-text-secondary text-xs">Next Friday Rotation</p>
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
                    Request Leave
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Notifications */}
        {data.notifications?.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="font-heading text-white text-sm mb-3">System Updates</h3>
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
