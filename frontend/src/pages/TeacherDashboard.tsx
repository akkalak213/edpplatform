import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { 
  LogOut, Plus, X, Loader2, Trash2, Cpu, Activity, CornerDownRight, 
  Layers, Search, CalendarClock, AlertTriangle, Key, Lock, Trophy, History, Medal, Crown 
} from 'lucide-react';

// --- Interfaces (คงเดิมทั้งหมด) ---
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

interface LeaderboardItem {
  student_name: string;
  class_room: string;
  score: number;
  total_score: number;
  time_spent: number;
  submitted_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(''); 

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchLeaderboard();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await client.get('/edp/projects');
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  const fetchQuizHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await client.get('/quiz/history');
      setQuizHistory(res.data);
      setShowHistoryModal(true);
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const res = await client.get('/quiz/leaderboard');
      setLeaderboardData(res.data);
      if (res.data.length > 0) {
        setShowLeaderboard(true);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

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
      setDeleteError("เกิดข้อผิดพลาด: ไม่สามารถลบข้อมูลได้");
    } finally {
      setIsDeleting(false);
    }
  };

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
        const error = err as { response?: { data?: { detail?: string } } };
        alert("เกิดข้อผิดพลาด: " + (error.response?.data?.detail || "รหัสผ่านเดิมไม่ถูกต้อง"));
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
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} นาที`;
  };

  return (
    <div className="min-h-[100dvh] bg-[#020617] text-slate-300 relative overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-200 font-kanit">
      
      {/* --- Ambient Background (ปรับปรุงให้รองรับมือถือ) --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10h80v80h-80z' fill='none' stroke='%2338bdf8' stroke-width='0.5'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px' }}></div>
        <div className="absolute top-[-10%] left-[-10%] w-[100%] h-[100%] bg-cyan-600/5 blur-[80px] md:blur-[120px] rounded-full animate-pulse-slow"></div>
      </div>

      <style>{`
        .animate-pulse-slow { animation: pulse 10s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .glass-tech { background: rgba(2, 6, 23, 0.7); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(56, 189, 248, 0.1); }
        .glass-tech-hover:hover { border-color: rgba(56, 189, 248, 0.3); box-shadow: 0 0 25px rgba(56, 189, 248, 0.1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.2); border-radius: 10px; }
        @keyframes modalPop { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-modal-pop { animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        
        {/* --- Header Deck (Responsive) --- */}
        <header className="mb-6 md:mb-10 glass-tech rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col gap-4 md:gap-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Logo & Status */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-md animate-pulse"></div>
                <div className="relative bg-[#0F172A] border border-cyan-500/50 rounded-xl p-2 md:p-2.5">
                  <Cpu className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                </div>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">EDP <span className="text-cyan-400">NEXUS</span></h1>
                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-cyan-600/70 font-semibold">
                  <Activity className="w-3 h-3" /> <span className="hidden xs:inline">SYSTEM</span> READY v2.5
                </div>
              </div>
            </div>

            {/* Main Actions */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {/* Desktop Search */}
              <div className="relative group hidden lg:block mr-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400" />
                <input
                  type="text" placeholder="ค้นหา..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#0F172A]/80 border border-slate-700/50 text-slate-300 text-sm rounded-xl pl-9 pr-4 py-2 w-32 focus:w-48 transition-all outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-5 sm:flex items-center gap-1.5 md:gap-2 w-full sm:w-auto">
                <button onClick={fetchQuizHistory} disabled={historyLoading} title="ประวัติการสอบ"
                  className="flex items-center justify-center p-2.5 rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-400 hover:text-cyan-400 transition-all">
                  {historyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <History className="w-5 h-5" />}
                </button>

                <button onClick={() => setShowPasswordModal(true)} title="เปลี่ยนรหัสผ่าน"
                  className="flex items-center justify-center p-2.5 rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-400 hover:text-cyan-400 transition-all">
                  <Key className="w-5 h-5" />
                </button>

                <button onClick={() => navigate('/student/quiz')}
                  className="col-span-1 flex items-center justify-center p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition-all">
                  <Trophy className="w-5 h-5" />
                </button>

                <button onClick={() => setShowCreateModal(true)}
                  className="col-span-1 flex items-center justify-center p-2.5 rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 hover:bg-cyan-500 transition-all">
                  <Plus className="w-5 h-5" />
                </button>

                <button onClick={handleLogout} title="ออกจากระบบ"
                  className="flex items-center justify-center p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="relative group lg:hidden w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text" placeholder="ค้นหาโครงงานวิศวกรรม..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F172A]/50 border border-slate-700/50 text-slate-300 text-sm rounded-xl pl-11 pr-4 py-3 outline-none"
            />
          </div>
        </header>

        {/* --- Project Grid --- */}
        <main className="pb-10">
          <div className="flex items-end justify-between mb-6 px-1">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-500" /> โครงงานทั้งหมด
              </h2>
              <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider mt-1">Workspace Overview</p>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">
              <span className="text-[10px] md:text-xs text-cyan-400 font-bold">{filteredProjects.length} PROJECTS</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredProjects.map((project) => (
              <div key={project.id} onClick={() => navigate(`/project/${project.id}`)}
                className="group relative glass-tech rounded-2xl md:rounded-3xl p-5 md:p-6 cursor-pointer transition-all duration-300 overflow-hidden border-slate-800 hover:border-cyan-500/40">
                
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-linear-to-br from-cyan-500/5 to-transparent"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="text-[9px] font-mono text-cyan-400/80 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                    ID-{String(project.id).padStart(4, '0')}
                  </div>
                  <button onClick={(e) => clickDeleteProject(e, project.id)}
                    className="p-2 text-slate-500 hover:text-red-400 bg-slate-800/50 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2 truncate group-hover:text-cyan-300 transition-colors uppercase tracking-tight">
                    {project.title}
                  </h3>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed line-clamp-2 min-h-[2.5rem]">
                    {project.description || "ไม่มีข้อมูลรายละเอียดสังเขปสำหรับโครงงานนี้"}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">{formatDate(project.created_at)}</span>
                  </div>
                  <div className="text-cyan-500 flex items-center gap-1 text-[10px] font-bold">
                    เข้าชม <CornerDownRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}

            {filteredProjects.length === 0 && (
              <div onClick={() => setShowCreateModal(true)}
                className="col-span-full h-48 md:h-64 glass-tech rounded-3xl border-dashed border-2 border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/30 transition-all group">
                <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="w-8 h-8 text-slate-600 group-hover:text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-400 group-hover:text-white">สร้างโครงงานแรกของคุณ</h3>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- Responsive Modals --- */}
      
      {/* 1. Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative glass-tech w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] p-6 md:p-8 animate-modal-pop border-cyan-500/20 overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-cyan-500 to-blue-600"></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3"><Cpu className="w-6 h-6 text-cyan-400" /> สร้างโครงงานใหม่</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-cyan-400 mb-2 uppercase tracking-widest">ชื่อหัวข้อโครงงาน</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0A0F1F] border border-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="ระบุชื่อโครงงาน..." />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-cyan-400 mb-2 uppercase tracking-widest">รายละเอียดสังเขป</label>
                <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0A0F1F] border border-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none transition-all"
                  placeholder="อธิบายสั้นๆ เกี่ยวกับโครงงาน..." />
              </div>
              <button type="submit" disabled={createLoading}
                className="w-full py-4 bg-linear-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2 uppercase tracking-widest">
                {createLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'ยืนยันการสร้างโครงงาน'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md" onClick={() => setShowPasswordModal(false)}></div>
          <div className="relative glass-tech w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 md:p-8 animate-modal-pop border-cyan-500/20 my-auto shadow-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cyan-500 to-blue-500"></div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2"><Lock className="w-5 h-5 text-cyan-400" /> เปลี่ยนรหัสผ่าน</h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
                {['old', 'new', 'confirm'].map((field) => (
                  <div key={field}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">
                      {field === 'old' ? 'รหัสผ่านเดิม' : field === 'new' ? 'รหัสผ่านใหม่' : 'ยืนยันรหัสผ่านใหม่'}
                    </label>
                    <input type="password" required value={passForm[field as keyof typeof passForm]}
                      onChange={(e) => setPassForm({...passForm, [field]: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="••••••••" />
                  </div>
                ))}
                <button type="submit" disabled={passLoading}
                  className="w-full py-4 mt-4 bg-linear-to-r from-cyan-600 to-blue-600 rounded-2xl font-black text-white shadow-xl flex justify-center items-center gap-2 transition-all active:scale-95 uppercase tracking-widest text-xs">
                    {passLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'อัปเดตรหัสผ่านใหม่'}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Quiz History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-md" onClick={() => setShowHistoryModal(false)}></div>
          <div className="relative glass-tech w-full max-w-2xl rounded-[2rem] p-5 md:p-8 shadow-2xl animate-modal-pop border-indigo-500/20 flex flex-col max-h-[85dvh]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-indigo-500 to-purple-600"></div>
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2"><History className="w-5 h-5 text-indigo-400" /> ประวัติการสอบ</h3>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 bg-slate-800/50 rounded-full text-slate-400"><X className="w-5 h-5"/></button>
            </div>
            <div className="overflow-y-auto pr-1 space-y-3 custom-scrollbar flex-1">
              {quizHistory.length === 0 ? (
                <div className="text-center py-16 text-slate-600">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-10" />
                  <p className="font-bold">ไม่มีข้อมูลการทดสอบ</p>
                </div>
              ) : (
                quizHistory.map((attempt, index) => (
                  <div key={attempt.id} className="bg-[#1E293B]/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${attempt.passed ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        #{quizHistory.length - index}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-bold text-base md:text-lg flex items-center gap-2 truncate">
                          {attempt.score} <span className="text-xs text-slate-500 font-medium">/ {attempt.total_score} แต้ม</span>
                        </div>
                        <div className="text-[10px] md:text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                          <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {formatDate(attempt.created_at)}</span>
                          <span className="flex items-center gap-1 font-mono text-cyan-700">{formatTime(attempt.time_spent_seconds)}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-[10px] font-black shrink-0 uppercase tracking-tighter ${attempt.passed ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {attempt.passed ? 'PASS' : 'FAIL'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Leaderboard Modal (Responsive Table) */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4">
          <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-md" onClick={() => setShowLeaderboard(false)}></div>
          <div className="relative glass-tech w-full max-w-3xl rounded-[2rem] p-5 md:p-8 shadow-2xl animate-modal-pop border-amber-500/20 flex flex-col max-h-[90dvh]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-amber-400 to-orange-600"></div>
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20 shrink-0"><Crown className="w-6 h-6 text-amber-400" /></div>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-black text-white truncate uppercase tracking-tight">Top Performance</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Rankings</p>
                  </div>
                </div>
                <button onClick={() => setShowLeaderboard(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 shrink-0"><X className="w-5 h-5"/></button>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar -mx-1 px-1">
              {leaderboardLoading ? (
                <div className="flex justify-center items-center py-20"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>
              ) : (
                <div className="min-w-[500px]">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        <th className="pb-2 pl-4">Rank</th>
                        <th className="pb-2">Student Name</th>
                        <th className="pb-2">Class</th>
                        <th className="pb-2 text-center">Duration</th>
                        <th className="pb-2 text-right pr-4">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.map((item, index) => (
                        <tr key={index} className={`group ${index === 0 ? 'bg-amber-500/10' : 'bg-white/5 hover:bg-white/10'} transition-all`}>
                          <td className="py-4 pl-4 rounded-l-2xl">
                            {index === 0 ? <Medal className="w-5 h-5 text-amber-400" /> :
                             index === 1 ? <Medal className="w-5 h-5 text-slate-300" /> :
                             index === 2 ? <Medal className="w-5 h-5 text-orange-400" /> :
                             <span className="text-slate-500 font-mono text-sm ml-1.5">{index + 1}</span>}
                          </td>
                          <td className="py-4 font-bold text-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[150px]">{item.student_name}</span>
                              {index === 0 && <span className="text-[8px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-black">KING</span>}
                            </div>
                          </td>
                          <td className="py-4 text-xs font-bold text-slate-500">{item.class_room}</td>
                          <td className="py-4 text-center text-slate-400 font-mono text-[10px]">{Math.floor(item.time_spent / 60)}:{(item.time_spent % 60).toString().padStart(2, '0')}</td>
                          <td className="py-4 text-right pr-4 rounded-r-2xl">
                            <span className={`font-black font-mono text-lg ${index < 3 ? 'text-amber-400' : 'text-slate-300'}`}>{item.score}</span>
                            <span className="text-[10px] text-slate-600 font-bold ml-1">/{item.total_score}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-4 text-center sm:hidden shrink-0 py-2 border-t border-slate-800">
               <p className="text-[9px] text-cyan-600 font-black italic uppercase tracking-widest animate-pulse">Slide Left to view more info →</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
          <div className="relative glass-tech bg-[#0F172A] rounded-3xl w-full max-w-sm p-6 md:p-8 text-center animate-modal-pop border-red-500/20 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-500/20">
               <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">ยืนยันการลบข้อมูล</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-8 leading-relaxed">โครงงานนี้และข้อมูลที่เกี่ยวข้องทั้งหมดจะหายไป <br/><span className="text-red-400 font-bold">ไม่สามารถกู้คืนได้</span></p>
            {deleteError && <div className="mb-4 text-red-400 text-xs font-bold animate-pulse">{deleteError}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 text-slate-400 font-bold text-sm bg-slate-800 rounded-xl">ยกเลิก</button>
              <button onClick={confirmDeleteProject} disabled={isDeleting} className="flex-1 py-3 text-white bg-red-600 rounded-xl text-sm font-black shadow-lg shadow-red-500/20 uppercase tracking-widest active:scale-95 transition-all">
                 {isDeleting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}