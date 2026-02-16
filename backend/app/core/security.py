from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

# 1. ตั้งค่า Password Hashing (ใช้ bcrypt ซึ่งเป็นมาตรฐานสากล)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 2. Configuration
# ใช้ Key ที่ยาวและซับซ้อนขึ้นเป็น Default เพื่อความปลอดภัย (กรณีลืมใส่ใน .env)
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # ปรับเวลาล็อกอินค้างไว้เป็น 30 นาที (แก้ได้ตามใจชอบ)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """ตรวจสอบรหัสผ่านว่าตรงกับ Hash หรือไม่"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """แปลงรหัสผ่านเป็น Hash ก่อนเก็บลง Database"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """สร้าง JWT Token สำหรับยืนยันตัวตน"""
    to_encode = data.copy()
    
    # 3. ใช้ timezone.utc เพื่อความแม่นยำของเวลา (แก้ปัญหา Python รุ่นใหม่)
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt