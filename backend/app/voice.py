import os, time
from collections import defaultdict, deque
import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from .prompts import instructions, MODES
router=APIRouter(prefix='/api/voice', tags=['voice'])
_recent=defaultdict(deque)
class VoiceRequest(BaseModel):
    mode: str = 'free-conversation'
    level: str = 'intermediate'
    speed: str = 'normal'
    correction_frequency: str = 'balanced'
    situation: str = Field(default='', max_length=500)
@router.post('/session')
async def create_voice_session(payload: VoiceRequest, request: Request):
    key=os.getenv('OPENAI_API_KEY','').strip()
    if not key: raise HTTPException(503, 'Real-time AI is not configured. Add OPENAI_API_KEY to backend/.env, or use the separately labelled Demo Mode.')
    now=time.time(); ip=request.client.host if request.client else 'unknown'; q=_recent[ip]
    while q and q[0] < now-60: q.popleft()
    if len(q)>=int(os.getenv('MAX_VOICE_SESSIONS_PER_MINUTE','10')): raise HTTPException(429,'Too many session requests. Wait a minute and try again.')
    q.append(now)
    model=os.getenv('OPENAI_REALTIME_MODEL','gpt-realtime').strip()
    body={'expires_after':{'anchor':'created_at','seconds':600},'session':{'type':'realtime','model':model,'instructions':instructions(payload.mode,payload.level,payload.speed,payload.correction_frequency,payload.situation),'audio':{'input':{'noise_reduction':{'type':'near_field'},'transcription':{'model':'gpt-4o-mini-transcribe'}},'output':{'voice':'marin'}}}}
    try:
      async with httpx.AsyncClient(timeout=20) as c: r=await c.post('https://api.openai.com/v1/realtime/client_secrets',headers={'Authorization':f'Bearer {key}','Content-Type':'application/json'},json=body)
    except httpx.HTTPError as e: raise HTTPException(502,'Could not reach the real-time AI service. Check the network and retry.') from e
    if not r.is_success:
      detail='Real-time session could not be created. Check API access, model availability, and billing.'
      try: detail=r.json().get('error',{}).get('message',detail)
      except Exception: pass
      raise HTTPException(502,detail)
    data=r.json(); secret=data.get('value') or data.get('client_secret',{}).get('value')
    if not secret: raise HTTPException(502,'Realtime service returned no temporary client credential.')
    return {'client_secret':secret,'expires_at':data.get('expires_at'),'model':model,'mode':payload.mode,'prompt_version':'2026-10-28-v1'}
