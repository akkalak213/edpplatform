# ไฟล์: backend/app/routers/quiz.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.edp import QuizQuestion, QuizAttempt, User
from app.routers.auth import get_current_user
from pydantic import BaseModel
from typing import List, Dict, Optional

router = APIRouter(prefix="/quiz", tags=["Quiz"])

# --- Schemas ---
# (ใช้แบบ Inline เพื่อความชัวร์ ไม่ต้องแก้ไฟล์อื่น)
class QuizSubmission(BaseModel):
    answers: Dict[int, int] # { question_id: selected_choice_index }
    time_spent_seconds: int

# --- Endpoints (Student) ---

@router.get("/questions")
def get_quiz_questions(db: Session = Depends(get_db)):
    # ส่งโจทย์ไปให้หน้าบ้าน (แต่ไม่ส่งเฉลยไปด้วย เพื่อกันการโกง)
    questions = db.query(QuizQuestion).order_by(QuizQuestion.order).all()
    return [
        {
            "id": q.id,
            "question_text": q.question_text,
            "choices": q.choices,
            "order": q.order,
            "category": q.category
        } for q in questions
    ]

@router.post("/submit")
def submit_quiz(
    submission: QuizSubmission, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # 1. โหลดเฉลยทั้งหมด
    questions = db.query(QuizQuestion).all()
    question_map = {q.id: q for q in questions}
    
    score = 0
    total_score = len(questions)
    log = []

    # 2. ตรวจคำตอบ
    for q_id, selected_idx in submission.answers.items():
        q_id = int(q_id)
        question = question_map.get(q_id)
        if question:
            is_correct = (question.correct_choice_index == selected_idx)
            if is_correct:
                score += 1
            
            log.append({
                "question_id": q_id,
                "selected": selected_idx,
                "correct": question.correct_choice_index,
                "is_correct": is_correct,
                "category": question.category
            })

    # 3. บันทึกผล
    percent = (score / total_score) * 100 if total_score > 0 else 0
    passed = percent >= 80

    attempt = QuizAttempt(
        student_id=current_user.id,
        score=score,
        total_score=total_score,
        passed=passed,
        time_spent_seconds=submission.time_spent_seconds,
        answers_log=log
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return {
        "score": score,
        "total": total_score,
        "percent": percent,
        "passed": passed,
        "details": log
    }

@router.get("/history")
def get_quiz_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == current_user.id).order_by(QuizAttempt.created_at.desc()).all()
    return attempts

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    # Query: Join ตาราง QuizAttempt กับ User เพื่อเอาชื่อนักเรียน
    # Order by: Score (Desc), Time (Asc), CreatedAt (Asc)
    results = db.query(QuizAttempt, User).join(User, QuizAttempt.student_id == User.id).order_by(
        QuizAttempt.score.desc(),
        QuizAttempt.time_spent_seconds.asc(),
        QuizAttempt.created_at.asc()
    ).limit(20).all() # เอาแค่ Top 20 คนเก่ง

    leaderboard = []
    for attempt, user in results:
        leaderboard.append({
            "student_name": f"{user.first_name} {user.last_name}",
            "class_room": user.class_room,
            "score": attempt.score,
            "total_score": attempt.total_score,
            "time_spent": attempt.time_spent_seconds,
            "submitted_at": attempt.created_at
        })
    
    return leaderboard

# --- Endpoints (Teacher/Analytics) ---

@router.get("/analytics/overview")
def get_quiz_overview(db: Session = Depends(get_db)):
    """สรุปภาพรวมทั้งหมดของการสอบ"""
    total_attempts = db.query(QuizAttempt).count()
    if total_attempts == 0:
        return {"total_attempts": 0, "average_score": 0, "pass_rate": 0, "max_score": 0}

    avg_score = db.query(func.avg(QuizAttempt.score)).scalar() or 0
    max_score = db.query(func.max(QuizAttempt.score)).scalar() or 0
    passed_count = db.query(QuizAttempt).filter(QuizAttempt.passed == True).count()
    pass_rate = (passed_count / total_attempts) * 100

    return {
        "total_attempts": total_attempts,
        "average_score": round(avg_score, 2),
        "pass_rate": round(pass_rate, 2),
        "max_score": max_score
    }

@router.get("/analytics/items")
def get_item_analysis(db: Session = Depends(get_db)):
    """วิเคราะห์รายข้อ: ข้อไหนคนถูกเยอะ/ผิดเยอะ"""
    attempts = db.query(QuizAttempt).all()
    questions = db.query(QuizQuestion).order_by(QuizQuestion.order).all()
    
    # เตรียมโครงสร้างข้อมูล
    analysis = {q.id: {"text": q.question_text, "correct": 0, "total": 0, "category": q.category, "order": q.order} for q in questions}

    # วนลูปนับคะแนน (อาจช้าถ้านักเรียนเป็นหมื่นคน แต่ระดับโรงเรียนไหวสบายครับ)
    for attempt in attempts:
        if not attempt.answers_log: continue
        for log in attempt.answers_log:
            # log format: {'question_id': 1, 'is_correct': True, ...}
            # บางที json เก็บมาเป็น dict หรือ object
            if isinstance(log, dict):
                q_id = log.get('question_id')
                is_correct = log.get('is_correct')
            else:
                # กรณีเก่าเก็บแปลกๆ (กันเหนียว)
                continue

            if q_id in analysis:
                analysis[q_id]['total'] += 1
                if is_correct:
                    analysis[q_id]['correct'] += 1
    
    # แปลงเป็น List เพื่อส่งกลับ
    result = []
    for q_id, data in analysis.items():
        percent = (data['correct'] / data['total'] * 100) if data['total'] > 0 else 0
        result.append({
            "id": q_id,
            "order": data['order'],
            "question": data['text'],
            "category": data['category'],
            "correct_count": data['correct'],
            "total_attempts": data['total'],
            "accuracy_percent": round(percent, 2)
        })
    
    # เรียงตามข้อที่คนทำผิดเยอะที่สุด (Accuracy น้อยสุดขึ้นก่อน)
    return sorted(result, key=lambda x: x['accuracy_percent'])

@router.get("/analytics/students")
def get_student_analytics(db: Session = Depends(get_db)):
    """สรุปรายชื่อนักเรียนพร้อมสถิติการสอบของแต่ละคน"""
    attempts = db.query(QuizAttempt, User).join(User).all()
    student_map = {}

    for att, user in attempts:
        sid = user.id
        if sid not in student_map:
            student_map[sid] = {
                "id": sid,
                "name": f"{user.first_name} {user.last_name}",
                "student_id": user.student_id,
                "class_room": user.class_room,
                "attempts_count": 0,
                "best_score": 0,
                "latest_score": 0,
                "avg_score": 0,
                "total_score_sum": 0,
                "latest_attempt_at": att.created_at
            }
        
        s = student_map[sid]
        s['attempts_count'] += 1
        s['total_score_sum'] += att.score
        
        # หา Best Score
        if att.score > s['best_score']:
            s['best_score'] = att.score
        
        # หา Latest Score
        if att.created_at >= s['latest_attempt_at']:
             s['latest_score'] = att.score
             s['latest_attempt_at'] = att.created_at

    results = []
    for s in student_map.values():
        s['avg_score'] = round(s['total_score_sum'] / s['attempts_count'], 2) if s['attempts_count'] > 0 else 0
        del s['total_score_sum']
        results.append(s)
    
    # เรียงตามเลขประจำตัว
    return sorted(results, key=lambda x: x['student_id'])

@router.delete("/reset")
def reset_quiz_data(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """ล้างข้อมูลการสอบทั้งหมด (สำหรับครู)"""
    try:
        db.query(QuizAttempt).delete()
        db.commit()
        return {"message": "Reset successful"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))