from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# 1. ตารางผู้ใช้ (User)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    student_id = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    class_room = Column(String)
    
    role = Column(String, default="student") # student, teacher, admin
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ความสัมพันธ์
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

# 2. ตารางโปรเจค (Project)
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # ✅ NEW: สถานะภาพรวมของโปรเจค
    status = Column(String, default="in_progress") # in_progress, completed, graded
    is_published = Column(Boolean, default=False)  # เผยแพร่ผลงานหรือไม่
    project_summary = Column(Text, nullable=True)  # สรุปภาพรวมโปรเจคโดย AI (ไว้โชว์หน้า Dashboard ครู)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    owner = relationship("User", back_populates="projects")
    steps = relationship("EdpStep", back_populates="project", cascade="all, delete-orphan")

# 3. ตาราง 6 ขั้นตอน EDP (EdpStep) - หัวใจสำคัญของการวิเคราะห์
class EdpStep(Base):
    __tablename__ = "edp_steps"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    step_number = Column(Integer) # 1-6
    
    # --- ข้อมูลหลัก ---
    content = Column(Text)          # เนื้อหาที่นักเรียนพิมพ์
    ai_feedback = Column(Text)      # คำแนะนำจาก AI
    
    # --- มิติที่ 1: คะแนนและการวัดผล (Performance) ---
    score = Column(Float, default=0.0)       # คะแนนรวมจาก AI
    score_breakdown = Column(JSON, default=[]) # ตารางคะแนนละเอียด 4 ด้าน (Clarity, etc.)
    
    # ✅ NEW: ส่วนของครูผู้สอน (Teacher Intervention)
    teacher_score = Column(Float, nullable=True)   # คะแนนจากครู (ถ้ามี ให้ใช้แทน AI)
    teacher_comment = Column(Text, nullable=True)  # คอมเมนต์เพิ่มเติมจากครู
    is_teacher_reviewed = Column(Boolean, default=False) # ครูตรวจแล้วหรือยัง

    # --- มิติที่ 2: การวิเคราะห์เชิงลึก (Deep Analytics) ---
    critical_thinking = Column(String) # ระดับการคิดวิเคราะห์ (Low, Medium, High)
    sentiment = Column(String)         # อารมณ์/ความมั่นใจ (Confident, Neutral, Confused)
    competency_level = Column(String)  # ระดับความสามารถ (Novice, Apprentice, Master)
    
    # ✅ NEW: แยกคะแนนความคิดสร้างสรรค์ออกมาเพื่อการวิเคราะห์เฉพาะจุด
    creativity_score = Column(Float, default=0.0) 
    
    suggested_action = Column(Text)    # สิ่งที่ควรทำต่อ
    warning_flags = Column(JSON, default=[]) # ธงแจ้งเตือน (เช่น ลอกเพื่อน, เนื้อหาสั้นเกินไป)

    # --- มิติที่ 3: พฤติกรรมการเรียนรู้ (Behavioral) ---
    word_count = Column(Integer, default=0)
    attempt_count = Column(Integer, default=1) # ส่งไปแล้วกี่รอบ
    
    # ✅ NEW: เวลาที่ใช้ในการทำ Step นี้ (วินาที) - ต้องส่งมาจาก Frontend
    time_spent_seconds = Column(Integer, default=0) 

    status = Column(String, default="submitted") # submitted, passed, revision_needed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", back_populates="steps")