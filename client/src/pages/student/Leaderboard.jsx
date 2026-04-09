import { useState, useEffect } from 'react';
import { PageLoader } from '../../components/common';
import StudentLayout from '../../components/layout/StudentLayout';
import api from '../../services/api';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const Leaderboard = () => {
  const [data, setData] = useState({ friday: null, students: [] });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/student/leaderboard');
        setData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleRequestSwap = async (allocationId) => {
    if (!confirm('Request to swap with this student? They will use your WhatsApp number if they accept.')) return;
    try {
      await api.post(`/fairness/swap/request`, { allocationId });
      alert('Swap requested successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error requesting swap');
    }
  };

  if (loading) return <StudentLayout><PageLoader /></StudentLayout>;

  return (
    <StudentLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Class Leaderboard</h1>
          {data.friday && (
            <p className="text-text-secondary mt-1">Upcoming Rotation: {formatDate(data.friday.date)}</p>
          )}
        </div>

        {!data.friday && (
          <div className="glass-card p-6 text-center">
            <p className="text-text-secondary">No rotation scheduled yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {data.students.map((student, i) => {
            const isMe = student._id === user?._id;
            
            let cardClasses = "glass-card p-4 transition-all ";
            if (isMe) cardClasses += "border-2 border-accent ";
            
            let badgeComponent = null;
            if (student.status === 'allocated') {
              cardClasses += "bg-success/5 ";
              badgeComponent = <span className="bg-success text-white px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded">Allocated</span>;
            } else if (student.status === 'available') {
              cardClasses += "bg-warning/10 ";
              badgeComponent = <span className="bg-warning text-white px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded">Spot Available</span>;
            } else {
              cardClasses += "opacity-75 ";
            }

            return (
              <div key={student._id} className={cardClasses}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-elevated border border-border-subtle flex items-center justify-center text-text-muted font-bold text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm flex gap-2 items-center">
                        {student.name}
                        {isMe && <span className="text-accent text-[10px] uppercase tracking-wider font-bold">(You)</span>}
                      </p>
                      <p className="text-text-muted text-xs">Used Quota: {student.quota_used} | {student.roll_no}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {badgeComponent}
                    
                    {student.status === 'available' && !isMe && (
                      <button 
                        onClick={() => handleRequestSwap(student.allocation_id)}
                        className="bg-accent text-white text-xs px-3 py-1.5 rounded-lg hover:bg-accent/80 transition-colors"
                      >
                        Request Swap
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {data.students.length === 0 && (
            <p className="text-center text-text-muted py-10">No students found.</p>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default Leaderboard;
