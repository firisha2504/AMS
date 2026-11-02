import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import FinancialManagementPage from './pages/FinancialManagementPage';
import MemberRecordsPage from './pages/MemberRecordsPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import AttendancePage from './pages/AttendancePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import BackupPage from './pages/BackupPage';
import PublicHomePage from './pages/public/PublicHomePage';
import AboutPage from './pages/public/AboutPage';
import ProfilePage from './pages/ProfilePage';
import PublicContentPage from './pages/PublicContentPage';
import TeamManagementPage from './pages/TeamManagementPage';
import './i18n';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
          <style>{`
            /* Prevent horizontal overflow on all devices */
            html, body, #root {
              overflow-x: hidden;
              width: 100%;
              max-width: 100vw;
            }
            
            /* Global mobile input fixes */
            @media (max-width: 768px) {
              select,
              input[type="date"],
              input[type="time"],
              input[type="datetime-local"],
              input[type="month"],
              input[type="week"] {
                font-size: 16px !important;
                position: relative;
                z-index: 40;
                max-height: 100vh;
              }
              
              /* Ensure dropdown doesn't overflow viewport */
              select {
                max-width: calc(100vw - 2rem);
                overflow-y: auto;
              }
              
              /* Force date picker within bounds */
              input[type="date"],
              input[type="time"],
              input[type="datetime-local"],
              input[type="month"],
              input[type="week"] {
                position: relative;
                max-width: calc(100vw - 1rem);
                margin-left: auto;
                margin-right: auto;
              }
            }
            
            /* Hide picker indicator on mobile */
            @media (max-width: 768px) {
              input[type="date"]::-webkit-calendar-picker-indicator,
              input[type="time"]::-webkit-calendar-picker-indicator,
              input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                cursor: pointer;
                opacity: 0.7;
                position: relative;
                z-index: 50;
              }
            }
            
            /* Container fix for pickers to stay in bounds */
            .date-input-wrapper {
              position: relative;
              overflow: visible;
            }
          `}</style>
          <Routes>
            <Route path="/" element={<PublicHomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/financial" element={<FinancialManagementPage />} />
              <Route path="/records" element={<MemberRecordsPage />} />
              <Route path="/logs" element={<ActivityLogsPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/public-content" element={<PublicContentPage />} />
              <Route path="/backup" element={<BackupPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/team-management" element={<TeamManagementPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );
  }

export default App;
