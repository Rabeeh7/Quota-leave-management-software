import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

const Spinner = () => (
  <div className="min-h-screen bg-base flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
  </div>
);

export const AuthGuard = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const rolePaths = {
      superadmin: '/superadmin/dashboard',
      leader: '/leader/dashboard',
      student: '/student/home',
    };
    return <Navigate to={rolePaths[user.role] || '/login'} replace />;
  }

  return children;
};

export default AuthGuard;
