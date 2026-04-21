import { useState, useEffect } from 'react';
import { KPICard, Badge, PageLoader, Modal } from '../../components/common';
import api from '../../services/api';
import { formatDate, getDaysUntil } from '../../utils/helpers';

const LeaderDashboard = () => {
  const [data, setData] = useState(null);
  const [semester, setSemester] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    request_open: '', request_close: '', swap_hours: 24, max_friday_slots: 12
  });

  const fetchData = async () => {
    try {
      const semRes = await api.get('/leader/semester/active/current');
      setSemester(semRes.data.semester);
      if (semRes.data.semester) {
        const dashRes = await api.get(`/leader/dashboard/${semRes.data.semester._id}`);
        setData(dashRes.data);
      }
      const studentsRes = await api.get('/leader/students/list');
      setStudents(studentsRes.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSetWindows = async () => {
    try {
      setProcessing(true);
      await api.post(`/leader/friday/${data.currentFriday._id}/set-windows`, settings);
      setShowSettings(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setProcessing(false); }
  };

  const handleAction = async (actionPath) => {
    if (!data?.currentFriday) return;
    if (!confirm('Are you sure you want to proceed to the next stage?')) return;
    try {
      setProcessing(true);
      await api.post(`/leader/friday/${data.currentFriday._id}/${actionPath}`);
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setProcessing(false); }
  };

  const handleManualAdd = async () => {
    if (!selectedStudentToAdd) return;
    try {
      await api.post('/leader/override', { 
        friday_id: data.currentFriday._id, 
        student_id: selectedStudentToAdd, 
        reason: 'Manual Addition via Dashboard' 
      });
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Error adding student'); }
  };

  const handleManualRemove = async (allocationId) => {
    if (!confirm('Remove this student from the list?')) return;
    try {
      await api.put(`/leader/allocation/${allocationId}/remove`, { reason: 'Manual Removal' });
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Error removing student'); }
  };

  const handleWhatsAppExport = async () => {
    try {
      setProcessing(true);
      const res = await api.get(`/leader/whatsapp-export/${data.currentFriday._id}`);
      await navigator.clipboard.writeText(res.data.text);
      alert('List copied to clipboard! You can now paste it into WhatsApp.');
    } catch (err) { alert(err.response?.data?.message || 'Export error'); }
    finally { setProcessing(false); }
  };

  if (loading) return <PageLoader />;

  if (!semester) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <h2 className="font-heading text-2xl text-white mb-2">No Active Semester</h2>
        <p className="text-text-secondary mb-6">Set up a semester to start managing Friday leaves.</p>
        <a href="/leader/setup" className="btn-primary">Setup Semester</a>
      </div>
    );
  }

  const stage = data?.currentFriday?.stage || 'upcoming';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-elevated/50 p-4 rounded-xl border border-border-subtle">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-text-secondary mt-1">Active Semester: <span className="text-white font-medium">{semester.semester_name}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Students" value={data?.totalStudents || 0} />
        <KPICard label="This Friday Slots" value={data?.currentFriday?.total_slots || 0} />
        <KPICard label="Requests Received" value={data?.pendingRequests || 0} color="text-accent" />
        <KPICard label="Swap Reqs Pending" value={data?.allocations?.reduce((sum, a) => sum + (a.swap_request_details?.filter(s => s.status === 'pending').length || 0), 0) || 0} color="text-warning" />
      </div>

      {data?.currentFriday && (
        <div className="glass-card p-6 border-l-4 border-l-accent">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-text-secondary uppercase tracking-widest text-xs mb-1">Current Friday</h3>
              <p className="text-2xl font-bold text-white mb-2">{formatDate(data.currentFriday.friday_date)}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium px-3 py-1 rounded bg-black/20 text-text-secondary">Stage: {stage.toUpperCase().replace('_', ' ')}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {stage === 'upcoming' && (
                <button onClick={() => setShowSettings(true)} className="btn-primary">Configure Request Window</button>
              )}
              {stage === 'request_open' && (
                <div className="text-right">
                  <p className="text-accent font-medium mb-2">Request window is OPEN for students.</p>
                  <button onClick={() => setShowSettings(true)} className="btn-secondary text-sm">Edit Windows</button>
                </div>
              )}
              {stage === 'request_closed' && (
                <button onClick={() => handleAction('run-rotation')} disabled={processing} className="btn-primary animate-pulse-glow">
                  {processing ? 'Running...' : 'Run Rotation Generator'}
                </button>
              )}
              {/* After rotation ran, allocations exist, but we still might be in request_closed stage if we just ran it, or we could add a rotation_run stage. 
                  Since run-rotation writes allocations and we stay closed, let's show "Publish Initial" if allocations exist and stage <= initial_published */}
              {stage === 'request_closed' && data.allocations.length > 0 && (
                <button onClick={() => handleAction('publish-initial')} disabled={processing} className="btn-accent mt-2">
                  {processing ? 'Publishing...' : 'Publish Initial List & Open Swaps'}
                </button>
              )}
              {stage === 'initial_published' && (
                <div className="text-right">
                  <p className="text-warning font-medium mb-2">Swap window is OPEN.</p>
                  <button onClick={() => handleAction('publish-final')} disabled={processing} className="btn-primary uppercase tracking-wider font-bold">
                    {processing ? 'Locking...' : 'Lock & Publish Final List'}
                  </button>
                </div>
              )}
              {stage === 'final_published' && (
                <div className="text-right">
                  <p className="text-success font-bold text-lg">Final List Published & Locked</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Friday Settings">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Request Open Datetime</label>
              <input type="datetime-local" className="input-field" value={settings.request_open} onChange={e => setSettings({...settings, request_open: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Request Close Datetime</label>
              <input type="datetime-local" className="input-field" value={settings.request_close} onChange={e => setSettings({...settings, request_close: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Swap Window (Hours)</label>
              <input type="number" className="input-field" value={settings.swap_hours} onChange={e => setSettings({...settings, swap_hours: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Max Slots</label>
              <input type="number" className="input-field" value={settings.max_friday_slots} onChange={e => setSettings({...settings, max_friday_slots: e.target.value})} />
            </div>
            <button onClick={handleSetWindows} disabled={processing} className="btn-primary w-full">Save Settings</button>
          </div>
        </Modal>
      )}

      {data?.allocations?.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-4">
              <h3 className="font-heading text-white">Current List ({data.allocations.length})</h3>
              <button onClick={handleWhatsAppExport} disabled={processing} className="btn-ghost text-xs border border-border-subtle p-1 px-2 rounded hover:border-accent hover:text-accent transition-colors">
                Copy for WhatsApp
              </button>
            </div>
            {stage !== 'final_published' && (
              <div className="flex gap-2">
                <select className="input-field max-w-[200px]" value={selectedStudentToAdd} onChange={(e) => setSelectedStudentToAdd(e.target.value)}>
                  <option value="">Select Student to Add</option>
                  {students.filter(s => !data.allocations.find(a => a.student_id._id === s._id)).map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.roll_no})</option>
                  ))}
                </select>
                <button onClick={handleManualAdd} className="btn-secondary text-sm">Manual Add</button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {data.allocations.map((a, i) => (
              <div key={a._id} className="bg-elevated border border-border-subtle rounded-xl p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">{i + 1}</div>
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2 items-center">
                  <div>
                    <p className="text-white font-medium text-sm">{a.student_id?.name}</p>
                    <p className="text-text-muted text-xs">{a.student_id?.roll_no}</p>
                  </div>
                  <div className="text-sm text-text-secondary">Quota Used: {students.find(s => s._id === a.student_id?._id)?.profile?.total_leaves || 0}</div>
                  <div className="text-sm text-text-secondary italic">Status: <Badge type={a.status === 'allocated' ? 'accent' : 'warning'}>{a.status}</Badge></div>
                </div>
                {stage !== 'final_published' && (
                  <button onClick={() => handleManualRemove(a._id)} className="text-danger hover:underline text-sm font-semibold">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.warnings?.length > 0 && (
        <div className="glass-card p-5 border border-warning/20">
          <h3 className="font-heading text-warning mb-4">Smart Warnings</h3>
          <div className="space-y-2">
            {data.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/10">
                <p className="text-sm text-warning flex-1">{w.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderDashboard;
