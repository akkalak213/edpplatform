import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import edp
from app.routers import edp as edp_router, auth, analytics
from app.routers import quiz

# สร้างตารางใน DB (ถ้ายังไม่มี)
edp.Base.metadata.create_all(bind=engine)

app = FastAPI(title="EDP AI Platform 2026", version="2.0.0")

# --- CORS Configuration (Dynamic) ---

# 1. รายการ Default สำหรับ Localhost (เผื่อต้องมารันเทสแก้บั๊กในเครื่อง)
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# 2. อ่านค่าจาก Environment Variable ชื่อ "ALLOWED_ORIGINS"
# วิธีใช้: ให้ใส่ URL คั่นด้วยเครื่องหมายลูกน้ำ (,) เช่น:
# ALLOWED_ORIGINS=https://krualex-edpplatform.up.railway.app,https://another-domain.com
env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    # แยก string ด้วย comma และลบช่องว่างหัวท้าย
    origins.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])

# (Optional) ปริ้นท์ออกมาดูใน Log ตอนเริ่ม Server ว่าอนุญาตใครบ้าง
print(f"✅ Active CORS Origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # ใช้รายการที่รวมมาแล้ว
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(edp_router.router)
app.include_router(analytics.router)
app.include_router(quiz.router)

@app.get("/")
def home():
    return {"message": "EDP AI System Backend is Secure & Ready!", "docs": "/docs"}