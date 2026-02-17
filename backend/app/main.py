from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import edp
from app.routers import edp as edp_router, auth, analytics

# สร้างตารางใน DB (ถ้ายังไม่มี)
edp.Base.metadata.create_all(bind=engine)

app = FastAPI(title="EDP AI Platform 2026", version="2.0.0")

# --- SECURITY FIX: ระบุ Origin ให้ชัดเจนเพื่ออนุญาต Frontend บน Cloud ---
origins = [
    "http://localhost:5173",          # สำหรับทดสอบในเครื่อง (Vite)
    "http://localhost:3000",          # เผื่อใช้พอร์ตอื่นๆ
    "https://krualex-edpplatform.up.railway.app/" # ✅ โดเมนจริงของคุณบน Railway
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # อนุญาตเฉพาะโดเมนในรายการด้านบน
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(edp_router.router)
app.include_router(analytics.router)

@app.get("/")
def home():
    return {"message": "EDP AI System Backend is Secure & Ready!", "docs": "/docs"}