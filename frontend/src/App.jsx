import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Landing from './pages/Landing.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import FaceRegistration from './pages/FaceRegistration.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ExamList from './pages/admin/ExamList.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import ExamRoom from './pages/student/ExamRoom.jsx';
import SessionDetails from './pages/admin/SessionDetails.jsx'; // Add this import
import { ToastContainer } from './components/UI/Toast.jsx';

function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" />;
  return children;
}

function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, [token]);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/face-register" element={
          <ProtectedRoute>
            <FaceRegistration />
          </ProtectedRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/exams" element={
          <ProtectedRoute requiredRole="admin">
            <ExamList />
          </ProtectedRoute>
        } />
        <Route path="/admin/sessions/:sessionId" element={
          <ProtectedRoute requiredRole="admin">
            <SessionDetails />
          </ProtectedRoute>
        } />
        
        {/* Student Routes */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/student/exam/:sessionId" element={
          <ProtectedRoute requiredRole="student">
            <ExamRoom />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;