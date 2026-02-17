import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { 
  LogOut, LayoutDashboard, Users, FolderOpen, 
  Search, Trash2, Edit2, Save, Key, 
  TrendingUp, Activity, PieChart, GraduationCap, CheckCircle,
  Clock, Signal 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'projects'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', student_id: '', class_room: '' });

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
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Auto Refresh ทุก 5 วินาที
  useEffect(() => {
    fetchData(); 
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleResetPassword = async (studentId: number, studentName: string) => {
    if (!window.confirm(`⚠️ ยืนยันการรีเซ็ตรหัสผ่านของ "${studentName}" ?\n\nรหัสผ่านใหม่จะเป็น: password123`)) {
      return;
    }
    
    try {
      await client.post(`/auth/reset-password/${studentId}`);
      alert(`✅ รีเซ็ตรหัสผ่านของ "${studentName}" สำเร็จ!\nให้นักเรียนเข้าสู่ระบบด้วยรหัส: password123`);
    } catch (err) {
      // [FIXED] ลบ any และใช้ Type Casting แทนเพื่อผ่าน ESLint
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      alert("❌ เกิดข้อผิดพลาด: " + (error.response?.data?.detail || error.message || "Unknown Error"));
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

  // --- Sub-Components ---
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
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
          <div className="flex items-end gap-2">
            <h3 className="text-4xl font-extrabold text-white tracking-tight">{value}</h3>
            {subValue && <span className="text-xs text-slate-500 mb-1.5 font-medium">{subValue}</span>}
          </div>
        </div>
        <div className={`p-4 rounded-2xl border ${colorMap[colorClass]} group-hover:scale-110 transition-transform`}>
          <Icon className="w-9 h-9" />
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
    <div className="min-h-screen bg-[#0F172A] text-slate-300 font-kanit flex">
      
      {/* Sidebar */}
      <aside className="w-72 bg-[#1E293B] border-r border-slate-800 flex flex-col fixed h-full z-30 shadow-2xl">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none">Teacher OS</h1>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">Command & Analytics</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 text-slate-400'}`}>
            <LayoutDashboard className="w-5 h-5" /> ภาพรวมระบบ
          </button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium transition-all ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 text-slate-400'}`}>
            <Users className="w-5 h-5" /> จัดการผู้เรียน
          </button>
          <button onClick={() => setActiveTab('projects')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium transition-all ${activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 text-slate-400'}`}>
            <FolderOpen className="w-5 h-5" /> ติดตามโครงงาน
          </button>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-bold transition-all shadow-sm">
            <LogOut className="w-5 h-5" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-10">
        
        {/* === OVERVIEW TAB === */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-10 animate-in fade-in duration-700">
            
            {/* Row 1: สถิติหลัก (5 ใบ) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {/* 1. Active Users (Realtime) */}
              <StatCard 
                title="Active Users" 
                value={stats.total_active_users} 
                icon={Signal} 
                colorClass="cyan"
                subValue="Online"
              />
              
              {/* 2. Total Students */}
              <StatCard title="นักเรียนทั้งหมด" value={stats.total_students} icon={Users} colorClass="blue" />
              
              {/* 3. Total Projects */}
              <StatCard title="โครงงานทั้งหมด" value={stats.total_projects} icon={FolderOpen} colorClass="purple" />
              
              {/* 4. Completed Projects */}
              <StatCard title="ผ่านเกณฑ์แล้ว" value={stats.completed_projects} icon={CheckCircle} colorClass="emerald" />
              
              {/* 5. Average Score */}
              <StatCard title="คะแนนเฉลี่ย" value={stats.average_score} icon={TrendingUp} colorClass="orange" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* Class Distribution (แบบเดิม Progress Bar) */}
              <div className="bg-[#1E293B] p-8 rounded-3xl border border-slate-800 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                  <PieChart className="w-6 h-6 text-indigo-400"/> จำนวนนักเรียนแยกตามห้อง
                </h3>
                <div className="space-y-6">
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

              {/* Time per Step Graph (Realtime Data) */}
              <div className="bg-[#1E293B] p-8 rounded-3xl border border-slate-800 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Clock className="w-6 h-6 text-pink-400"/> เวลาเฉลี่ยต่อขั้นตอน (นาที)
                </h3>
                <div className="space-y-5">
                  {Object.entries(stats.avg_time_per_step || {}).sort().map(([stepName, seconds]) => {
                    const percent = Math.min((seconds / 3600) * 100, 100); 
                    return (
                      <div key={stepName} className="group">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-200 font-bold">{stepName}</span>
                          <span className="text-pink-400 font-mono">{formatTime(seconds)}</span>
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
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-[#1E293B] p-6 rounded-3xl border border-slate-800 shadow-lg">
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
                <span className="text-xs font-bold text-slate-500 uppercase">กรองห้อง:</span>
                <select 
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="bg-[#0F172A] border border-slate-700 rounded-xl px-6 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {classList.map(c => <option key={c} value={c}>{c === 'All' ? 'ทุกห้องเรียน' : c}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-[#1E293B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <tr>
                    <th className="p-6">รหัสนักเรียน</th>
                    <th className="p-6">ชื่อ - นามสกุล</th>
                    <th className="p-6">ห้องเรียน</th>
                    <th className="p-6 text-center">จำนวนงาน</th>
                    <th className="p-6 text-center text-emerald-400">เกรดเฉลี่ย</th> 
                    <th className="p-6 text-right">จัดการข้อมูล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {getFilteredStudents().map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="p-6 font-mono text-indigo-400 font-bold">{s.student_id}</td>
                      <td className="p-6 text-white font-medium">{s.first_name} {s.last_name}</td>
                      <td className="p-6"><span className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold">{s.class_room}</span></td>
                      <td className="p-6 text-center font-bold text-slate-400">{s.project_count}</td>
                      
                      <td className="p-6 text-center">
                         <span className={`px-3 py-1 rounded-lg text-sm font-black ${
                           s.average_score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                           s.average_score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                           'bg-red-500/20 text-red-400'
                         }`}>
                           {s.average_score}
                         </span>
                      </td>

                      <td className="p-6 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleResetPassword(s.id, s.first_name)} 
                          title="รีเซ็ตรหัสผ่านเป็น password123"
                          className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-lg shadow-orange-500/10"
                        >
                          <Key className="w-4 h-4"/>
                        </button>

                        <button onClick={() => { setEditingStudent(s); setEditForm({...s}); }} className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => { if(confirm("ลบข้อมูล?")) client.delete(`/edp/teacher/students/${s.id}`).then(() => fetchData()); }} className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/10"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === PROJECTS TAB === */}
        {activeTab === 'projects' && (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
             <div className="bg-[#1E293B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <tr>
                    <th className="p-6">เจ้าของโครงงาน</th>
                    <th className="p-6">ชื่อโครงงาน</th>
                    <th className="p-6 text-center">ความคืบหน้า</th>
                    <th className="p-6 text-right">แอคชั่น</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {projects.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-6">
                        <div className="text-white font-bold">{p.owner.first_name} {p.owner.last_name}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{p.owner.class_room}</div>
                      </td>
                      <td className="p-6 text-slate-200 font-medium">{p.title}</td>
                      <td className="p-6">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(p.latest_step / 6) * 100}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-400">Step {p.latest_step}/6</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <button 
                          onClick={() => navigate(`/teacher/project/${p.id}`)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
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
        )}

      </main>

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-[#1E293B] p-10 rounded-[2.5rem] border border-slate-700 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-white mb-8 text-center uppercase tracking-wider">แก้ไขข้อมูลนักเรียน</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="ชื่อจริง" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} className="bg-[#0F172A] border border-slate-700 rounded-2xl px-5 py-3.5 text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
                <input placeholder="นามสกุล" value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} className="bg-[#0F172A] border border-slate-700 rounded-2xl px-5 py-3.5 text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
              </div>
              <input placeholder="รหัสนักเรียน" value={editForm.student_id} onChange={e => setEditForm({...editForm, student_id: e.target.value})} className="w-full bg-[#0F172A] border border-slate-700 rounded-2xl px-5 py-3.5 text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
              <input placeholder="ห้องเรียน" value={editForm.class_room} onChange={e => setEditForm({...editForm, class_room: e.target.value})} className="w-full bg-[#0F172A] border border-slate-700 rounded-2xl px-5 py-3.5 text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setEditingStudent(null)} className="flex-1 px-4 py-4 text-slate-400 font-bold hover:text-white transition-all">ยกเลิก</button>
              <button onClick={() => client.patch(`/edp/teacher/students/${editingStudent.id}`, editForm).then(() => { setEditingStudent(null); fetchData(); })} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">
                <Save className="w-5 h-5" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}