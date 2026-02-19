import { X, UserPlus, LayoutDashboard, Cpu, Trophy, History, Settings, BookOpen } from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserManualModal({ isOpen, onClose }: UserManualModalProps) {
  if (!isOpen) return null;

  const manualCards = [
    {
      icon: UserPlus,
      color: "blue",
      title: "1. เริ่มต้นใช้งาน",
      desc: "การลงทะเบียนและเข้าสู่ระบบ",
      steps: [
        "กด 'สมัครสมาชิกใหม่' ที่หน้า Login",
        "กรอกชื่อ-สกุล, รหัสนักเรียน, ห้อง และรหัสผ่าน",
        "กด 'Sign Up' เพื่อสร้างบัญชี",
        "กลับมาหน้า Login กรอกอีเมล/รหัสผ่าน เพื่อเข้าสู่ระบบ"
      ]
    },
    {
      icon: LayoutDashboard,
      color: "cyan",
      title: "2. หน้าแดชบอร์ด",
      desc: "จัดการโครงงานและเมนูหลัก",
      steps: [
        "กด '+ สร้างโครงงานใหม่' เพื่อเริ่มโปรเจกต์",
        "กรอกชื่อและรายละเอียดสังเขป",
        "คลิกที่การ์ดโครงงานเพื่อเข้าสู่ห้องเรียน AI",
        "กดปุ่มถังขยะหากต้องการลบโครงงาน"
      ]
    },
    {
      icon: Cpu,
      color: "indigo",
      title: "3. ห้องเรียน AI (EDP)",
      desc: "เรียนรู้ผ่านกระบวนการ 6 ขั้นตอน",
      steps: [
        "คุยกับ AI เพื่อทำภารกิจในแต่ละขั้น",
        "พิมพ์คำตอบส่ง AI จะตรวจและให้คะแนนทันที",
        "ต้องได้คะแนน ≥ 60 จึงจะผ่านไปขั้นถัดไป",
        "ถ้าไม่ผ่าน ให้ปรับแก้ตามคำแนะนำแล้วส่งใหม่"
      ]
    },
    {
      icon: Trophy,
      color: "yellow",
      title: "4. การทำแบบทดสอบ",
      desc: "วัดความรู้และทักษะ",
      steps: [
        "กดปุ่ม 'ทำแบบทดสอบ' ที่ Dashboard",
        "ทำข้อสอบ 40 ข้อ (เกณฑ์ผ่าน 80%)",
        "⚠️ ห้ามพับจอหรือสลับแท็บ (จะถูกปรับตกทันที)",
        "กดส่งข้อสอบเพื่อดูผลคะแนนและเฉลย"
      ]
    },
    {
      icon: History,
      color: "emerald",
      title: "5. ประวัติ & อันดับ",
      desc: "ติดตามผลการเรียน",
      steps: [
        "กดปุ่ม 'นาฬิกา' เพื่อดูประวัติการสอบย้อนหลัง",
        "ดู Leaderboard เพื่อเช็คอันดับคะแนนสูงสุด",
        "👑 ผู้ที่ได้ที่ 1 จะมีมงกุฎท้ายชื่อ"
      ]
    },
    {
      icon: Settings,
      color: "red",
      title: "6. จัดการบัญชี",
      desc: "ความปลอดภัย",
      steps: [
        "กดปุ่ม 'กุญแจ' เพื่อเปลี่ยนรหัสผ่าน",
        "กดปุ่ม 'Log Out' สีแดง เพื่อออกจากระบบ",
        "ควรออกจากระบบทุกครั้งเมื่อเลิกใช้งาน"
      ]
    }
  ];

  return (
    // [FIXED] เปลี่ยน z-[100] เป็น z-100 ตามคำแนะนำ Tailwind Lint
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#0F172A] border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-[#1E293B]/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 rounded-xl border border-blue-500/30">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">คู่มือการใช้งานสำหรับนักเรียน</h2>
              <p className="text-xs text-slate-400">Student User Manual</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#020617]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {manualCards.map((card, idx) => {
              // [FIXED] เปลี่ยนจาก any เป็น Record<string, string> เพื่อแก้ ESLint Warning
              const colors: Record<string, string> = {
                blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                red: "bg-red-500/10 text-red-400 border-red-500/20",
              };
              
              const ColorIcon = card.icon;

              return (
                <div key={idx} className="bg-[#1E293B] border border-slate-700/50 p-5 rounded-2xl hover:border-slate-600 transition-all group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors[card.color]}`}>
                      <ColorIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{card.title}</h3>
                      <p className="text-[10px] text-slate-500">{card.desc}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {card.steps.map((step, sIdx) => (
                      <li key={sIdx} className="text-xs text-slate-300 flex gap-2 leading-relaxed">
                        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${card.color === 'yellow' ? 'bg-yellow-500' : card.color === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#1E293B]/50 text-center">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-500/20"
          >
            เข้าใจแล้ว
          </button>
        </div>

      </div>
    </div>
  );
}