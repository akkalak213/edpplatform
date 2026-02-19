import google.generativeai as genai
import os
import json
import re
import asyncio
import hashlib  # [ADDED] สำหรับสร้าง Cache Key
from collections import OrderedDict # [ADDED] สำหรับทำ LRU Cache อย่างง่าย
from dotenv import load_dotenv
# นำเข้า Library สำหรับจัดการ Retry และ Error
from tenacity import retry, stop_after_delay, wait_exponential, retry_if_exception_type, RetryError
from google.api_core import exceptions

load_dotenv()

# [TUNING] ลดจำนวนคนเข้าพร้อมกัน (ปรับตาม Tier ที่ใช้)
gemini_semaphore = asyncio.Semaphore(50)

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Warning: GEMINI_API_KEY not found in .env")
        else:
            genai.configure(api_key=api_key)
            # [CONFIG] ห้ามเปลี่ยน Model ตามคำสั่ง (ใช้ 2.5 flash ตัวเดิม)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        
        # [ADDED] ระบบ Caching (เก็บผลลัพธ์การวิเคราะห์)
        # ใช้ OrderedDict เพื่อจำกัดขนาดและตัดข้อมูลเก่าออกเมื่อเต็ม (LRU Concept)
        self._cache = OrderedDict()
        self._cache_limit = 1000 

    def _get_cache_key(self, step_number: int, content: str) -> str:
        """สร้าง Key สำหรับ Cache โดยใช้ MD5 Hash ของข้อความเพื่อประหยัดพื้นที่"""
        raw_data = f"{step_number}:{content.strip()}"
        return hashlib.md5(raw_data.encode('utf-8')).hexdigest()

    async def analyze_step(self, step_number: int, content: str) -> dict:
        # 1. Validation (ตรวจสอบความยาวข้อความ)
        if not content or len(content.strip()) < 10:
            return {
                "relevance_score": 0,
                "creativity_score": 0,
                "score_breakdown": [],
                "feedback_th": "เนื้อหาสั้นเกินไป กรุณาอธิบายรายละเอียดให้ชัดเจนกว่านี้ (อย่างน้อย 1-2 ประโยค)",
                "warning_flags": ["too_short"]
            }

        # [ADDED] Check Cache: ถ้าเคยวิเคราะห์ข้อความนี้แล้ว ให้คืนค่าเดิมทันที
        cache_key = self._get_cache_key(step_number, content)
        if cache_key in self._cache:
            # ย้าย key ไปท้ายสุด (Mark as recently used)
            self._cache.move_to_end(cache_key)
            print(f"♻️  Gemini Cache Hit for Step {step_number}")
            return self._cache[cache_key]

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
        - 'creativity_score': Rate the overall creativity and novelty of the solution from 0-100 independent of the rubric.
        - Provide helpful feedback in Thai Language (ภาษาไทย).
        - Check for warning flags (e.g., nonsense, copied text, off-topic).

        RESPONSE JSON FORMAT ONLY:
        {{
            "relevance_score": (Integer 0-100),
            "creativity_score": (Integer 0-100),
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

        # [SAFEGUARD] เรียกผ่านฟังก์ชัน Retry พร้อมดัก Error
        try:
            result = await self._generate_with_retry_and_limit(prompt)
            
            # [ADDED] Save to Cache
            self._cache[cache_key] = result
            # ถ้า Cache เต็ม ให้ลบตัวเก่าสุดออก (FIFO/LRU)
            if len(self._cache) > self._cache_limit:
                self._cache.popitem(last=False)
                
            return result

        except RetryError:
            print("Gemini Quota Exceeded: Max retries reached.")
            return {
                "relevance_score": 0,
                "creativity_score": 0,
                "score_breakdown": [],
                "feedback_th": "⚠️ ขณะนี้มีผู้ใช้งานจำนวนมาก ระบบ AI กำลังประมวลผลไม่ทัน กรุณารอ 1-2 นาทีแล้วกดส่งใหม่อีกครั้งครับ",
                "warning_flags": ["quota_exceeded"]
            }
        except Exception as e:
            print(f"Unexpected Error in analyze_step: {e}")
            return {
                "relevance_score": 0,
                "creativity_score": 0,
                "score_breakdown": [],
                "feedback_th": "เกิดข้อผิดพลาดทางเทคนิค กรุณาลองใหม่อีกครั้ง",
                "warning_flags": ["system_error"]
            }

    # ---------------------------------------------------------
    # ฟังก์ชัน Retry Logic
    # ---------------------------------------------------------
    @retry(
        stop=stop_after_delay(30), 
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(exceptions.ResourceExhausted)
    )
    async def _generate_with_retry_and_limit(self, prompt: str):
        # ใช้ Semaphore จำกัดคนเข้า
        async with gemini_semaphore:
            # เรียกใช้ Model
            response = await self.model.generate_content_async(prompt)
            
            # Parsing Logic
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
                result.setdefault("creativity_score", 0) 
                result.setdefault("feedback_th", "ระบบไม่สามารถสรุปคำแนะนำได้")
                return result
            else:
                return {
                    "relevance_score": 0, 
                    "creativity_score": 0,
                    "score_breakdown": [],
                    "feedback_th": "AI ตอบกลับผิดรูปแบบ กรุณาลองใหม่", 
                    "warning_flags": ["ai_format_error"]
                }