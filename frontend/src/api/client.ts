import axios from 'axios';

const client = axios.create({
  // [FIX] ใช้ Environment Variable จาก Vite 
  // หากไม่มีค่า (เช่น รัน local) จะถอยกลับไปใช้ http://127.0.0.1:8000 อัตโนมัติ
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: แนบ Token ไปกับทุก Request
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response Interceptor: ดักจับ Error 401 (Token หมดอายุ/ไม่ถูกต้อง)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired or unauthorized. Redirecting to login...");
      localStorage.removeItem('token');
      localStorage.removeItem('role'); // ลบ role ออกด้วยเพื่อความสะอาด
      
      if (window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;