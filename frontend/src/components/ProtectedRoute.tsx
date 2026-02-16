import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[]; // กำหนด role ที่เข้าได้ (ถ้าไม่ใส่คือเข้าได้หมดขอแค่ login)
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // 1. ถ้าไม่มี Token ดีดไป Login ทันที (ไม่เรนเดอร์หน้าเนื้อหาเลย)
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. ถ้ามี Role ที่กำหนด แต่ Role ไม่ตรง ก็ดีดออก (เช่น นักเรียนจะเข้าหน้าครู)
  if (allowedRoles && !allowedRoles.includes(role || '')) {
    // ถ้าเป็นครูให้ไปหน้าครู ถ้าเป็นนักเรียนให้ไปหน้า dashboard
    return <Navigate to={role === 'teacher' ? '/teacher/dashboard' : '/dashboard'} replace />;
  }

  // 3. ผ่านด่านทั้งหมด อนุญาตให้เข้าได้
  return <Outlet />;
};

export default ProtectedRoute;