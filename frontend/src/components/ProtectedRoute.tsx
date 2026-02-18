import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[]; // กำหนด role ที่เข้าได้ (ถ้าไม่ใส่คือเข้าได้หมดขอแค่ login)
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const location = useLocation(); // [ADDED] ใช้ตรวจสอบ path ปัจจุบัน

  // 1. ถ้าไม่มี Token ดีดไป Login ทันที
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. ถ้ามี Role ที่กำหนด แต่ Role ของ User ไม่ตรงกับที่อนุญาต
  if (allowedRoles && !allowedRoles.includes(role || '')) {
    // คำนวณเส้นทางที่จะดีดไปตาม Role
    const targetPath = role === 'teacher' ? '/teacher/dashboard' : '/dashboard';

    // [CRITICAL FIX] ป้องกัน Infinite Loop (Redirect หาตัวเอง)
    // กรณีที่ Role ผิดพลาด หรือ Logic การดีดขัดแย้งกันจนเป้าหมายคือหน้าปัจจุบัน
    if (location.pathname === targetPath) {
      // ถ้าจะดีดมาหน้าเดิม แสดงว่า User นี้ไม่มีที่ไปที่ถูกต้อง -> ให้ Logout ออกไปเลยปลอดภัยสุด
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      return <Navigate to="/login" replace />;
    }

    // ดีดไปหน้า Dashboard ตาม Role ของตัวเอง
    return <Navigate to={targetPath} replace />;
  }

  // 3. ผ่านด่านทั้งหมด อนุญาตให้เข้าได้
  return <Outlet />;
};

export default ProtectedRoute;