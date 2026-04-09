import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRolePath } from '../../utils/helpers';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState('student'); // 'student' or 'admin'
  const [formData, setFormData] = useState({ email: '', roll_no: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const credentials = { username: formData.username, password: formData.password };

      const user = await login(credentials);
      navigate(getRolePath(user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow */}
      <div className="glow-orb" style={{ top: '-150px', left: '50%', transform: 'translateX(-50%)' }} />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
              <span className="text-white font-bold text-2xl">Q</span>
            </div>
          </Link>
          <h1 className="font-heading text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-text-secondary mt-2">Sign in to your Quota Manager account</p>
        </div>

        {/* Form */}
        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Username (Email or Roll Number)</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Enter username"
                value={formData.username || ''}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Password</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="Enter password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 glass-card p-4">
          <p className="text-xs text-text-muted mb-2 font-semibold uppercase tracking-wider">Demo Accounts</p>
          <div className="space-y-1.5 text-xs text-text-secondary">
            <p><strong className="text-white">Super Admin:</strong> superadmin@fairleave.app / SuperAdmin@123</p>
            <p><strong className="text-white">Admin:</strong> leader@cse.edu / Leader@123</p>
            <p><strong className="text-white">Student:</strong> CS001 / CS001</p>
          </div>
        </div>

        <p className="text-center text-text-muted text-sm mt-6">
          <Link to="/" className="text-accent hover:text-accent-light transition-colors">Back to home</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
