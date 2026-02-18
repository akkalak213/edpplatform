import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import ForgotPassword from './pages/ForgotPassword';

// Import หน้าของครู
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherProjectDetail from './pages/TeacherProjectDetail';

// Import ยามเฝ้าประตู
import ProtectedRoute from './components/ProtectedRoute';
import StudentQuiz from './pages/StudentQuiz';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* === โซนต้องห้าม (ต้อง Login ก่อนถึงจะเข้าได้) === */}
        
        {/* 1. สำหรับนักเรียน (Role: student) */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/student/quiz" element={<StudentQuiz />} />
        </Route>

        {/* 2. สำหรับครู (Role: teacher) */}
        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/project/:id" element={<TeacherProjectDetail />} />
        </Route>

        {/* Fallback for 404 - Optional: Redirect to login or show 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;