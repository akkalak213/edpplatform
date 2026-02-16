import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Lock, Mail, Loader2, ArrowRight, User, Hash, School, LogIn, Cpu, Zap, Eye, EyeOff, CheckCircle2, X } from 'lucide-react';
import { AxiosError } from 'axios';

export default function Register() {
  const navigate = useNavigate();
  
  // State สำหรับเก็บข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    student_id: '',
    class_room: 'ม.4/1'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Toggle Password
  const [showSuccess, setShowSuccess] = useState(false); // [NEW] Toggle Success Modal

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await client.post('/auth/register', formData);
      // [NEW] เปิด Modal แทนการใช้ alert()
      setShowSuccess(true);
    } catch (err) {
      const error = err as AxiosError<{detail: string}>;
      const msg = error.response?.data?.detail || "เกิดข้อผิดพลาดในการสมัครสมาชิก";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
        .input-dark {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.1);
          color: white;
        }
        .input-dark:focus {
          background: rgba(30, 41, 59, 0.9);
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
        }
        select.input-dark option {
          background-color: #1e293b;
          color: white;
        }
        /* Custom Scrollbar for Form */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        /* Modal Animation */
        @keyframes modalPop {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-modal { animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* --- SUCCESS MODAL --- */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#1e293b] border border-blue-500/30 rounded-3xl p-8 shadow-2xl relative animate-modal">
            
            {/* Glow Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-green-500/20 blur-[60px] rounded-full pointer-events-none"></div>

            <div className="text-center relative z-10">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">ลงทะเบียนสำเร็จ!</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                บัญชีของคุณถูกสร้างเรียบร้อยแล้ว <br/>สามารถเข้าสู่ระบบเพื่อเริ่มใช้งานได้ทันที
              </p>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                เข้าสู่ระบบ <LogIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BACKGROUND LAYERS --- */}
      <div className="absolute inset-0 bg-circuit z-0 pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[8s]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 blur-[100px] rounded-full mix-blend-screen"></div>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="relative z-10 w-full max-w-[1200px] flex flex-col lg:flex-row items-center justify-between p-6 lg:p-12 gap-12 lg:gap-20">
        
        {/* LEFT SIDE (Branding) */}
        <div className="w-full lg:w-1/2 text-white space-y-8 animate-in fade-in slide-in-from-left-4 duration-700 hidden lg:block">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium tracking-wide">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
             EDP PLATFORM 2026
          </div>

          <div className="space-y-4">
             <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">Engineering</span> <br/>
               Intelligence.
             </h1>
             <p className="text-slate-400 text-lg lg:text-xl font-light leading-relaxed max-w-lg">
               ยกระดับการเรียนรู้โครงงานวิศวกรรม ด้วยระบบ AI Assistant <br className="hidden lg:block"/>ที่เข้าใจบริบทและให้คำแนะนำอย่างแม่นยำ
             </p>
          </div>

          <div className="flex items-center gap-6 pt-4">
             <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">System Core</div>
                  <div className="text-sm font-medium text-white">Version 2.5.0</div>
                </div>
             </div>
             
             <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Zap className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Status</div>
                  <div className="text-sm font-medium text-white">All Systems Go</div>
                </div>
             </div>
          </div>
        </div>

        {/* RIGHT SIDE: Register Form */}
        <div className="w-full lg:w-[480px]">
          {/* [FIX] ความสูง Fixed ที่ 633px + Scrollbar */}
          <div className="glass-panel p-8 md:p-10 rounded-[2rem] w-full h-[633px] flex flex-col animate-in zoom-in-95 duration-500 delay-150">
            
            <div className="mb-6 shrink-0">
              <h2 className="text-2xl font-bold text-white mb-2">สร้างบัญชีใหม่</h2>
              <p className="text-slate-400 font-light text-sm">กรอกข้อมูลเพื่อเริ่มต้นใช้งาน</p>
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
              <form onSubmit={handleRegister} className="space-y-4 pb-2">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl flex items-center gap-2 animate-pulse">
                    <X className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Grid: ชื่อ-นามสกุล */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="group">
                    <label className="block text-[10px] font-medium text-slate-400 mb-1.5 ml-1 uppercase tracking-wider">ชื่อจริง</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-4 w-4 text-slate-500"/></div>
                      <input name="first_name" required className="w-full pl-9 pr-3 py-3 rounded-xl input-dark focus:outline-none transition-all duration-300 placeholder-slate-500 text-sm" placeholder="สมชาย" value={formData.first_name} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-medium text-slate-400 mb-1.5 ml-1 uppercase tracking-wider">นามสกุล</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-4 w-4 text-slate-500"/></div>
                      <input name="last_name" required className="w-full pl-9 pr-3 py-3 rounded-xl input-dark focus:outline-none transition-all duration-300 placeholder-slate-500 text-sm" placeholder="รักเรียน" value={formData.last_name} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                {/* Grid: รหัส-ห้อง */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="group">
                    <label className="block text-[10px] font-medium text-slate-400 mb-1.5 ml-1 uppercase tracking-wider">รหัสนักเรียน</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Hash className="h-4 w-4 text-slate-500"/></div>
                      <input name="student_id" required maxLength={6} className="w-full pl-9 pr-3 py-3 rounded-xl input-dark focus:outline-none transition-all duration-300 placeholder-slate-500 text-sm" placeholder="66001" value={formData.student_id} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-medium text-slate-400 mb-1.5 ml-1 uppercase tracking-wider">ห้อง</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><School className="h-4 w-4 text-slate-500"/></div>
                      <select name="class_room" required className="w-full pl-9 pr-3 py-3 rounded-xl input-dark focus:outline-none transition-all duration-300 text-sm appearance-none cursor-pointer" value={formData.class_room} onChange={handleChange}>
                        <option value="ม.4/1">ม.4/1</option>
                        <option value="ม.4/2">ม.4/2</option>
                        <option value="ม.4/3">ม.4/3</option>
                        <option value="ม.4/4">ม.4/4</option>
                        <option value="ม.4/5">ม.4/5</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="group">
                  <label className="block text-[10px] font-medium text-slate-400 mb-1.5 ml-1 uppercase tracking-wider">อีเมล</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-500"/></div>
                    <input name="email" type="email" required className="w-full pl-11 pr-4 py-3.5 rounded-xl input-dark focus:outline-none transition-all duration-300 placeholder-slate-500" placeholder="student@school.com" value={formData.email} onChange={handleChange} />
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <label className="block text-[10px] font-medium text-slate-400 mb-1.5 ml-1 uppercase tracking-wider">รหัสผ่าน</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-500"/></div>
                    <input name="password" type={showPassword ? "text" : "password"} required className="w-full pl-11 pr-10 py-3.5 rounded-xl input-dark focus:outline-none transition-all duration-300 placeholder-slate-500" placeholder="••••••••" value={formData.password} onChange={handleChange} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-blue-400 transition-colors cursor-pointer">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (<>Sign Up <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>)}
                </button>
              </form>
            </div>

            <div className="pt-6 mt-6 border-t border-white/5 text-center shrink-0">
              <p className="text-slate-500 text-sm">
                มีบัญชีอยู่แล้ว?{' '}
                <button onClick={() => navigate('/login')} className="text-blue-400 font-medium hover:text-blue-300 inline-flex items-center gap-1 hover:underline">
                  เข้าสู่ระบบ <LogIn className="w-3 h-3" />
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}