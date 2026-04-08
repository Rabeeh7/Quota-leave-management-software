import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const superadminLinks = [
  { to: '/superadmin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/superadmin/requests', label: 'Requests', icon: '📨' },
  { to: '/superadmin/appoint-leader', label: 'Leaders', icon: '👤' },
  { to: '/superadmin/analytics', label: 'Analytics', icon: '📈' },
];

const leaderLinks = [
  { to: '/leader/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/leader/setup', label: 'Semester', icon: '📅' },
  { to: '/leader/friday-list', label: 'Friday List', icon: '📋' },
  { to: '/leader/students', label: 'Students', icon: '🎓' },
  { to: '/leader/blocked', label: 'Blocked', icon: '🚫' },
  { to: '/leader/reports', label: 'Reports', icon: '📈' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = user?.role === 'superadmin' ? superadminLinks : leaderLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-card border-r border-border-subtle">
        {/* Logo */}
        <div className="p-6 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg text-white">FairLeave</h1>
              <span className="text-xs text-text-secondary capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <span className="text-lg">{link.icon}</span>
              <span className="font-medium">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-border-subtle">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-ghost w-full text-left text-sm text-danger hover:text-danger">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border-subtle z-50 px-2 py-1">
        <div className="flex justify-around">
          {links.slice(0, 5).map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-accent' : 'text-text-muted'
                }`
              }
            >
              <span className="text-xl">{link.icon}</span>
              <span className="text-[10px] mt-0.5">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
