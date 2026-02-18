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

if __name__ == "__main__":
    print("🚀 เริ่มสร้างตารางสำหรับระบบ Quiz...")

    with engine.connect() as conn:
        try:
            # 1. สร้างตาราง quiz_questions (เก็บโจทย์)
            print("creating table 'quiz_questions'...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS quiz_questions (
                    id SERIAL PRIMARY KEY,
                    question_text TEXT,
                    choices JSONB,
                    correct_choice_index INTEGER,
                    category VARCHAR,
                    "order" INTEGER
                );
            """))
            
            # 2. สร้างตาราง quiz_attempts (เก็บผลการสอบ)
            print("creating table 'quiz_attempts'...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS quiz_attempts (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER REFERENCES users(id),
                    score INTEGER,
                    total_score INTEGER,
                    passed BOOLEAN,
                    time_spent_seconds INTEGER,
                    answers_log JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))
            
            conn.commit()
            print("✅ สร้างตาราง Quiz สำเร็จเรียบร้อย!")
            
        except Exception as e:
            print(f"⚠️ เกิดข้อผิดพลาด: {e}")

    print("\n🎉 Database update completed!")