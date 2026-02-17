import { useState, createContext, useContext } from 'react';
import type { ReactNode } from 'react'; // ✅ แยก Type import ตามที่ ESLint ต้องการ
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastData {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // ตั้งเวลาให้หายไปเอง
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-right duration-300 text-white font-kanit
            ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}
          `}>
            {t.type === 'success' && <CheckCircle className="w-5 h-5"/>}
            {t.type === 'error' && <AlertCircle className="w-5 h-5"/>}
            {t.type === 'info' && <Info className="w-5 h-5"/>}
            <span className="text-sm font-medium">{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="hover:bg-black/20 rounded p-1">
              <X className="w-4 h-4 opacity-70"/>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ✅ เพิ่มบรรทัดนี้เพื่อบอก ESLint ว่าไม่ต้องกังวลเรื่อง Fast Refresh ในไฟล์นี้
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};