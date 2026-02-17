# File: backend/app/routers/auth.py
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

# ==========================================
# 🔑 CONFIGURATION (Key Configuration)
# ==========================================
# [FIX] Kept the original key as requested
SECRET_KEY = "sdmmgkamdjjjdJJNJsafnDLKsmfknSJDFndsjZNJKFD*-*324242dsa"  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Setup OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# --- Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    student_id: str
    first_name: str
    last_name: str
    class_room: str

# --- 🛠️ INTERNAL FUNCTIONS (Create and Verify Token locally) ---

def create_access_token_local(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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
    
    # [NEW] Update last active time whenever the user interacts with the API
    user.last_active_at = datetime.now(timezone.utc)
    db.commit()
    
    return user

# --- API ENDPOINTS ---

@router.post("/register", status_code=201)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # 1. Check duplicate email
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว")
    
    # 2. Check duplicate student_id
    if db.query(User).filter(User.student_id == user_in.student_id).first():
        raise HTTPException(status_code=400, detail="เลขประจำตัวนี้มีในระบบแล้ว")

    # 3. Create User
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
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Find User
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # 2. Check password
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    
    # 3. Create Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    access_token = create_access_token_local(
        data={
            "sub": user.email, 
            "role": user.role,
            "id": user.id,
            "name": f"{user.first_name} {user.last_name}"
        },
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role 
    }

# --- [NEW] Reset Password System for Teachers ---
@router.post("/reset-password/{student_id}")
def reset_student_password(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Check if Teacher (Security Check)
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="สำหรับครูเท่านั้น")
    
    # 2. Find Student
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลนักเรียน")
        
    # 3. Reset password to "password123"
    student.hashed_password = security.get_password_hash("password123")
    db.commit()
    
    return {"message": f"รีเซ็ตรหัสผ่านของ {student.first_name} เป็น 'password123' เรียบร้อยแล้ว"}

@router.post("/change-password")
def change_password(
    password_data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Check old password
    if not security.verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="รหัสผ่านเดิมไม่ถูกต้อง")
    
    # 2. Change to new password
    current_user.hashed_password = security.get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "เปลี่ยนรหัสผ่านสำเร็จ"}