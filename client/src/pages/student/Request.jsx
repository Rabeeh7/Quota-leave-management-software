import { useState, useEffect } from 'react';
import { Badge, PageLoader } from '../../components/common';
import StudentLayout from '../../components/layout/StudentLayout';
import api from '../../services/api';
import { formatDate, getDaysUntil } from '../../utils/helpers';

const Request = () => {
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestType, setRequestType] = useState('normal');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/student/dashboard');
        setDashData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleSubmit = async () => {
    if (!dashData?.nextFriday) return;
    setSubmitting(true);
    try {
      await api.post('/student/request', {
        friday_id: dashData.nextFriday._id,
        request_type: requestType,
        reason
      });
      alert('Request submitted successfully!');
      window.location.href = '/student/dashboard';
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting request');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async () => {
    if (!dashData?.myRequest) return;
    try {
      await api.put(`/student/request/${dashData.myRequest._id}/cancel`);
      window.location.reload();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <StudentLayout><PageLoader /></StudentLayout>;

  const friday = dashData?.nextFriday;
  const isOpen = friday?.status === 'open';
  const daysLeft = friday ? getDaysUntil(friday.friday_date) : null;

  return (
    <StudentLayout>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="font-heading text-xl text-white">Request Leave</h1>
          <p className="text-text-secondary text-sm">Submit your request for this Friday</p>
        </div>

        {!friday ? (
          <div className="text-center py-16">
            <h2 className="font-heading text-lg text-white">No upcoming Friday</h2>
            <p className="text-text-secondary text-sm mt-2">Check back when a new Friday is available.</p>
          </div>
        ) : (
          <>
            {/* Friday Info */}
            <div className="glass-card p-5 text-center">
              <p className="text-text-secondary text-sm">Upcoming Friday</p>
              <p className="text-white font-heading text-xl mt-1">{formatDate(friday.friday_date)}</p>
              <div className="mt-2">
                <Badge type={isOpen ? 'success' : 'warning'}>{friday.status}</Badge>
              </div>
              {daysLeft > 0 && (
                <p className="text-accent text-sm mt-2">{daysLeft} days remaining</p>
              )}
            </div>

            {/* Already submitted */}
            {dashData.myRequest ? (
              <div className="glass-card p-5">
                <div className="text-center mb-4">
                  <h3 className="font-heading text-white font-bold text-lg">Request Already Submitted</h3>
                  <p className="text-text-secondary text-sm mt-1">Type: {dashData.myRequest.request_type}</p>
                  <div className="mt-2 text-sm font-semibold tracking-wider p-2">
                    STATUS: {dashData.myRequest.status.toUpperCase()}
                  </div>
                </div>
                {dashData.myRequest.status === 'pending' && (
                  <button onClick={handleCancel} className="btn-danger w-full">Cancel Request</button>
                )}
              </div>
            ) : !isOpen ? (
              <div className="glass-card p-5 text-center">
                <h3 className="font-heading text-white">Requests Closed</h3>
                <p className="text-text-secondary text-sm mt-1">The deadline has passed for this Friday.</p>
              </div>
            ) : (
              <>
                {/* Confidence Meter */}
                {dashData.prediction && (
                  <div className={`rounded-2xl p-4 border ${
                    dashData.prediction.confidence === 'high' ? 'bg-success/5 border-success/20' :
                    dashData.prediction.confidence === 'medium' ? 'bg-warning/5 border-warning/20' :
                    'bg-danger/5 border-danger/20'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-white font-medium text-sm">
                          Confidence: {dashData.prediction.confidence.toUpperCase()}
                        </p>
                        <p className="text-text-secondary text-xs">{dashData.prediction.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Request Type */}
                <div className="glass-card p-5">
                  <h3 className="font-heading text-white text-sm mb-3">Request Type</h3>
                  <div className="flex gap-2">
                    {['normal', 'emergency', 'swap'].map(t => (
                      <button key={t} onClick={() => setRequestType(t)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium capitalize transition-all border ${
                          requestType === t
                            ? t === 'emergency' 
                              ? 'bg-danger/10 border-danger text-danger'
                              : 'bg-accent/10 border-accent text-accent'
                            : 'bg-elevated border-border-subtle text-text-secondary'
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div className="glass-card p-5">
                  <h3 className="font-heading text-white text-sm mb-3">Reason (optional)</h3>
                  <textarea className="input-field min-h-[100px] resize-none" value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Why do you need leave this Friday?" />
                </div>

                {/* Submit */}
                <button onClick={handleSubmit} disabled={submitting}
                  className="btn-primary w-full text-lg !py-4">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default Request;
