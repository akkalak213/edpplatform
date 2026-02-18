import { useEffect, useState } from 'react';
import client from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Users, CheckCircle, TrendingUp, AlertTriangle, Search, Trash2, 
  Loader2, Trophy 
} from 'lucide-react';

// --- Interfaces ---
interface OverviewStats {
  total_attempts: number;
  average_score: number;
  pass_rate: number;
  max_score: number;
}

interface ItemAnalysis {
  id: number;
  question: string;
  correct_count: number;
  total_attempts: number;
  accuracy_percent: number;
  category: string;
}

interface StudentStat {
  id: number;
  name: string;
  student_id: string;
  class_room: string;
  attempts_count: number;
  best_score: number;
  latest_score: number;
  avg_score: number;
  latest_attempt_at: string;
}

export default function TeacherQuizAnalytics() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [items, setItems] = useState<ItemAnalysis[]>([]);
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resOverview, resItems, resStudents] = await Promise.all([
        client.get('/quiz/analytics/overview'),
        client.get('/quiz/analytics/items'),
        client.get('/quiz/analytics/students')
      ]);
      
      setOverview(resOverview.data);
      setItems(resItems.data);
      setStudents(resStudents.data);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm("⚠️ คำเตือน: การกระทำนี้จะลบประวัติการสอบของนักเรียน 'ทุกคน' ออกจากระบบ\n\nคุณแน่ใจหรือไม่ที่จะดำเนินการต่อ?")) return;
    
    // Double Confirm
    const confirmText = prompt("พิมพ์คำว่า 'RESET' เพื่อยืนยันการลบข้อมูล");
    if (confirmText !== "RESET") return;

    setResetting(true);
    try {
      await client.delete('/quiz/reset');
      alert("ล้างข้อมูลเรียบร้อยแล้ว");
      fetchData(); // Reload Data
    } catch (err) {
      console.error("Reset failed", err); // [FIXED] ใช้งานตัวแปร err
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    } finally {
      setResetting(false);
    }
  };

  // Filter Students
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.student_id.includes(searchTerm) ||
    s.class_room.includes(searchTerm)
  );

  // Prepare Data for Chart (Top 10 Hardest Questions)
  const chartData = items.slice(0, 10).map(item => ({
    name: `ข้อ ${item.id}`,
    accuracy: item.accuracy_percent,
    question: item.question.substring(0, 30) + "..."
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
      <Loader2 className="w-6 h-6 animate-spin" /> กำลังโหลดข้อมูล...
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users className="w-5 h-5"/></div>
            <span className="text-slate-400 text-sm">จำนวนการสอบทั้งหมด</span>
          </div>
          <div className="text-3xl font-bold text-white">{overview?.total_attempts} <span className="text-sm font-normal text-slate-500">ครั้ง</span></div>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><CheckCircle className="w-5 h-5"/></div>
            <span className="text-slate-400 text-sm">อัตราการผ่านเกณฑ์</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">{overview?.pass_rate}%</div>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Trophy className="w-5 h-5"/></div>
            <span className="text-slate-400 text-sm">คะแนนสูงสุดที่ทำได้</span>
          </div>
          <div className="text-3xl font-bold text-amber-400">{overview?.max_score} <span className="text-sm font-normal text-slate-500">คะแนน</span></div>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><TrendingUp className="w-5 h-5"/></div>
            <span className="text-slate-400 text-sm">คะแนนเฉลี่ยรวม</span>
          </div>
          <div className="text-3xl font-bold text-white">{overview?.average_score}</div>
        </div>
      </div>

      {/* 2. Charts & Item Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" /> 10 อันดับข้อที่นักเรียนตอบผิดมากที่สุด
          </h3>
          {/* [FIXED] ใช้ h-75 ตามคำแนะนำ Linter */}
          <div className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={50} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.accuracy < 50 ? '#EF4444' : '#EAB308'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-sm"></span> ตอบถูกน้อยกว่า 50% (ยากมาก)</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-500 rounded-sm"></span> ตอบถูก 50% ขึ้นไป (ปานกลาง)</div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4">จัดการข้อมูล</h3>
            <p className="text-slate-400 text-sm mb-6">
              คุณสามารถล้างข้อมูลประวัติการสอบทั้งหมด เพื่อเริ่มเก็บคะแนนรอบใหม่ได้ (Leaderboard จะถูกรีเซ็ตด้วย)
            </p>
          </div>
          
          <button 
            onClick={handleResetData}
            disabled={resetting}
            className="w-full py-4 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded-xl transition-all flex items-center justify-center gap-2 group"
          >
            {resetting ? <Loader2 className="animate-spin w-5 h-5"/> : <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            <span>รีเซ็ตข้อมูลการสอบทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* 3. Student Table */}
      <div className="bg-[#1E293B] rounded-3xl border border-slate-700 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" /> รายชื่อนักเรียนและผลการสอบ
          </h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-cyan-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">รหัสนักเรียน</th>
                <th className="p-4 font-medium">ชื่อ-นามสกุล</th>
                <th className="p-4 font-medium">ห้องเรียน</th>
                <th className="p-4 font-medium text-center">สอบไป (ครั้ง)</th>
                <th className="p-4 font-medium text-center">คะแนนล่าสุด</th>
                <th className="p-4 font-medium text-center">คะแนนดีสุด</th>
                <th className="p-4 font-medium text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-700/50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">ไม่พบข้อมูลนักเรียน</td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-cyan-400">{s.student_id}</td>
                    <td className="p-4 text-white font-medium">{s.name}</td>
                    <td className="p-4 text-slate-400">{s.class_room}</td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-700 text-white px-2 py-1 rounded-md text-xs">{s.attempts_count}</span>
                    </td>
                    <td className="p-4 text-center text-slate-300">{s.latest_score}</td>
                    <td className="p-4 text-center">
                      <span className="font-bold text-emerald-400">{s.best_score}</span>
                    </td>
                    <td className="p-4 text-center">
                      {s.best_score >= 32 ? ( // 80% of 40 = 32
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> ผ่านแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                          {/* เปลี่ยนเป็น - หรือ clock ก็ได้ตามความเหมาะสม */}
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}