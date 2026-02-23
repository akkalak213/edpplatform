import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { 
  ArrowLeft, Send, Bot, CheckCircle, Loader2, RefreshCw, 
  ChevronRight, Copy, Check, Cpu, Sparkles, RotateCw, BarChart3, Clock,
  BookOpen, Lightbulb, X, AlertTriangle 
} from 'lucide-react'; 

// --- Interfaces ---
interface ScoreItem {
  criteria: string;
  score: number;
  max_score: number;
  comment?: string;
}

interface EdpStep {
  id: number;
  step_number: number;
  content: string;
  ai_feedback: string;
  score: number;
  score_breakdown?: ScoreItem[];
  status: string;
  attempt_count?: number;
}

// เนื้อหาความรู้ประจำขั้นตอน (Learning Materials)
const STEP_CONTENT = {
  1: {
    title: "ระบุปัญหา (Problem Identification)",
    goal: "ทำความเข้าใจปัญหาให้ถ่องแท้",
    questions: [
      "ปัญหาที่เกิดขึ้นคืออะไร? (What)",
      "ปัญหานี้เกิดกับใคร? (Who)",
      "เกิดขึ้นที่ไหนและเมื่อไหร่? (Where/When)",
      "ทำไมปัญหานี้ถึงสำคัญและควรได้รับการแก้ไข? (Why)"
    ],
    task: "เขียนอธิบายสภาพปัญหา และระบุขอบเขตของปัญหาให้ชัดเจน"
  },
  2: {
    title: "รวบรวมข้อมูล (Related Information Search)",
    goal: "ค้นหาความรู้เพื่อใช้แก้ปัญหา",
    questions: [
      "มีความรู้ทางวิทยาศาสตร์ คณิตศาสตร์ หรือเทคโนโลยีใดที่เกี่ยวข้องบ้าง?",
      "มีใครเคยแก้ปัญหานี้มาก่อนไหม? เขาทำอย่างไร?",
      "วัสดุหรืออุปกรณ์อะไรบ้างที่น่าจะนำมาใช้ได้?"
    ],
    task: "สรุปความรู้ ทฤษฎี หรือหลักการที่หามาได้ และบอกแหล่งที่มาของข้อมูล"
  },
  3: {
    title: "ออกแบบวิธีการแก้ปัญหา (Solution Design)",
    goal: "คิดค้นและเลือกวิธีที่ดีที่สุด",
    questions: [
      "มีแนวทางแก้ปัญหาที่เป็นไปได้กี่วิธี? (ลองคิดออกมาหลายๆ แบบ)",
      "แต่ละวิธีมีข้อดี-ข้อเสียอย่างไร?",
      "วิธีไหนเหมาะสมที่สุดภายใต้เงื่อนไขที่มี (เวลา, งบประมาณ, ความสามารถ)?"
    ],
    task: "อธิบายแนวคิดที่เลือก หรือวาดภาพร่าง (Sketch) ของชิ้นงาน พร้อมระบุส่วนประกอบสำคัญ"
  },
  4: {
    title: "วางแผนและดำเนินการ (Planning and Development)",
    goal: "ลงมือสร้างชิ้นงานจริง",
    questions: [
      "ต้องใช้วัสดุอุปกรณ์อะไรบ้าง? จำนวนเท่าไหร่?",
      "ลำดับขั้นตอนการสร้างเป็นอย่างไร? (ทำอะไรก่อน-หลัง)",
      "ต้องคำนึงถึงความปลอดภัยในขั้นตอนไหนบ้าง?"
    ],
    task: "เขียนแผนการปฏิบัติงาน หรือบันทึกขั้นตอนการสร้างชิ้นงานต้นแบบ (Prototype)"
  },
  5: {
    title: "ทดสอบ ประเมินผล และปรับปรุง (Testing & Evaluation)",
    goal: "ตรวจสอบประสิทธิภาพและแก้ไขจุดบกพร่อง",
    questions: [
      "จะทดสอบชิ้นงานอย่างไรให้เห็นผลชัดเจน? (กำหนดเกณฑ์การทดสอบ)",
      "ผลการทดสอบเป็นไปตามเป้าหมายไหม?",
      "พบจุดบกพร่องอะไร? และได้ทำการแก้ไขอย่างไร?"
    ],
    task: "บันทึกผลการทดสอบ (เป็นตัวเลขหรือตาราง) และอธิบายสิ่งที่ได้ปรับปรุงแก้ไข"
  },
  6: {
    title: "นำเสนอผลงาน (Presentation)",
    goal: "สื่อสารสิ่งที่ทำมาทั้งหมดให้ผู้อื่นเข้าใจ",
    questions: [
      "จุดเด่นของผลงานนี้คืออะไร?",
      "ผลงานนี้แก้ปัญหาได้จริงหรือไม่?",
      "ถ้ามีเวลาเพิ่ม จะพัฒนาอะไรต่อในอนาคต?"
    ],
    task: "สรุปภาพรวมของโครงงาน จุดเด่น ข้อจำกัด และข้อเสนอแนะสำหรับการพัฒนาต่อ"
  }
};

