from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError

from app.database import get_db
from app.models.edp import User
from app.core import security

# ==========================================
# 🔑 CONFIGURATION (กำหนดกุญแจที่นี่ที่เดียว จบปัญหา)
# ==========================================
SECRET_KEY = "EDP_SUPER_SECRET_KEY_CHANGE_ME_PLEASE"  # กุญแจลับสำหรับไฟล์นี้โดยเฉพาะ
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 วัน

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

# --- 🛠️ INTERNAL FUNCTIONS (สร้างและตรวจ Token ในไฟล์นี้เลย) ---

# [NEW] ฟังก์ชันสร้าง Token ที่ใช้ SECRET_KEY ของไฟล์นี้แน่นอน
def create_access_token_local(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    # ใช้ SECRET_KEY ที่ประกาศข้างบน 100%
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# [FIX] ฟังก์ชันตรวจ Token ก็ใช้ SECRET_KEY ตัวเดียวกัน
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # ใช้ SECRET_KEY ตัวเดิมในการแกะ Token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
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
        # Password Hash ยังใช้ของ security ได้ (เพราะมันเป็น One-way hash ไม่เกี่ยวกับ Secret Key)
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
    # 1. หา User
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # 2. ตรวจรหัสผ่าน
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    
    # 3. สร้าง Token (เรียกฟังก์ชัน local ที่เราเพิ่งเขียน)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # [FIX] ใช้ create_access_token_local แทน security.create_access_token
    access_token = create_access_token_local(
        data={
            "sub": user.email, 
            "role": user.role,
            "id": user.id,
            "name": f"{user.first_name} {user.last_name}"
        },
        expires_delta=access_token_expires
    )
    
    # [CRITICAL FIX] ส่ง role กลับไปด้วย เพื่อให้ Frontend ตัดสินใจเปลี่ยนหน้าจอได้ถูกต้อง
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role 
    }