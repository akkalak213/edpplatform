# backend/app/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

# ==========================================
# 🔑 JWT CONFIGURATION (Single Source of Truth)
# ==========================================

# [CRITICAL] อ่านจาก .env เท่านั้น ไม่มี hardcode ใน code
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "❌ SECRET_KEY ไม่ได้ถูกกำหนดใน .env\n"
        "   รันคำสั่งนี้เพื่อสร้าง key ใหม่:\n"
        "   python -c \"import secrets; print(secrets.token_hex(64))\""
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 ชั่วโมง (เหมาะกับ 1 วันเรียน)