import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ArrowLeft, User, MessageSquare, Save, CheckCircle, Award, AlertTriangle, Loader2 } from 'lucide-react';
// [NEW] นำเข้า useToast เพื่อใช้แจ้งเตือนสวยๆ
import { useToast } from '../components/Toast';

interface EdpStep {
  id: number;
  step_number: number;
  content: string;
  ai_feedback: string;
  score: number;
  teacher_score?: number;
  teacher_comment?: string;
  is_teacher_reviewed: boolean;
  created_at: string;
}

interface TeacherProject {
  id: number;
  title: string;
  owner: {
    first_name: string;
    last_name: string;
  };
}

export default function TeacherProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast(); // [NEW] เรียกใช้ Hook แจ้งเตือน

  const [steps, setSteps] = useState<EdpStep[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  
  // State สำหรับการให้คะแนน (Editing Mode)
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeComment, setGradeComment] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProjectData = useCallback(async () => {
    try {
      // 1. ดึงข้อมูล Steps
      const resSteps = await client.get(`/edp/project/${id}`);
      setSteps(resSteps.data);

      // 2. ดึงข้อมูล Project Info
      const resProj = await client.get('/edp/teacher/projects');
      const currentProj = resProj.data.find((p: TeacherProject) => p.id === Number(id));
      
      if (currentProj) {
        setProjectTitle(currentProj.title);
        setStudentName(`${currentProj.owner.first_name} ${currentProj.owner.last_name}`);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast("ไม่สามารถดึงข้อมูลโปรเจคได้", "error");
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleEditClick = (step: EdpStep) => {
    setEditingStepId(step.id);
    // ถ้าครูเคยให้คะแนนแล้วให้ดึงมาโชว์ ถ้ายังให้ใช้คะแนน AI เป็นค่าเริ่มต้น
    setGradeScore(step.teacher_score ?? step.score); 
    setGradeComment(step.teacher_comment || "");
  };

  const handleSaveGrade = async (stepId: number) => {
    setSaving(true);
    try {
      await client.patch(`/edp/step/${stepId}/grade`, {
        teacher_score: gradeScore,
        teacher_comment: gradeComment
      });
      
      // [FIX] ใช้ prev เพื่อความแม่นยำในการอัปเดต state
      setSteps(prev => prev.map(s => s.id === stepId ? { 
        ...s, 
        teacher_score: gradeScore, 
        teacher_comment: gradeComment,
        is_teacher_reviewed: true 
      } : s));
      
      setEditingStepId(null);
      showToast("บันทึกคะแนนเรียบร้อยแล้ว", "success"); // [NEW] แจ้งเตือนสีเขียว
    } catch (err) {
      console.error("Save grade error:", err);
      showToast("บันทึกไม่สำเร็จ กรุณาลองใหม่", "error"); // [NEW] แจ้งเตือนสีแดง
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-300 font-kanit pb-20">
      
      {/* Header */}
      <div className="bg-[#1E293B] border-b border-slate-700 sticky top-0 z-20 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/teacher/dashboard')} className="p-2 hover:bg-slate-700 rounded-full transition">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" /> 
              ตรวจงาน: {projectTitle || "กำลังโหลด..."}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <User className="w-3 h-3" /> นักเรียน: <span className="text-indigo-400">{studentName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {steps.map((step) => (
          <div key={step.id} className={`rounded-2xl border transition-all duration-300 
            ${step.is_teacher_reviewed 
              ? 'bg-[#1E293B] border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
              : 'bg-[#1E293B]/60 border-slate-700'}`}>
            
            <div className="p-6 border-b border-slate-700/50 flex justify-between items-start">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-slate-400 mb-3 border border-slate-700">
                  STEP {step.step_number}
                </span>
                <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">{step.content}</p>
              </div>
              
              {/* Score Badge */}
              <div className="text-right ml-4 shrink-0">
                <div className="text-xs text-slate-500 mb-1">คะแนนสุทธิ</div>
                <div className={`text-3xl font-bold font-mono ${step.is_teacher_reviewed ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {step.teacher_score ?? step.score}
                  <span className="text-sm text-slate-600">/100</span>
                </div>
                {step.is_teacher_reviewed && (
                   <span className="flex items-center justify-end gap-1 text-[10px] text-emerald-500 mt-1">
                     <CheckCircle className="w-3 h-3" /> ครูตรวจแล้ว
                   </span>
                )}
              </div>
            </div>

            {/* AI Feedback Section (Reference) */}
            <div className="p-4 bg-black/20 text-sm text-slate-500 border-b border-slate-700/50 flex gap-3">
              <div className="shrink-0 pt-1"><div className="w-2 h-2 rounded-full bg-cyan-500"></div></div>
              <div>
                <span className="text-cyan-500 font-medium">AI Feedback: </span> 
                {step.ai_feedback}
              </div>
            </div>

            {/* Teacher Grading Section */}
            <div className="p-6 bg-[#1E293B]">
              {editingStepId === step.id ? (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex gap-4 mb-4">
                    <div className="w-32">
                      <label className="text-xs text-slate-400 mb-1 block">แก้ไขคะแนน</label>
                      <input 
                        type="number" 
                        value={gradeScore}
                        onChange={(e) => setGradeScore(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-center font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">ความเห็นครูผู้สอน</label>
                      <input 
                        type="text" 
                        value={gradeComment}
                        onChange={(e) => setGradeComment(e.target.value)}
                        placeholder="พิมพ์คำแนะนำเพิ่มเติมให้นักเรียน..."
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => setEditingStepId(null)}
                      className="px-4 py-2 text-slate-400 hover:text-white transition"
                    >
                      ยกเลิก
                    </button>
                    <button 
                      onClick={() => handleSaveGrade(step.id)}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      {saving ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>} 
                      บันทึกผล
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <MessageSquare className={`w-5 h-5 mt-0.5 ${step.teacher_comment ? 'text-indigo-400' : 'text-slate-600'}`} />
                    <div>
                      <div className="text-sm font-medium text-slate-300">ความเห็นครู:</div>
                      <p className="text-slate-400 text-sm mt-0.5">
                        {step.teacher_comment || <span className="text-slate-600 italic">ยังไม่มีความเห็น</span>}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleEditClick(step)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition text-sm"
                  >
                    {step.is_teacher_reviewed ? "แก้ไขเกรด" : "ให้คะแนน"}
                  </button>
                </div>
              )}
            </div>

          </div>
        ))}
        
        {steps.length === 0 && (
           <div className="text-center py-20 text-slate-500 bg-[#1E293B]/50 rounded-3xl border border-dashed border-slate-700">
             <AlertTriangle className="w-10 h-10 mx-auto mb-4 opacity-50" />
             นักเรียนคนนี้ยังไม่ได้เริ่มทำโครงงาน
           </div>
        )}
      </div>
    </div>
  );
}