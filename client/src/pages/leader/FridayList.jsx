import { useState, useEffect } from 'react';
import { Badge, PageLoader, Modal } from '../../components/common';
import api from '../../services/api';
import { formatDate, getInitials } from '../../utils/helpers';

const FridayListManager = () => {
  const [fridays, setFridays] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedFriday, setSelectedFriday] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [whatsappText, setWhatsappText] = useState(null);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/superadmin/departments');
        setDepartments(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    if (!selectedDept) {
      setFridays([]);
      setSelectedFriday(null);
      return;
    }
    const fetchFridays = async () => {
      setLoading(true);
      try {
        const fridayRes = await api.get(`/superadmin/friday/list/${selectedDept}`);
        const openFridays = fridayRes.data.filter(f => ['open', 'locked', 'published'].includes(f.status));
        setFridays(openFridays);
        if (openFridays.length > 0) setSelectedFriday(openFridays[0]);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchFridays();
  }, [selectedDept]);

  useEffect(() => {
    if (!selectedFriday) return;
    const fetchAllocations = async () => {
      try {
        const allocRes = await api.get(`/superadmin/friday/${selectedFriday._id}/allocations`);
        setAllocations(allocRes.data || []);
      } catch (err) { console.error(err); }
    };
    fetchAllocations();
  }, [selectedFriday, selectedDept]);

  const handlePublish = async () => {
    if (!selectedFriday) return;
    try {
      await api.post(`/superadmin/friday/${selectedFriday._id}/publish`);
      alert('List published! Students have been notified.');
      setSelectedFriday(prev => ({ ...prev, status: 'published' }));
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleWhatsappExport = async () => {
    if (!selectedFriday) return;
    try {
      const res = await api.get(`/superadmin/whatsapp-export/${selectedFriday._id}`);
      setWhatsappText(res.data.text);
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(whatsappText);
    alert('Copied to clipboard!');
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Friday List Manager</h1>
          <p className="text-text-secondary mt-1">Manage and publish approved student lists per department</p>
        </div>
        <select 
          className="input-field w-full sm:w-auto min-w-[200px]"
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          <option value="">Select Department</option>
          {departments.map(d => (
            <option key={d._id} value={d._id}>{d.name} ({d.institution})</option>
          ))}
        </select>
      </div>

      {!selectedDept && (
        <div className="text-center py-10">
          <p className="text-text-secondary">Please select a department to view the lists.</p>
        </div>
      )}

      {selectedDept && (
        <>
          {/* Friday Selector */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {fridays.map(f => (
          <button key={f._id} onClick={() => setSelectedFriday(f)}
            className={`flex-shrink-0 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              selectedFriday?._id === f._id
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-elevated border-border-subtle text-text-secondary hover:border-border-light'
            }`}>
            <p>{formatDate(f.friday_date)}</p>
            <Badge type={f.status === 'published' ? 'success' : f.status === 'locked' ? 'warning' : 'accent'}>
              {f.status}
            </Badge>
          </button>
        ))}
      </div>

      {/* Student Cards */}
      {selectedFriday && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-white">
              {formatDate(selectedFriday.friday_date)} — Approved Students
            </h2>
            <span className="text-text-secondary text-sm">{allocations.length}/{selectedFriday.total_slots} slots</span>
          </div>

          {allocations.length === 0 ? (
            <div className="text-center py-10 text-text-muted">
              <p>No allocations yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {allocations.map((a) => (
                <div key={a._id} className="bg-elevated border border-border-subtle rounded-xl p-4 flex items-center gap-3 group hover:border-accent/20 transition-all">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {getInitials(a.student_id?.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{a.student_id?.name}</p>
                    <p className="text-text-muted text-xs">{a.student_id?.roll_no}</p>
                  </div>
                  <Badge type={a.confirmed ? 'success' : 'warning'}>
                    {a.confirmed ? '✓' : '…'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Sticky Actions */}
      {selectedFriday && allocations.length > 0 && (
        <div className="sticky bottom-20 lg:bottom-4 flex gap-3">
          <button onClick={handlePublish} className="btn-primary flex-1">
            Publish List
          </button>
          <button onClick={handleWhatsappExport} className="btn-secondary flex-1">
            WhatsApp Export
          </button>
        </div>
      )}

      {/* WhatsApp Modal */}
      <Modal isOpen={!!whatsappText} onClose={() => setWhatsappText(null)} title="WhatsApp Export">
        <pre className="bg-elevated p-4 rounded-xl text-sm text-text-secondary whitespace-pre-wrap font-body mb-4">
          {whatsappText}
        </pre>
        <button onClick={copyToClipboard} className="btn-primary w-full">Copy to Clipboard</button>
      </Modal>
      </>
      )}
    </div>
  );
};

export default FridayListManager;
