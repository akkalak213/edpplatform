# ไฟล์: backend/update_db.py
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# 1. ดึง URL Database
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    print("❌ Error: ไม่พบ DATABASE_URL ใน .env")
    exit(1)

engine = create_engine(DATABASE_URL)

def add_column_if_not_exists(table, column, type_sql):
    with engine.connect() as conn:
        # เช็คว่ามีคอลัมน์หรือยัง
        check_sql = text(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='{table}' AND column_name='{column}';
        """)
        result = conn.execute(check_sql).fetchone()
        
        if not result:
            print(f"➕ กำลังเพิ่มคอลัมน์ '{column}' ในตาราง '{table}'...")
            try:
                # สั่ง SQL เพิ่มคอลัมน์
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type_sql};"))
                conn.commit()
                print(f"✅ เพิ่มสำเร็จ!")
            except Exception as e:
                print(f"⚠️ เพิ่มไม่สำเร็จ: {e}")
        else:
            print(f"👌 คอลัมน์ '{column}' มีอยู่แล้ว (ข้าม)")

if __name__ == "__main__":
    print("🚀 เริ่มตรวจสอบและอัปเดต Database...")
    
    # 1. เพิ่มคอลัมน์ให้ตาราง edp_steps (สำหรับเก็บคะแนนครูและสถิติ)
    add_column_if_not_exists("edp_steps", "teacher_score", "FLOAT DEFAULT NULL")
    add_column_if_not_exists("edp_steps", "teacher_comment", "TEXT DEFAULT NULL")
    add_column_if_not_exists("edp_steps", "is_teacher_reviewed", "BOOLEAN DEFAULT FALSE")
    
    add_column_if_not_exists("edp_steps", "creativity_score", "FLOAT DEFAULT 0.0")
    add_column_if_not_exists("edp_steps", "time_spent_seconds", "INTEGER DEFAULT 0")
    
    # 2. เพิ่มคอลัมน์ให้ตาราง projects (สำหรับสถานะ)
    add_column_if_not_exists("projects", "status", "VARCHAR DEFAULT 'in_progress'")
    add_column_if_not_exists("projects", "is_published", "BOOLEAN DEFAULT FALSE")
    add_column_if_not_exists("projects", "project_summary", "TEXT DEFAULT NULL")

    print("\n🎉 อัปเดต Database เรียบร้อย! ข้อมูลเก่าอยู่ครบถ้วน")