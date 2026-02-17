# File: backend/update_db.py
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# 1. Get Database URL
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    print("❌ Error: DATABASE_URL not found in .env")
    exit(1)

engine = create_engine(DATABASE_URL)

def add_column_if_not_exists(table, column, type_sql):
    with engine.connect() as conn:
        # Check if column exists
        check_sql = text(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='{table}' AND column_name='{column}';
        """)
        result = conn.execute(check_sql).fetchone()
        
        if not result:
            print(f"➕ Adding column '{column}' to table '{table}'...")
            try:
                # Add column
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type_sql};"))
                conn.commit()
                print(f"✅ Added successfully!")
            except Exception as e:
                print(f"⚠️ Failed to add: {e}")
        else:
            print(f"👌 Column '{column}' already exists (skipped)")

if __name__ == "__main__":
    print("🚀 Starting Database check and update...")
    
    # 1. Add columns to edp_steps table
    add_column_if_not_exists("edp_steps", "teacher_score", "FLOAT DEFAULT NULL")
    add_column_if_not_exists("edp_steps", "teacher_comment", "TEXT DEFAULT NULL")
    add_column_if_not_exists("edp_steps", "is_teacher_reviewed", "BOOLEAN DEFAULT FALSE")
    
    add_column_if_not_exists("edp_steps", "creativity_score", "FLOAT DEFAULT 0.0")
    add_column_if_not_exists("edp_steps", "time_spent_seconds", "INTEGER DEFAULT 0")
    
    # 2. Add columns to projects table
    add_column_if_not_exists("projects", "status", "VARCHAR DEFAULT 'in_progress'")
    add_column_if_not_exists("projects", "is_published", "BOOLEAN DEFAULT FALSE")
    add_column_if_not_exists("projects", "project_summary", "TEXT DEFAULT NULL")

    # 3. [NEW] Add column for tracking user activity
    add_column_if_not_exists("users", "last_active_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()")

    print("\n🎉 Database update completed! Old data is safe.")