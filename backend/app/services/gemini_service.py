import google.generativeai as genai
import os
import json
import re
import asyncio
from dotenv import load_dotenv
# นำเข้า Library สำหรับจัดการ Retry และ Error
from tenacity import retry, stop_after_delay, wait_exponential, retry_if_exception_type, RetryError
from google.api_core import exceptions

load_dotenv()

# [TUNING] ลดจำนวนคนเข้าพร้อมกันเหลือ 3 คน (ปลอดภัยที่สุดสำหรับ Free Tier)
# ส่วนเกินจะรอในคิวของ Server เรา ไม่ส่งไปชน Google ให้โดนด่า
gemini_semaphore = asyncio.Semaphore(50)

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Warning: GEMINI_API_KEY not found in .env")
        else:
            genai.configure(api_key=api_key)
            # ✅ ใช้โมเดลเดิมของคุณ 100%
            self.model = genai.GenerativeModel('gemini-2.5-flash')

    async def analyze_step(self, step_number: int, content: str) -> dict:
        # 1. Validation (ตรวจสอบความยาวข้อความ)
        if not content or len(content.strip()) < 10:
            return {
                "relevance_score": 0,
                "score_breakdown": [],
                "feedback_th": "เนื้อหาสั้นเกินไป กรุณาอธิบายรายละเอียดให้ชัดเจนกว่านี้ (อย่างน้อย 1-2 ประโยค)",
                "warning_flags": ["too_short"]
            }

        # 2. Rubric Definition (เกณฑ์การให้คะแนนฉบับเต็ม)
        rubrics = {
            1: [
                "ความชัดเจนของปัญหา (Clarity) - ปัญหาคืออะไร เกิดกับใคร",
                "ที่มาและความสำคัญ (Background) - ทำไมต้องแก้ปัญหานี้",
                "กลุ่มเป้าหมาย (Target User) - ระบุผู้ใช้งานชัดเจน",
                "ความเป็นไปได้ (Feasibility) - แก้ได้จริงหรือไม่"
            ],
            2: [
                "ความน่าเชื่อถือ (Reliability) - ข้อมูลถูกต้อง อ้างอิงได้",
                "ความหลากหลาย (Variety) - มาจากหลายแหล่งข้อมูล",
                "ความเกี่ยวข้อง (Relevance) - ตรงกับหัวข้อปัญหา",
                "การสรุปใจความ (Synthesis) - เรียบเรียงเป็นภาษาตนเอง"
            ],
            3: [
                "ความคิดสร้างสรรค์ (Creativity) - วิธีการแปลกใหม่ น่าสนใจ",
                "การเปรียบเทียบ (Comparison) - มีหลายทางเลือก",
                "เหตุผลการเลือก (Justification) - ทำไมเลือกวิธีนี้",
                "ความละเอียดแบบร่าง (Detail) - อธิบายลักษณะชิ้นงานชัดเจน"
            ],
            4: [
                "ลำดับขั้นตอน (Process) - เป็นขั้นเป็นตอน เข้าใจง่าย",
                "วัสดุอุปกรณ์ (Materials) - ระบุของที่ต้องใช้ครบถ้วน",
                "ความปลอดภัย (Safety) - คำนึงถึงความปลอดภัย",
                "ความเป็นไปได้จริง (Practicality) - ทำได้จริงในเวลาที่มี"
            ],
            5: [
                "วิธีการทดสอบ (Testing Method) - วัดผลได้เป็นรูปธรรม",
                "การบันทึกผล (Data Collection) - มีตัวเลข/ตารางชัดเจน",
                "การวิเคราะห์ (Analysis) - อธิบายผลลัพธ์ว่าดี/ไม่ดี",
                "ความซื่อสัตย์ (Integrity) - รายงานตามความเป็นจริง"
            ],
            6: [
                "การสรุปผล (Conclusion) - ตอบโจทย์ปัญหาตั้งต้นไหม",
                "จุดเด่น/ด้อย (Pros/Cons) - วิเคราะห์งานตัวเองได้",
                "การพัฒนาต่อ (Future Work) - เสนอไอเดียต่อยอด",
                "การสื่อสาร (Communication) - ภาษาเข้าใจง่าย น่าสนใจ"
            ]
        }
        
        current_rubric = rubrics.get(step_number, ["เกณฑ์ที่ 1", "เกณฑ์ที่ 2", "เกณฑ์ที่ 3", "เกณฑ์ที่ 4"])
        
        # 3. Prompt (คำสั่งที่ส่งให้ AI ฉบับเต็ม)
        prompt = f"""
        Act as a strict Senior Engineering Professor evaluating a student's EDP project submission (Step {step_number}).
        Student Input: "{content}"

        EVALUATION CRITERIA (Total 100 points, 25 points each):
        1. {current_rubric[0]}
        2. {current_rubric[1]}
        3. {current_rubric[2]}
        4. {current_rubric[3]}

        INSTRUCTIONS:
        - Rate each criteria STRICTLY from 0-25. (Give 0 if missing, 25 only for perfection).
        - 'relevance_score' MUST be the sum of all breakdown scores.
        - Provide helpful feedback in Thai Language (ภาษาไทย).
        - Check for warning flags (e.g., nonsense, copied text, off-topic).

        RESPONSE JSON FORMAT ONLY:
        {{
            "relevance_score": (Integer 0-100),
            "score_breakdown": [
                {{ "criteria": "{current_rubric[0]}", "score": (0-25), "max_score": 25, "comment": "(Short Thai comment explaining the score)" }},
                {{ "criteria": "{current_rubric[1]}", "score": (0-25), "max_score": 25, "comment": "(Short Thai comment)" }},
                {{ "criteria": "{current_rubric[2]}", "score": (0-25), "max_score": 25, "comment": "(Short Thai comment)" }},
                {{ "criteria": "{current_rubric[3]}", "score": (0-25), "max_score": 25, "comment": "(Short Thai comment)" }}
            ],
            "feedback_th": "(Full constructive feedback in Thai, approx 2-3 sentences)",
            "critical_thinking": "(Low/Medium/High)",
            "sentiment": "(Neutral/Confident/Confused)",
            "competency_level": "(Novice/Apprentice/Proficient/Distinguished)",
            "warning_flags": [],
            "suggested_action": "(Specific advice on what to do next)"
        }}
        """

        # [SAFEGUARD] เรียกผ่านฟังก์ชัน Retry พร้อมดัก Error สุดท้ายไม่ให้ Server ล่ม (Error 500)
        try:
            return await self._generate_with_retry_and_limit(prompt)
        except RetryError:
            # ถ้าตื้อจนครบเวลาแล้วยังไม่ได้ (แปลว่า Google ไม่ยอมจริงๆ)
            print("Gemini Quota Exceeded: Max retries reached.")
            return {
                "relevance_score": 0,
                "score_breakdown": [],
                "feedback_th": "⚠️ ขณะนี้มีผู้ใช้งานจำนวนมาก ระบบ AI กำลังประมวลผลไม่ทัน กรุณารอ 1-2 นาทีแล้วกดส่งใหม่อีกครั้งครับ",
                "warning_flags": ["quota_exceeded"]
            }
        except Exception as e:
            print(f"Unexpected Error in analyze_step: {e}")
            return {
                "relevance_score": 0,
                "score_breakdown": [],
                "feedback_th": "เกิดข้อผิดพลาดทางเทคนิค กรุณาลองใหม่อีกครั้ง",
                "warning_flags": ["system_error"]
            }

    # ---------------------------------------------------------
    # ฟังก์ชัน Retry Logic (ปรับจูนให้ "อึด" ขึ้น สู้กับเวลา 56 วินาทีของ Google)
    # ---------------------------------------------------------
    @retry(
        # [TUNING] เปลี่ยนจากนับครั้ง เป็นนับเวลา: ให้พยายามตื้อต่อเนื่องนานสูงสุด 120 วินาที (2 นาที)
        stop=stop_after_delay(30), 
        # รอแบบทวีคูณ: เริ่มที่ 4 วิ, แล้วเพิ่มไปเรื่อยๆ สูงสุดรอรอบละ 60 วิ
        # (สูตรนี้จะช่วยให้เราไม่ Spam ถี่เกินไป จนโดนแบนซ้ำ)
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(exceptions.ResourceExhausted) # ทำเฉพาะเมื่อเจอ Error 429
    )
    async def _generate_with_retry_and_limit(self, prompt: str):
        # ใช้ Semaphore จำกัดคนเข้า (Concurrency Limit)
        async with gemini_semaphore:
            # เรียกใช้ Model
            response = await self.model.generate_content_async(prompt)
            
            # Parsing Logic (คงเดิม)
            clean_text = re.sub(r'```json\s*', '', response.text)
            clean_text = re.sub(r'```\s*', '', clean_text)
            match = re.search(r'\{.*\}', clean_text, re.DOTALL)
            
            if match:
                result = json.loads(match.group())
                # Recalculate Score for safety
                if "score_breakdown" in result:
                    result["relevance_score"] = sum(item.get("score", 0) for item in result["score_breakdown"])
                
                # Default values
                result.setdefault("warning_flags", [])
                result.setdefault("feedback_th", "ระบบไม่สามารถสรุปคำแนะนำได้")
                return result
            else:
                return {
                    "relevance_score": 0, 
                    "score_breakdown": [],
                    "feedback_th": "AI ตอบกลับผิดรูปแบบ กรุณาลองใหม่", 
                    "warning_flags": ["ai_format_error"]
                }