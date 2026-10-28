# Architecture and implementation map

## Reuse
- Existing React + TypeScript + Vite app, dashboard, scenario practice, settings, progress charts, translation page, speech hooks, and feedback engine are preserved.
- Existing FastAPI service and translation client-secret endpoint remain available.

## Added / modified
- `frontend/src/pages/LiveCoach.tsx`: new WebRTC speaking screen with status, transcript, microphone controls, reconnect action, and explicitly labelled scripted Demo Mode.
- `backend/app/voice.py`: server-side ephemeral Realtime credential minting, environment-configurable model, bounded request rate, and safe service errors.
- `backend/app/prompts.py`: versioned shared tutor instructions and mode configurations.
- `backend/app/auth.py`, `database.py`, `models.py`: Argon2 password hashing, short-lived JWT, SQLAlchemy SQLite/PostgreSQL configuration, users and conversation records.
- `backend/server.py`: health, sign-up/sign-in, protected history save/list/delete routes.
- `backend/app/feedback.py`: conservative transcript-based report scaffold; does not invent scores or claim audio measurement.

## Data flow
Browser requests a short-lived credential from FastAPI; the server uses the long-lived `OPENAI_API_KEY` only server-side. Browser establishes WebRTC with OpenAI using the temporary credential. Persistent account/history routes use JWT and SQLAlchemy. For production, use HTTPS, PostgreSQL, a strong `JWT_SECRET`, strict CORS origins, reverse-proxy rate limits, and Alembic migrations.

## Limitations
The browser WebRTC integration and provider endpoint/model compatibility must be verified against the configured OpenAI account. Authentication/history APIs are implemented but full account/profile screens and end-to-end history UI are not yet wired into the existing frontend. The feedback report intentionally returns no numeric scores until a validated assessment pipeline is added. SQLite tables are initialized on startup; Alembic migrations are not yet included. Reconnect is a manual control plus connection-state indication, not a fully verified automatic backoff loop.
