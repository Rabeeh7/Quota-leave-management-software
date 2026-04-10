import { useState, useEffect } from 'react';
import { PageLoader } from '../../components/common';
import StudentLayout from '../../components/layout/StudentLayout';
import { useAuth } from '../../contexts/useAuth';
import api from '../../services/api';

const Profile = () => {
  const { user, logout } = useAuth();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' });
  const [changing, setChanging] = useState(false);

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChanging(true);
    try {
      await api.put('/auth/change-password', passwords);
      alert('Password changed successfully!');
      setPasswords({ current_password: '', new_password: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Error changing password');
    } finally { setChanging(false); }
  };

  if (loading) return <StudentLayout><PageLoader /></StudentLayout>;

  const profile = dashData?.profile;

  return (
    <StudentLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-2xl">{user?.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <h1 className="font-heading text-xl text-white">{user?.name}</h1>
          <p className="text-text-secondary text-sm">{user?.roll_no}</p>
          <p className="text-text-muted text-xs mt-1">{user?.phone}</p>
        </div>

        {/* Priority */}
        <div className="glass-card p-5 flex flex-col items-center">
          <h3 className="font-heading text-white text-sm mb-1">Rotation Priority</h3>
          <p className="text-3xl font-bold text-accent">{profile?.rotation_priority || 0}</p>
          <p className="text-text-secondary text-xs mt-2 text-center">
            Higher number means you have less priority for the next rotation.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-white">{profile?.total_leaves ?? 0}</p>
            <p className="text-text-muted text-xs">Total Leaves</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-white">{profile?.emergency_count ?? 0}</p>
            <p className="text-text-muted text-xs">Emergency</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-white">{profile?.swap_count ?? 0}</p>
            <p className="text-text-muted text-xs">Swaps</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-white">{profile?.skipped_turns ?? 0}</p>
            <p className="text-text-muted text-xs">Skipped</p>
          </div>
        </div>

        {/* Change Password */}
        <div className="glass-card p-5">
          <h3 className="font-heading text-white text-sm mb-4">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input type="password" required className="input-field" placeholder="Current password"
              value={passwords.current_password}
              onChange={e => setPasswords({ ...passwords, current_password: e.target.value })} />
            <input type="password" required className="input-field" placeholder="New password"
              value={passwords.new_password}
              onChange={e => setPasswords({ ...passwords, new_password: e.target.value })} />
            <button type="submit" disabled={changing} className="btn-secondary w-full">
              {changing ? 'Changing...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Logout */}
        <button onClick={() => { logout(); window.location.href = '/login'; }}
          className="w-full py-3 rounded-xl text-danger border border-danger/20 bg-danger/5 font-medium transition-all hover:bg-danger/10">
          🚪 Logout
        </button>
      </div>
    </StudentLayout>
  );
};

export default Profile;
