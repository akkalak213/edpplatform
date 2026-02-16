import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ArrowLeft, Send, Bot, CheckCircle, Loader2, RefreshCw, ChevronRight, Copy, Check, Cpu, Sparkles, RotateCw, BarChart3 } from 'lucide-react';

// --- Interfaces ---
// [FIX] ย้าย Interface ขึ้นมาด้านบนเพื่อเรียกใช้ใน Component ได้
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
// [FIX] เปลี่ยนจาก any[] เป็น ScoreItem[]
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
  
  const [animatingStepId, setAnimatingStepId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, [steps, submitting, isProcessComplete]);

  const handleSubmit = async () => {
    if (!currentInput.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await client.post('/edp/submit', {
        project_id: Number(id),
        step_number: currentStepNumber,
        content: currentInput
      });

      const newStep = res.data;
      setSteps(prev => [...prev, newStep]);
      setCurrentInput('');
      setAnimatingStepId(newStep.id);

    } catch (error) {
      console.error("Submit error:", error);
      alert("เกิดข้อผิดพลาดในการส่งงาน");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex flex-col font-kanit selection:bg-cyan-500/20 selection:text-cyan-200">
      
      {/* Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
         <div className="absolute top-[-10%] left-[-10%] w-125 h-125 bg-cyan-600/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="bg-[#0F172A]/80 backdrop-blur-md border-b border-cyan-500/10 sticky top-0 z-30 shadow-lg">
        <div className="px-6 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2 hover:bg-white/5 rounded-full transition text-slate-400 hover:text-white border border-transparent hover:border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-white text-lg flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              ห้องเรียน AI: <span className="text-cyan-400 font-mono">Module #{id}</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-light tracking-wide">ENGINEERING DESIGN PROCESS SYSTEM</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="flex overflow-x-auto px-6 pb-4 gap-2 no-scrollbar mask-gradient-right">
          {EDP_STEPS.map((name, index) => {
            const stepNum = index + 1;
            const isCompleted = isProcessComplete || (stepNum < currentStepNumber);
            const isCurrent = !isProcessComplete && (stepNum === currentStepNumber);
            
            return (
              <div 
                key={index}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium border flex items-center gap-1.5 transition-all
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
      <div className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8 overflow-y-auto pb-40 relative z-10">
        {loading && steps.length === 0 && (
          <div className="text-center text-slate-500 py-20 flex flex-col items-center animate-pulse">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-cyan-500"/>
            กำลังโหลดข้อมูลระบบ...
          </div>
        )}

        {steps.map((step, index) => {
          const isPass = step.score >= 60;
          const shouldAnimate = step.id === animatingStepId;

          return (
            <div key={step.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {(index === 0 || steps[index-1].step_number !== step.step_number) && (
                <div className="flex items-center justify-center my-8 opacity-70">
                   <div className="bg-[#1E293B] border border-slate-700 text-slate-400 px-4 py-1.5 rounded-full text-xs font-mono tracking-wider shadow-sm">
                     --- STEP {step.step_number} : {EDP_STEPS[step.step_number-1]?.split('. ')[1]} ---
                   </div>
                </div>
              )}

              {/* Student */}
              <div className="flex justify-end pl-12">
                <div className="bg-linear-to-br from-blue-600 to-indigo-700 text-white px-6 py-4 rounded-3xl rounded-tr-none shadow-lg relative group max-w-full">
                  <div className="text-[10px] text-blue-200 mb-1 font-mono text-right opacity-70">STUDENT INPUT</div>
                  <p className="leading-relaxed">{step.content}</p>
                  <CopyButton text={step.content} />
                </div>
              </div>

              {/* AI Response */}
              <div className="flex gap-4 pr-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-[0_0_15px_rgba(0,0,0,0.3)] 
                  ${isPass ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                  <Bot className={`w-6 h-6 ${isPass ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                
                <div className={`flex-1 border px-6 py-5 rounded-3xl rounded-tl-none shadow-lg relative group
                  ${isPass ? 'bg-[#0F172A] border-green-500/20' : 'bg-[#0F172A] border-red-500/20'}`}>
                  
                  {/* Score Header */}
                  <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                    <div>
                      <span className={`text-sm font-bold flex items-center gap-2 ${isPass ? 'text-green-400' : 'text-red-400'}`}>
                        {isPass ? <CheckCircle className="w-4 h-4"/> : <RefreshCw className="w-4 h-4"/>}
                        {isPass ? "ผ่านเกณฑ์ (PASS)" : "ต้องแก้ไข (REVISION NEEDED)"}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">AI ANALYSIS REPORT</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-3xl font-black ${isPass ? 'text-green-500' : 'text-red-500'} font-mono`}>
                        {step.score}<span className="text-sm font-normal text-slate-600">/100</span>
                      </span>
                    </div>
                  </div>

                  {/* AI Feedback Content */}
                  <div className="prose prose-sm prose-invert max-w-none text-slate-300 leading-7 min-h-15">
                    {shouldAnimate ? (
                      <TypewriterText text={step.ai_feedback} onComplete={() => setAnimatingStepId(null)} />
                    ) : (
                      <span className="whitespace-pre-wrap">{step.ai_feedback}</span>
                    )}
                  </div>
                  <CopyButton text={step.ai_feedback} />

                  {/* SHOW SCORE BREAKDOWN TABLE */}
                  {step.score_breakdown && (
                    <ScoreTable breakdown={step.score_breakdown} />
                  )}

                  {!isPass && (
                    <div className="mt-5 bg-red-500/5 p-3 rounded-xl border border-red-500/20 flex gap-3 items-start text-sm text-red-300/90">
                      <RefreshCw className="w-5 h-5 mt-0.5 shrink-0 animate-spin-slow" />
                      <span>คำแนะนำ: กรุณาปรับปรุงเนื้อหาตามคอมเมนต์ แล้วส่งงานใหม่ใน Step นี้อีกครั้ง</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Success & Iterate Banner */}
        {isProcessComplete && !submitting && (
          <div className="animate-in zoom-in-95 duration-500 my-8">
            {/* [FIX] bg-gradient-to-r -> bg-linear-to-r */}
            <div className="bg-linear-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-3xl p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                  <Sparkles className="w-8 h-8 text-green-400 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">โครงงานเสร็จสมบูรณ์!</h2>
                <p className="text-green-200/80 max-w-lg mx-auto mb-6">
                  ยินดีด้วยครับ! คุณผ่านกระบวนการออกแบบเชิงวิศวกรรมครบทั้ง 6 ขั้นตอนแล้ว 
                  สามารถเริ่มวงจรใหม่ (Iteration) เพื่อพัฒนาผลงานให้ดียิ่งขึ้นได้
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full text-green-300 text-sm border border-green-500/20">
                  <RotateCw className="w-4 h-4" /> พร้อมสำหรับรอบถัดไป (Cycle 2)
                </div>
              </div>
            </div>
          </div>
        )}

        {submitting && <ThinkingBubble />}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Input Footer */}
      <div className="bg-[#020617]/90 backdrop-blur-xl border-t border-white/5 p-4 pb-6 sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium uppercase tracking-wider pl-1">
             {isProcessComplete ? (
               <span className="text-green-400 flex items-center gap-1 animate-bounce"><RotateCw className="w-3 h-3"/> Iteration Mode: Starting New Cycle</span>
             ) : isRevision ? (
               <span className="text-red-400 flex items-center gap-1 animate-pulse"><RefreshCw className="w-3 h-3"/> Revision Mode: Step {currentStepNumber}</span>
             ) : (
               <span className="text-cyan-400 flex items-center gap-1"><ChevronRight className="w-3 h-3"/> Current Task: Step {currentStepNumber}</span>
             )}
          </div>

          <div className="relative group">
            <div className={`absolute -inset-0.5 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500 
              ${isProcessComplete ? 'bg-green-500' : isRevision ? 'bg-red-600' : 'bg-cyan-600'}`}></div>
            
            <div className="relative flex gap-2 bg-[#0F172A] rounded-2xl p-2 border border-white/10">
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder={
                  isProcessComplete ? "เริ่มรอบใหม่: ระบุปัญหาที่ต้องการปรับปรุง (Step 1)..." :
                  isRevision ? "พิมพ์เนื้อหาที่แก้ไขใหม่ที่นี่..." : 
                  `พิมพ์เนื้อหาสำหรับขั้นตอนที่ ${currentStepNumber}...`
                }
                className="flex-1 bg-transparent text-white px-4 py-3 outline-none resize-none placeholder-slate-600 min-h-15"
                rows={2}
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
                className={`self-end mb-1 mr-1 rounded-xl w-12 h-12 flex items-center justify-center transition-all duration-300
                  ${isProcessComplete
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                    : isRevision 
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)]'
                  }
                  disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed
                `}
              >
                {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="text-center mt-2 text-[10px] text-slate-600">
            กด Enter เพื่อส่ง | Shift + Enter เพื่อขึ้นบรรทัดใหม่
          </div>
        </div>
      </div>
    </div>
  );
}