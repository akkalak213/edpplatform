import { useEffect, useState } from 'react';
import client from '../api/client';
import { 
  Users, CheckCircle, TrendingUp, AlertTriangle, Search, Trash2, 
  Loader2, Trophy, XCircle, AlertCircle, RefreshCw, X
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

      {/* 2. Item Analysis Ranking (เปลี่ยนจากกราฟเป็น List เพื่อให้อ่านโจทย์ออก) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1E293B] rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 bg-slate-800/30 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> 10 อันดับข้อที่ตอบผิดมากที่สุด
            </h3>
            <button onClick={fetchData} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 space-y-3">
            {items.length > 0 ? (
              items.slice(0, 10).map((item, index) => {
                const wrongPercent = (100 - item.accuracy_percent).toFixed(1);
                return (
                  <div key={item.id} className="group bg-[#0F172A] border border-slate-800 rounded-2xl p-4 transition-all hover:border-slate-600">
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg
                        ${index === 0 ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}
                      `}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-tighter bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            ข้อที่ {item.order}
                          </span>
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            {item.category}
                          </span>
                        </div>
                        {/* แสดงโจทย์เต็มๆ */}
                        <p className="text-slate-200 text-sm font-medium line-clamp-2 mb-3 italic">
                          "{item.question}"
                        </p>
                        
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-red-400">อัตราตอบผิด {wrongPercent}%</span>
                            <span className="text-slate-500">{item.correct_count}/{item.total_attempts} คนตอบถูก</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${index < 3 ? 'bg-red-500' : 'bg-amber-500'}`}
                              style={{ width: `${100 - item.accuracy_percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-75 flex flex-col items-center justify-center text-slate-500">
                <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                <p>ยังไม่มีข้อมูลสถิติรายข้อ (ต้องมีนักเรียนสอบก่อน)</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-[#1E293B] p-8 rounded-3xl border border-slate-700 shadow-xl flex flex-col justify-between h-full min-h-75">
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

      {/* 3. Student Table (ส่วนนี้หายไปในโค้ดเก่าของคุณ ผมเติมให้แล้ว!) */}
      <div className="bg-[#1E293B] rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700 bg-slate-800/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cyan-400" /> รายชื่อและผลการสอบรายคน
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

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="p-6">รหัสนักเรียน</th>
                <th className="p-6">ชื่อ-นามสกุล</th>
                <th className="p-6">ห้อง</th>
                <th className="p-6 text-center">สอบ (ครั้ง)</th>
                <th className="p-6 text-center">ล่าสุด</th>
                <th className="p-6 text-center text-amber-500">ดีที่สุด</th>
                <th className="p-6 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-slate-500 italic">ไม่พบข้อมูลนักเรียน</td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="p-6 font-mono text-cyan-400 font-bold">{s.student_id}</td>
                    <td className="p-6 text-white font-bold">{s.name}</td>
                    <td className="p-6 text-slate-400">{s.class_room}</td>
                    <td className="p-6 text-center">
                      <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-lg text-xs font-black">{s.attempts_count}</span>
                    </td>
                    <td className="p-6 text-center text-slate-300 font-mono">{s.latest_score}</td>
                    <td className="p-6 text-center font-mono font-black text-lg text-white">{s.best_score}</td>
                    <td className="p-6 text-center">
                      {s.attempts_count === 0 ? (
                        <span className="text-slate-600 text-[10px] uppercase font-bold tracking-widest">ยังไม่สอบ</span>
                      ) : s.best_score >= 32 ? (
                        <div className="flex items-center justify-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs font-black">
                          <CheckCircle className="w-3.5 h-3.5" /> ผ่าน
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 text-xs font-black">
                          <XCircle className="w-3.5 h-3.5" /> ไม่ผ่าน
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-800">
          {filteredStudents.map((s) => (
            <div key={s.id} className="p-5 space-y-4 hover:bg-slate-800/30 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-mono text-cyan-500 font-bold mb-0.5">{s.student_id}</div>
                  <div className="text-white font-bold">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.class_room}</div>
                </div>
                {s.attempts_count > 0 && (
                   <div className={`text-xs font-black px-2 py-1 rounded-lg ${s.best_score >= 32 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                     {s.best_score >= 32 ? 'PASS' : 'FAIL'}
                   </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center bg-[#0F172A] p-3 rounded-2xl border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">สอบ</div>
                  <div className="text-white font-black">{s.attempts_count}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">ล่าสุด</div>
                  <div className="text-white font-black">{s.latest_score}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">ดีสุด</div>
                  <div className="text-white font-black">{s.best_score}</div>
                </div>
              </div>
            </div>
          ))}
          {filteredStudents.length === 0 && <div className="p-10 text-center text-slate-600">ไม่พบข้อมูล</div>}
        </div>
      </div>

      {/* ===== RESET MODAL (3 STEPS) ===== */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-slate-600 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 relative">

            <button onClick={closeResetModal} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>

            {/* Step 1: Confirm */}
            {resetModal.step === 'confirm' && (
              <>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-2">ยืนยันการรีเซ็ตระบบสอบ</h3>
                <p className="text-slate-400 text-center text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                  ข้อมูลการสอบทั้งหมดจะหายไปถาวร
                </p>
                <div className="flex gap-3">
                  <button onClick={closeResetModal} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all text-sm">ยกเลิก</button>
                  <button onClick={handleResetConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all text-sm">ดำเนินการต่อ</button>
                </div>
              </>
            )}

            {/* Step 2: Type RESET */}
            {resetModal.step === 'type' && (
              <>
                <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-2">ยืนยันตัวตน</h3>
                <p className="text-slate-400 text-center text-xs sm:text-sm mb-4">พิมพ์คำว่า <span className="text-orange-400 font-bold">RESET</span></p>
                <input
                  type="text" placeholder="RESET" value={resetModal.typeValue}
                  onChange={(e) => setResetModal(prev => ({ ...prev, typeValue: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-2xl px-5 py-3.5 text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all text-center mb-6"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button onClick={closeResetModal} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all text-sm">ยกเลิก</button>
                  <button onClick={handleResetExecute} disabled={resetModal.typeValue !== 'RESET' || resetting} className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl font-bold shadow-lg transition-all text-sm flex justify-center items-center gap-2">
                    {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} ลบข้อมูล
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Result */}
            {resetModal.step === 'result' && (
              <>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 border ${resetModal.resultType === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  {resetModal.resultType === 'success' ? <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500" /> : <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-2">{resetModal.resultType === 'success' ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'}</h3>
                <p className="text-slate-400 text-center text-xs sm:text-sm mb-6 sm:mb-8">{resetModal.resultMessage}</p>
                <button onClick={closeResetModal} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm">รับทราบ</button>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}