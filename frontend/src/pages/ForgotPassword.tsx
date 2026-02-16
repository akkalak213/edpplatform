import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Mail, MessageCircle, Cpu } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0F172A]" style={{ fontFamily: "'Kanit', sans-serif" }}>
      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');
        
        .bg-circuit {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23334155' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .glass-panel {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
      `}</style>

      {/* --- BACKGROUND LAYERS --- */}
      <div className="absolute inset-0 bg-circuit z-0 pointer-events-none"></div>
      {/* [FIX] ปรับขนาด class ตามคำแนะนำ Tailwind */}
      <div className="absolute top-[-10%] left-[-10%] w-200 h-200 bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[8s]"></div>

      {/* --- MAIN CONTENT --- */}
      <div className="relative z-10 w-full max-w-120 p-6">
        {/* [FIX] ปรับความสูงและขอบมนตามมาตรฐานเพื่อลดอาการกระชากของจอ */}
        <div className="glass-panel p-8 md:p-10 rounded-4xl w-full min-h-150 flex flex-col justify-center animate-in zoom-in-95 duration-500">
          
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
              <Cpu className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-kanit">ลืมรหัสผ่านใช่ไหม?</h2>
            <p className="text-slate-400 font-light text-sm">ไม่ต้องกังวล คุณสามารถกู้คืนบัญชีได้ตามขั้นตอนนี้</p>
          </div>

          <div className="space-y-6">
            {/* Contact Item 1: Walk-in */}
            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              <div className="p-3 bg-indigo-500/20 rounded-xl h-fit">
                <MapPin className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm mb-1 uppercase tracking-wide">ติดต่อด้วยตนเอง</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  หมวดคอมพิวเตอร์ อาคาร 2 ชั้น 3<br />
                  ห้องปฏิบัติการคอมพิวเตอร์
                </p>
              </div>
            </div>

            {/* Contact Item 2: Email */}
            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              <div className="p-3 bg-blue-500/20 rounded-xl h-fit">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm mb-1 uppercase tracking-wide">ติดต่อผ่านอีเมล</h3>
                <p className="text-slate-400 text-xs font-mono">Akkalak_2003@mns.ac.th</p>
              </div>
            </div>

            {/* Note Section */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3">
              <MessageCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-[11px] text-amber-200/70 leading-tight">
                *กรุณาเตรียมรหัสนักเรียนและบัตรประจำตัวนักเรียนมาเพื่อยืนยันตัวตนกับเจ้าหน้าที่ในวันและเวลาราชการ
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 mt-8 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium text-sm transition-all border border-white/10 flex items-center justify-center gap-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            กลับหน้าเข้าสู่ระบบ
          </button>

        </div>
      </div>
    </div>
  );
}