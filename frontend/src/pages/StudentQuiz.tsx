import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { 
  ArrowLeft, Clock, CheckCircle, 
  ChevronRight, Trophy, RotateCw, Play, Lock, Unlock, Loader2, AlertTriangle, XCircle 
} from 'lucide-react';

interface Question {
  id: number;
  question_text: string;
  choices: string[];
  order: number;
  category: string;
}

interface AnswerLog {
  question_id: number;
  selected: number;
  correct: number;
  is_correct: boolean;
  category: string;
}

interface QuizResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  details: AnswerLog[];
}

export default function StudentQuiz() {
  const navigate = useNavigate();
  
  // States
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); 
  const [isLocked, setIsLocked] = useState(false); 
  
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  
  // Timer
  const [timeSeconds, setTimeSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // --- 🚫 ANTI-CHEAT STATE & REFS 🚫 ---
  const [cheatingDetected, setCheatingDetected] = useState(false);
  const isQuizActiveRef = useRef(false);

  useEffect(() => {
    isQuizActiveRef.current = quizStarted && !quizFinished;
  }, [quizStarted, quizFinished]);

  useEffect(() => {
    const handleViolation = () => {
      if (isQuizActiveRef.current) {
        setCheatingDetected(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) handleViolation();
    };

    const onBlur = () => {
      handleViolation();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, []); 

  const handleRestartQuiz = () => {
    setCheatingDetected(false);
    setQuizStarted(false);
    setQuizFinished(false);
    setCurrentQIndex(0);
    setAnswers({});
    setTimeSeconds(0);
    setIsLocked(false);
    setSubmitting(false);
  };
  // -------------------------------------

  // [NEW] 🔙 Handle Back Button Logic
  const handleBack = () => {
    if (quizStarted && !quizFinished && !cheatingDetected) {
      // ถ้ากำลังสอบอยู่ ให้เตือนก่อน
      if (window.confirm("⚠️ คำเตือน: คุณกำลังทำข้อสอบอยู่\n\nหากออกจากหน้านี้ การสอบจะถือเป็นโมฆะและคะแนนจะไม่ถูกบันทึก\n\nยืนยันที่จะออกจากหน้าสอบหรือไม่?")) {
        navigate('/dashboard');
      }
    } else {
      // ถ้ายังไม่เริ่ม หรือสอบเสร็จแล้ว หรือโดนจับโกง ให้ไปได้เลย
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (quizStarted && !quizFinished && !cheatingDetected) {
      timerRef.current = window.setInterval(() => {
        setTimeSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizStarted, quizFinished, cheatingDetected]);

  const fetchQuestions = async () => {
    try {
      const res = await client.get('/quiz/questions');
      setQuestions(res.data);
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setCurrentQIndex(0);
    setAnswers({});
    setTimeSeconds(0);
    setIsLocked(false);
    setSubmitting(false);
    setQuizStarted(true);
    setCheatingDetected(false);
  };

  const handleSelectChoice = (choiceIdx: number) => {
    if (isLocked) return; 
    const qId = questions[currentQIndex].id;
    setAnswers(prev => ({ ...prev, [qId]: choiceIdx }));
  };

  const handleConfirm = () => {
    setIsLocked(true);
  };

  const handleEdit = () => {
    setIsLocked(false);
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setIsLocked(false); 
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (submitting) return;

    setSubmitting(true);
    setQuizFinished(true);
    
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await client.post('/quiz/submit', {
        answers: answers,
        time_spent_seconds: timeSeconds
      });
      setResult(res.data);
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      alert("ส่งข้อสอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
      setQuizFinished(false); 
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">Loading Quiz...</div>;

  // --- 🔴 CHEATING DETECTED SCREEN 🔴 ---
  if (cheatingDetected) {
    return (
      // [FIXED] z-[100] -> z-100
      <div className="fixed inset-0 z-100 bg-red-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
        <div className="bg-[#1E293B] border-2 border-red-500 rounded-3xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.5)]">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wider">ทุจริตการสอบ!</h2>
          <p className="text-red-200 text-lg mb-6 leading-relaxed">
            ระบบตรวจพบว่าคุณพยายามออกจากหน้าจอ หรือสลับโปรแกรมระหว่างทำข้อสอบ
          </p>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 text-sm text-red-300">
            ⛔ การสอบครั้งนี้ถือเป็นโมฆะ <br/>
            🔄 คุณต้องเริ่มทำข้อสอบใหม่ตั้งแต่ข้อแรก
          </div>
          <button 
            onClick={handleRestartQuiz}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-red-500/20 transition-all active:scale-95"
          >
            รับทราบ และเริ่มทำใหม่
          </button>
        </div>
      </div>
    );
  }

  // --- 1. Intro Screen ---
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-300 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1E293B] border border-slate-700 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          {/* [FIXED] bg-gradient-to-r -> bg-linear-to-r */}
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-cyan-500 to-blue-600"></div>
          
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
            <Trophy className="w-10 h-10" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">แบบทดสอบทักษะการแก้ปัญหา</h1>
          
          <div className="text-left space-y-3 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 mb-8 text-sm">
            <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400"/> มีทั้งหมด 40 ข้อ</p>
            <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400"/> ไม่จำกัดเวลา (แต่มีการจับเวลา)</p>
            <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400"/> เกณฑ์ผ่านคือ 80% (32 ข้อขึ้นไป)</p>
            <p className="flex items-center gap-2 text-red-400 font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-500"/> ห้ามออกจากหน้าจอเด็ดขาด!
            </p>
          </div>

          <button onClick={handleStart} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2">
            <Play className="w-5 h-5 fill-current" /> เริ่มทำแบบทดสอบ
          </button>
          
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-slate-500 hover:text-slate-300 text-sm">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  // --- 3. Result Screen ---
  if (quizFinished && result) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-300 p-6 font-kanit">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className={`text-center p-10 rounded-[2.5rem] border ${result.passed ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
            <h2 className="text-xl font-bold text-white mb-2">สรุปผลการทดสอบ</h2>
            <div className="text-6xl font-black mb-2 text-white">
              {result.score}<span className="text-2xl text-slate-400 font-medium">/{result.total}</span>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${result.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {result.passed ? 'ผ่านเกณฑ์ (ยอดเยี่ยม!)' : 'ยังไม่ผ่านเกณฑ์ (พยายามอีกนิด)'}
            </div>
            <p className="mt-4 text-slate-400 text-sm">ใช้เวลาไปทั้งหมด {formatTime(timeSeconds)} นาที</p>
          </div>

          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6">
            <h3 className="text-white font-bold mb-4">เฉลยละเอียด</h3>
            <div className="space-y-3">
              {result.details.map((log: AnswerLog, idx: number) => (
                <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center ${log.is_correct ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">ข้อที่ {idx + 1}</div>
                    <div className={log.is_correct ? 'text-green-400' : 'text-red-400'}>
                      {log.is_correct ? 'ถูกต้อง' : 'ผิดพลาด'}
                    </div>
                  </div>
                  {!log.is_correct && (
                    <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-lg">
                      เฉลย: ข้อ {['ก','ข','ค','ง'][log.correct]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            <RotateCw className="w-5 h-5" /> ทำแบบทดสอบอีกครั้ง
          </button>
          <button onClick={() => navigate('/dashboard')} className="w-full py-4 text-slate-500 hover:text-white">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  // --- 2. Quiz Interface ---
  const currentQ = questions[currentQIndex];
  const selectedChoice = answers[currentQ.id];
  const hasAnswered = selectedChoice !== undefined;
  const isLastQuestion = currentQIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-kanit flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-[#0F172A] flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-4">
          {/* [FIXED] ใช้ handleBack แทน navigate ตรงๆ */}
          <button onClick={handleBack}><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h2 className="text-white font-bold">ข้อที่ {currentQIndex + 1} <span className="text-slate-500 text-sm">/ {questions.length}</span></h2>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-cyan-200">{formatTime(timeSeconds)}</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-800 w-full">
        <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-3xl mx-auto w-full flex flex-col justify-center">
        {/* Loading Overlay when submitting */}
        {submitting && (
           <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in">
              <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
              <p className="text-white text-lg animate-pulse">กำลังส่งข้อสอบ...</p>
           </div>
        )}

        <div className="bg-[#1E293B]/50 border border-slate-700 rounded-3xl p-8 mb-8 backdrop-blur-sm">
          <span className="inline-block px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold mb-4 border border-blue-500/20">
            {currentQ.category || "General"}
          </span>
          <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
            {currentQ.question_text}
          </h3>
        </div>

        <div className="space-y-4">
          {currentQ.choices.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectChoice(idx)}
              disabled={isLocked || submitting}
              className={`w-full p-5 rounded-2xl border text-left transition-all relative overflow-hidden group
                ${selectedChoice === idx 
                  ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)]' 
                  : 'bg-[#1E293B] border-slate-700 text-slate-400 hover:bg-[#263345] hover:border-slate-600'}
                ${(isLocked || submitting) ? 'cursor-not-allowed opacity-80' : ''}
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors
                  ${selectedChoice === idx 
                    ? 'bg-cyan-500 text-white border-cyan-500' 
                    : 'bg-slate-800 text-slate-500 border-slate-600 group-hover:border-slate-500'}
                `}>
                  {['ก', 'ข', 'ค', 'ง'][idx]}
                </div>
                <span className="text-base md:text-lg">{choice}</span>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="p-6 border-t border-slate-800 bg-[#0F172A] sticky bottom-0 z-20">
        <div className="max-w-3xl mx-auto flex gap-4">
          {!isLocked ? (
            <button 
              onClick={handleConfirm}
              disabled={!hasAnswered || submitting}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" /> ยืนยันคำตอบ
            </button>
          ) : (
            <>
              <button 
                onClick={handleEdit}
                disabled={submitting}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold border border-slate-600 transition-all flex items-center justify-center gap-2"
              >
                <Unlock className="w-5 h-5" /> แก้ไข
              </button>
              
              <button 
                onClick={handleNext}
                disabled={submitting}
                // [FIXED] bg-gradient-to-r -> bg-linear-to-r
                className={`flex-2 py-4 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2
                  ${isLastQuestion 
                    ? 'bg-green-600 hover:bg-green-500 shadow-green-500/20' 
                    : 'bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20'}
                `}
              >
                {isLastQuestion ? (
                   submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ส่งข้อสอบ'
                ) : (
                   <>ข้อถัดไป <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}