import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const SemesterSetup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    semester_name: '',
    start_date: '',
    end_date: '',
    max_friday_slots: 12,
    quota_percentage: 33,
    request_deadline_day: 'Wednesday',
    request_deadline_time: '09:00',
    emergency_limit: 2,
    swap_enabled: true
  });
  const [examPeriods, setExamPeriods] = useState([]);
  const [breakPeriods, setBreakPeriods] = useState([]);
  const [tempBreak, setTempBreak] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/superadmin/semester/setup', {
        ...formData,
        exam_periods: examPeriods,
        break_periods: breakPeriods
      });
      setPreview(res.data);
      alert('Semester created successfully!');
      navigate('/superadmin/dashboard');
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating semester');
    } finally { setLoading(false); }
  };

  // Calculate preview stats
  const calcFridays = () => {
    if (!formData.start_date || !formData.end_date) return null;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    let fridays = 0;
    const d = new Date(start);
    while (d <= end) {
      if (d.getDay() === 5) fridays++;
      d.setDate(d.getDate() + 1);
    }
    const blocked = examPeriods.length + breakPeriods.length;
    const valid = Math.max(0, fridays - blocked);
    const totalSlots = valid * formData.max_friday_slots;
    return { fridays, blocked, valid, totalSlots };
  };

  const stats = calcFridays();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Semester Setup</h1>
        <p className="text-text-secondary mt-1">Configure a new semester with calendar and blocking rules</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-heading text-white">Basic Information</h2>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Semester Name</label>
            <input required className="input-field" placeholder="e.g. Semester 2 - 2026" value={formData.semester_name}
              onChange={e => setFormData({ ...formData, semester_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Start Date</label>
              <input required type="date" className="input-field" value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">End Date</label>
              <input required type="date" className="input-field" value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Slots per Friday</label>
              <input type="number" className="input-field" value={formData.max_friday_slots}
                onChange={e => setFormData({ ...formData, max_friday_slots: parseInt(e.target.value) || 12 })} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Emergency Limit</label>
              <input type="number" className="input-field" value={formData.emergency_limit}
                onChange={e => setFormData({ ...formData, emergency_limit: parseInt(e.target.value) || 2 })} />
            </div>
          </div>
        </div>

        {/* Live Stats Preview */}
        {stats && (
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
            <h3 className="font-heading text-accent mb-3">Live Calendar Preview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-white">{stats.fridays}</p>
                <p className="text-xs text-text-secondary">Total Fridays</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-danger">{stats.blocked}</p>
                <p className="text-xs text-text-secondary">Blocked</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-success">{stats.valid}</p>
                <p className="text-xs text-text-secondary">Valid Fridays</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-accent">{stats.totalSlots}</p>
                <p className="text-xs text-text-secondary">Total Slots</p>
              </div>
            </div>
          </div>
        )}

        {/* Exam Periods */}
        <div className="glass-card p-5 space-y-3">
          <h2 className="font-heading text-white">Exam Periods</h2>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Start</label>
              <input type="date" className="input-field" value={tempExam.start}
                onChange={e => setTempExam({ ...tempExam, start: e.target.value })} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">End</label>
              <input type="date" className="input-field" value={tempExam.end}
                onChange={e => setTempExam({ ...tempExam, end: e.target.value })} />
            </div>
            <button type="button" className="btn-secondary !px-4 !py-3 text-sm"
              onClick={() => { if (tempExam.start && tempExam.end) { setExamPeriods([...examPeriods, tempExam]); setTempExam({ start: '', end: '' }); } }}>
              Add
            </button>
          </div>
          {examPeriods.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-danger/5 border border-danger/10 rounded-lg px-3 py-2">
              <span className="text-sm text-white">{p.start} &rarr; {p.end}</span>
              <button type="button" onClick={() => setExamPeriods(examPeriods.filter((_, j) => j !== i))} className="text-danger text-sm">✕</button>
            </div>
          ))}
        </div>

        {/* Break Periods */}
        <div className="glass-card p-5 space-y-3">
          <h2 className="font-heading text-white">Semester Breaks</h2>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Start</label>
              <input type="date" className="input-field" value={tempBreak.start}
                onChange={e => setTempBreak({ ...tempBreak, start: e.target.value })} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">End</label>
              <input type="date" className="input-field" value={tempBreak.end}
                onChange={e => setTempBreak({ ...tempBreak, end: e.target.value })} />
            </div>
            <button type="button" className="btn-secondary !px-4 !py-3 text-sm"
              onClick={() => { if (tempBreak.start && tempBreak.end) { setBreakPeriods([...breakPeriods, tempBreak]); setTempBreak({ start: '', end: '' }); } }}>
              Add
            </button>
          </div>
          {breakPeriods.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-neutral/5 border border-neutral/10 rounded-lg px-3 py-2">
              <span className="text-sm text-white">{p.start} &rarr; {p.end}</span>
              <button type="button" onClick={() => setBreakPeriods(breakPeriods.filter((_, j) => j !== i))} className="text-danger text-sm">✕</button>
            </div>
          ))}
        </div>

        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full text-lg !py-4">
          {loading ? 'Creating Semester...' : 'Create Semester & Generate Calendar'}
        </button>
      </form>
    </div>
  );
};

export default SemesterSetup;
