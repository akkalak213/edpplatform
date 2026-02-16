import google.generativeai as genai
import os
from dotenv import load_dotenv

# โหลด API Key จากไฟล์ .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Error: ไม่เจอ GEMINI_API_KEY ในไฟล์ .env")
    print("   (ตรวจสอบว่ามีไฟล์ .env และใส่ Key ถูกต้องไหม)")
else:
    genai.configure(api_key=api_key)
    print("🔍 กำลังตรวจสอบรายชื่อ Model ที่ API Key คุณใช้ได้...\n")
    
    try:
        count = 0
        print("--- รายชื่อ Model ที่พบ ---")
        for m in genai.list_models():
            # กรองเอาเฉพาะตัวที่เจนข้อความได้ (generateContent)
            if 'generateContent' in m.supported_generation_methods:
                print(f"✅ {m.name}")
                count += 1
        
        print("\n---------------------------")
        if count == 0:
            print("⚠️ ไม่พบ Model เลย! (Key อาจจะมีปัญหา หรือยังไม่เปิดใช้งาน Google AI Studio)")
        else:
            print(f"🎉 เจอทั้งหมด {count} โมเดล")
            print("ให้เลือกชื่อจากในลิสต์นี้ไปใส่ในไฟล์ gemini_service.py ครับ")

    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")