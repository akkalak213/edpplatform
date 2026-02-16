from app.database import engine, Base
from app.models.edp import User, Project, EdpStep

print("🔥 กำลังลบตารางเก่าทิ้ง (Dropping all tables)...")
Base.metadata.drop_all(bind=engine)

print("✨ กำลังสร้างตารางใหม่ที่มีช่องครบถ้วน (Creating new tables)...")
Base.metadata.create_all(bind=engine)

print("✅ เสร็จสิ้น! Database ของคุณเป็นเวอร์ชันใหม่แล้ว")