from __future__ import annotations

import os
import json
import re
import time
from collections import defaultdict, deque
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

app = FastAPI(title="American English Speaking Coach API", version="2.0.0")

origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_SAFETY_IDENTIFIER = os.getenv("OPENAI_SAFETY_IDENTIFIER", "american-english-speaking-coach-local")
_report_requests = defaultdict(deque)

LANGUAGE_CODES = {
    "English (US)": "en",
    "Japanese": "ja",
    "Hindi": "hi",
    "Tamil": "ta",
    "Telugu": "te",
    "Malayalam": "ml",
    "Spanish": "es",
    "French": "fr",
    "German": "de",
    "Korean": "ko",
    "Chinese (Mandarin)": "zh",
}


class TranslationSessionRequest(BaseModel):
    target_language: str = Field(min_length=2)
    source_language: str | None = None


@app.get("/")
async def root():
    return {
        "name": "American English Speaking Coach API",
        "status": "running",
        "realtime_translation": True,
        "model": "gpt-realtime-translate",
    }


@app.get("/health")
async def health():
    return {"status": "ok", "realtime_translation": bool(OPENAI_API_KEY)}


class ReportTurn(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    text: str = Field(min_length=1, max_length=2000)


class SessionReportRequest(BaseModel):
    mode: str = Field(default="free-conversation", max_length=80)
    level: str = Field(default="intermediate", max_length=40)
    transcript: list[ReportTurn] = Field(min_length=1, max_length=200)


@app.post("/api/reports/session")
async def generate_session_report(payload: SessionReportRequest, request: Request):
    """Generate a transcript-grounded learning report; API credentials stay server-side."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    recent = _report_requests[client_ip]
    while recent and recent[0] < now - 60:
        recent.popleft()
    if len(recent) >= 5:
        raise HTTPException(status_code=429, detail="Too many report requests. Please wait a minute and try again.")
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AI reports are not configured. Add OPENAI_API_KEY to backend/.env.")

    recent.append(now)
    transcript_lines = [f"{'Learner' if turn.role == 'user' else 'Coach'}: {turn.text.strip()}" for turn in payload.transcript]
    transcript = "\n".join(transcript_lines)[-24000:]
    user_words = sum(len(turn.text.split()) for turn in payload.transcript if turn.role == "user")
    system_prompt = (
        "You are an experienced American English speaking coach. Analyze only the learner's transcript. "
        "Return valid JSON with keys: summary (string), scores (object with grammar, vocabulary, fluency, overall as integers 0-100 or null), "
        "score_notes (string), grammar (array of objects with original, corrected, explanation), "
        "natural_expressions (array of objects with original, more_natural), vocabulary (array of objects with word, meaning, example), "
        "clarity (string), fluency (string), repeated_mistakes (array of strings), and next_exercise (object with title and reason). "
        "Use only sentences the learner actually said. Be encouraging, specific, and concise. Up to 5 grammar notes, "
        "5 natural expressions, and 6 vocabulary items. Never infer or score accent or pronunciation from text. "
        "Do not penalize understandable non-American accents. If there is too little evidence for a score, use null."
    )
    request_body = {
        "model": os.getenv("OPENAI_REPORT_MODEL", "gpt-4o-mini").strip(),
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Practice mode: {payload.mode}\nLearner level: {payload.level}\nLearner word count: {user_words}\n\nTranscript:\n{transcript}"},
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json=request_body,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach the AI report service. Check the network and retry.") from exc

    if not response.is_success:
        raise HTTPException(status_code=502, detail="AI report generation failed. Check API key permissions, model access, and billing.")
    try:
        content = response.json()["choices"][0]["message"]["content"]
        report = json.loads(re.sub(r"^```(?:json)?|```$", "", content.strip(), flags=re.MULTILINE).strip())
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="The AI service returned an unreadable report. Please try again.") from exc

    scores = report.get("scores") if isinstance(report.get("scores"), dict) else {}
    clean_scores = {}
    for key in ("grammar", "vocabulary", "fluency", "overall"):
        value = scores.get(key)
        clean_scores[key] = max(0, min(100, int(value))) if isinstance(value, (int, float)) and not isinstance(value, bool) else None
    score_notes = str(report.get("score_notes", ""))
    if user_words < 60:
        clean_scores = {key: None for key in clean_scores}
        score_notes = f"Not enough learner speech to estimate scores reliably ({user_words} words; at least 60 recommended)."

    def safe_items(key, limit):
        values = report.get(key)
        return [item for item in values if isinstance(item, dict)][:limit] if isinstance(values, list) else []

    return {
        "summary": str(report.get("summary", "")),
        "scores": clean_scores,
        "score_notes": score_notes,
        "grammar": safe_items("grammar", 5),
        "natural_expressions": safe_items("natural_expressions", 5),
        "vocabulary": safe_items("vocabulary", 6),
        "clarity": str(report.get("clarity", "")),
        "fluency": str(report.get("fluency", "")),
        "repeated_mistakes": [str(item) for item in report.get("repeated_mistakes", [])[:5]] if isinstance(report.get("repeated_mistakes"), list) else [],
        "next_exercise": report.get("next_exercise") if isinstance(report.get("next_exercise"), dict) else None,
        "user_word_count": user_words,
        "pronunciation": {"status": "not_assessed", "note": "Pronunciation is not scored from transcript text."},
    }


@app.post("/api/realtime/session")
async def create_realtime_translation_session(payload: TranslationSessionRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured. Add it to backend/.env before starting the backend.",
        )

    target = LANGUAGE_CODES.get(payload.target_language, payload.target_language.lower()[:2])
    source = LANGUAGE_CODES.get(payload.source_language or "", None)

    session: dict = {
        "model": "gpt-realtime-translate",
        "audio": {
            "output": {"language": target},
            "input": {
                "noise_reduction": {"type": "near_field"},
                "transcription": {},
            },
        },
    }
    if source:
        session["audio"]["input"]["transcription"]["language"] = source

    body = {
        "expires_after": {"anchor": "created_at", "seconds": 600},
        "session": session,
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    if OPENAI_SAFETY_IDENTIFIER:
        headers["OpenAI-Safety-Identifier"] = OPENAI_SAFETY_IDENTIFIER

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.openai.com/v1/realtime/translations/client_secrets",
                headers=headers,
                json=body,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach OpenAI: {exc}") from exc

    if not response.is_success:
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise HTTPException(status_code=response.status_code, detail=detail)

    data = response.json()
    return {
        "client_secret": data["value"],
        "expires_at": data.get("expires_at"),
        "session": data.get("session"),
    }

# Speaking-coach services are separate from the existing translation endpoint.
from datetime import datetime, timezone
from pydantic import EmailStr
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.database import Base, engine, SessionLocal
from app.models import User, Conversation
from app.auth import hash_password, verify_password, create_token, token_user
from app.voice import router as voice_router
from app.feedback import transcript_report

app.include_router(voice_router)
Base.metadata.create_all(bind=engine)

class AccountPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)

class HistoryPayload(BaseModel):
    mode: str = Field(default='free-conversation', max_length=40)
    transcript: list[dict] = Field(default_factory=list, max_length=500)
    duration_seconds: int = Field(default=0, ge=0, le=86400)

@app.post('/api/auth/signup')
def signup(payload: AccountPayload):
    with SessionLocal() as db:
        user=User(email=payload.email.lower(), password_hash=hash_password(payload.password))
        db.add(user)
        try: db.commit(); db.refresh(user)
        except IntegrityError: db.rollback(); raise HTTPException(409,'An account with this email already exists.')
        return {'access_token':create_token(user.id),'token_type':'bearer','user':{'id':user.id,'email':user.email,'level':user.level}}

@app.post('/api/auth/signin')
def signin(payload: AccountPayload):
    with SessionLocal() as db:
        user=db.scalar(select(User).where(User.email==payload.email.lower()))
        if not user or not verify_password(payload.password,user.password_hash): raise HTTPException(401,'Email or password is incorrect.')
        return {'access_token':create_token(user.id),'token_type':'bearer','user':{'id':user.id,'email':user.email,'level':user.level}}

@app.get('/api/history')
def list_history(user_id: int = __import__('fastapi').Depends(token_user)):
    with SessionLocal() as db:
        rows=db.scalars(select(Conversation).where(Conversation.user_id==user_id).order_by(Conversation.created_at.desc()).limit(100)).all()
        return [{'id':x.id,'mode':x.mode,'transcript':__import__('json').loads(x.transcript),'feedback':__import__('json').loads(x.feedback),'duration_seconds':x.duration_seconds,'created_at':x.created_at.isoformat()} for x in rows]

@app.post('/api/history')
def save_history(payload: HistoryPayload, user_id: int = __import__('fastapi').Depends(token_user)):
    import json
    transcript=[{'role':str(x.get('role',''))[:20], 'text':str(x.get('text',''))[:4000]} for x in payload.transcript]
    report=transcript_report(transcript)
    with SessionLocal() as db:
        row=Conversation(user_id=user_id,mode=payload.mode,transcript=json.dumps(transcript),feedback=json.dumps(report),duration_seconds=payload.duration_seconds)
        db.add(row); db.commit(); db.refresh(row)
        return {'id':row.id,'feedback':report,'created_at':row.created_at.isoformat()}

@app.delete('/api/history')
def delete_history(user_id: int = __import__('fastapi').Depends(token_user)):
    from sqlalchemy import delete
    with SessionLocal() as db:
        db.execute(delete(Conversation).where(Conversation.user_id==user_id)); db.commit()
    return {'deleted':True}
