import { useState, useEffect } from 'react';
import { Badge, PageLoader, Modal, EmptyState } from '../../components/common';
import api from '../../services/api';

const StudentManager = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [addForm, setAddForm] = useState({ name: '', roll_no: '', phone: '', password: '', notes: '' });
  const [bulkText, setBulkText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/leader/students/list');
      setStudents(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/leader/students/add', addForm);
      setShowAdd(false);
      setAddForm({ name: '', roll_no: '', phone: '', password: '', notes: '' });
      fetchStudents();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleBulkImport = async () => {
    setSubmitting(true);
    try {
      const lines = bulkText.trim().split('\n').filter(l => l.trim());
      const parsed = lines.map(l => {
        const parts = l.split(',').map(s => s.trim());
        return { name: parts[0], roll_no: parts[1], phone: parts[2] || '', password: parts[3] || parts[1] };
      });
      const res = await api.post('/leader/students/bulk-import', { students: parsed });
      alert(`Imported: ${res.data.results.success} success, ${res.data.results.failed} failed`);
      setShowBulk(false);
      setBulkText('');
      fetchStudents();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (id) => {
    try {
      await api.put(`/leader/students/${id}/toggle-active`);
      fetchStudents();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_no?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Student Manager</h1>
          <p className="text-text-secondary mt-1">{students.length} students total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)} className="btn-secondary text-sm">📥 Bulk Import</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Student</button>
        </div>
      </div>

      {/* Search */}
      <input className="input-field" placeholder="🔍 Search by name or roll number..." value={search}
        onChange={e => setSearch(e.target.value)} />

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left text-text-secondary font-medium p-4">Student</th>
              <th className="text-left text-text-secondary font-medium p-4">Roll No</th>
              <th className="text-left text-text-secondary font-medium p-4">Phone</th>
              <th className="text-left text-text-secondary font-medium p-4">Leaves</th>
              <th className="text-left text-text-secondary font-medium p-4">Rotation Priority</th>
              <th className="text-left text-text-secondary font-medium p-4">Status</th>
              <th className="text-left text-text-secondary font-medium p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filtered.map(s => (
              <tr key={s._id} className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => setShowDetail(s)}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                      {s.name?.charAt(0)}
                    </div>
                    <span className="text-white font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="p-4 text-text-secondary font-mono">{s.roll_no}</td>
                <td className="p-4 text-text-secondary">{s.phone || '—'}</td>
                <td className="p-4 text-white font-semibold tabular-nums">{s.profile?.total_leaves ?? 0}</td>
                <td className="p-4">
                  <div className={`w-3 h-3 rounded-full ${
                    (s.profile?.rotation_priority ?? 0) >= 0 ? 'bg-success' : 'bg-danger'
                  }`} />
                </td>
                <td className="p-4">
                  <Badge type={s.is_active ? 'success' : 'danger'}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="p-4">
                  <button onClick={(e) => { e.stopPropagation(); handleToggle(s._id); }}
                    className="btn-ghost text-xs">{s.is_active ? 'Deactivate' : 'Activate'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Student">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Name *</label>
            <input required className="input-field" value={addForm.name}
              onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Roll Number *</label>
            <input required className="input-field" value={addForm.roll_no}
              onChange={e => setAddForm({ ...addForm, roll_no: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Phone</label>
            <input className="input-field" value={addForm.phone}
              onChange={e => setAddForm({ ...addForm, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Password (default: roll number)</label>
            <input className="input-field" value={addForm.password} placeholder="Leave empty for roll_no"
              onChange={e => setAddForm({ ...addForm, password: e.target.value })} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Adding...' : 'Add Student'}
          </button>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal isOpen={showBulk} onClose={() => setShowBulk(false)} title="Bulk Import Students">
        <p className="text-text-secondary text-sm mb-3">Enter one student per line: <code className="text-accent">Name, RollNo, Phone, Password</code></p>
        <textarea className="input-field min-h-[200px] font-mono text-xs" value={bulkText}
          onChange={e => setBulkText(e.target.value)}
          placeholder="Mohammed Ajmal, CS006, +919876543210, pass123&#10;Sinan Ahmed, CS007, +919876543211" />
        <button onClick={handleBulkImport} disabled={submitting} className="btn-primary w-full mt-4">
          {submitting ? 'Importing...' : 'Import Students'}
        </button>
      </Modal>

      {/* Detail Drawer */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail?.name || 'Student Details'}>
        {showDetail && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-elevated p-3 rounded-xl">
                <p className="text-text-muted text-xs">Roll No</p>
                <p className="text-white font-semibold">{showDetail.roll_no}</p>
              </div>
              <div className="bg-elevated p-3 rounded-xl">
                <p className="text-text-muted text-xs">Phone</p>
                <p className="text-white font-semibold">{showDetail.phone || '—'}</p>
              </div>
              <div className="bg-elevated p-3 rounded-xl">
                <p className="text-text-muted text-xs">Total Leaves</p>
                <p className="text-white font-semibold tabular-nums">{showDetail.profile?.total_leaves ?? 0}</p>
              </div>
              <div className="bg-elevated p-3 rounded-xl">
                <p className="text-text-muted text-xs">Emergency Used</p>
                <p className="text-white font-semibold tabular-nums">{showDetail.profile?.emergency_count ?? 0}</p>
              </div>
              <div className="bg-elevated p-3 rounded-xl">
                <p className="text-text-muted text-xs">Swap Count</p>
                <p className="text-white font-semibold tabular-nums">{showDetail.profile?.swap_count ?? 0}</p>
              </div>
              <div className="bg-elevated p-3 rounded-xl">
                <p className="text-text-muted text-xs">Rotation Priority</p>
                <p className="text-white font-semibold tabular-nums">{showDetail.profile?.rotation_priority ?? 0}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentManager;
