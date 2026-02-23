from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# 1. ดึง URL และจัดการปัญหา URL ของ Railway
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# [CRITICAL FIX] แปลง postgres:// เป็น postgresql://
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Fallback ไปใช้ SQLite ถ้ารัน Local แล้วลืมใส่ Env
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./edp.db"

# 2. เตรียม Config สำหรับ Engine
engine_kwargs = {}

# แยก Config ตามประเภทฐานข้อมูล
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # --- Config สำหรับ 4 Workers ---
    
    # เลนถนนหลักต่อ 1 Worker = 10 (รวม 4 Workers = 40 Connections)
    engine_kwargs["pool_size"] = 10 
    
    # เลนสำรองต่อ 1 Worker = 10 (รวม 4 Workers = 40 Connections)
    engine_kwargs["max_overflow"] = 10 
    
    # รวม 4 Workers จะกิน Connection สูงสุดที่ 80 (เหลือที่ว่าง 20 คิวให้ระบบหายใจ) ปลอดภัย 100%
    engine_kwargs["pool_timeout"] = 30
    engine_kwargs["pool_recycle"] = 1800
    engine_kwargs["pool_pre_ping"] = True

# 3. สร้าง Engine ด้วย Config ที่เตรียมไว้
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()