// --- Typewriter Component ---
const TypewriterText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    let index = 0;
    const speed = 5; 
    const intervalId = setInterval(() => {
      const chunk = text.slice(index, index + 5); 
      setDisplayedText((prev) => prev + chunk);
      index += 5;
      if (index >= text.length) {
        clearInterval(intervalId);
        setDisplayedText(text);
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, speed);
    return () => clearInterval(intervalId);
  }, [text]); 

  return <span className="whitespace-pre-wrap">{displayedText}</span>;
};

// --- Copy Button ---
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      title="คัดลอก"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

// --- Score Breakdown Table ---
const ScoreTable = ({ breakdown }: { breakdown: ScoreItem[] }) => {
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <div className="mt-4 bg-black/20 rounded-xl p-4 border border-white/5 overflow-hidden">
      <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
        <BarChart3 className="w-3 h-3" /> รายละเอียดคะแนน
      </h4>
      <div className="space-y-3">
        {breakdown.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>{item.criteria}</span>
              <span className={item.score >= 15 ? "text-green-400 font-mono" : "text-red-400 font-mono"}>
                {item.score}/{item.max_score}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${item.score >= 15 ? 'bg-green-500' : 'bg-red-500'}`} 
                style={{ width: `${(item.score / item.max_score) * 100}%` }}
              ></div>
            </div>
            {item.comment && (
              <p className="text-[10px] text-slate-500 mt-0.5 italic">"{item.comment}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Thinking Bubble ---
const ThinkingBubble = () => (
  <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="w-10 h-10 bg-cyan-950/50 rounded-full flex items-center justify-center shrink-0 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
      <Bot className="w-6 h-6 text-cyan-400 animate-pulse" />
    </div>
    <div className="bg-[#0F172A] border border-cyan-500/20 px-5 py-4 rounded-2xl rounded-tl-none shadow-lg flex items-center gap-2 h-14">
      <span className="text-cyan-400 text-sm mr-1 font-medium font-kanit">AI กำลังวิเคราะห์...</span>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></div>
      </div>
    </div>
  </div>
);

// --- Content Guide Modal ---
const ContentGuideModal = ({ step, onClose }: { step: number, onClose: () => void }) => {
  const content = STEP_CONTENT[step as keyof typeof STEP_CONTENT];
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1E293B] w-full max-w-2xl rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-900 to-slate-900 px-6 py-4 md:px-8 md:py-6 border-b border-slate-700 flex justify-between items-start shrink-0">
          <div>
            <div className="text-[10px] md:text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> คู่มือการเรียนรู้
            </div>
            <h2 className="text-lg md:text-2xl font-bold text-white leading-tight">{content.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto flex-1">
          {/* Goal */}
          <div>
            <h3 className="text-base md:text-lg font-bold text-emerald-400 mb-2 md:mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> เป้าหมายของขั้นตอนนี้
            </h3>
            <p className="text-slate-300 bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-xl leading-relaxed text-sm md:text-base">
              {content.goal}
            </p>
          </div>

          {/* Questions */}
          <div>
            <h3 className="text-base md:text-lg font-bold text-amber-400 mb-3 md:mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" /> คำถามชวนคิด
            </h3>
            <ul className="space-y-3">
              {content.questions.map((q, idx) => (
                <li key={idx} className="flex gap-3 text-slate-300 text-sm md:text-base">
                  <span className="text-amber-500 font-bold text-lg">•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Task */}
          <div>
            <h3 className="text-base md:text-lg font-bold text-cyan-400 mb-2 md:mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> สิ่งที่ต้องทำส่งครู
            </h3>
            <div className="text-white bg-linear-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 p-5 rounded-xl text-sm md:text-base">
              {content.task}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900/50 px-6 py-4 border-t border-slate-700 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 text-sm md:text-base"
          >
            เข้าใจแล้ว เริ่มทำเลย!
          </button>
        </div>
      </div>
    </div>
  );
};

const EDP_STEPS = [
  "ระบุปัญหา",
  "รวบรวมข้อมูล",
  "ออกแบบวิธีการ",
  "วางแผนและทำ",
  "ทดสอบประเมิน",
  "นำเสนอผลงาน"
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [steps, setSteps] = useState<EdpStep[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // State สำหรับเก็บข้อความ Error ที่ส่งมาจาก Backend เพื่อแสดงเป็น Banner
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [animatingStepId, setAnimatingStepId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Timer State
  const startTimeRef = useRef<number>(Date.now()); 
  const [sessionTime, setSessionTime] = useState(0); 

  // Modal State
  const [showContentGuide, setShowContentGuide] = useState(false);

  const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
  
  let rawNextStep = 1;
  let isRevision = false;

  if (lastStep) {
    if (lastStep.score >= 60) {
      rawNextStep = lastStep.step_number + 1;
      isRevision = false;
    } else {
      rawNextStep = lastStep.step_number;
      isRevision = true;
    }
  }

  const isProcessComplete = rawNextStep > 6;
  const currentStepNumber = isProcessComplete ? 1 : rawNextStep; 

  // --- [FIX 14] Timer Logic Optimization ---
  // เพิ่ม steps.length เป็น dependency เพื่อบังคับให้เวลารีเซ็ตเมื่อมีการส่งงานสำเร็จ (ไม่ว่าจะผ่านหรือตก)
  useEffect(() => {
    startTimeRef.current = Date.now();
    setSessionTime(0);
    
    const timer = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentStepNumber, steps.length]);

  const fetchSteps = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await client.get(`/edp/project/${id}`);
      setSteps(res.data);
    } catch (error) {
      console.error("Error fetching steps:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSteps(); }, [fetchSteps]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps, submitting, isProcessComplete, submitError]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!currentInput.trim()) return;
    
    setSubmitting(true);
    setSubmitError(null); 
    
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await client.post('/edp/submit', {
        project_id: Number(id),
        step_number: currentStepNumber,
        content: currentInput,
        time_spent_seconds: timeSpent
      });

      const newStep = res.data;
      setSteps(prev => [...prev, newStep]);
      setCurrentInput('');
      setAnimatingStepId(newStep.id);
      
      // ไม่ต้องตั้งค่า startTimeRef.current = Date.now() ตรงนี้แล้ว 
      // เพราะ useEffect ตัวจัดการ Timer จะทำงานอัตโนมัติเมื่อ steps.length เปลี่ยนแปลง

    } catch (err) {
      console.error("Submit error:", err);
      const error = err as { response?: { data?: { detail?: string } } };
      const errorMsg = error.response?.data?.detail || "เกิดข้อผิดพลาดในการส่งงาน กรุณาลองใหม่อีกครั้ง";
      setSubmitError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex flex-col font-kanit selection:bg-cyan-500/20 selection:text-cyan-200">
      
      {/* Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[125vw] h-[125vh] bg-cyan-600/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="bg-[#0F172A]/80 backdrop-blur-md border-b border-cyan-500/10 sticky top-0 z-30 shadow-lg">
        <div className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
                onClick={() => navigate('/dashboard')} 
                className="p-2 hover:bg-white/5 rounded-full transition text-slate-400 hover:text-white border border-transparent hover:border-white/10"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <span className="hidden md:inline">ห้องเรียน AI:</span>
                <span className="text-cyan-400 font-mono">#{id}</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-light tracking-wide hidden md:block">ENGINEERING DESIGN PROCESS SYSTEM</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Guide Button (Desktop) */}
            <button 
              onClick={() => setShowContentGuide(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-full border border-blue-500/30 transition-all animate-pulse hover:animate-none"
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-bold">คู่มือ Step {currentStepNumber}</span>
            </button>

            {/* Guide Icon (Mobile) */}
            <button 
              onClick={() => setShowContentGuide(true)}
              className="md:hidden p-2 bg-blue-600/20 text-blue-300 rounded-full border border-blue-500/30"
            >
              <BookOpen className="w-5 h-5" />
            </button>

            {/* Clock Display */}
            <div className="flex items-center gap-2 md:gap-3 bg-slate-900/50 px-3 py-1.5 md:px-4 rounded-full border border-slate-800">
                <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-xs md:text-sm font-mono text-cyan-200 w-10 md:w-12 text-center">
                {formatTime(sessionTime)}
                </span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar (Scrollable on Mobile) */}
        <div className="flex overflow-x-auto px-4 md:px-6 pb-3 md:pb-4 gap-2 no-scrollbar mask-gradient-right snap-x">
          {EDP_STEPS.map((name, index) => {
            const stepNum = index + 1;
            const isCompleted = isProcessComplete || (stepNum < currentStepNumber);
            const isCurrent = !isProcessComplete && (stepNum === currentStepNumber);
            
            return (
              <div 
                key={index}
                className={`snap-center shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium border flex items-center gap-1.5 transition-all whitespace-nowrap
                  ${isCompleted 
                    ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                    : ''}
                  ${isCurrent 
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                    : ''}
                  ${!isCompleted && !isCurrent 
                    ? 'bg-white/5 text-slate-500 border-white/5' 
                    : ''}
                `}
              >
                {isCompleted ? <CheckCircle className="w-3 h-3" /> : <span className="font-mono">{stepNum}</span>}
                {name}
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Chat Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6 md:space-y-8 overflow-y-auto pb-32 md:pb-40 relative z-10">
        {loading && steps.length === 0 && (
          <div className="text-center text-slate-500 py-20 flex flex-col items-center animate-pulse">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-cyan-500"/>
            กำลังโหลดข้อมูลระบบ...
          </div>
        )}

        {/* Initial Guide Prompt */}
        {!loading && steps.length === 0 && (
           <div className="flex justify-center animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="bg-[#1E293B]/80 backdrop-blur border border-cyan-500/30 p-6 md:p-8 rounded-3xl max-w-2xl text-center shadow-2xl mx-2">
                 <div className="w-14 h-14 md:w-16 md:h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <Lightbulb className="w-7 h-7 md:w-8 md:h-8 text-cyan-400" />
                 </div>
                 <h2 className="text-xl md:text-2xl font-bold text-white mb-3">ยินดีต้อนรับสู่ขั้นตอนที่ 1: ระบุปัญหา</h2>
                 <p className="text-sm md:text-base text-slate-300 mb-6 leading-relaxed">
                    เริ่มต้นด้วยการบอกเล่าปัญหาที่คุณพบเจอ "ปัญหาคืออะไร? เกิดกับใคร? และทำไมถึงสำคัญ?"
                 </p>
                 <button 
                   onClick={() => setShowContentGuide(true)}
                   className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-cyan-500/25 transition-all text-sm md:text-base w-full md:w-auto"
                 >
                    ดูแนวทางการเขียน
                 </button>
              </div>
           </div>
        )}

        {steps.map((step, index) => {
          const isPass = step.score >= 60;
          const shouldAnimate = step.id === animatingStepId;

          return (
            <div key={step.id} className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {(index === 0 || steps[index-1].step_number !== step.step_number) && (
                <div className="flex items-center justify-center my-6 md:my-8 opacity-70">
                   <div className="bg-[#1E293B] border border-slate-700 text-slate-400 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-mono tracking-wider shadow-sm text-center">
                      STEP {step.step_number} : {EDP_STEPS[step.step_number-1]}
                   </div>
                </div>
              )}

              {/* Student */}
              <div className="flex justify-end pl-8 md:pl-12">
                <div className="bg-linear-to-br from-blue-600 to-indigo-700 text-white px-5 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-3xl rounded-tr-none shadow-lg relative group max-w-full">
                  <div className="text-[10px] text-blue-200 mb-1 font-mono text-right opacity-70">STUDENT INPUT</div>
                  <p className="leading-relaxed text-sm md:text-base">{step.content}</p>
                  <CopyButton text={step.content} />
                </div>
              </div>

              {/* AI Response */}
              <div className="flex gap-3 md:gap-4 pr-0 md:pr-4">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 border shadow-[0_0_15px_rgba(0,0,0,0.3)] 
                  ${isPass ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                  <Bot className={`w-5 h-5 md:w-6 md:h-6 ${isPass ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                
                <div className={`flex-1 border px-5 py-4 md:px-6 md:py-5 rounded-2xl md:rounded-3xl rounded-tl-none shadow-lg relative group
                  ${isPass ? 'bg-[#0F172A] border-green-500/20' : 'bg-[#0F172A] border-red-500/20'}`}>
                  
                  {/* Score Header */}
                  <div className="flex justify-between items-start mb-3 md:mb-4 border-b border-white/5 pb-3">
                    <div>
                      <span className={`text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 ${isPass ? 'text-green-400' : 'text-red-400'}`}>
                        {isPass ? <CheckCircle className="w-3 h-3 md:w-4 md:h-4"/> : <RefreshCw className="w-3 h-3 md:w-4 md:h-4"/>}
                        {isPass ? "ผ่านเกณฑ์" : "ต้องแก้ไข"}
                      </span>
                      <p className="text-[8px] md:text-[10px] text-slate-500 mt-1 font-mono">AI ANALYSIS REPORT</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl md:text-3xl font-black ${isPass ? 'text-green-500' : 'text-red-500'} font-mono`}>
                        {step.score}<span className="text-xs md:text-sm font-normal text-slate-600">/100</span>
                      </span>
                    </div>
                  </div>

                  {/* AI Feedback Content */}
                  <div className="prose prose-sm prose-invert max-w-none text-slate-300 leading-6 md:leading-7 min-h-15 text-sm md:text-base">
                    {shouldAnimate ? (
                      <TypewriterText text={step.ai_feedback} onComplete={() => setAnimatingStepId(null)} />
                    ) : (
                      <span className="whitespace-pre-wrap">{step.ai_feedback}</span>
                    )}
                  </div>
                  <CopyButton text={step.ai_feedback} />

                  {step.score_breakdown && (
                    <ScoreTable breakdown={step.score_breakdown} />
                  )}

                  {!isPass && (
                    <div className="mt-4 md:mt-5 bg-red-500/5 p-3 rounded-xl border border-red-500/20 flex gap-3 items-start text-xs md:text-sm text-red-300/90">
                      <RefreshCw className="w-4 h-4 md:w-5 md:h-5 mt-0.5 shrink-0 animate-spin-slow" />
                      <span>คำแนะนำ: กรุณาปรับปรุงเนื้อหาตามคอมเมนต์ แล้วส่งงานใหม่ใน Step นี้อีกครั้ง</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isProcessComplete && !submitting && (
          <div className="animate-in zoom-in-95 duration-500 my-8">
            <div className="bg-linear-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                  <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-green-400 animate-pulse" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">โครงงานเสร็จสมบูรณ์!</h2>
                <p className="text-green-200/80 max-w-lg mx-auto mb-6 text-sm md:text-base">
                  ยินดีด้วยครับ! คุณผ่านกระบวนการออกแบบเชิงวิศวกรรมครบทั้ง 6 ขั้นตอนแล้ว 
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full text-green-300 text-xs md:text-sm border border-green-500/20">
                  <RotateCw className="w-3 h-3 md:w-4 md:h-4" /> พร้อมสำหรับรอบถัดไป (Cycle 2)
                </div>
              </div>
            </div>
          </div>
        )}

        {submitting && <ThinkingBubble />}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Input Footer */}
      <div className="bg-[#020617]/90 backdrop-blur-xl border-t border-white/5 p-3 md:p-4 pb-6 sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2 md:mb-3 pl-1">
             <div className="flex items-center gap-2 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                {isProcessComplete ? (
                  <span className="text-green-400 flex items-center gap-1"><RotateCw className="w-3 h-3"/> New Cycle</span>
                ) : (
                  <span className="text-cyan-400 flex items-center gap-1"><ChevronRight className="w-3 h-3"/> Step {currentStepNumber}</span>
                )}
             </div>
             
             <button 
               onClick={() => setShowContentGuide(true)}
               className="text-[10px] md:text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
             >
               <BookOpen className="w-3 h-3" /> ดูแนวทาง
             </button>
          </div>

          {/* แบนเนอร์แจ้งเตือนข้อผิดพลาด (เช่น ส่งข้อความซ้ำ) ที่ดูเนียนไปกับดีไซน์ แทน alert() */}
          {submitError && (
            <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 flex items-start gap-3 bg-red-950/50 border border-red-500/30 text-red-200 px-4 py-3 md:px-5 md:py-4 rounded-2xl shadow-lg shadow-red-900/20">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <span className="flex-1 text-sm leading-relaxed">{submitError}</span>
              <button onClick={() => setSubmitError(null)} className="p-1 hover:bg-red-500/20 rounded-lg transition-colors shrink-0">
                <X className="w-4 h-4 text-red-400 hover:text-white" />
              </button>
            </div>
          )}

          <div className="relative group">
            <div className={`absolute -inset-0.5 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500 
              ${isProcessComplete ? 'bg-green-500' : isRevision ? 'bg-red-600' : 'bg-cyan-600'}`}></div>
            
            <div className="relative flex gap-2 bg-[#0F172A] rounded-2xl p-1.5 md:p-2 border border-white/10">
              <textarea
                value={currentInput}
                onChange={(e) => {
                  setCurrentInput(e.target.value);
                  if (submitError) setSubmitError(null); // ซ่อน Error Banner ทันทีที่เริ่มพิมพ์ใหม่
                }}
                placeholder={isProcessComplete ? "เริ่มรอบใหม่..." : "พิมพ์เนื้อหา..."}
                className="flex-1 bg-transparent text-white px-3 py-2 md:px-4 md:py-3 outline-none resize-none placeholder-slate-600 min-h-12.5 md:min-h-15 text-sm md:text-base"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !currentInput.trim()}
                className={`self-end mb-0.5 mr-0.5 md:mb-1 md:mr-1 rounded-xl w-10 h-10 md:w-12 md:h-12 flex items-center justify-center transition-all duration-300
                  ${isProcessComplete
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : isRevision 
                    ? 'bg-red-600 hover:bg-red-500 text-white' 
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  }
                  disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed
                `}
              >
                {submitting ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showContentGuide && (
        <ContentGuideModal 
          step={currentStepNumber} 
          onClose={() => setShowContentGuide(false)} 
        />
      )}

    </div>
  );
}