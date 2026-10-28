# Merge notes: American Coach + Speakwise

## Integration strategy

The American English AI Speaking Coach remains the foundation because it was identified as the tested application. Its Vite/React frontend, FastAPI backend, realtime voice endpoint, translation flow, settings, and scenario practice have been preserved.

Speakwise-inspired features added to the foundation:

- Vocabulary notebook: add words/phrases, meanings and example sentences; play the term through browser text-to-speech; mark terms as mastered; delete terms.
- Session history: save and review Live Coach transcript lines after using **End and save session**; delete saved transcript records.
- AI post-session report: generate transcript-grounded feedback using the server-side OpenAI key, with grammar corrections, more natural expressions, vocabulary suggestions, and cautious text-based scores.
- Navigation links for History and Vocabulary on desktop and mobile.
- Live Coach demo timer, explicit live/demo session mode, and session saving.

## Important limitations

- Vocabulary and saved live transcripts use browser localStorage. They are not synced to a cloud database or across devices.
- Existing structured-practice progress remains in its existing local storage.
- Speakwise's MongoDB authentication/database backend has not been copied into this app because the American Coach uses a different account and storage design. Combining those backend systems without a migration would risk breaking the existing working app.
- AI reports use the server-side OpenAI key through `POST /api/reports/session`; set `OPENAI_REPORT_MODEL` (default `gpt-4o-mini`) if you want to change the text model. The report never claims to score pronunciation from transcript text alone. Report generation depends on your key having access to that text model and may incur API charges.
- A successful build and real OpenAI Realtime session still need to be verified on the user's machine with their configured API key and provider access.

## Run

1. Run `setup.bat` once to install dependencies and create `backend/.env`.
2. Edit `backend/.env` and add your OpenAI API key and a strong `JWT_SECRET`.
3. Run `start-dev.bat` from the project folder.
4. Open `http://localhost:3000`.
5. Visit **Vocabulary** to save expressions. After a Live Coach session, click **End and save session**, then visit **History**.
