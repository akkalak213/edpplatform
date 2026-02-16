import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Lock, Mail, Loader2, ArrowRight, Cpu, Zap, Eye, EyeOff } from 'lucide-react';
import { AxiosError } from 'axios';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const res = await client.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // เก็บ Token และ Role ลงเครื่อง
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('role', res.data.role); // เก็บ role ไว้ใช้ประโยชน์อื่นได้

      // ✅ [FIX] ตรวจสอบ Role เพื่อเปลี่ยนเส้นทาง
      if (res.data.role === 'teacher') {
        navigate('/teacher/dashboard'); // ไปหน้าครู
      } else {
        navigate('/dashboard'); // ไปหน้าเด็ก
      }
      
    } catch (err) {
      const error = err as AxiosError;
      if (error.response) {
         setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      }
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
      `}</style>

      {/* --- BACKGROUND LAYERS --- */}
      <div className="absolute inset-0 bg-circuit z-0 pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[8s]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 blur-[100px] rounded-full mix-blend-screen"></div>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="relative z-10 w-full max-w-[1200px] flex flex-col lg:flex-row items-center justify-between p-6 lg:p-12 gap-12 lg:gap-20">
        
        {/* LEFT SIDE */}
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

        {/* RIGHT SIDE (Login Form) */}
        <div className="w-full lg:w-[480px]">
          <div className="glass-panel p-8 md:p-10 rounded-[2rem] w-full min-h-[633px] flex flex-col justify-center animate-in zoom-in-95 duration-500 delay-150">
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">เข้าสู่ระบบ</h2>
              <p className="text-slate-400 font-light text-sm">เข้าถึงพื้นที่การเรียนรู้ของคุณ</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl flex items-center gap-2 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0"></div>
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="group">
                <label className="block text-xs font-medium text-slate-400 mb-2 ml-1 uppercase tracking-wider">อีเมล</label>
                <div className="relative transition-all duration-300 transform group-hover:-translate-y-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl input-dark focus:outline-none transition-all duration-300 placeholder-slate-500"
                    placeholder="exam@mns.ac.th"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="group">
                <div className="flex justify-between mb-2 ml-1">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">รหัสผ่าน</label>
                  <button 
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>
                <div className="relative transition-all duration-300 transform group-hover:-translate-y-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"} // Toggle Type
                    required
                    className="w-full pl-11 pr-10 py-3.5 rounded-xl input-dark focus:outline-none transition-all duration-300 placeholder-slate-500"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {/* Eye Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm transition-all duration-300 
                           shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 active:scale-[0.98] 
                           disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
                
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-6 mt-6 border-t border-white/5 text-center">
              <p className="text-slate-500 text-sm">
                ยังไม่มีบัญชี?{' '}
                <button 
                  onClick={() => navigate('/register')}
                  className="text-blue-400 font-medium hover:text-blue-300 inline-flex items-center gap-1 hover:underline decoration-1 underline-offset-4 transition-all"
                >
                  สมัครสมาชิกใหม่ <ArrowRight className="w-3 h-3" />
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}