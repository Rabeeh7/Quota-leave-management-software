import { useState, useEffect } from 'react';
import { PageLoader, Modal } from '../../components/common';
import StudentLayout from '../../components/layout/StudentLayout';
import api from '../../services/api';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/useAuth';

const sameId = (a, b) => String(a) === String(b);

const Leaderboard = () => {
  const [data, setData] = useState({ friday: null, students: [] });
  const [loading, setLoading] = useState(true);
  const [swapModal, setSwapModal] = useState(null);
  const [myNextQuotaDate, setMyNextQuotaDate] = useState(null);
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

  useEffect(() => {
    if (!swapModal) {
      setMyNextQuotaDate(null);
      return;
    }
    let cancelled = false;
    api.get('/student/next-date')
      .then((res) => {
        if (!cancelled) setMyNextQuotaDate(res.data?.nextQuotaDate ?? null);
      })
      .catch(() => {
        if (!cancelled) setMyNextQuotaDate(null);
      });
    return () => { cancelled = true; };
  }, [swapModal]);

  const confirmSwapRequest = async () => {
    if (!swapModal?.allocationId) return;
    try {
      await api.post('/rotation/swap/request', { allocationId: swapModal.allocationId });
      alert('Swap requested successfully! They will be notified.');
      setSwapModal(null);
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

  const myAllocation = data.students.find(s => sameId(s._id, user?._id));
  const amIAllocated = myAllocation?.status === 'allocated';

  const classFridayLabel = data.friday?.date ? formatDate(data.friday.date) : '—';
  const myNextLabel = myNextQuotaDate ? formatDate(myNextQuotaDate) : 'TBD';

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

        <Modal
          isOpen={!!swapModal}
          onClose={() => setSwapModal(null)}
          title="Request swap"
        >
          <div data-testid="swap-modal" className="space-y-4 text-sm text-text-secondary">
            <p>
              You are requesting to swap for <span className="text-white font-medium">{swapModal?.peerName}</span>&apos;s available spot.
            </p>
            <div className="glass-card p-3 rounded-xl space-y-2">
              <p data-testid="swap-modal-class-friday">
                <span className="text-text-muted">Class Friday (this rotation): </span>
                <span className="text-white font-medium">{classFridayLabel}</span>
              </p>
              <p data-testid="swap-modal-my-next">
                <span className="text-text-muted">Your next quota date: </span>
                <span className="text-white font-medium">{myNextLabel}</span>
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setSwapModal(null)}>Cancel</button>
              <button type="button" className="btn-primary flex-1" onClick={confirmSwapRequest}>Confirm request</button>
            </div>
          </div>
        </Modal>

        <div className="space-y-3">
          {data.students.map((student, i) => {
            const isMe = sameId(student._id, user?._id);

            let cardClasses = 'p-4 rounded-2xl border transition-all ';

            if (student.status === 'allocated') {
              cardClasses += 'bg-success/5 border-success/20 ';
            } else if (student.status === 'available') {
              cardClasses += 'bg-warning/10 border-warning/30 ';
            } else {
              cardClasses += 'bg-elevated border-border-subtle opacity-75 ';
            }

            if (isMe) {
              cardClasses += '!border-2 !border-accent !opacity-100 ';
            }

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

            const canRequestSwap = student.status === 'available' && !isMe && !amIAllocated;
            const whatsappLink = student.status === 'available' && !isMe
              ? generateWhatsAppLink(student.phone, student.name)
              : null;

            return (
              <div key={student._id} className={cardClasses} data-testid={isMe ? 'leaderboard-row-me' : 'leaderboard-row'}>
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

                {(canRequestSwap || whatsappLink) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border-subtle/50">
                    {canRequestSwap && (
                      <button
                        type="button"
                        onClick={() => setSwapModal({ allocationId: student.allocation_id, peerName: student.name })}
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
