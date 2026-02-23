from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, aliased
from sqlalchemy import desc, func, distinct, case, and_
from datetime import datetime, timezone, timedelta 
from typing import List
from app.database import get_db
# ✅ เพิ่ม QuizAttempt เข้ามาในการ Import ด้านล่างนี้
from app.models.edp import EdpStep, Project, User, QuizAttempt
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
# 📊 TEACHER ANALYTICS & MANAGEMENT (Optimized)
# ==========================================

@router.get("/teacher/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied: Teachers only")

    total_students = db.query(func.count(User.id)).filter(User.role == 'student').scalar()
    total_projects = db.query(func.count(Project.id)).scalar()
    
    completed_projects = db.query(func.count(distinct(Project.id))).join(EdpStep).filter(
        EdpStep.step_number == 6,
        func.coalesce(EdpStep.teacher_score, EdpStep.score) >= 60
    ).scalar()

    avg_score = db.query(func.avg(func.coalesce(EdpStep.teacher_score, EdpStep.score))).scalar() or 0.0

    time_stats = db.query(
        EdpStep.step_number, 
        func.avg(EdpStep.time_spent_seconds)
    ).group_by(EdpStep.step_number).all()
    
    avg_time_map = {f"Step {s[0]}": round(s[1] or 0, 2) for s in time_stats}

    one_min_ago = datetime.now(timezone.utc) - timedelta(minutes=1)
    total_active_users = db.query(func.count(User.id)).filter(
        User.role == 'student',
        User.last_active_at >= one_min_ago
    ).scalar()

    class_stats = db.query(
        User.class_room, 
        func.count(User.id)
    ).filter(User.role == 'student').group_by(User.class_room).all()
    
    class_dist = { (room or "Unassigned"): count for room, count in class_stats }

    return DashboardStats(
        total_students=total_students,
        total_projects=total_projects,
        completed_projects=completed_projects,
        average_score=round(avg_score, 2),
        class_distribution=class_dist,
        total_active_users=total_active_users, 
        avg_time_per_step=avg_time_map,
        student_performance_avg=round(avg_score, 2)
    )

@router.get("/teacher/students", response_model=List[UserInfo])
def get_all_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied")
    
    # [FIX] Pagination Guard ป้องกันการดึงข้อมูลเกินความจำเป็น
    limit = min(limit, 500)
    
    results = db.query(
        User,
        func.count(distinct(Project.id)).label("project_count"),
        func.avg(func.coalesce(EdpStep.teacher_score, EdpStep.score)).label("average_score")
    ).outerjoin(Project, User.id == Project.owner_id)\
     .outerjoin(EdpStep, Project.id == EdpStep.project_id)\
     .filter(User.role == 'student')\
     .group_by(User.id)\
     .order_by(User.id.desc())\
     .offset(skip).limit(limit)\
     .all()
    
    response_data = []
    for user, p_count, avg_score in results:
        s_info = UserInfo.from_orm(user)
        s_info.project_count = p_count or 0
        s_info.average_score = round(avg_score or 0.0, 2)
        response_data.append(s_info)
        
    return response_data

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
    # ตรวจสอบสิทธิ์ว่าต้องเป็นครูเท่านั้น
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied: เฉพาะครูเท่านั้นที่สามารถลบข้อมูลนักเรียนได้")
        
    student = db.query(User).filter(User.id == student_id, User.role == 'student').first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    try:
        # ✅ 1. ลบประวัติการสอบ (QuizAttempt) ของนักเรียนคนนี้ทั้งหมด
        db.query(QuizAttempt).filter(QuizAttempt.student_id == student.id).delete(synchronize_session=False)
        
        # ✅ 2. ค้นหาโครงงาน (Project) ทั้งหมดของนักเรียน
        projects = db.query(Project).filter(Project.owner_id == student.id).all()
        project_ids = [p.id for p in projects]
        
        if project_ids:
            # ✅ 3. ลบขั้นตอนงาน (EdpStep) ที่ผูกอยู่กับโครงงานทั้งหมดของเด็กคนนี้
            db.query(EdpStep).filter(EdpStep.project_id.in_(project_ids)).delete(synchronize_session=False)
            
            # ✅ 4. ลบโครงงาน (Project)
            db.query(Project).filter(Project.owner_id == student.id).delete(synchronize_session=False)
            
        # ✅ 5. ลบบัญชีนักเรียน (User) ออกจากระบบเป็นขั้นตอนสุดท้าย
        db.delete(student)
        db.commit()
        return {"message": "ลบบัญชีนักเรียนและข้อมูลที่เกี่ยวข้องทั้งหมดเรียบร้อยแล้ว"}
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting student: {e}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดระดับเซิร์ฟเวอร์ ไม่สามารถลบข้อมูลนักเรียนได้")

# ==========================================
# 🚀 PROJECT & EDP ENDPOINTS
# ==========================================

@router.get("/projects")
def get_user_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    return projects

