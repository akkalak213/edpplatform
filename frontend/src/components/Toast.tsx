import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

// กำหนดรูปแบบข้อมูลที่รับเข้ามา (Props)
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

// ✅ ใช้ export default เพื่อให้ Dashboard.tsx เรียกใช้ได้ทันที
export default function Toast({ message, type, onClose }: ToastProps) {
  
  // ตั้งเวลาให้นับถอยหลัง 3 วินาที แล้วปิดตัวเอง
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    // ถ้าผู้ใช้ปิดก่อน หรือ Component ถูกทำลาย ให้ยกเลิกตัวนับเวลา
    return () => clearTimeout(timer);
  }, [onClose]);

  // เลือกสีพื้นหลังและไอคอนตามสถานะ
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
    <div className="fixed top-5 right-5 z-50 pointer-events-none">
      <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-right duration-300 text-white font-kanit ${bgColor}`}>
        {/* ไอคอน */}
        <Icon className="w-5 h-5 shrink-0" />
        
        {/* ข้อความแจ้งเตือน */}
        <span className="text-sm font-medium">{message}</span>
        
        {/* ปุ่มปิด */}
        <button 
          onClick={onClose} 
          className="hover:bg-black/20 rounded p-1 transition-colors"
          title="ปิดการแจ้งเตือน"
        >
          <X className="w-4 h-4 opacity-70"/>
        </button>
      </div>
    </div>
  );
}