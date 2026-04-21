import { useState, useEffect, useCallback } from 'react';
import { Badge, PageLoader, Modal, EmptyState } from '../../components/common';
import { useAuth } from '../../contexts/useAuth';
import api from '../../services/api';

const StudentManager = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [addForm, setAddForm] = useState({ name: '', roll_no: '', phone: '', password: '', notes: '' });
  const [bulkText, setBulkText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'superadmin') {
      api.get('/superadmin/departments').then(res => setDepartments(res.data)).catch(console.error);
    }
  }, [user]);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      if (user?.role === 'superadmin') {
        if (!selectedDept) { setStudents([]); return; }
        const res = await api.get(`/superadmin/students/list/${selectedDept}`);
        setStudents(res.data);
      } else {
        const res = await api.get('/leader/students/list');
        setStudents(res.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedDept, user]);

  useEffect(() => { void fetchStudents(); }, [fetchStudents]);

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
      if (user?.role === 'superadmin') {
        await api.put(`/superadmin/students/${id}/toggle-active`);
      } else {
        await api.put(`/leader/students/${id}/toggle-active`);
      }
      fetchStudents();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this student?')) return;
    try {
      await api.delete(`/superadmin/students/${id}`);
      fetchStudents();
      setShowDetail(null);
    } catch (err) { alert(err.response?.data?.message || 'Error deleting'); }
  };

  const handleDownloadCSV = () => {
    let csv = 'Name,Roll No/Username,Phone,Total Leaves,Status\n';
    students.forEach(s => {
      csv += `"${s.name}","${s.roll_no}","${s.phone || ''}",${s.profile?.total_leaves || 0},${s.is_active ? 'Active' : 'Inactive'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_no?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Student Manager</h1>
          <p className="text-text-secondary mt-1">{students.length} students total</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {user?.role === 'superadmin' ? (
            <select className="input-field max-w-[250px]" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.institution})</option>)}
            </select>
          ) : (
            <>
              <button onClick={handleDownloadCSV} className="btn-secondary text-sm hidden sm:block">↓ CSV</button>
              <button onClick={() => setShowBulk(true)} className="btn-secondary text-sm">Bulk Import</button>
              <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add</button>
            </>
          )}
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
                  {user?.role === 'superadmin' ? (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s._id); }}
                      className="btn-danger w-full !py-1 text-xs">Delete</button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); handleToggle(s._id); }}
                      className="btn-ghost text-xs w-full">{s.is_active ? 'Deactivate' : 'Activate'}</button>
                  )}
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
            {user?.role === 'superadmin' && (
              <button onClick={() => handleDelete(showDetail._id)} className="btn-danger w-full mt-4">
                Permanently Delete Student
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentManager;
