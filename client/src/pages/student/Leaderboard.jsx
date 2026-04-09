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
    if (!confirm('Request to swap with this student?')) return;
    try {
      await api.post(`/rotation/swap/request`, { allocationId });
      alert('Swap requested successfully! They will be notified.');
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Error requesting swap');
    }
  };

  const generateWhatsAppLink = (phone, name) => {
    const cleanPhone = phone?.replace(/[^0-9]/g, '');
    if (!cleanPhone) return null;
    const message = encodeURIComponent(`Hi ${name}, I saw your quota spot is available on Quota Manager. Would you be open to a swap?`);
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  if (loading) return <StudentLayout><PageLoader /></StudentLayout>;

  // Check if current user is allocated
  const myAllocation = data.students.find(s => s._id === user?._id);
  const amIAllocated = myAllocation?.status === 'allocated';

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
            
            // Color-coded cards
            let cardClasses = "p-4 rounded-2xl border transition-all ";
            
            if (student.status === 'allocated') {
              // Green — got quota
              cardClasses += "bg-success/5 border-success/20 ";
            } else if (student.status === 'available') {
              // Amber — spot available for swap
              cardClasses += "bg-warning/10 border-warning/30 ";
            } else {
              // Grey — not this week
              cardClasses += "bg-elevated border-border-subtle opacity-75 ";
            }

            // Blue border for logged-in user
            if (isMe) {
              cardClasses += "!border-2 !border-accent !opacity-100 ";
            }

            // Status badges
            let badgeComponent = null;
            if (student.status === 'allocated') {
              badgeComponent = (
                <span className="bg-success text-white px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full">
                  Got Quota
                </span>
              );
            } else if (student.status === 'available') {
              badgeComponent = (
                <span className="bg-warning text-white px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full animate-pulse">
                  Spot Available
                </span>
              );
            } else {
              badgeComponent = (
                <span className="bg-white/5 text-text-muted px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full">
                  Not This Week
                </span>
              );
            }

            // Can request swap: spot is available AND I'm not allocated AND it's not me
            const canRequestSwap = student.status === 'available' && !isMe && !amIAllocated;
            const whatsappLink = student.status === 'available' && !isMe 
              ? generateWhatsAppLink(student.phone, student.name) 
              : null;

            return (
              <div key={student._id} className={cardClasses}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      student.status === 'allocated' ? 'bg-success/20 text-success' :
                      student.status === 'available' ? 'bg-warning/20 text-warning' :
                      'bg-elevated border border-border-subtle text-text-muted'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm flex gap-2 items-center">
                        {student.name}
                        {isMe && <span className="text-accent text-[10px] uppercase tracking-wider font-bold bg-accent/10 px-1.5 py-0.5 rounded">(You)</span>}
                      </p>
                      <p className="text-text-muted text-xs">Used Quota: {student.quota_used} | {student.roll_no}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {badgeComponent}
                  </div>
                </div>

                {/* Swap action area */}
                {(canRequestSwap || whatsappLink) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border-subtle/50">
                    {canRequestSwap && (
                      <button 
                        onClick={() => handleRequestSwap(student.allocation_id)}
                        className="bg-accent text-white text-xs px-4 py-2 rounded-lg hover:bg-accent/80 transition-colors flex-1 font-medium"
                      >
                        Request Swap
                      </button>
                    )}
                    {whatsappLink && (
                      <a href={whatsappLink} target="_blank" rel="noreferrer" 
                        className="bg-green-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-green-500 transition-colors text-center font-medium">
                        WhatsApp
                      </a>
                    )}
                  </div>
                )}
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
