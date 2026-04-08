import { useState, useEffect } from 'react';
import { PageLoader, Modal } from '../../components/common';
import api from '../../services/api';

const AppointLeader = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', department_id: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetch = async () => {
    try {
      const res = await api.get('/superadmin/departments');
      setDepartments(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleAppoint = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/superadmin/leaders/appoint', formData);
      setShowModal(false);
      setFormData({ name: '', email: '', password: '', phone: '', department_id: '' });
      fetch();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this leader?')) return;
    try {
      await api.delete(`/superadmin/leaders/remove/${userId}`);
      fetch();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Manage Leaders</h1>
          <p className="text-text-secondary mt-1">Appoint or remove department leaders</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ Appoint Leader</button>
      </div>

      <div className="grid gap-4">
        {departments.map(dept => (
          <div key={dept._id} className="glass-card p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-heading text-white">{dept.name}</h3>
                <p className="text-text-secondary text-sm">{dept.institution}</p>
              </div>
              <div className="flex items-center gap-3">
                {dept.leader ? (
                  <>
                    <div className="text-right">
                      <p className="text-white text-sm font-medium">{dept.leader.name}</p>
                      <p className="text-text-muted text-xs">{dept.leader.email}</p>
                    </div>
                    <button onClick={() => handleRemove(dept.leader._id)} className="btn-danger !px-3 !py-1.5 text-xs">
                      Remove
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setFormData({ ...formData, department_id: dept._id }); setShowModal(true); }}
                    className="btn-secondary !px-4 !py-2 text-sm">Assign Leader</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Appoint Leader">
        <form onSubmit={handleAppoint} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Department</label>
            <select required className="input-field" value={formData.department_id}
              onChange={e => setFormData({ ...formData, department_id: e.target.value })}>
              <option value="">Select department</option>
              {departments.filter(d => !d.leader).map(d => (
                <option key={d._id} value={d._id}>{d.name} — {d.institution}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Name</label>
            <input required className="input-field" placeholder="Leader name" value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Email</label>
            <input required type="email" className="input-field" placeholder="leader@example.com" value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Password</label>
            <input required type="password" className="input-field" placeholder="Set password" value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Phone</label>
            <input className="input-field" placeholder="+91 9876543210" value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Appointing...' : 'Appoint Leader'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AppointLeader;
