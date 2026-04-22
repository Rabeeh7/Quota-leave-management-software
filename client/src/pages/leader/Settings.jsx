import { useState, useEffect } from 'react';
import api from '../../services/api';
import { PageLoader } from '../../components/common';

const DepartmentSettings = () => {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/leader/settings');
        setFormData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.put('/leader/settings', formData);
      alert('Department settings updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating settings');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Department Settings</h1>
        <p className="text-text-secondary mt-1">Configure default request windows, quotas, and constraints for your department.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-heading text-white">Request Constraints</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Request Open Day</label>
              <select className="input-field" value={formData?.request_open_day || 'Tuesday'}
                onChange={e => setFormData({ ...formData, request_open_day: e.target.value })}>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Request Open Time</label>
              <input type="time" className="input-field" value={formData?.request_open_time || '00:00'}
                onChange={e => setFormData({ ...formData, request_open_time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Deadline Day</label>
              <select className="input-field" value={formData?.request_deadline_day || 'Wednesday'}
                onChange={e => setFormData({ ...formData, request_deadline_day: e.target.value })}>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Deadline Time</label>
              <input type="time" className="input-field" value={formData?.request_deadline_time || '17:00'}
                onChange={e => setFormData({ ...formData, request_deadline_time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Default Slots per Friday</label>
              <input type="number" className="input-field" value={formData?.max_friday_slots || 12}
                onChange={e => setFormData({ ...formData, max_friday_slots: parseInt(e.target.value) || 12 })} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Emergency Limit</label>
              <input type="number" className="input-field" value={formData?.emergency_limit || 2}
                onChange={e => setFormData({ ...formData, emergency_limit: parseInt(e.target.value) || 2 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Enable Swapping</label>
              <select className="input-field" value={formData?.swap_enabled !== false ? 'true' : 'false'}
                onChange={e => setFormData({ ...formData, swap_enabled: e.target.value === 'true' })}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Swap Window (Hours)</label>
              <input type="number" className="input-field" value={formData?.swap_hours || 24}
                onChange={e => setFormData({ ...formData, swap_hours: parseInt(e.target.value) || 24 })} />
            </div>
          </div>
        </div>
        <button type="submit" disabled={processing} className="btn-primary w-full text-lg !py-4">
          {processing ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

export default DepartmentSettings;
