import google.generativeai as genai
import os
import json
import re
import asyncio
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from google.api_core import exceptions

load_dotenv()

# [วิธีที่ 2] สร้าง Semaphore เพื่อจำกัดการเรียก AI พร้อมกันไม่เกิน 5 Request
# (คนที่ 6 เป็นต้นไปจะต้องรอใน Server เราก่อน ไม่ส่งไป Google เพื่อกัน Error 429)
gemini_semaphore = asyncio.Semaphore(5)

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
        # 1. Validation (เหมือนเดิม)
        if not content or len(content.strip()) < 10:
            return {
                "relevance_score": 0,
                "score_breakdown": [],
                "feedback_th": "เนื้อหาสั้นเกินไป กรุณาอธิบายรายละเอียดให้ชัดเจนกว่านี้ (อย่างน้อย 1-2 ประโยค)",
                "warning_flags": ["too_short"]
            }

        # 2. Rubric Definition (เหมือนเดิม)
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
        
        # 3. Prompt (เหมือนเดิมเป๊ะ)
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

        # [วิธีที่ 1 & 2 รวมร่าง] เรียกผ่านฟังก์ชันที่มี Retry และ Semaphore
        # ส่ง prompt เข้าไปทำงาน
        return await self._generate_with_retry_and_limit(prompt)

    # ---------------------------------------------------------
    # ฟังก์ชันใหม่: แยกออกมาเพื่อทำ Retry Logic โดยเฉพาะ
    # ---------------------------------------------------------
    @retry(
        stop=stop_after_attempt(5),             # ลองใหม่ได้สูงสุด 5 ครั้ง
        wait=wait_exponential(multiplier=1, min=2, max=10), # รอแบบทวีคูณ (2วิ, 4วิ, 8วิ...)
        retry=retry_if_exception_type(exceptions.ResourceExhausted) # ทำเฉพาะเมื่อเจอ Error 429
    )
    async def _generate_with_retry_and_limit(self, prompt: str):
        # ใช้ Semaphore จำกัดคนเข้าพร้อมกัน (Concurrency Limit)
        async with gemini_semaphore:
            try:
                # เรียกใช้ Model ตัวเดิมของคุณ
                response = await self.model.generate_content_async(prompt)
                raw_text = response.text
                
                # 4. Cleaning & Parsing logic (เหมือนเดิม)
                clean_text = re.sub(r'```json\s*', '', raw_text)
                clean_text = re.sub(r'```\s*', '', clean_text)
                match = re.search(r'\{.*\}', clean_text, re.DOTALL)
                
                if match:
                    result = json.loads(match.group())
                    
                    if "score_breakdown" in result:
                        total = sum(item.get("score", 0) for item in result["score_breakdown"])
                        result["relevance_score"] = total
                    
                    if "warning_flags" not in result: result["warning_flags"] = []
                    if "feedback_th" not in result: result["feedback_th"] = "ระบบไม่สามารถสรุปคำแนะนำได้"

                    return result
                else:
                    print(f"JSON Parse Error: {raw_text}")
                    return {
                        "relevance_score": 0, 
                        "score_breakdown": [],
                        "feedback_th": "ระบบไม่สามารถประมวลผลคำตอบได้ กรุณาลองใหม่อีกครั้ง", 
                        "warning_flags": ["ai_format_error"]
                    }
                    
            except Exception as e:
                # ถ้าเป็น Error 429 ให้โยน (raise) ออกไปเพื่อให้ @retry ข้างบนทำงาน
                if "429" in str(e) or isinstance(e, exceptions.ResourceExhausted):
                    raise e 
                
                # ถ้า Error อื่นๆ ให้แจ้งเตือนตามปกติ
                print(f"Gemini API Error: {e}")
                return {
                    "relevance_score": 0, 
                    "score_breakdown": [],
                    "feedback_th": "เกิดปัญหาการเชื่อมต่อกับ AI (Connection Error) กรุณาลองใหม่", 
                    "warning_flags": ["connection_error"]
                }