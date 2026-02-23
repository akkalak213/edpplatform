# ไฟล์: backend/app/routers/quiz.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.edp import QuizQuestion, QuizAttempt, User
from app.routers.auth import get_current_user
from pydantic import BaseModel
from typing import List, Dict, Optional
import random

router = APIRouter(prefix="/quiz", tags=["Quiz"])

# --- Schemas ---
class QuizSubmission(BaseModel):
    answers: Dict[int, str] 
    time_spent_seconds: int

# --- Endpoints (Student) ---

@router.get("/questions")
def get_quiz_questions(db: Session = Depends(get_db)):
    questions = db.query(QuizQuestion).all()
    random.shuffle(questions)
    
    result = []
    for q in questions:
        shuffled_choices = list(q.choices)
        random.shuffle(shuffled_choices)
        
        result.append({
            "id": q.id,
            "question_text": q.question_text,
            "choices": shuffled_choices, 
            "order": q.order,
            "category": q.category
        })
    return result

@router.post("/submit")
def submit_quiz(
    submission: QuizSubmission, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    questions = db.query(QuizQuestion).all()
    question_map = {q.id: q for q in questions}
    
    score = 0
    total_score = len(questions)
    log = []

    for q_id, selected_text in submission.answers.items():
        q_id = int(q_id)
        question = question_map.get(q_id)
        
        if question:
            correct_text = question.choices[question.correct_choice_index]
            is_correct = (selected_text == correct_text)
            if is_correct:
                score += 1
            
            log.append({
                "question_id": q_id,
                "selected_text": selected_text, 
                "correct_text": correct_text,   
                "is_correct": is_correct,
                "category": question.category
            })

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

# -------------------------------------------------------------------
@router.get("/history")
def get_quiz_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == current_user.id
    ).order_by(QuizAttempt.created_at.desc()).all()
    
    history_list = []
    for att in attempts:
        history_list.append({
            "id": att.id,
            "score": att.score,
            "total_score": att.total_score,
            "passed": att.passed,
            "time_spent_seconds": att.time_spent_seconds,
            "created_at": att.created_at,
            "details": att.answers_log or []
        })
    return history_list

@router.get("/history/{attempt_id}")
def get_quiz_attempt_details(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.id == attempt_id, 
        QuizAttempt.student_id == current_user.id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    return {
        "id": attempt.id,
        "details": attempt.answers_log or []
    }

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    all_attempts = db.query(QuizAttempt, User).join(User, QuizAttempt.student_id == User.id).order_by(
        QuizAttempt.score.desc(),
        QuizAttempt.time_spent_seconds.asc(),
        QuizAttempt.created_at.asc()
    ).all()

    seen_students = set()
    leaderboard = []
    
    for attempt, user in all_attempts:
        if user.id not in seen_students:
            seen_students.add(user.id)
            leaderboard.append({
                "student_name": f"{user.first_name} {user.last_name}",
                "class_room": user.class_room,
                "score": attempt.score,
                "total_score": attempt.total_score,
                "time_spent": attempt.time_spent_seconds,
                "submitted_at": attempt.created_at
            })
            if len(leaderboard) >= 20:
                break
    
    return leaderboard

# --- Endpoints (Teacher/Analytics) ---

@router.get("/analytics/overview")
def get_quiz_overview(db: Session = Depends(get_db)):
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
    attempts = db.query(QuizAttempt).all()
    questions = db.query(QuizQuestion).order_by(QuizQuestion.order).all()
    
    analysis = {q.id: {"text": q.question_text, "correct": 0, "total": 0, "category": q.category, "order": q.order} for q in questions}

    for attempt in attempts:
        if not attempt.answers_log: continue
        for log in attempt.answers_log:
            if isinstance(log, dict):
                q_id = log.get('question_id')
                is_correct = log.get('is_correct')
            else:
                continue

            if q_id in analysis:
                analysis[q_id]['total'] += 1
                if is_correct:
                    analysis[q_id]['correct'] += 1
    
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
    
    return sorted(result, key=lambda x: x['accuracy_percent'])

@router.get("/analytics/students")
def get_student_analytics(db: Session = Depends(get_db)):
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
                "latest_attempt_at": att.created_at,
                "history": [] # ✅ จุดสำคัญ: แนบประวัติการสอบไปให้ Frontend
            }
        
        s = student_map[sid]
        s['attempts_count'] += 1
        s['total_score_sum'] += att.score
        
        # ✅ เก็บข้อมูลการสอบรายครั้งเข้าไปใน history
        s['history'].append({
            "attempt_id": att.id,
            "score": att.score,
            "total_score": att.total_score,
            "passed": att.passed,
            "time_spent_seconds": att.time_spent_seconds,
            "created_at": att.created_at
        })
        
        if att.score > s['best_score']:
            s['best_score'] = att.score
        
        if att.created_at >= s['latest_attempt_at']:
             s['latest_score'] = att.score
             s['latest_attempt_at'] = att.created_at

    results = []
    for s in student_map.values():
        s['avg_score'] = round(s['total_score_sum'] / s['attempts_count'], 2) if s['attempts_count'] > 0 else 0
        if 'total_score_sum' in s:
            del s['total_score_sum']
            
        # จัดเรียงจากสอบล่าสุด -> ไปหาเก่าสุด
        s['history'].sort(key=lambda x: x['created_at'], reverse=True)
        results.append(s)
    
    return sorted(results, key=lambda x: x['student_id'])

@router.delete("/reset")
def reset_quiz_data(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied: Teachers only")

    try:
        db.query(QuizAttempt).delete()
        db.commit()
        return {"message": "Reset successful"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))