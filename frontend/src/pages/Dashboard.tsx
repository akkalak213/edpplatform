import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { 
  LogOut, Plus, X, Loader2, Trash2, Cpu, Activity, CornerDownRight, 
  Layers, Search, CalendarClock, AlertTriangle, Lock, Trophy, History, Medal, Crown,
  ChevronDown, BarChart3, XCircle, CheckCircle, User
} from 'lucide-react';
import Toast from '../components/Toast';

// --- Interfaces ---
interface Project {
  id: number;
  title: string;
  description: string;
  created_at?: string;
}

interface AnswerLog {
  question_id: number;
  selected: number;
  correct: number;
  is_correct: boolean;
  category: string;
}

interface QuizAttempt {
  id: number;
  score: number;
  total_score: number;
  passed: boolean;
  time_spent_seconds: number;
  created_at: string;
  details?: AnswerLog[]; 
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
  
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({ 
    message: '', type: 'success', isVisible: false 
  });

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(''); 

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'info' | 'password'>('info');
  const [profileForm, setProfileForm] = useState({
    first_name: '', last_name: '', student_id: '', email: '', class_room: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);

  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [expandedAttemptId, setExpandedAttemptId] = useState<number | null>(null);
  const [attemptDetails, setAttemptDetails] = useState<Record<number, AnswerLog[]>>({});
  const [detailsLoading, setDetailsLoading] = useState<Record<number, boolean>>({});

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchLeaderboard();
    fetchProfile();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, isVisible: true });
  };

  const fetchProfile = async () => {
    try {
      const res = await client.get('/auth/me');
      setProfileForm(res.data);
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  };

  const fetchProjects = async () => {
    setIsProjectsLoading(true);
    try {
      const res = await client.get('/edp/projects');
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setIsProjectsLoading(false);
    }
  };

  const fetchQuizHistory = async () => {
    setHistoryLoading(true);
    setExpandedAttemptId(null);
    try {
      const res = await client.get('/quiz/history');
      setQuizHistory(res.data);
      setShowHistoryModal(true);
    } catch (err) {
      console.error("Failed to fetch history", err);
      showToast("ไม่สามารถดึงข้อมูลประวัติการสอบได้", 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleDetails = async (attemptId: number, initialDetails?: AnswerLog[]) => {
    if (expandedAttemptId === attemptId) {
      setExpandedAttemptId(null);
      return;
    }
    
    setExpandedAttemptId(attemptId);
    if (attemptDetails[attemptId]) return;

    setDetailsLoading(prev => ({ ...prev, [attemptId]: true }));

    try {
      if (initialDetails && initialDetails.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setAttemptDetails(prev => ({ ...prev, [attemptId]: initialDetails }));
      } else {
        const res = await client.get(`/quiz/history/${attemptId}`);
        setAttemptDetails(prev => ({ ...prev, [attemptId]: res.data.details || res.data || [] }));
      }
    } catch (err) {
      console.error("Failed to fetch attempt details", err);
      showToast("ดึงรายละเอียดการสอบล้มเหลว", 'error');
    } finally {
      setDetailsLoading(prev => ({ ...prev, [attemptId]: false }));
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

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
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
      await fetchProjects();
      showToast("สร้างโครงงานเรียบร้อยแล้ว", 'success');
    } catch (err) {
      console.error("Create error:", err);
      showToast("เกิดข้อผิดพลาดในการสร้างโครงงาน", 'error');
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
      setProjects(prev => prev.filter(p => p.id !== projectToDelete));
      setShowDeleteModal(false);
      showToast("ลบโครงงานเรียบร้อยแล้ว", 'success');
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleteError("เกิดข้อผิดพลาด: ไม่สามารถลบข้อมูลได้ในขณะนี้");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
        await client.patch('/auth/profile', {
            first_name: profileForm.first_name,
            last_name: profileForm.last_name,
            class_room: profileForm.class_room
        });
        showToast("อัปเดตข้อมูลสำเร็จ!", 'success');
    } catch (err) {
        console.error("Update profile error:", err); // [FIXED] ใช้ตัวแปร err เพื่อแก้ ESLint warning
        showToast("อัปเดตข้อมูลไม่สำเร็จ", 'error');
    } finally {
        setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.new !== passForm.confirm) {
        showToast("รหัสผ่านใหม่ไม่ตรงกัน", 'error');
        return;
    }
    setPassLoading(true);
    try {
        await client.post('/auth/change-password', {
            old_password: passForm.old,
            new_password: passForm.new
        });
        showToast("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!", 'success');
        setPassForm({ old: '', new: '', confirm: '' });
        setShowProfileModal(false);
    } catch (err) {
        const error = err as { response?: { data?: { detail?: string } } };
        const errorMsg = error.response?.data?.detail || "รหัสผ่านเดิมไม่ถูกต้อง";
        showToast("เกิดข้อผิดพลาด: " + errorMsg, 'error');
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
    <div className="min-h-screen bg-[#020617] text-slate-300 relative overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-200">
      
      {toast.isVisible && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      )}

      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10h80v80h-80z' fill='none' stroke='%2338bdf8' stroke-width='0.5'/%3E%3Cpath d='M30 30h40v40h-40z' fill='none' stroke='%2338bdf8' stroke-width='0.5' opacity='0.5'/%3E%3C/svg%3E")`, backgroundSize: '60px 60px' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-soft-light"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[150%] md:w-50 h-[150%] md:h-50 bg-cyan-600/10 blur-[100px] md:blur-[150px] rounded-full mix-blend-screen animate-pulse-slow"></div>
      </div>

      <style>{`
        .animate-pulse-slow { animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .glass-tech { background: rgba(2, 6, 23, 0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(56, 189, 248, 0.1); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); }
        .glass-tech-hover:hover { background: rgba(2, 6, 23, 0.8); border-color: rgba(56, 189, 248, 0.3); box-shadow: 0 0 20px rgba(56, 189, 248, 0.15), inset 0 0 10px rgba(56, 189, 248, 0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        @keyframes modalPop { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-modal-pop { animation: modalPop 0.2s ease-out forwards; }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        
        {/* --- Header Deck --- */}
        <header className="mb-8 md:mb-12 glass-tech rounded-2xl md:rounded-3xl p-4 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo Section */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-md animate-pulse"></div>
                <div className="relative bg-[#0F172A] border border-cyan-500/50 rounded-xl p-2 md:p-2.5">
                  <Cpu className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                </div>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">EDP <span className="text-cyan-400">NEXUS</span></h1>
                <div className="flex items-center gap-2 text-[10px] md:text-xs text-cyan-600/70 font-medium">
                  <Activity className="w-3 h-3" /> ระบบพร้อมใช้งาน v2.5.0
                </div>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3 w-full sm:w-auto">
              {/* Search Desktop */}
              <div className="relative group hidden lg:block">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="text" placeholder="ค้นหาโครงงาน..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#0F172A]/50 border border-slate-700/50 text-slate-300 text-sm rounded-xl pl-10 pr-4 py-2 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all w-40 focus:w-56"
                />
              </div>

              <button
                onClick={fetchQuizHistory}
                disabled={historyLoading}
                className="p-2 md:p-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all shrink-0"
                title="ประวัติการสอบ"
              >
                {historyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <History className="w-5 h-5" />}
              </button>

              <button
                onClick={() => { setShowLeaderboard(true); fetchLeaderboard(); }}
                className="p-2 md:p-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all shrink-0"
                title="อันดับคะแนน"
              >
                <Trophy className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('/student/quiz')}
                className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 text-sm font-bold"
              >
                <Trophy className="w-4 h-4 md:w-5 md:h-5" /> 
                <span className="hidden sm:inline">ทำแบบทดสอบ</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-linear-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 shrink-0 text-sm font-medium"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden sm:inline">สร้างโครงงานใหม่</span>
              </button>

              <button 
                onClick={() => { setProfileTab('info'); setShowProfileModal(true); }}
                className="p-2 md:p-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all shrink-0"
                title="โปรไฟล์ส่วนตัว"
              >
                <User className="w-5 h-5" />
              </button>

              <button 
                onClick={handleLogoutClick}
                className="p-2 md:p-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                title="ออกจากระบบ"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Mobile */}
          <div className="relative group lg:hidden w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text" placeholder="ค้นหาโครงงาน..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F172A]/50 border border-slate-700/50 text-slate-300 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none"
            />
          </div>
        </header>

        {/* --- Project Grid --- */}
        <main className="pb-20">
          <div className="flex items-center justify-between mb-6 md:mb-8 px-2">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-500" /> โครงงานทั้งหมด
              </h2>
              <p className="text-slate-500 text-xs md:text-sm font-light">เลือกโครงงานเพื่อเข้าสู่พื้นที่การทำงาน</p>
            </div>
            <div className="text-[10px] md:text-xs text-slate-600 font-medium">
              จำนวน: <span className="text-cyan-400">{filteredProjects.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {isProjectsLoading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 bg-[#1E293B]/30 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-slate-400 font-medium">กำลังเรียกข้อมูลพื้นที่ทำงาน...</p>
              </div>
            ) : (
              <>
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="group relative glass-tech glass-tech-hover rounded-3xl md:rounded-4xl p-5 md:p-6 cursor-pointer transition-all duration-500 overflow-hidden animate-in fade-in zoom-in-95"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className="absolute -inset-0.5 bg-linear-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl md:rounded-4xl blur-md"></div>
                    </div>

                    <div className="flex justify-between items-start mb-4 md:mb-5 relative z-10">
                      <div className="text-[9px] md:text-[10px] text-cyan-300/70 bg-cyan-950/30 border border-cyan-900/50 px-2 md:px-3 py-1 rounded-full uppercase tracking-wider font-medium">
                        รหัส :: {String(project.id).padStart(4, '0')}
                      </div>
                      
                      <button 
                        onClick={(e) => clickDeleteProject(e, project.id)}
                        className="p-1.5 md:p-2 text-slate-600 hover:text-red-400 bg-slate-900/50 hover:bg-red-950/30 rounded-lg md:rounded-xl border border-transparent hover:border-red-900/50 transition-all opacity-100 sm:opacity-60 sm:group-hover:opacity-100 z-20"
                        title="ลบโครงงาน"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>

                    <div className="relative z-10 pl-1 md:pl-2">
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3 truncate group-hover:text-cyan-300 transition-colors">
                        {project.title}
                      </h3>
                      <div className="relative">
                        <div className="absolute -left-3 top-1 bottom-1 w-0.5 bg-slate-800 group-hover:bg-cyan-700/50 transition-colors"></div>
                        <p className="text-slate-400 text-xs md:text-sm leading-relaxed line-clamp-2 pl-2 font-light">
                            {project.description || "ไม่มีรายละเอียดสังเขป"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 md:mt-8 pt-4 border-t border-slate-800/50 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                          <CalendarClock className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 group-hover:text-cyan-500 transition-colors" />
                          <span className="text-[9px] md:text-[10px] text-slate-500 font-medium">
                            {formatDate(project.created_at)}
                          </span>
                      </div>
                      <div className="text-cyan-500 opacity-100 sm:opacity-0 sm:-translate-x-4 sm:group-hover:opacity-100 sm:group-hover:translate-x-0 transition-all duration-300 flex items-center gap-1 text-[10px] md:text-xs font-medium tracking-wider">
                        เปิด <CornerDownRight className="w-3 h-3 md:w-4 md:h-4" />
                      </div>
                    </div>
                  </div>
                ))}

                {filteredProjects.length === 0 && (
                  <div
                    onClick={() => setShowCreateModal(true)}
                    className="group col-span-full h-48 md:h-75 glass-tech rounded-3xl md:rounded-4xl border-dashed border-2 border-slate-800/80 hover:border-cyan-500/30 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-900/80 rounded-full flex items-center justify-center mb-4 md:mb-6 border border-slate-800 group-hover:border-cyan-500/50 transition-all relative z-10">
                       <Plus className="w-8 h-8 md:w-10 md:h-10 text-slate-600 group-hover:text-cyan-400" />
                     </div>
                     <h3 className="text-lg md:text-xl font-bold text-slate-300 group-hover:text-white relative z-10">พื้นที่ว่าง</h3>
                     <p className="text-slate-500 text-xs md:text-sm mt-2 relative z-10 font-light px-4 text-center">คลิกเพื่อเริ่มต้นสร้างโครงงานใหม่</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* --- Create Project Modal --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowCreateModal(false)}></div>
          
          <div className="relative glass-tech bg-[#0F172A]/90 rounded-4xl w-full max-w-lg p-6 md:p-8 shadow-2xl animate-modal-pop border-cyan-500/20 overflow-hidden my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cyan-500 to-blue-600"></div>
            
            <div className="flex justify-between items-start mb-6 md:mb-8 relative z-10">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                    <Cpu className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                    สร้างโครงงานใหม่
                </h3>
                <p className="text-slate-400 text-xs md:text-sm mt-1 font-light">ระบุรายละเอียดสำหรับโครงงานวิศวกรรมของคุณ</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 bg-slate-900/50 rounded-full text-slate-400 hover:text-white border border-slate-800 shrink-0">
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="space-y-4 md:space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] md:text-xs text-cyan-300/70 mb-2 font-medium ml-1">ชื่อโครงงาน</label>
                <input 
                  type="text" required
                  className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white text-sm outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="เช่น หุ่นยนต์เก็บขยะอัตโนมัติ"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs text-cyan-300/70 mb-2 font-medium ml-1">รายละเอียดสังเขป</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white text-sm outline-none transition-all focus:ring-2 focus:ring-cyan-500/20 resize-none"
                  placeholder="อธิบายเป้าหมายของโครงงาน..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-slate-400 bg-slate-900/50 border border-slate-800 rounded-xl font-medium text-sm">
                  ยกเลิก
                </button>
                <button 
                  type="submit" disabled={createLoading}
                  className="flex-[1.5] py-3 text-white bg-linear-to-r from-cyan-600 to-blue-600 rounded-xl font-medium text-sm shadow-lg shadow-cyan-500/20 flex justify-center items-center gap-2"
                >
                  {createLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'ยืนยันการสร้าง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm animate-in fade-in" onClick={() => setShowDeleteModal(false)}></div>
          <div className="relative glass-tech bg-[#0F172A] rounded-3xl w-full max-w-sm p-6 md:p-8 text-center animate-modal-pop border-red-500/20">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-red-500"></div>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
               <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">ยืนยันการลบข้อมูล</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed px-2">ข้อมูลทั้งหมดจะหายไปและกู้คืนไม่ได้</p>
            {deleteError && <div className="mb-4 text-red-400 text-xs animate-pulse">{deleteError}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 text-slate-400 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium">ยกเลิก</button>
              <button onClick={confirmDeleteProject} disabled={isDeleting} className="flex-1 py-2.5 text-white bg-red-600 rounded-xl text-sm font-bold shadow-lg shadow-red-500/20">
                 {isDeleting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Logout Confirmation Modal --- */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm animate-in fade-in" onClick={() => setShowLogoutModal(false)}></div>
          <div className="relative glass-tech bg-[#0F172A] rounded-3xl w-full max-w-sm p-6 md:p-8 text-center animate-modal-pop border-red-500/20">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-red-500"></div>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
               <LogOut className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">ยืนยันการออกจากระบบ</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed px-2">คุณต้องการออกจากระบบใช่หรือไม่?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-2.5 text-slate-400 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium">ยกเลิก</button>
              <button onClick={confirmLogout} className="flex-1 py-2.5 text-white bg-red-600 rounded-xl text-sm font-bold shadow-lg shadow-red-500/20">
                 ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Profile & Change Password Modal --- */}
      {showProfileModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-sm animate-in fade-in" onClick={() => setShowProfileModal(false)}></div>
          <div className="relative glass-tech bg-[#0F172A] rounded-4xl w-full max-w-md p-6 md:p-8 shadow-2xl animate-modal-pop border-cyan-500/20 my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cyan-500 to-blue-500"></div>
            
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-cyan-400" /> โปรไฟล์ของฉัน
                </h3>
                <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"><X className="w-5 h-5"/></button>
            </div>

            {/* --- Tabs --- */}
            <div className="flex bg-slate-900/50 p-1 rounded-xl mb-6 border border-slate-800">
              <button 
                onClick={() => setProfileTab('info')}
                className={`flex-1 py-2 text-xs md:text-sm font-medium rounded-lg transition-all ${profileTab === 'info' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              >
                ข้อมูลส่วนตัว
              </button>
              <button 
                onClick={() => setProfileTab('password')}
                className={`flex-1 py-2 text-xs md:text-sm font-medium rounded-lg transition-all ${profileTab === 'password' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              >
                เปลี่ยนรหัสผ่าน
              </button>
            </div>

            {/* --- Tab Content: Info --- */}
            {profileTab === 'info' ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium ml-1 mb-1">รหัสนักเรียน <Lock className="w-2.5 h-2.5 inline-block -mt-0.5 text-slate-500"/></label>
                    <input type="text" value={profileForm.student_id} disabled className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-slate-500 text-sm cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium ml-1 mb-1">อีเมล <Lock className="w-2.5 h-2.5 inline-block -mt-0.5 text-slate-500"/></label>
                    <input type="text" value={profileForm.email} disabled className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-slate-500 text-sm cursor-not-allowed truncate" title={profileForm.email} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium ml-1 mb-1">ชื่อจริง</label>
                    <input type="text" required value={profileForm.first_name} onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} className="w-full px-4 py-3 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium ml-1 mb-1">นามสกุล</label>
                    <input type="text" required value={profileForm.last_name} onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} className="w-full px-4 py-3 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/20" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-medium ml-1 mb-1">ห้องเรียน</label>
                  <input type="text" required value={profileForm.class_room} onChange={e => setProfileForm({...profileForm, class_room: e.target.value})} className="w-full px-4 py-3 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/20" />
                </div>

                <button type="submit" disabled={profileLoading} className="w-full py-3.5 mt-2 text-white bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 text-sm transition-all">
                    {profileLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'บันทึกข้อมูลส่วนตัว'}
                </button>
              </form>
            ) : (
              /* --- Tab Content: Password --- */
              <form onSubmit={handleChangePassword} className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                  {['old', 'new', 'confirm'].map((key) => (
                    <div key={key}>
                      <label className="text-[10px] text-slate-400 font-medium ml-1 mb-1 block">
                        {key === 'old' ? 'รหัสผ่านเดิม' : key === 'new' ? 'รหัสผ่านใหม่' : 'ยืนยันรหัสผ่านใหม่'}
                      </label>
                      <input 
                        type="password" required
                        value={passForm[key as keyof typeof passForm]}
                        onChange={(e) => setPassForm({...passForm, [key]: e.target.value})}
                        className="w-full px-4 py-3 bg-[#0A0F1F] border border-slate-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/20"
                        placeholder="••••••"
                      />
                    </div>
                  ))}
                  <button type="submit" disabled={passLoading} className="w-full py-3.5 mt-2 text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 text-sm transition-all">
                      {passLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Lock className="w-4 h-4"/>} อัปเดตรหัสผ่าน
                  </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* --- Quiz History Modal --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-sm animate-in fade-in" onClick={() => setShowHistoryModal(false)}></div>
          <div className="relative glass-tech bg-[#0F172A] rounded-3xl w-full max-w-3xl p-5 md:p-8 shadow-2xl animate-modal-pop border-indigo-500/20 flex flex-col max-h-[85vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 to-purple-500"></div>
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" /> ประวัติการสอบ
                </h3>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="overflow-y-auto pr-1 space-y-3 custom-scrollbar flex-1">
              {historyLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
              ) : quizHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Trophy className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">ยังไม่มีประวัติการสอบ</p>
                </div>
              ) : (
                quizHistory.map((attempt, index) => (
                  <div key={attempt.id} className="bg-[#1E293B] border border-slate-700 hover:border-slate-600 rounded-2xl flex flex-col overflow-hidden transition-all duration-300 shadow-lg">
                    
                    <div 
                      onClick={() => handleToggleDetails(attempt.id, attempt.details)}
                      className="p-4 md:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shrink-0
                          ${attempt.passed ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}
                        `}>
                          #{quizHistory.length - index}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-bold text-sm md:text-lg flex items-center gap-2 truncate">
                            {attempt.score} <span className="text-[10px] md:text-sm text-slate-500 font-normal">/ {attempt.total_score}</span>
                          </div>
                          <div className="text-[9px] md:text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                            <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {formatDate(attempt.created_at)}</span>
                            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {formatTime(attempt.time_spent_seconds)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 md:gap-4 shrink-0">
                        <div className={`px-2 md:px-3 py-1 rounded-lg text-[9px] md:text-xs font-bold shrink-0
                          ${attempt.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                        `}>
                          {attempt.passed ? 'ผ่าน' : 'ไม่ผ่าน'}
                        </div>
                        <div className={`p-1.5 rounded-full transition-transform duration-300 ${expandedAttemptId === attempt.id ? 'rotate-180 bg-slate-800' : 'bg-transparent'}`}>
                           <ChevronDown className="w-5 h-5 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`grid transition-all duration-300 ease-in-out ${
                        expandedAttemptId === attempt.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="p-4 md:p-6 border-t border-slate-700/50 bg-[#0F172A]/50">
                          {detailsLoading[attempt.id] ? (
                             <div className="flex flex-col justify-center items-center py-6 md:py-8 gap-3">
                                <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-indigo-500" />
                                <span className="text-[10px] md:text-xs text-slate-400 animate-pulse">กำลังประมวลผลข้อมูลรายข้อ...</span>
                             </div>
                          ) : attemptDetails[attempt.id] && attemptDetails[attempt.id].length > 0 ? (
                             <div>
                                <h4 className="text-[10px] md:text-xs font-bold text-slate-300 mb-3 md:mb-4 uppercase tracking-wider flex items-center gap-2">
                                   <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400"/> สรุปผลรายข้อ <span className="text-slate-500 font-normal">(ซ่อนเฉลย)</span>
                                </h4>
                                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 md:gap-3">
                                   {attemptDetails[attempt.id].map((log, i) => (
                                      <div key={i} className={`flex flex-col items-center justify-center py-2 md:py-3 rounded-xl border transition-all hover:scale-105
                                        ${log.is_correct ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40' : 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'}
                                      `}>
                                         <span className="text-[10px] md:text-xs text-slate-500 font-mono mb-1 md:mb-1.5 font-medium">{i + 1}</span>
                                         {log.is_correct ? <CheckCircle className="w-3.5 h-3.5 md:w-5 md:h-5 text-green-500 shadow-sm"/> : <XCircle className="w-3.5 h-3.5 md:w-5 md:h-5 text-red-500 shadow-sm"/>}
                                      </div>
                                   ))}
                                </div>
                             </div>
                          ) : (
                             <div className="text-center py-6 text-slate-500 text-xs md:text-sm">ไม่พบรายละเอียดการสอบ</div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Leaderboard Modal --- */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-120 flex items-center justify-center p-2 md:p-4">
          <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-sm animate-in fade-in" onClick={() => setShowLeaderboard(false)}></div>
          <div className="relative glass-tech bg-[#0F172A] rounded-3xl w-full max-w-3xl p-5 md:p-8 shadow-2xl animate-modal-pop border-amber-500/20 flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-amber-400 to-orange-600"></div>
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 shrink-0">
                    <Crown className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-white truncate">อันดับคะแนนสูงสุด</h3>
                    <p className="text-[10px] md:text-xs text-slate-500 truncate">Top 20 นักเรียนที่มีผลงานยอดเยี่ยม</p>
                  </div>
                </div>
                <button onClick={() => setShowLeaderboard(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 shrink-0"><X className="w-5 h-5"/></button>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar">
              {leaderboardLoading ? (
                <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
              ) : leaderboardData.length === 0 ? (
                <div className="text-center py-10 text-slate-500">ยังไม่มีข้อมูลการสอบ</div>
              ) : (
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] md:text-xs text-slate-500 border-b border-slate-700/50">
                        <th className="py-3 pl-2 md:pl-4 font-medium w-12">#</th>
                        <th className="py-3 font-medium">ชื่อ - นามสกุล</th>
                        <th className="py-3 font-medium hidden sm:table-cell">ห้อง</th>
                        <th className="py-3 font-medium text-center">เวลา</th>
                        <th className="py-3 pr-2 md:pr-4 font-medium text-right">คะแนน</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] md:text-sm">
                      {leaderboardData.map((item, index) => (
                        <tr key={index} className={`border-b border-slate-800/50 hover:bg-white/5 transition-colors ${index === 0 ? 'bg-amber-500/5' : ''}`}>
                          <td className="py-4 pl-2 md:pl-4">
                            {index === 0 ? <Medal className="w-4 h-4 md:w-5 md:h-5 text-amber-400" /> :
                             index === 1 ? <Medal className="w-4 h-4 md:w-5 md:h-5 text-slate-300" /> :
                             index === 2 ? <Medal className="w-4 h-4 md:w-5 md:h-5 text-orange-400" /> :
                             <span className="text-slate-500 font-mono ml-1.5">{index + 1}</span>}
                          </td>
                          <td className="py-4 font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-20 md:max-w-none">{item.student_name}</span>
                              {index === 0 && <span className="hidden xs:inline text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">KING</span>}
                            </div>
                          </td>
                          <td className="py-4 text-slate-400 hidden sm:table-cell">{item.class_room}</td>
                          <td className="py-4 text-center text-slate-500 font-mono text-[10px] md:text-xs">
                            {Math.floor(item.time_spent / 60)}:{(item.time_spent % 60).toString().padStart(2, '0')}
                          </td>
                          <td className="py-4 pr-2 md:pr-4 text-right">
                            <span className={`font-bold font-mono text-base md:text-lg ${index < 3 ? 'text-white' : 'text-slate-300'}`}>
                              {item.score}
                            </span>
                            <span className="text-[9px] md:text-xs text-slate-600 ml-1">/{item.total_score}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-4 text-center sm:hidden shrink-0">
               <p className="text-[10px] text-slate-600 italic">ปัดไปทางซ้ายเพื่อดูข้อมูลเพิ่มเติม</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}