import os, time
from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
from fastapi import HTTPException, Header
password_hash = PasswordHash.recommended()
SECRET = os.getenv('JWT_SECRET', '')
ALGORITHM = 'HS256'
def hash_password(password: str) -> str: return password_hash.hash(password)
def verify_password(password: str, hashed: str) -> bool: return password_hash.verify(password, hashed)
def create_token(user_id: int) -> str:
    if not SECRET: raise RuntimeError('Set JWT_SECRET to enable account authentication.')
    return jwt.encode({'sub': str(user_id), 'exp': datetime.now(timezone.utc)+timedelta(minutes=30)}, SECRET, algorithm=ALGORITHM)
def token_user(authorization: str | None = Header(default=None)) -> int:
    if not SECRET: raise HTTPException(503, 'Authentication is not configured. Set JWT_SECRET.')
    if not authorization or not authorization.lower().startswith('bearer '): raise HTTPException(401, 'Sign in to continue.')
    try: return int(jwt.decode(authorization.split(' ',1)[1], SECRET, algorithms=[ALGORITHM])['sub'])
    except Exception: raise HTTPException(401, 'Session expired or invalid. Please sign in again.')
