# ไฟล์: backend/app/routers/quiz.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.edp import QuizQuestion, QuizAttempt, User
from app.routers.auth import get_current_user
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter(prefix="/quiz", tags=["Quiz"])

# --- Schemas ---
class QuizSubmission(BaseModel):
    answers: Dict[int, int] # { question_id: selected_choice_index }
    time_spent_seconds: int

# --- Endpoints ---

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
    percent = (score / total_score) * 100
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