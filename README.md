# American English AI Speaking Coach

A React + TypeScript + Vite frontend and FastAPI backend, retaining the original practice and translation features while adding a realtime voice-coach route and supporting API modules.

## Quick start (Windows)
1. Install Python 3.11+ and Node.js 20+.
2. Run `setup.bat` once. It installs dependencies and creates `backend/.env` from the example if needed.
3. Edit `backend/.env`; add your OpenAI API key and replace the placeholder `JWT_SECRET` with a long random secret.
4. Run `start-dev.bat`; it starts the API and Vite frontend in separate windows.
5. Open `http://localhost:3000`. The Live Coach is available at `/live-coach`.

For a manual setup, run `python -m venv .venv`, activate it, then `pip install -r requirements.txt` inside `backend`; run `python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000` from `backend`. In `frontend`, run `npm install` then `npm run dev`.

## Environment
- `OPENAI_API_KEY`: required server-side for genuine realtime AI. Never put this in frontend `.env` or commit it.
- `OPENAI_REALTIME_MODEL`: defaults to `gpt-realtime`; use a model enabled for your account.
- `OPENAI_REPORT_MODEL`: defaults to `gpt-4o-mini`; optional text model for AI post-session reports. The same server-side `OPENAI_API_KEY` is used, and API usage may incur charges.
- `JWT_SECRET`: long random secret; required for sign-up/sign-in and persistent history routes.
- `DATABASE_URL`: defaults to local SQLite (`sqlite:///./coach.db`); set PostgreSQL URL in production.
- `CORS_ORIGINS`: comma-separated allowed frontend origins.
- `MAX_VOICE_SESSIONS_PER_MINUTE`: simple per-IP session-mint limit.

Without OpenAI credentials, use the clearly labelled Demo Mode. Demo Mode is scripted and does not pretend to be a live AI session.

## Merged Speakwise learning features

This merged version keeps the American Coach frontend/backend as the base and adds Speakwise-inspired features: **Vocabulary Notebook** (save expressions, meanings, example sentences, hear a word with browser text-to-speech, and mark words mastered), **Session History** (save and review Live Coach transcripts after selecting “End and save session”), and **AI post-session reports** (grammar corrections, more natural expressions, vocabulary suggestions, and cautious transcript-based feedback using the server-side OpenAI key). These learning records are stored locally in the current browser. They do not sync between devices or accounts. The two original projects are intentionally not combined at the database/authentication layer because they use different persistence models (SQLite/PostgreSQL versus MongoDB) and incompatible account APIs.

The existing Live Coach supports several practice modes, including free conversation, job interviews, pronunciation practice, storytelling, debate, role-play, and daily challenges. Pronunciation is not scored automatically from transcript text alone.

## Checks
- API health: `http://127.0.0.1:8000/health`
- Frontend production build: `cd frontend && npm install && npm run build`
- Backend tests: `cd backend && pip install -r requirements.txt && pytest ../tests -q`

See `docs/ARCHITECTURE.md`, `docs/MOBILE_PLAN.md`, `DECISIONS.md`, and `TEST_REPORT.md`. This is a development scaffold, not a claim of production certification. Verify provider/model access and live audio on your account before deployment.


## Windows install troubleshooting

`setup.bat` creates a project-local Python virtual environment at `.venv` and installs backend dependencies there. This avoids writing packages into a protected system-wide Python directory. Run `setup.bat` again after extracting this project if installation previously failed. You normally do not need to run the terminal as Administrator.

If Windows reports that a package file is locked, close Python/VS Code terminals using this project's `.venv`, then rerun `setup.bat`. If a partial `.venv` is damaged, close running terminals and delete the project's `.venv` folder before rerunning setup.
