import { useEffect, useState } from 'react';
import client from '../api/client';
import { 
  Users, CheckCircle, TrendingUp, AlertTriangle, Search, Trash2, 
  Loader2, Trophy, XCircle, AlertCircle, RefreshCw, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
  order: number;
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

// --- Modal Step Type ---
type ResetStep = 'confirm' | 'type' | 'result';

interface ResetModalState {
  isOpen: boolean;
  step: ResetStep;
  typeValue: string;
  resultType: 'success' | 'error';
  resultMessage: string;
}

export default function TeacherQuizAnalytics() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [items, setItems] = useState<ItemAnalysis[]>([]);
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [resetting, setResetting] = useState(false);

  // --- Reset Modal State ---
  const [resetModal, setResetModal] = useState<ResetModalState>({
    isOpen: false,
    step: 'confirm',
    typeValue: '',
    resultType: 'success',
    resultMessage: '',
  });

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
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Modal Handlers ---
  const openResetModal = () => {
    setResetModal({ isOpen: true, step: 'confirm', typeValue: '', resultType: 'success', resultMessage: '' });
  };

  const closeResetModal = () => {
    setResetModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleResetConfirm = () => {
    setResetModal(prev => ({ ...prev, step: 'type', typeValue: '' }));
  };

  const handleResetExecute = async () => {
    if (resetModal.typeValue !== 'RESET') return;

    setResetting(true);
    try {
      await client.delete('/quiz/reset');
      setResetModal(prev => ({
        ...prev,
        step: 'result',
        resultType: 'success',
        resultMessage: 'ล้างข้อมูลการสอบทั้งหมดเรียบร้อยแล้ว',
      }));
      fetchData();
    } catch (err) {
      console.error("Reset failed:", err);
      setResetModal(prev => ({
        ...prev,
        step: 'result',
        resultType: 'error',
        resultMessage: 'เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่อีกครั้ง',
      }));
    } finally {
      setResetting(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.student_id.includes(searchTerm) ||
    s.class_room.includes(searchTerm)
  );

  // Prepare Data for Chart
  const chartData = items.slice(0, 10).map(item => ({
    name: `ข้อ ${item.id}`,
    accuracy: item.accuracy_percent,
    question: item.question.length > 30 ? item.question.substring(0, 30) + "..." : item.question
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" /> กำลังโหลดข้อมูล...
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users className="w-5 h-5"/></div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">จำนวนการสอบ</span>
          </div>
          <div className="text-3xl font-black text-white">{overview?.total_attempts} <span className="text-sm font-normal text-slate-500">ครั้ง</span></div>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><CheckCircle className="w-5 h-5"/></div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">ผ่านเกณฑ์</span>
          </div>
          <div className="text-3xl font-black text-emerald-400">{overview?.pass_rate}%</div>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Trophy className="w-5 h-5"/></div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">คะแนนสูงสุด</span>
          </div>
          <div className="text-3xl font-black text-amber-400">{overview?.max_score} <span className="text-sm font-normal text-slate-500">แต้ม</span></div>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><TrendingUp className="w-5 h-5"/></div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">เฉลี่ยรวม</span>
          </div>
          <div className="text-3xl font-black text-white">{overview?.average_score}</div>
        </div>
      </div>

      {/* 2. Charts & Item Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> 10 อันดับข้อที่ตอบผิดมากที่สุด
            </h3>
            <button onClick={fetchData} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          {chartData.length > 0 ? (
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
              <div className="mt-4 flex justify-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-sm"></span> ตอบถูกน้อยกว่า 50% (ยากมาก)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-500 rounded-sm"></span> ตอบถูก 50% ขึ้นไป (ปานกลาง)</div>
              </div>
            </div>
          ) : (
            <div className="h-75 w-full flex flex-col items-center justify-center text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                <AlertCircle className="w-10 h-10 mb-2 opacity-50"/>
                <p>ยังไม่มีข้อมูลการสอบในระบบ</p>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-lg flex flex-col justify-between min-h-75">
          <div>
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20 text-red-500">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">รีเซ็ตระบบสอบ</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              การรีเซ็ตจะทำการลบข้อมูลการสอบของนักเรียน "ทุกคน" ออกจากฐานข้อมูลถาวร รวมถึง Leaderboard ด้วย 
              <br /><br />
              <span className="text-red-400 font-bold italic">* ใช้เมื่อต้องการเริ่มการสอบรอบใหม่เท่านั้น</span>
            </p>
          </div>
          
          <button 
            onClick={openResetModal}
            disabled={resetting}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {resetting ? <Loader2 className="animate-spin w-5 h-5"/> : <Trash2 className="w-5 h-5" />}
            ล้างข้อมูลการสอบทั้งหมด
          </button>
        </div>
      </div>

      {/* 3. Student Table */}
      <div className="bg-[#1E293B] rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700 bg-slate-800/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" /> รายชื่อนักเรียนและผลการสอบ
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="ค้นหารหัส หรือ ชื่อนักเรียน..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F172A] border border-slate-700 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
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
                  <td colSpan={7} className="p-20 text-center text-slate-500 italic">ไม่พบข้อมูลนักเรียน</td>
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
                      {s.attempts_count === 0 ? (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                          ยังไม่สอบ
                        </span>
                      ) : s.best_score >= 32 ? ( 
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> ผ่านแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-xs font-bold bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20">
                          <XCircle className="w-3 h-3" /> ไม่ผ่าน
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

      {/* ===== RESET MODAL (3 STEPS) ===== */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-slate-600 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 relative">

            {/* ปุ่มปิด (ทุก step) */}
            <button
              onClick={closeResetModal}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* ── STEP 1: ยืนยันเบื้องต้น ── */}
            {resetModal.step === 'confirm' && (
              <>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-2">ยืนยันการรีเซ็ตระบบสอบ</h3>
                <p className="text-slate-400 text-center text-xs sm:text-sm mb-2 leading-relaxed">
                  การกระทำนี้จะลบประวัติการสอบของนักเรียน
                </p>
                <p className="text-red-400 font-bold text-center text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                  "ทุกคน" ออกจากระบบถาวร รวมถึง Leaderboard
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={closeResetModal}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all text-sm"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleResetConfirm}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all text-sm"
                  >
                    ดำเนินการต่อ
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: พิมพ์ RESET ยืนยัน ── */}
            {resetModal.step === 'type' && (
              <>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 bg-orange-500/10 border border-orange-500/20">
                  <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-2">ยืนยันตัวตน</h3>
                <p className="text-slate-400 text-center text-xs sm:text-sm mb-1 leading-relaxed">
                  พิมพ์คำว่า
                </p>
                <p className="text-center mb-5">
                  <span className="font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-lg text-sm tracking-widest">
                    RESET
                  </span>
                </p>
                <input
                  type="text"
                  placeholder="พิมพ์ RESET ที่นี่..."
                  value={resetModal.typeValue}
                  onChange={(e) => setResetModal(prev => ({ ...prev, typeValue: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-2xl px-5 py-3.5 text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-mono tracking-widest text-center mb-6"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={closeResetModal}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all text-sm"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleResetExecute}
                    disabled={resetModal.typeValue !== 'RESET' || resetting}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    ลบข้อมูล
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: ผลลัพธ์ ── */}
            {resetModal.step === 'result' && (
              <>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 border ${
                  resetModal.resultType === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  {resetModal.resultType === 'success'
                    ? <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500" />
                    : <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
                  }
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-2">
                  {resetModal.resultType === 'success' ? 'ดำเนินการสำเร็จ' : 'เกิดข้อผิดพลาด'}
                </h3>
                <p className="text-slate-400 text-center text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                  {resetModal.resultMessage}
                </p>
                <button
                  onClick={closeResetModal}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm"
                >
                  รับทราบ
                </button>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}