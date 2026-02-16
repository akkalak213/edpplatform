from app.database import SessionLocal, engine
from app.models import edp

# สร้าง Session เพื่อคุยกับ DB
db = SessionLocal()

def seed_data():
    # 1. สร้าง User จำลอง
    user = edp.User(
        email="student@test.com",
        full_name="Test Student",
        role="student",
        hashed_password="fake_hash_password"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"✅ Created User ID: {user.id}")

    # 2. สร้าง Project จำลอง (ผูกกับ User ตะกี้)
    project = edp.Project(
        title="Automated Plant Waterer",
        description="A robot that waters plants automatically.",
        owner_id=user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    print(f"✅ Created Project ID: {project.id}")

if __name__ == "__main__":
    try:
        seed_data()
        print("🎉 Seeding Complete! Ready to test.")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()