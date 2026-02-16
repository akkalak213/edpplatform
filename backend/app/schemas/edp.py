from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

# --- Step Schemas ---
class StepCreate(BaseModel):
    project_id: int
    step_number: int 
    content: str

class ScoreItem(BaseModel):
    criteria: str
    score: int
    max_score: int
    comment: Optional[str] = None

class StepResponse(BaseModel):
    id: int
    step_number: int
    content: str
    ai_feedback: Optional[str] = None
    score: float
    score_breakdown: Optional[List[ScoreItem]] = []
    
    # Analytics Fields
    critical_thinking: Optional[str] = None
    sentiment: Optional[str] = None
    competency_level: Optional[str] = None
    suggested_action: Optional[str] = None
    warning_flags: Optional[List[Any]] = []
    
    # Stats
    word_count: Optional[int] = 0
    attempt_count: int
    status: str
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectCreate(BaseModel):
    title: str
    description: str = None

class ProjectBase(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    status: Optional[str] = None # เพิ่ม status ให้รองรับ ProjectModel ใหม่
    
    class Config:
        from_attributes = True

# --- Teacher & Admin Schemas ---
class UserInfo(BaseModel):
    id: int
    first_name: str
    last_name: str
    student_id: str
    class_room: str
    email: Optional[str] = None
    project_count: Optional[int] = 0 
    
    class Config:
        from_attributes = True

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    student_id: Optional[str] = None
    class_room: Optional[str] = None

class ProjectWithStudent(ProjectBase):
    owner: UserInfo
    latest_step: Optional[int] = 0
    status: str = "In Progress"

class TeacherGrade(BaseModel):
    teacher_score: float
    teacher_comment: Optional[str] = None

class DashboardStats(BaseModel):
    total_students: int
    total_projects: int
    completed_projects: int
    average_score: float
    class_distribution: Dict[str, int]