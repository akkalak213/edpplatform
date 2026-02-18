import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Helper: ตรวจว่า JWT หมดอายุหรือเปล่า (decode เอง ไม่ต้องใช้ library) ──
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp คือ Unix timestamp (วินาที) — เทียบกับเวลาปัจจุบัน
    return payload.exp * 1000 < Date.now();
  } catch {
    // decode ไม่ได้ = token ผิดรูปแบบ = ถือว่าหมดอายุ
    return true;
  }
}

// ── Request Interceptor ──
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      // ✅ เช็ค expiry ก่อนแนบ token ทุกครั้ง
      if (isTokenExpired(token)) {
        // Token หมดอายุ → ล้าง storage แล้วไป login ทันที
        // ไม่ต้องรอให้ server ตอบ 401 กลับมาก่อน
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        // ยกเลิก request นี้เลย ไม่ส่งออกไป
        return Promise.reject(new axios.Cancel('Token expired'));
      }

      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // ถ้าเป็น Cancel (จาก token expired ข้างบน) ไม่ต้องทำอะไรเพิ่ม
    if (axios.isCancel(error)) return Promise.reject(error);

    if (error.response?.status === 401) {
      console.warn("Session expired or unauthorized. Redirecting to login...");
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;