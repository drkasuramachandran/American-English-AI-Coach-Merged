# Decisions

- Keep the existing React/Vite and FastAPI project rather than replacing it, because the current app already has useful practice, translation, progress, and settings pages.
- Add `/live-coach` as a separate route so existing practice flows remain intact.
- Use `gpt-realtime` as the configurable default model for speech-to-speech; model/account access must be verified with real credentials before declaring live operation successful.
- Keep the prior translation model and endpoint intact; translation and speaking-coach sessions have different instructions and use cases.
- Use SQLite by default and allow PostgreSQL through `DATABASE_URL` for local-to-production parity.
- Use Argon2 password hashing and 30-minute JWT access tokens; authentication is disabled until a strong `JWT_SECRET` is configured.
- Do not invent feedback scores. Until a validated assessment is implemented, return transcript-based metadata and null numeric scores.
- Include an explicitly labelled scripted Demo Mode when credentials are unavailable; it is not represented as live AI.
- Use a manual reconnect control for this iteration rather than claiming a verified automatic reconnect/backoff implementation.
- Initialize SQLite tables at startup for local ease; production migration management with Alembic remains a follow-up.
- Do not overwrite the user's local files or publish to GitHub automatically; deliver a separate ZIP for review.
