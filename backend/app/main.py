from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import edp
from app.routers import edp as edp_router, auth, analytics

# สร้างตารางใน DB (ถ้ายังไม่มี)
edp.Base.metadata.create_all(bind=engine)

app = FastAPI(title="EDP AI Platform 2026", version="2.0.0")

# --- SECURITY FIX: ระบุ Origin ให้ชัดเจน ---
origins = [
    "http://localhost:5173", # พอร์ต Default ของ Vite/React
    "http://localhost:3000", # เผื่อใช้ Next.js หรืออื่นๆ
    # "https://your-production-domain.com" # ใส่โดเมนจริงเมื่อขึ้น Server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # เปลี่ยนจาก ["*"] เป็น origins
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