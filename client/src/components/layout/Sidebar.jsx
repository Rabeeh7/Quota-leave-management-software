import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

const superadminLinks = [
  { to: '/superadmin/dashboard', label: 'Dashboard' },
  { to: '/superadmin/requests', label: 'Requests' },
  { to: '/superadmin/appoint-leader', label: 'Departments' },
  { to: '/superadmin/students', label: 'Students' },
  { to: '/superadmin/analytics', label: 'Analytics' },
];

const leaderLinks = [
  { to: '/leader/dashboard', label: 'Dashboard' },
  { to: '/leader/setup', label: 'Semester' },
  { to: '/leader/students', label: 'Students' },
  { to: '/leader/friday-list', label: 'Friday List' },
  { to: '/leader/reports', label: 'Reports' },
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
              <span className="text-white font-bold text-lg">Q</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg text-white">Quota Manager</h1>
              <span className="text-xs text-text-secondary capitalize">{user?.role === 'leader' ? 'Admin' : user?.role === 'superadmin' ? 'Super Admin' : user?.role}</span>
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
              <span className="font-medium px-2">{link.label}</span>
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
            Logout
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
                `flex flex-col items-center py-3 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-accent border-t-2 border-accent' : 'text-text-muted mt-0.5'
                }`
              }
            >
              <span className="text-[12px] font-semibold">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
