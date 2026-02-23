from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from app.database import get_db
from app.models.edp import EdpStep, Project, User
from app.routers.auth import get_current_user # ✅ Import ตัวตรวจสอบ User

router = APIRouter(prefix="/analytics", tags=["Teacher Analytics"])

@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # ✅ บังคับต้องมี Token ยืนยันตัวตน
):
    """
    Dashboard ภาพรวมห้องเรียน:
    - กระจายงานในแต่ละขั้น (Progress)
    - เกรดเฉลี่ยรวม (Average Score)
    - สุขภาพจิตห้องเรียน (Class Sentiment)
    - ระดับสมรรถนะ (Competency Distribution)
    """
    # ✅ ป้องกันไม่ให้นักเรียน หรือคนนอกเข้ามาดูข้อมูลภาพรวม
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied: สำหรับครูผู้สอนเท่านั้น")
    
    # 1. ความคืบหน้า (Progress): นักเรียนอยู่ขั้นตอนไหนกันบ้าง
    step_stats = db.query(
        EdpStep.step_number, 
        func.count(EdpStep.id).label("total")
    ).group_by(EdpStep.step_number).all()
    
    # 2. คะแนนเฉลี่ยทั้งระบบ (System Performance)
    avg_score = db.query(func.avg(EdpStep.score)).scalar() or 0
    
    # 3. สุขภาพจิตผู้เรียน (Sentiment Analysis)
    sentiment_stats = db.query(
        EdpStep.sentiment, 
        func.count(EdpStep.id)
    ).filter(EdpStep.sentiment.isnot(None)).group_by(EdpStep.sentiment).all()

    # 4. การกระจายตัวของสมรรถนะ (Competency Levels)
    competency_stats = db.query(
        EdpStep.competency_level,
        func.count(EdpStep.id)
    ).filter(EdpStep.competency_level.isnot(None)).group_by(EdpStep.competency_level).all()

    return {
        "progress_chart": {f"Step {s.step_number}": s.total for s in step_stats},
        "average_score": round(avg_score, 2),
        "sentiment_chart": {str(s[0]): s[1] for s in sentiment_stats},
        "competency_chart": {str(c[0]): c[1] for c in competency_stats}
    }

@router.get("/at-risk-students")
def get_at_risk_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # ✅ บังคับต้องมี Token
):
    """
    🚨 ระบบเตือนภัยล่วงหน้า (Early Warning System):
    ค้นหานักเรียนที่ 'น่าเป็นห่วง' โดยระบุตัวตนชัดเจน (ชื่อ, ห้อง, เลขประจำตัว)
    เพื่อให้ครูเข้าช่วยทันที
    """
    # ✅ ป้องกันข้อมูลส่วนตัวนักเรียนหลุด
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied: สำหรับครูผู้สอนเท่านั้น")
    
    # ดึงข้อมูลระบุตัวตนครบถ้วน
    risky_students = db.query(
        User.first_name,
        User.last_name,
        User.class_room,
        User.student_id,
        Project.title,
        EdpStep.step_number,
        EdpStep.attempt_count,
        EdpStep.sentiment,
        EdpStep.warning_flags,
        EdpStep.ai_feedback
    ).join(Project, Project.owner_id == User.id)\
     .join(EdpStep, EdpStep.project_id == Project.id)\
     .filter(
         (EdpStep.attempt_count >= 3) | 
         (EdpStep.sentiment.in_(["Frustrated", "Confused"])) |
         (EdpStep.score < 4)
     ).order_by(desc(EdpStep.attempt_count)).limit(20).all()

    return [
        {
            "student_name": f"{s.first_name} {s.last_name}",
            "student_id": s.student_id,
            "class_room": s.class_room,
            "project": s.title,
            "step": f"Step {s.step_number}",
            "issue": "ติดขัดนานเกินไป" if s.attempt_count >= 3 else f"อารมณ์: {s.sentiment}",
            "attempts": s.attempt_count,
            "ai_suggestion": (s.ai_feedback[:100] + "...") if s.ai_feedback else "ไม่มีคำแนะนำ"
        } for s in risky_students
    ]

@router.get("/critical-thinking-matrix")
def get_critical_thinking_matrix(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # ✅ บังคับต้องมี Token
):
    """
    เจาะลึกทักษะการคิดวิพากษ์ (Critical Thinking) รายขั้นตอน
    """
    # ✅ ป้องกันผู้ไม่มีสิทธิ์
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied: สำหรับครูผู้สอนเท่านั้น")

    results = db.query(
        EdpStep.step_number,
        EdpStep.critical_thinking,
        func.count(EdpStep.id)
    ).group_by(EdpStep.step_number, EdpStep.critical_thinking).all()
    
    # จัด Format สำหรับทำ Stacked Bar Chart
    matrix = {}
    for r in results:
        step = f"Step {r.step_number}"
        level = r.critical_thinking or "Unknown"
        count = r[2]
        
        if step not in matrix:
            matrix[step] = {}
        matrix[step][level] = count
        
    return matrix