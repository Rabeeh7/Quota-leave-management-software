import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/layout/AuthGuard';
import DashboardLayout from './components/layout/DashboardLayout';

// Public
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';

// Super Admin
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import Requests from './pages/superadmin/Requests';
import AppointLeader from './pages/superadmin/AppointLeader';
import Analytics from './pages/superadmin/Analytics';
import SemesterSetup from './pages/leader/SemesterSetup';
import FridayList from './pages/leader/FridayList';
import BlockedFridays from './pages/leader/BlockedFridays';

// Leader
import LeaderDashboard from './pages/leader/Dashboard';
import Students from './pages/leader/Students';
import LeaderFridayList from './pages/leader/LeaderFridayList';
import Reports from './pages/leader/Reports';

// Student
import StudentDashboard from './pages/student/Dashboard';
import StudentLeaderboard from './pages/student/Leaderboard';
import StudentRequest from './pages/student/Request';
import StudentHistory from './pages/student/History';
import StudentProfile from './pages/student/Profile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Super Admin — wrapped in DashboardLayout */}
          <Route
            path="/superadmin"
            element={
              <AuthGuard allowedRoles={['superadmin']}>
                <DashboardLayout />
              </AuthGuard>
            }
          >
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="requests" element={<Requests />} />
            <Route path="appoint-leader" element={<AppointLeader />} />
            <Route path="setup" element={<SemesterSetup />} />
            <Route path="friday-list" element={<FridayList />} />
            <Route path="blocked" element={<BlockedFridays />} />
            <Route path="students" element={<Students />} />
            <Route path="analytics" element={<Analytics />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Leader — wrapped in DashboardLayout */}
          <Route
            path="/leader"
            element={
              <AuthGuard allowedRoles={['leader']}>
                <DashboardLayout />
              </AuthGuard>
            }
          >
            <Route path="dashboard" element={<LeaderDashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="setup" element={<SemesterSetup />} />
            <Route path="friday-list" element={<LeaderFridayList />} />
            <Route path="reports" element={<Reports />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Student — uses its own layout internally */}
          <Route
            path="/student/home"
            element={
              <AuthGuard allowedRoles={['student']}>
                <StudentDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/student/dashboard"
            element={
              <AuthGuard allowedRoles={['student']}>
                <StudentDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/student/leaderboard"
            element={
              <AuthGuard allowedRoles={['student']}>
                <StudentLeaderboard />
              </AuthGuard>
            }
          />
          <Route
            path="/student/request"
            element={
              <AuthGuard allowedRoles={['student']}>
                <StudentRequest />
              </AuthGuard>
            }
          />
          <Route
            path="/student/history"
            element={
              <AuthGuard allowedRoles={['student']}>
                <StudentHistory />
              </AuthGuard>
            }
          />
          <Route
            path="/student/profile"
            element={
              <AuthGuard allowedRoles={['student']}>
                <StudentProfile />
              </AuthGuard>
            }
          />
          <Route path="/student" element={<Navigate to="/student/home" replace />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