@router.get("/teacher/projects", response_model=List[ProjectWithStudent])
def get_all_projects_for_teacher(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied")

    # [FIX] Pagination Guard ป้องกันเซิร์ฟเวอร์โหลดหนัก
    limit = min(limit, 500)

    # [FIX 2] แก้ปัญหาโปรเจกต์ขึ้นซ้ำ โดยการดึงเฉพาะ ID ของ Step ล่าสุดจริงๆ (max_step_id) เท่านั้น
    latest_step_sub = db.query(
        EdpStep.project_id,
        func.max(EdpStep.id).label("max_step_id")
    ).group_by(EdpStep.project_id).subquery()

    # นำมา Join เพื่อให้ได้ข้อมูลที่ Unique 100%
    projects_query = db.query(
        Project, 
        User, 
        EdpStep
    ).join(User, Project.owner_id == User.id)\
     .outerjoin(latest_step_sub, Project.id == latest_step_sub.c.project_id)\
     .outerjoin(EdpStep, EdpStep.id == latest_step_sub.c.max_step_id)\
     .order_by(Project.created_at.desc())\
     .offset(skip).limit(limit)\
     .all()
    
    results = []
    for p, owner, edp_step in projects_query:
        status_text = "In Progress"
        step_num = 0
        
        if edp_step:
            step_num = edp_step.step_number
            final_score = edp_step.teacher_score if edp_step.teacher_score is not None else edp_step.score
            
            if step_num == 6 and final_score is not None and final_score >= 60:
                status_text = "Completed"
        else:
            status_text = "Not Started"
        
        p_data = ProjectWithStudent(
            id=p.id,
            title=p.title,
            description=p.description,
            created_at=p.created_at,
            owner=owner,
            latest_step=step_num,
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
        
    try:
        # ✅ ลบข้อมูลขั้นตอนการทำงาน (EdpStep) ของโครงงานนี้ทิ้งก่อนลบโปรเจกต์
        db.query(EdpStep).filter(EdpStep.project_id == project.id).delete(synchronize_session=False)
        
        # ลบโครงงาน
        db.delete(project)
        db.commit()
        return {"message": "Project deleted successfully"}
    except Exception as e:
        db.rollback()
        print(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail="ไม่สามารถลบโครงงานได้")

@router.post("/submit", response_model=StepResponse)
async def submit_edp_step(
    step: StepCreate, 
    db: Session = Depends(get_db),
    ai_service: GeminiService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user)
):
    # [FIX] Guard ป้องกัน Step เกิน 6
    if step.step_number < 1 or step.step_number > 6:
        raise HTTPException(status_code=400, detail="Invalid step number. Must be between 1 and 6.")

    project = db.query(Project).filter(Project.id == step.project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project.owner_id != current_user.id and current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied")

    # ดึงงานล่าสุดของ *ด่านนี้* มาเทียบ (เพื่อดูเรื่องสแปมข้อความเดิม)
    last_step = db.query(EdpStep).filter(
        EdpStep.project_id == step.project_id,
        EdpStep.step_number == step.step_number
    ).order_by(desc(EdpStep.created_at)).first()

    # ดึงงานล่าสุดของ *โปรเจกต์นี้ทั้งหมด* เพื่อใช้เช็ค Cycle ทับซ้อน
    absolute_latest_step = db.query(EdpStep).filter(
        EdpStep.project_id == step.project_id
    ).order_by(desc(EdpStep.created_at)).first()

    if last_step:
        # [FIX 1] ดักจับข้อความซ้ำเป๊ะๆ ป้องกันเด็กสแปมส่งเพื่อเปลี่ยนคะแนน
        if last_step.content.strip() == step.content.strip():
            raise HTTPException(
                status_code=400, 
                detail="เนื้อหาเหมือนกับครั้งที่แล้วเป๊ะเลย! กรุณาปรับปรุงแก้ไขตามคำแนะนำก่อนส่งใหม่นะครับ"
            )

        # Rate Limiting (15 วินาที)
        if last_step.created_at:
            now = datetime.now(timezone.utc)
            last_step_time = last_step.created_at
            
            # ป้องกันปัญหา Race Condition timezone-aware vs timezone-naive
            if last_step_time.tzinfo is None:
                last_step_time = last_step_time.replace(tzinfo=timezone.utc)
            
            time_diff = (now - last_step_time).total_seconds()
            if time_diff < 15:
                raise HTTPException(status_code=429, detail=f"กรุณารออีก {15 - int(time_diff)} วินาที ก่อนส่งงานใหม่อีกครั้ง")

    # --- AI Analysis ---
    analysis = await ai_service.analyze_step(step.step_number, step.content)
    
    # [FIX 2] เช็คการนับ attempt_count ทับซ้อนในกรณีขึ้น Cycle ใหม่
    # ถ้าด่านล่าสุดสุดที่เพิ่งทำ ไม่ใช่ด่านนี้ แสดงว่าเด็กวน Cycle กลับมาทำด่านนี้ใหม่ ให้เริ่มนับ attempt = 1 
    if absolute_latest_step and absolute_latest_step.step_number != step.step_number:
        current_attempt = 1
    else:
        current_attempt = (last_step.attempt_count + 1) if last_step else 1

    new_step = EdpStep(
        project_id=step.project_id,
        step_number=step.step_number,
        content=step.content,
        ai_feedback=analysis.get("feedback_th", "N/A"),
        score=float(analysis.get("relevance_score", 0)),
        
        creativity_score=float(analysis.get("creativity_score", 0)),
        time_spent_seconds=step.time_spent_seconds, 
        
        score_breakdown=analysis.get("score_breakdown", []),
        warning_flags=analysis.get("warning_flags", []),
        sentiment=analysis.get("sentiment", "Neutral"),
        competency_level=analysis.get("competency_level", "Novice"),
        critical_thinking=analysis.get("critical_thinking", "Low"),
        suggested_action=analysis.get("suggested_action", ""),
        
        status="submitted",
        word_count=len(step.content.split()) if step.content else 0,
        attempt_count=current_attempt  # ใช้ค่า attempt ที่คำนวณใหม่
    )
    
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

    step.teacher_score = grade.teacher_score
    step.teacher_comment = grade.teacher_comment
    step.is_teacher_reviewed = True
    
    db.commit()
    db.refresh(step)
    return step