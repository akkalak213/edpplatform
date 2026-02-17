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
    # --- Config สำหรับ Local (SQLite) ---
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # --- Config สำหรับ Production (PostgreSQL บน Railway) ---
    # จัดเต็มสเปคเครื่อง 8 vCPU / 8 GB RAM
    
    # 1. pool_size: จำนวน Connection ที่เปิดค้างรอไว้ตลอดเวลา (เหมือนเลนถนนหลัก)
    # ปกติ 5-10 แต่เครื่องคุณแรง จัดไป 40 เลยครับ รองรับเด็ก 50 คนสบาย
    engine_kwargs["pool_size"] = 40
    
    # 2. max_overflow: ถ้า 40 เลนเต็ม อนุญาตให้เปิดเลนพิเศษเพิ่มได้อีกกี่เลน
    # รวมแล้วรับได้สูงสุด 60 Concurrent Connections (40+20)
    engine_kwargs["max_overflow"] = 20
    
    # 3. pool_timeout: ถ้ารถติด (Connection เต็ม) ให้รอได้กี่วินาทีก่อนแจ้ง Error
    engine_kwargs["pool_timeout"] = 30
    
    # 4. pool_recycle: รีเซ็ต Connection ทุกๆ 30 นาที (1800 วิ) 
    # ป้องกันปัญหา Railway ตัด Connection ที่ทิ้งไว้นานๆ
    engine_kwargs["pool_recycle"] = 1800
    
    # 5. pool_pre_ping: (สำคัญมาก) เช็คก่อนว่า Connection ยังดีอยู่ไหมก่อนใช้งาน
    # ช่วยแก้ปัญหา "Database connection closed" หรือ Error 500 แบบงงๆ
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