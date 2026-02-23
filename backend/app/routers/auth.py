# backend/app/routers/auth.py
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError

from app.schemas.edp import ChangePassword
from app.database import get_db
from app.models.edp import User
from app.core import security

from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# --- Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    student_id: str
    first_name: str
    last_name: str
    class_room: str

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    class_room: Optional[str] = None

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    # [OPTIMIZED] อัปเดต last_active_at เฉพาะเมื่อผ่านไปแล้วอย่างน้อย 1 นาที
    # ช่วยลดภาระ Database มหาศาลเมื่อมีนักเรียนใช้งานพร้อมกันเยอะๆ
    now = datetime.now(timezone.utc)
    if user.last_active_at is None or (now - user.last_active_at).total_seconds() > 60:
        user.last_active_at = now
        db.commit()

    return user

# --- API Endpoints ---

@router.post("/register", status_code=201)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว")
    if db.query(User).filter(User.student_id == user_in.student_id).first():
        raise HTTPException(status_code=400, detail="เลขประจำตัวนี้มีในระบบแล้ว")

    new_user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        student_id=user_in.student_id,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        class_room=user_in.class_room,
        role="student"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "สมัครสมาชิกสำเร็จ", "student_id": new_user.student_id}

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")

    # [CLEAN CODE] ในฟังก์ชันสร้าง Token มีค่า Default ของ EXP อยู่แล้ว ตัดทิ้งให้โค้ดสั้นลงได้
    access_token = security.create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
            "id": user.id,
            "name": f"{user.first_name} {user.last_name}"
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }

@router.get("/me")
def get_my_profile(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "student_id": current_user.student_id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "class_room": current_user.class_room
    }

@router.patch("/profile")
def update_my_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if profile_data.first_name: current_user.first_name = profile_data.first_name
    if profile_data.last_name: current_user.last_name = profile_data.last_name
    if profile_data.class_room: current_user.class_room = profile_data.class_room
    
    db.commit()
    return {"message": "อัปเดตข้อมูลสำเร็จ"}

@router.post("/reset-password/{student_id}")
def reset_student_password(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="สำหรับครูเท่านั้น")

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลนักเรียน")

    student.hashed_password = security.get_password_hash("password123")
    db.commit()
    return {"message": f"รีเซ็ตรหัสผ่านของ {student.first_name} เป็น 'password123' เรียบร้อยแล้ว"}

@router.post("/change-password")
def change_password(
    password_data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not security.verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="รหัสผ่านเดิมไม่ถูกต้อง")

    current_user.hashed_password = security.get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "เปลี่ยนรหัสผ่านสำเร็จ"}