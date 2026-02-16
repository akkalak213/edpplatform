from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# 1. ดึง URL จาก Environment Variable
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# [CRITICAL FIX] Railway/Heroku มักจะให้ postgres:// มา 
# แต่ SQLAlchemy ต้องการ postgresql:// เราจึงต้องทำการแทนที่คำครับ
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# กรณีรันเครื่องตัวเอง (Local) แล้วไม่มีค่าใน .env ให้กลับไปใช้ SQLite
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./edp.db"

# 2. ตั้งค่า Connect Args สำหรับ SQLite เท่านั้น
connect_args = {}
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    connect_args = {"check_same_thread": False}

# 3. สร้าง Engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()