import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const studentLinks = [
  { to: '/student/dashboard', label: 'Home', icon: '🏠' },
  { to: '/student/request', label: 'Request', icon: '✋' },
  { to: '/student/history', label: 'History', icon: '📜' },
  { to: '/student/profile', label: 'Profile', icon: '👤' },
];

const StudentBottomNav = () => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border-subtle z-50 px-2 py-1 safe-area-bottom">
      <div className="flex justify-around">
        {studentLinks.map(link => (
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
            <span className="text-[10px] mt-0.5 font-medium">{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

const StudentLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <h1 className="font-heading font-bold text-white">FairLeave</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/student/profile')}
              className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center"
            >
              <span className="text-accent font-bold text-xs">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      <StudentBottomNav />
    </div>
  );
};

export default StudentLayout;
