import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import edp
from app.routers import edp as edp_router, auth, analytics, quiz


edp.Base.metadata.create_all(bind=engine)

app = FastAPI(title="EDP AI Platform 2026", version="2.0.0")




origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://krualex-edpplatform.up.railway.app" 
]


env_origins = os.getenv("ALLOWED_ORIGINS") or os.getenv("CORS_ORIGINS") or ""

if env_origins:
    
    
    cleaned_origins = [
        origin.strip().rstrip("/") 
        for origin in env_origins.split(",") 
        if origin.strip()
    ]
    origins.extend(cleaned_origins)


origins = list(set(origins))


print(f"✅ Active CORS Origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            
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