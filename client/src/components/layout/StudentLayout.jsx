import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

const studentLinks = [
  { to: '/student/home', label: 'Home' },
  { to: '/student/leaderboard', label: 'Leaderboard' },
  { to: '/student/request', label: 'Request' },
  { to: '/student/history', label: 'History' },
  { to: '/student/profile', label: 'Profile' }
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
  );
};

const StudentLayout = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <h1 className="font-heading font-bold text-white">Quota Manager</h1>
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
