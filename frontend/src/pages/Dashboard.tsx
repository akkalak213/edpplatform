import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { 
  LogOut, Plus, X, Loader2, Trash2, Cpu, Activity, CornerDownRight, 
  Layers, Search, CalendarClock, AlertTriangle, Key, Lock, Trophy, History, CheckCircle, XCircle 
} from 'lucide-react';

// --- Interfaces ---
interface Project {
  id: number;
  title: string;
  description: string;
  created_at?: string;
}

interface QuizAttempt {
  id: number;
  score: number;
  total_score: number;
  passed: boolean;
  time_spent_seconds: number;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(''); 

  // Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);

  // Quiz History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await client.get('/edp/projects');
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  // Fetch Quiz History
  const fetchQuizHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await client.get('/quiz/history');
      setQuizHistory(res.data);
      setShowHistoryModal(true);
    } catch (err) {
      console.error("Failed to fetch history", err);
      alert("ไม่สามารถดึงข้อมูลประวัติการสอบได้");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // --- Create Logic ---
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await client.post('/edp/projects', { title, description: desc });
      setShowCreateModal(false);
      setTitle('');
      setDesc('');
      fetchProjects();
    } catch (err) {
      console.error("Create error:", err);
    } finally {
      setCreateLoading(false);
    }
  };

  // --- Delete Logic ---
  const clickDeleteProject = (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation(); 
    setProjectToDelete(projectId);
    setDeleteError(''); 
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete === null) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await client.delete(`/edp/projects/${projectToDelete}`);
      setProjects(projects.filter(p => p.id !== projectToDelete));
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleteError("เกิดข้อผิดพลาด: ไม่สามารถลบข้อมูลได้ในขณะนี้");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Change Password Logic ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passForm.new !== passForm.confirm) {
        alert("รหัสผ่านใหม่ไม่ตรงกัน");
        return;
    }

    setPassLoading(true);
    try {
        await client.post('/auth/change-password', {
            old_password: passForm.old,
            new_password: passForm.new
        });
        alert("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!");
        setShowPasswordModal(false);
        setPassForm({ old: '', new: '', confirm: '' });
    } catch (err) {
        // [FIXED] Type Assertion แทน any
        const error = err as { response?: { data?: { detail?: string } } };
        const errorMsg = error.response?.data?.detail || "รหัสผ่านเดิมไม่ถูกต้อง";
        alert("เกิดข้อผิดพลาด: " + errorMsg);
    } finally {
        setPassLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return "ไม่ระบุวันที่";
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} นาที`;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 relative overflow-hidden selection:bg-cyan-500/20 selection:text-cyan-200">
      
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10h80v80h-80z' fill='none' stroke='%2338bdf8' stroke-width='0.5'/%3E%3Cpath d='M30 30h40v40h-40z' fill='none' stroke='%2338bdf8' stroke-width='0.5' opacity='0.5'/%3E%3C/svg%3E")`, backgroundSize: '60px 60px' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-soft-light"></div>
        <div className="absolute top-[-20%] left-[-10%] w-200 h-200 bg-cyan-600/10 blur-[150px] rounded-full mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[-30%] right-[-10%] w-150 h-150 bg-blue-700/10 blur-[150px] rounded-full mix-blend-screen"></div>
      </div>

      {/* --- Custom Styles --- */}
      <style>{`
        .animate-pulse-slow { animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        
        .glass-tech {
          background: rgba(2, 6, 23, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(56, 189, 248, 0.1);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }
        .glass-tech-hover:hover {
          background: rgba(2, 6, 23, 0.8);
          border-color: rgba(56, 189, 248, 0.3);
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.15), inset 0 0 10px rgba(56, 189, 248, 0.05);
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        @keyframes modalPop {
            0% { transform: scale(0.95); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
        .animate-modal-pop { animation: modalPop 0.2s ease-out forwards; }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* --- Header Deck --- */}
        <header className="mb-12 glass-tech rounded-3xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-md animate-pulse"></div>
              <div className="relative bg-[#0F172A] border border-cyan-500/50 rounded-xl p-2.5">
                <Cpu className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">EDP <span className="text-cyan-400">NEXUS</span></h1>
              <div className="flex items-center gap-2 text-xs text-cyan-600/70 font-medium">
                <Activity className="w-3 h-3" /> ระบบพร้อมใช้งาน v2.5.0
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <div className="relative group hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาโครงงาน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0F172A]/50 border border-slate-700/50 text-slate-300 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all w-48 focus:w-64"
              />
            </div>

            {/* History Button */}
            <button
              onClick={fetchQuizHistory}
              disabled={historyLoading}
              className="p-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
              title="ประวัติการสอบ"
            >
              {historyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <History className="w-5 h-5" />}
            </button>

            {/* Quiz Button */}
            <button
              onClick={() => navigate('/student/quiz')}
              className="relative group bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Trophy className="w-5 h-5" /> 
              <span className="hidden sm:inline font-bold">ทำแบบทดสอบ</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="relative group bg-linear-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-white/20 group-hover:animate-[shimmer_1.5s_infinite] -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent"></div>
              <div className="flex items-center gap-2 font-medium relative z-10">
                <Plus className="w-5 h-5" /> <span className="hidden sm:inline">สร้างโครงงานใหม่</span>
              </div>
            </button>

            <button 
              onClick={() => setShowPasswordModal(true)}
              className="p-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
              title="เปลี่ยนรหัสผ่าน"
            >
              <Key className="w-5 h-5" />
            </button>

            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
              title="ออกจากระบบ"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* --- Project Grid --- */}
        <main className="pb-20">
          <div className="flex items-end justify-between mb-8 px-2">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-500" /> โครงงานทั้งหมด
              </h2>
              <p className="text-slate-500 text-sm font-light">เลือกโครงงานเพื่อเข้าสู่พื้นที่การทำงาน</p>
            </div>
            <div className="text-xs text-slate-600 font-medium">
              จำนวน: <span className="text-cyan-400">{filteredProjects.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <div 
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="group relative glass-tech glass-tech-hover rounded-4xl p-6 cursor-pointer transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute -inset-0.5 bg-linear-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-4xl blur-md"></div>
                </div>

                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className="text-[10px] text-cyan-300/70 bg-cyan-950/30 border border-cyan-900/50 px-3 py-1 rounded-full uppercase tracking-wider font-medium">
                    รหัส :: {String(project.id).padStart(4, '0')}
                  </div>
                  
                  <button 
                    onClick={(e) => clickDeleteProject(e, project.id)}
                    className="p-2 text-slate-600 hover:text-red-400 bg-slate-900/50 hover:bg-red-950/30 rounded-xl border border-transparent hover:border-red-900/50 transition-all opacity-60 group-hover:opacity-100 z-20"
                    title="ลบโครงงาน"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative z-10 pl-2">
                  <h3 className="text-2xl font-bold text-white mb-3 truncate group-hover:text-cyan-300 transition-colors">
                    {project.title}
                  </h3>
                  <div className="relative">
                    <div className="absolute -left-3 top-2 bottom-2 w-0.5 bg-slate-800 group-hover:bg-cyan-700/50 transition-colors"></div>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 pl-2 font-light">
                        {project.description || "ไม่มีรายละเอียดสังเขป"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800/50 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-slate-500 group-hover:text-cyan-500 transition-colors" />
                      <span className="text-[10px] text-slate-500 font-medium">
                        สร้างเมื่อ: {formatDate(project.created_at)}
                      </span>
                  </div>
                  <div className="text-cyan-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex items-center gap-1 text-xs font-medium tracking-wider">
                    เปิดงาน <CornerDownRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}

            {filteredProjects.length === 0 && (
              <div
                onClick={() => setShowCreateModal(true)}
                className="group col-span-full h-75 glass-tech rounded-4xl border-dashed border-2 border-slate-800/80 hover:border-cyan-500/30 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-4xl"></div>
                 <div className="w-24 h-24 bg-slate-900/80 rounded-full flex items-center justify-center mb-6 border border-slate-800 group-hover:border-cyan-500/50 group-hover:scale-110 transition-all relative z-10">
                   <Plus className="w-10 h-10 text-slate-600 group-hover:text-cyan-400" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-300 group-hover:text-white relative z-10">พื้นที่ว่าง</h3>
                 <p className="text-slate-500 text-sm mt-2 relative z-10 font-light">คลิกเพื่อเริ่มต้นสร้างโครงงานใหม่</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- Create Project Modal --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowCreateModal(false)}></div>
          
          <div className="relative glass-tech bg-[#0F172A]/90 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-modal-pop border-cyan-500/20 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cyan-500 to-blue-600"></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Cpu className="w-6 h-6 text-cyan-400" />
                    สร้างโครงงานใหม่
                </h3>
                <p className="text-slate-400 text-sm mt-1 font-light">กำหนดหัวข้อและรายละเอียดสำหรับโครงงานวิศวกรรมของคุณ</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 bg-slate-900/50 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="space-y-6 relative z-10">
              <div className="group">
                <label className="block text-xs text-cyan-300/70 mb-2 font-medium ml-1">ชื่อโครงงาน</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-5 py-3.5 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                  placeholder="เช่น หุ่นยนต์เก็บขยะอัตโนมัติ"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="group">
                <label className="block text-xs text-cyan-300/70 mb-2 font-medium ml-1">รายละเอียดสังเขป</label>
                <textarea 
                  rows={4}
                  className="w-full px-5 py-3.5 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all resize-none"
                  placeholder="อธิบายเป้าหมายหรือขอบเขตของโครงงาน..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3.5 text-slate-400 bg-slate-900/50 border border-slate-800 hover:bg-slate-800/80 rounded-xl font-medium transition-all">
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={createLoading}
                  className="flex-[1.5] py-3.5 text-white bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-medium shadow-lg shadow-cyan-500/20 transition-all flex justify-center items-center gap-2 relative overflow-hidden hover:scale-[1.02] active:scale-[0.98]"
                >
                  {createLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    <><Activity className="w-5 h-5" /> ยืนยันการสร้าง</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowDeleteModal(false)}></div>
          
          <div className="relative glass-tech bg-[#0F172A] rounded-4xl w-full max-w-sm p-8 shadow-2xl animate-modal-pop border-red-500/20 overflow-hidden text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-linear-to-r from-transparent via-red-500 to-transparent"></div>
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 relative z-10 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
               <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-3 relative z-10">ยืนยันการลบข้อมูล</h3>
            <p className="text-slate-400 text-sm mb-6 font-light relative z-10 leading-relaxed">
              คุณแน่ใจหรือไม่ที่จะลบโครงงานนี้?<br/>
              <span className="text-red-400/80 font-medium">ข้อมูลทั้งหมดจะหายไปและกู้คืนไม่ได้</span>
            </p>
            
            {deleteError && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-center justify-center gap-2 animate-pulse">
                <X className="w-3 h-3" /> {deleteError}
              </div>
            )}

            <div className="flex gap-3 relative z-10">
              <button 
                onClick={() => setShowDeleteModal(false)} 
                className="flex-1 py-3 text-slate-400 bg-slate-900 hover:bg-slate-800 rounded-xl font-medium transition-all border border-slate-800"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDeleteProject}
                disabled={isDeleting}
                className="flex-1 py-3 text-white bg-linear-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl font-medium shadow-lg shadow-red-500/20 transition-all flex justify-center items-center gap-2 hover:scale-[1.02]"
              >
                 {isDeleting ? <Loader2 className="animate-spin w-5 h-5" /> : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Change Password Modal --- */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowPasswordModal(false)}></div>
          
          <div className="relative glass-tech bg-[#0F172A] rounded-4xl w-full max-w-md p-8 shadow-2xl animate-modal-pop border-cyan-500/20 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cyan-500 to-blue-500"></div>
            
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-cyan-400" /> เปลี่ยนรหัสผ่าน
                </h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium ml-1">รหัสผ่านเดิม</label>
                    <input 
                        type="password"
                        required
                        value={passForm.old}
                        onChange={(e) => setPassForm({...passForm, old: e.target.value})}
                        className="w-full px-4 py-3 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                        placeholder="••••••"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium ml-1">รหัสผ่านใหม่</label>
                    <input 
                        type="password"
                        required
                        value={passForm.new}
                        onChange={(e) => setPassForm({...passForm, new: e.target.value})}
                        className="w-full px-4 py-3 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                        placeholder="••••••"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium ml-1">ยืนยันรหัสผ่านใหม่</label>
                    <input 
                        type="password"
                        required
                        value={passForm.confirm}
                        onChange={(e) => setPassForm({...passForm, confirm: e.target.value})}
                        className="w-full px-4 py-3 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                        placeholder="••••••"
                    />
                </div>

                <button 
                    type="submit"
                    disabled={passLoading}
                    className="w-full py-3.5 mt-4 text-white bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-medium shadow-lg shadow-cyan-500/20 transition-all flex justify-center items-center gap-2"
                >
                    {passLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'ยืนยันการเปลี่ยนรหัสผ่าน'}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* --- [NEW] Quiz History Modal --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowHistoryModal(false)}></div>
          
          <div className="relative glass-tech bg-[#0F172A] rounded-4xl w-full max-w-2xl p-8 shadow-2xl animate-modal-pop border-indigo-500/20 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 to-purple-500"></div>
            
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" /> ประวัติการสอบ
                </h3>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
            </div>

            <div className="overflow-y-auto pr-2 space-y-3 custom-scrollbar flex-1">
              {quizHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>ยังไม่มีประวัติการสอบ</p>
                </div>
              ) : (
                quizHistory.map((attempt, index) => (
                  <div key={attempt.id} className="bg-[#1E293B] border border-slate-700 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                        ${attempt.passed ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}
                      `}>
                        {quizHistory.length - index}
                      </div>
                      <div>
                        <div className="text-white font-bold text-lg flex items-center gap-2">
                          {attempt.score} <span className="text-sm text-slate-500 font-normal">/ {attempt.total_score} คะแนน</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {formatDate(attempt.created_at)}</span>
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {formatTime(attempt.time_spent_seconds)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1
                      ${attempt.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                    `}>
                      {attempt.passed ? <><CheckCircle className="w-3 h-3"/> ผ่านเกณฑ์</> : <><XCircle className="w-3 h-3"/> ไม่ผ่าน</>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}