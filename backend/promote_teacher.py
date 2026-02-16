# backend/promote_teacher.py
from app.database import SessionLocal
from app.models.edp import User

def promote_to_teacher(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ ไม่พบผู้ใช้: {email}")
            return
        
        user.role = "teacher"
        db.commit()
        print(f"✅ อัปเกรด '{user.first_name}' ({email}) เป็น 'Teacher' เรียบร้อยแล้ว!")
        print("➡️  ตอนนี้คุณสามารถล็อกอินด้วยอีเมลนี้เพื่อเข้าหน้า Teacher Dashboard ได้เลย")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    target_email = input("กรุณากรอกอีเมลที่จะตั้งให้เป็นครู: ")
    promote_to_teacher(target_email)