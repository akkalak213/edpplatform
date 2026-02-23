import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { 
  LogOut, LayoutDashboard, Users, FolderOpen, 
  Search, Trash2, Edit2, Save, Key, 
  TrendingUp, Activity, PieChart, GraduationCap, CheckCircle,
  Clock, Signal, Trophy, AlertCircle, X, Menu, Loader2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import TeacherQuizAnalytics from './TeacherQuizAnalytics';

// Interfaces
interface Stats {
  total_students: number;
  total_projects: number;
  completed_projects: number;
  average_score: number;
  class_distribution: Record<string, number>;
  total_active_users: number;
  avg_time_per_step: Record<string, number>;
  student_performance_avg: number;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  student_id: string;
  class_room: string;
  email: string;
  project_count: number;
  average_score: number;
}

interface Project {
  id: number;
  title: string;
  status: string;
  latest_step: number;
  owner: {
    first_name: string;
    last_name: string;
    class_room: string;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  subValue?: string;
}

// Modal State Interfaces
interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'red' | 'indigo' | 'orange';
  onConfirm: () => void;
}

interface AlertModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error';
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'projects' | 'analytics'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // --- States ใหม่สำหรับแก้ความดีเลย์ ---
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', student_id: '', class_room: '' });

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false, title: '', message: '', confirmText: 'ยืนยัน', confirmColor: 'indigo', onConfirm: () => {}
  });
  
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    isOpen: false, title: '', message: '', type: 'success'
  });

  // [FIXED] ใช้ fetchData โดยตรงใน useCallback ไม่ต้องใช้ useRef ให้ซับซ้อน
  const fetchData = useCallback(async () => {
    try {
      const [resStats, resStudents, resProjects] = await Promise.all([
        client.get('/edp/teacher/stats'),
        client.get('/edp/teacher/students'),
        client.get('/edp/teacher/projects')
      ]);
      setStats(resStats.data);
      setStudents(resStudents.data);
      setProjects(resProjects.data);
    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // รันครั้งแรกเมื่อโหลดหน้า
    fetchData();
    
    // ตั้ง interval ให้ดึงข้อมูลอัตโนมัติทุก 10 วินาที
    const interval = setInterval(fetchData, 10000); 

    return () => clearInterval(interval);
  }, [fetchData]); 

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleResetPassword = (studentId: number, studentName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการรีเซ็ตรหัสผ่าน',
      message: `คุณต้องการรีเซ็ตรหัสผ่านของนักเรียน "${studentName}" ใช่หรือไม่?\nรหัสผ่านใหม่จะเป็น: password123`,
      confirmText: 'รีเซ็ตรหัสผ่าน',
      confirmColor: 'orange',
      onConfirm: async () => {
        setIsConfirmingAction(true); // เปิด Loading
        try {
          await client.post(`/auth/reset-password/${studentId}`);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({
            isOpen: true,
            title: 'ดำเนินการสำเร็จ',
            message: `รีเซ็ตรหัสผ่านเรียบร้อยแล้ว\nให้นักเรียนเข้าสู่ระบบด้วยรหัส: password123`,
            type: 'success'
          });
        } catch (err) {
          console.error("Reset password failed:", err); // [FIXED] ใช้ err
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          const error = err as { response?: { data?: { detail?: string } }; message?: string };
          setAlertModal({
            isOpen: true,
            title: 'เกิดข้อผิดพลาด',
            message: error.response?.data?.detail || "ไม่สามารถรีเซ็ตรหัสผ่านได้",
            type: 'error'
          });
        } finally {
          setIsConfirmingAction(false); // ปิด Loading
        }
      }
    });
  };

  const handleDeleteStudent = (student: Student) => {
    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลบข้อมูล',
      message: `คุณแน่ใจหรือไม่ที่จะลบข้อมูลของ "${student.first_name} ${student.last_name}"?\nการกระทำนี้ไม่สามารถกู้คืนได้`,
      confirmText: 'ลบข้อมูลทันที',
      confirmColor: 'red',
      onConfirm: async () => {
        setIsConfirmingAction(true); // เปิด Loading
        try {
          await client.delete(`/edp/teacher/students/${student.id}`);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          fetchData(); // ดึงข้อมูลใหม่
        } catch (err) {
          console.error("Delete failed:", err);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({
            isOpen: true,
            title: 'เกิดข้อผิดพลาด',
            message: 'ไม่สามารถลบข้อมูลได้',
            type: 'error'
          });
        } finally {
          setIsConfirmingAction(false); // ปิด Loading
        }
      }
    });
  };

  const handleEditStudentSave = async () => {
    if (!editingStudent) return;
    setEditLoading(true);
    try {
      await client.patch(`/edp/teacher/students/${editingStudent.id}`, editForm);
      setEditingStudent(null);
      fetchData(); // ดึงข้อมูลใหม่
      setAlertModal({ isOpen: true, title: 'สำเร็จ', message: 'อัปเดตข้อมูลนักเรียนเรียบร้อยแล้ว', type: 'success' });
    } catch (err) {
      console.error("Update failed:", err); // [FIXED] ใช้ err เผื่อมีปัญหา
      setAlertModal({ isOpen: true, title: 'ผิดพลาด', message: 'ไม่สามารถแก้ไขข้อมูลได้', type: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  const getFilteredStudents = () => {
    return students.filter(s => 
      (s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       s.student_id.includes(searchTerm)) &&
      (filterClass === 'All' || s.class_room === filterClass)
    );
  };

  const classList = ['All', ...Array.from(new Set(students.map(s => s.class_room))).sort()];

  const formatTime = (seconds: number) => {
    if (!seconds) return "0m";
    const mins = Math.floor(seconds / 60);
    return `${mins}m ${Math.floor(seconds % 60)}s`;
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, subValue }: StatCardProps) => {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      emerald: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
      purple: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
      orange: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
      pink: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
      cyan: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
    };

    return (
      <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-xl flex items-center justify-between hover:border-slate-500 transition-all group">
        <div className="min-w-0 flex-1 mr-3">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 truncate">{title}</p>
          <div className="flex items-end gap-2 flex-wrap">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{value}</h3>
            {subValue && <span className="text-xs text-slate-500 mb-1.5 font-medium">{subValue}</span>}
          </div>
        </div>
        <div className={`p-3 sm:p-4 rounded-2xl border shrink-0 ${colorMap[colorClass]} group-hover:scale-110 transition-transform`}>
          <Icon className="w-7 h-7 sm:w-9 sm:h-9" />
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-slate-400 font-kanit">
      <Activity className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
      <p className="text-lg animate-pulse">กำลังเตรียมข้อมูล Command Center...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-300 font-kanit flex relative">
      
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-72 bg-[#1E293B] border-r border-slate-800 flex flex-col fixed h-full z-30 shadow-2xl
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-6 lg:p-8 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white leading-none">Teacher OS</h1>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">Command & Analytics</span>
              </div>
            </div>
            <button
              className="lg:hidden text-slate-400 hover:text-white p-1"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          {(
            [
              { tab: 'overview',   icon: LayoutDashboard, label: 'ภาพรวมระบบ' },
              { tab: 'students',   icon: Users,           label: 'จัดการผู้เรียน' },
              { tab: 'projects',   icon: FolderOpen,      label: 'ติดตามโครงงาน' },
              { tab: 'analytics',  icon: Trophy,          label: 'ผลการทดสอบ' },
            ] as const
          ).map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" /> {label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-bold transition-all shadow-sm">
            <LogOut className="w-5 h-5" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-w-0">

        {/* Top Bar Mobile */}
        <div className="lg:hidden sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur border-b border-slate-800 flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white p-1"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white text-base">Teacher OS</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-10">

          {/* === OVERVIEW TAB === */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
                <StatCard title="Active Users" value={stats.total_active_users} icon={Signal} colorClass="cyan" subValue="Online" />
                <StatCard title="นักเรียนทั้งหมด" value={stats.total_students} icon={Users} colorClass="blue" />
                <StatCard title="โครงงานทั้งหมด" value={stats.total_projects} icon={FolderOpen} colorClass="purple" />
                <StatCard title="ผ่านเกณฑ์แล้ว" value={stats.completed_projects} icon={CheckCircle} colorClass="emerald" />
                <StatCard title="คะแนนเฉลี่ย" value={stats.average_score} icon={TrendingUp} colorClass="orange" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                {/* Class Distribution */}
                <div className="bg-[#1E293B] p-6 lg:p-8 rounded-3xl border border-slate-800 shadow-xl">
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-6 lg:mb-8 flex items-center gap-3">
                    <PieChart className="w-6 h-6 text-indigo-400 shrink-0"/> จำนวนนักเรียนแยกตามห้อง
                  </h3>
                  <div className="space-y-5 lg:space-y-6">
                    {Object.entries(stats.class_distribution).sort().map(([cls, count]) => (
                      <div key={cls} className="group">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-200 font-medium">{cls}</span>
                          <span className="text-indigo-400 font-bold">{count} คน</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-1000 group-hover:bg-indigo-400" 
                            style={{ width: `${(count / (stats.total_students || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    {Object.keys(stats.class_distribution).length === 0 && <div className="text-center text-slate-500">ไม่มีข้อมูลนักเรียน</div>}
                  </div>
                </div>

                {/* Time per Step Graph */}
                <div className="bg-[#1E293B] p-6 lg:p-8 rounded-3xl border border-slate-800 shadow-xl">
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-5 lg:mb-6 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-pink-400 shrink-0"/> เวลาเฉลี่ยต่อขั้นตอน (นาที)
                  </h3>
                  <div className="space-y-4 lg:space-y-5">
                    {Object.entries(stats.avg_time_per_step || {}).sort().map(([stepName, seconds]) => {
                      const percent = Math.min((seconds / 3600) * 100, 100); 
                      return (
                        <div key={stepName} className="group">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-200 font-bold truncate mr-2">{stepName}</span>
                            <span className="text-pink-400 font-mono shrink-0">{formatTime(seconds)}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700 relative">
                            <div 
                              className="bg-pink-500 h-full rounded-full transition-all duration-1000 group-hover:bg-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]" 
                              style={{ width: `${Math.max(percent, 5)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(stats.avg_time_per_step || {}).length === 0 && (
                        <div className="text-center text-slate-500 py-10">ยังไม่มีข้อมูลเวลาการใช้งาน</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === STUDENTS TAB === */}
          {activeTab === 'students' && (
            <div className="space-y-6 lg:space-y-8 animate-in slide-in-from-right-10 duration-500">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#1E293B] p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-lg">
                <div className="relative w-full md:w-1/2">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-2xl pl-12 pr-6 py-3.5 text-white focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                  />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">กรองห้อง:</span>
                  <select 
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="flex-1 bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {classList.map(c => <option key={c} value={c}>{c === 'All' ? 'ทุกห้องเรียน' : c}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-[#1E293B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-175">
                    <thead className="bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <tr>
                        <th className="p-4 lg:p-6">รหัสนักเรียน</th>
                        <th className="p-4 lg:p-6">ชื่อ - นามสกุล</th>
                        <th className="p-4 lg:p-6">ห้องเรียน</th>
                        <th className="p-4 lg:p-6 text-center">จำนวนงาน</th>
                        <th className="p-4 lg:p-6 text-center text-emerald-400">เกรดเฉลี่ย</th> 
                        <th className="p-4 lg:p-6 text-right">จัดการข้อมูล</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {getFilteredStudents().map(s => (
                        <tr key={s.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="p-4 lg:p-6 font-mono text-indigo-400 font-bold">{s.student_id}</td>
                          <td className="p-4 lg:p-6 text-white font-medium whitespace-nowrap">{s.first_name} {s.last_name}</td>
                          <td className="p-4 lg:p-6"><span className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">{s.class_room}</span></td>
                          <td className="p-4 lg:p-6 text-center font-bold text-slate-400">{s.project_count}</td>
                          
                          <td className="p-4 lg:p-6 text-center">
                              <span className={`px-3 py-1 rounded-lg text-sm font-black ${
                                s.average_score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                                s.average_score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {s.average_score}
                              </span>
                          </td>

                          <td className="p-4 lg:p-6">
                            <div className="flex justify-end gap-2 lg:gap-3 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleResetPassword(s.id, s.first_name)} className="p-2 lg:p-2.5 bg-orange-500/10 text-orange-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-lg shadow-orange-500/10" title="รีเซ็ตรหัสผ่านเป็น password123"><Key className="w-4 h-4"/></button>
                              <button onClick={() => { setEditingStudent(s); setEditForm({...s}); }} className="p-2 lg:p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10"><Edit2 className="w-4 h-4"/></button>
                              <button onClick={() => handleDeleteStudent(s)} className="p-2 lg:p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/10"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* === PROJECTS TAB === */}
          {activeTab === 'projects' && (
            <div className="space-y-6 lg:space-y-8 animate-in slide-in-from-right-10 duration-500">
               <div className="bg-[#1E293B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-150">
                    <thead className="bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <tr>
                        <th className="p-4 lg:p-6">เจ้าของโครงงาน</th>
                        <th className="p-4 lg:p-6">ชื่อโครงงาน</th>
                        <th className="p-4 lg:p-6 text-center">ความคืบหน้า</th>
                        <th className="p-4 lg:p-6 text-right">แอคชั่น</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {projects.map(p => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 lg:p-6">
                            <div className="text-white font-bold whitespace-nowrap">{p.owner.first_name} {p.owner.last_name}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{p.owner.class_room}</div>
                          </td>
                          <td className="p-4 lg:p-6 text-slate-200 font-medium">{p.title}</td>
                          <td className="p-4 lg:p-6">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-24 lg:w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(p.latest_step / 6) * 100}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-indigo-400">Step {p.latest_step}/6</span>
                            </div>
                          </td>
                          <td className="p-4 lg:p-6 text-right">
                            <button 
                              onClick={() => navigate(`/teacher/project/${p.id}`)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 whitespace-nowrap"
                            >
                              ตรวจงานละเอียด
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* === ANALYTICS TAB === */}
          {activeTab === 'analytics' && (
            <TeacherQuizAnalytics />
          )}

        </div>
      </main>
{/* Edit Modal (Student Info) */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-[#1E293B] p-6 sm:p-10 rounded-4xl sm:rounded-[2.5rem] border border-slate-700 w-full max-w-md shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-black text-white mb-6 sm:mb-8 text-center uppercase tracking-wider">แก้ไขข้อมูลนักเรียน</h3>
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <input placeholder="ชื่อจริง" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} className="bg-[#0F172A] border border-slate-700 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm sm:text-base"/>
                <input placeholder="นามสกุล" value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} className="bg-[#0F172A] border border-slate-700 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm sm:text-base"/>
              </div>
              <input placeholder="รหัสนักเรียน" value={editForm.student_id} onChange={e => setEditForm({...editForm, student_id: e.target.value})} className="w-full bg-[#0F172A] border border-slate-700 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm sm:text-base"/>
              
              {/* ✅ เปลี่ยนส่วนนี้เป็น Dropdown */}
              <select 
                value={editForm.class_room} 
                onChange={e => setEditForm({...editForm, class_room: e.target.value})} 
                className="w-full bg-[#0F172A] border border-slate-700 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm sm:text-base appearance-none cursor-pointer"
              >
                <option value="" disabled>เลือกห้องเรียน</option>
                <option value="ม.4/1">ม.4/1</option>
                <option value="ม.4/2">ม.4/2</option>
                <option value="ม.4/3">ม.4/3</option>
                <option value="ม.4/4">ม.4/4</option>
                <option value="ม.4/5">ม.4/5</option>
              </select>
              
            </div>
            <div className="flex gap-4 mt-8 sm:mt-10">
              <button onClick={() => setEditingStudent(null)} className="flex-1 px-4 py-3 sm:py-4 text-slate-400 font-bold hover:text-white transition-all text-sm sm:text-base">ยกเลิก</button>
              <button 
                onClick={handleEditStudentSave}
                disabled={editLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-black shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50"
              >
                {editLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Save className="w-4 h-4 sm:w-5 sm:h-5" />} บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-slate-600 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 bg-${confirmModal.confirmColor}-500/10 border border-${confirmModal.confirmColor}-500/20`}>
              <AlertCircle className={`w-7 h-7 sm:w-8 sm:h-8 text-${confirmModal.confirmColor}-500`} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-2">{confirmModal.title}</h3>
            <p className="text-slate-400 text-center text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed whitespace-pre-line">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(prev => ({...prev, isOpen: false}))} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all text-sm">ยกเลิก</button>
              <button 
                onClick={confirmModal.onConfirm}
                disabled={isConfirmingAction}
                className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition-all text-sm flex justify-center items-center gap-2 disabled:opacity-50
                  ${confirmModal.confirmColor === 'red' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 
                    confirmModal.confirmColor === 'orange' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20' : 
                    'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'}`}
              >
                {isConfirmingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-slate-600 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={() => setAlertModal(prev => ({...prev, isOpen: false}))} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 ${alertModal.type === 'success' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
              {alertModal.type === 'success' ? <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-500"/> : <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500"/>}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-2">{alertModal.title}</h3>
            <p className="text-slate-400 text-center text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed whitespace-pre-line">{alertModal.message}</p>
            <button onClick={() => setAlertModal(prev => ({...prev, isOpen: false}))} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm">รับทราบ</button>
          </div>
        </div>
      )}

    </div>
  );
}