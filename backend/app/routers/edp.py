from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
# [FIX] เพิ่ม timedelta เข้ามาสำหรับการคำนวณเวลา Active
from datetime import datetime, timezone, timedelta 
from typing import List
from app.database import get_db
from app.models.edp import EdpStep, Project, User
from app.schemas.edp import (
    StepCreate, StepResponse, ProjectCreate, ProjectWithStudent, 
    TeacherGrade, StudentUpdate, UserInfo, DashboardStats
)
from app.services.gemini_service import GeminiService
from app.routers.auth import get_current_user

router = APIRouter(
    prefix="/edp",
    tags=["EDP Process"]
)

def get_ai_service():
    return GeminiService()

# ==========================================
# 📊 TEACHER ANALYTICS & MANAGEMENT (ส่วนใหม่ + Realtime)
# ==========================================

@router.get("/teacher/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. เช็คสิทธิ์ครู
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied: Teachers only")

    # 2. คำนวณสถิติพื้นฐาน
    total_students = db.query(User).filter(User.role == 'student').count()
    total_projects = db.query(Project).count()
    
    # นับโปรเจคที่เสร็จสมบูรณ์ (ผ่าน Step 6 ด้วยคะแนน >= 60)
    completed_projects = db.query(Project).join(EdpStep).filter(
        EdpStep.step_number == 6,
        func.coalesce(EdpStep.teacher_score, EdpStep.score) >= 60
    ).count()

    # คะแนนเฉลี่ยรวมทุก Step ของทุกคน
    avg_score = db.query(func.avg(func.coalesce(EdpStep.teacher_score, EdpStep.score))).scalar() or 0.0

    # เวลาเฉลี่ยในแต่ละ Step (วินาที)
    time_stats = db.query(
        EdpStep.step_number, 
        func.avg(EdpStep.time_spent_seconds)
    ).group_by(EdpStep.step_number).all()
    
    avg_time_map = {f"Step {s[0]}": round(s[1] or 0, 2) for s in time_stats}

    # [NEW] คำนวณ Active Users (เคลื่อนไหวใน 1 นาทีที่ผ่านมา - Realtime)
    one_min_ago = datetime.now(timezone.utc) - timedelta(minutes=1)
    total_active_users = db.query(User).filter(
        User.role == 'student',
        User.last_active_at >= one_min_ago
    ).count()

    # การกระจายตัวของนักเรียนในแต่ละห้อง
    students = db.query(User).filter(User.role == 'student').all()
    class_dist = {}
    for s in students:
        room = s.class_room or "Unassigned"
        class_dist[room] = class_dist.get(room, 0) + 1

    return DashboardStats(
        total_students=total_students,
        total_projects=total_projects,
        completed_projects=completed_projects,
        average_score=round(avg_score, 2),
        class_distribution=class_dist,
        # [UPDATED] ส่งค่า Active Users จริงกลับไป
        total_active_users=total_active_users, 
        avg_time_per_step=avg_time_map,
        student_performance_avg=round(avg_score, 2)
    )

@router.get("/teacher/students", response_model=List[UserInfo])
def get_all_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied")
    
    students = db.query(User).filter(User.role == 'student').all()
    
    results = []
    for s in students:
        # นับจำนวนโปรเจค
        p_count = db.query(Project).filter(Project.owner_id == s.id).count()
        
        # คำนวณคะแนนเฉลี่ยรายบุคคล
        s_avg = db.query(func.avg(func.coalesce(EdpStep.teacher_score, EdpStep.score)))\
            .join(Project, Project.id == EdpStep.project_id)\
            .filter(Project.owner_id == s.id).scalar() or 0.0
        
        # แปลงข้อมูล
        s_info = UserInfo.from_orm(s)
        s_info.project_count = p_count
        s_info.average_score = round(s_avg, 2)
        results.append(s_info)
        
    return results

@router.patch("/teacher/students/{student_id}")
def update_student(
    student_id: int,
    update_data: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied")
        
    student = db.query(User).filter(User.id == student_id, User.role == 'student').first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # อัปเดตข้อมูลทีละ field
    if update_data.first_name: student.first_name = update_data.first_name
    if update_data.last_name: student.last_name = update_data.last_name
    if update_data.student_id: student.student_id = update_data.student_id
    if update_data.class_room: student.class_room = update_data.class_room
    
    db.commit()
    db.refresh(student)
    return {"message": "Student updated successfully"}

@router.delete("/teacher/students/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied")
        
    student = db.query(User).filter(User.id == student_id, User.role == 'student').first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    db.delete(student)
    db.commit()
    return {"message": "Student deleted successfully"}

# ==========================================
# 🚀 PROJECT & EDP ENDPOINTS (เหมือนเดิม 100%)
# ==========================================

@router.get("/projects")
def get_user_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # นักเรียนเห็นแค่ของตัวเอง
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    return projects

@router.get("/teacher/projects", response_model=List[ProjectWithStudent])
def get_all_projects_for_teacher(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ครูเห็นของทุกคน
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied")

    projects = db.query(Project).join(User).all()
    
    results = []
    for p in projects:
        last_step = db.query(EdpStep).filter(EdpStep.project_id == p.id).order_by(desc(EdpStep.step_number)).first()
        
        current_step_num = last_step.step_number if last_step else 0
        status_text = "In Progress"
        
        if current_step_num == 6 and last_step.score >= 60:
            status_text = "Completed"
        elif current_step_num == 0:
            status_text = "Not Started"
        
        p_data = ProjectWithStudent(
            id=p.id,
            title=p.title,
            description=p.description,
            created_at=p.created_at,
            owner=p.owner,
            latest_step=current_step_num,
            status=status_text
        )
        results.append(p_data)
        
    return results

@router.post("/projects", status_code=201)
def create_project(
    project_in: ProjectCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_project = Project(
        title=project_in.title,
        description=project_in.description,
        owner_id=current_user.id
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return {"message": "Project created successfully", "id": new_project.id}

@router.delete("/projects/{project_id}")
def delete_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.owner_id != current_user.id and current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied")
        
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

@router.post("/submit", response_model=StepResponse)
async def submit_edp_step(
    step: StepCreate, 
    db: Session = Depends(get_db),
    ai_service: GeminiService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == step.project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project.owner_id != current_user.id and current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied")

    # --- Rate Limiting (15 วินาที) ---
    last_step = db.query(EdpStep).filter(
        EdpStep.project_id == step.project_id,
        EdpStep.step_number == step.step_number
    ).order_by(desc(EdpStep.created_at)).first()

    if last_step and last_step.created_at:
        now = datetime.now(timezone.utc)
        last_step_time = last_step.created_at
        if last_step_time.tzinfo is None:
            last_step_time = last_step_time.replace(tzinfo=timezone.utc)
        
        time_diff = (now - last_step_time).total_seconds()
        if time_diff < 15:
            raise HTTPException(status_code=429, detail=f"Please wait {15 - int(time_diff)} seconds")

    # --- AI Analysis ---
    analysis = await ai_service.analyze_step(step.step_number, step.content)
    
    new_step = EdpStep(
        project_id=step.project_id,
        step_number=step.step_number,
        content=step.content,
        ai_feedback=analysis.get("feedback_th", "N/A"),
        score=float(analysis.get("relevance_score", 0)),
        
        # บันทึก Creativity และ Time Spent
        creativity_score=float(analysis.get("creativity_score", 0)),
        time_spent_seconds=step.time_spent_seconds, 
        
        score_breakdown=analysis.get("score_breakdown", []),
        warning_flags=analysis.get("warning_flags", []),
        sentiment=analysis.get("sentiment", "Neutral"),
        competency_level=analysis.get("competency_level", "Novice"),
        critical_thinking=analysis.get("critical_thinking", "Low"),
        suggested_action=analysis.get("suggested_action", ""),
        
        status="submitted",
        word_count=len(step.content.split()) if step.content else 0
    )
    
    new_step.attempt_count = (last_step.attempt_count + 1) if last_step else 1

    db.add(new_step)
    db.commit()
    db.refresh(new_step)
    
    return new_step

@router.get("/project/{project_id}", response_model=List[StepResponse])
def get_project_steps(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.owner_id != current_user.id and current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied")

    steps = db.query(EdpStep).filter(EdpStep.project_id == project_id).order_by(EdpStep.step_number.asc()).all()
    return steps or []

@router.patch("/step/{step_id}/grade")
def grade_step(
    step_id: int,
    grade: TeacherGrade,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied: Teachers only")

    step = db.query(EdpStep).filter(EdpStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")

    # บันทึกคะแนนและคอมเมนต์จากครู
    step.teacher_score = grade.teacher_score
    step.teacher_comment = grade.teacher_comment
    step.is_teacher_reviewed = True
    
    db.commit()
    db.refresh(step)
    return step