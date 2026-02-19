import { useState, createContext, useContext, useEffect } from 'react';
// [FIX] แยก type import ออกมาต่างหาก เพื่อแก้ Error: 'ReactNode' is a type...
import type { ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

// --- Types ---
export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

// --- 1. UI Component (ส่วนแสดงผลหลัก) ---
// ถูกเรียกใช้โดยทั้ง Provider (สำหรับครู) และ Default Export (สำหรับนักเรียน)
export function ToastComponent({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  let bgColor = 'bg-blue-600';
  let Icon = Info;

  if (type === 'success') {
    bgColor = 'bg-emerald-600';
    Icon = CheckCircle;
  } else if (type === 'error') {
    bgColor = 'bg-red-600';
    Icon = AlertCircle;
  }

  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-right duration-300 text-white font-kanit ${bgColor} mb-2`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button 
        onClick={onClose} 
        className="hover:bg-black/20 rounded p-1 transition-colors"
      >
        <X className="w-4 h-4 opacity-70"/>
      </button>
    </div>
  );
}

// --- 2. Context & Provider (สำหรับ main.tsx และ TeacherProjectDetail.tsx) ---
const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{id: number, message: string, type: ToastType}[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove from state handled by UI Effect or backup timeout here
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500); 
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Global Toast Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastComponent 
            key={t.id} 
            message={t.message} 
            type={t.type} 
            onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Hook สำหรับเรียกใช้ (เช่น const { showToast } = useToast())
// [FIX] เพิ่มบรรทัดนี้เพื่อบอก ESLint ว่าไม่ต้องกังวลเรื่อง Fast Refresh ในไฟล์นี้
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

// --- 3. Default Export (สำหรับ Dashboard.tsx ของนักเรียน) ---
// รองรับ import Toast from '../components/Toast'
export default function LegacyToast({ message, type, onClose }: ToastProps) {
  return (
    <div className="fixed top-5 right-5 z-50 pointer-events-none">
       <ToastComponent message={message} type={type} onClose={onClose} />
    </div>
  );
}