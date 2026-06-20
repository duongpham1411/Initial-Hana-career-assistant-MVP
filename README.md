# JobBuddy Voice Agent

PC-first MVP for a voice-based AI career assistant for students and freshers looking for Data Analyst or Business Analyst internships.

The backend supports mock responses plus optional live AI providers through backend environment variables. API keys stay on the backend only.

## Project Structure

```text
jobbuddy-voice-agent/
  backend/
    app/
      api/
      core/
      db/
      models/
      services/
      main.py
    .env.example
    requirements.txt
  frontend/
    src/
      components/
      pages/
      services/
      App.jsx
      main.jsx
      styles.css
    .env.example
    index.html
    package.json
    vite.config.js
  .gitignore
  AGENTS.md
  README.md
```

## Run the Backend

From the project root:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend URL:

```text
http://localhost:8000
```

Health check:

```text
http://localhost:8000/health
```

## Run the Frontend

From the project root:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Environment Setup

Copy the example environment files before running locally:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Keep real API keys in backend `.env` only. Do not expose secrets in frontend code.

Optional AI provider setup for real AI responses:

```text
backend/.env
AI_PROVIDER=auto

OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4.1-mini

GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-3.5-flash
```

`AI_PROVIDER` options:

- `auto`: try Gemini first when `GEMINI_API_KEY` exists, then OpenAI, then mock.
- `gemini`: use Gemini only, then mock if it fails.
- `openai`: use OpenAI only, then mock if it fails.
- `mock`: always use mock responses.

If no live provider is configured or a provider request fails, the backend automatically uses mock responses.

## Current Mock Backend Endpoints

- `GET /health`
- `POST /api/chat`
- `POST /api/company/research`
- `POST /api/jd/analyze`
- `GET /api/profile`
- `POST /api/profile`
- `GET /api/tracker`
- `POST /api/tracker`

## What To Build Next

1. Add SQLite tables for profile data, job tracker entries, chat history, and saved analyses.
2. Persist chat history and tracker data instead of storing them in memory/localStorage.
3. Add backend logging for provider errors without showing raw provider errors in the UI.
4. Add speech-to-text and text-to-speech backend endpoints.
5. Add form validation, loading states, and error messages across the frontend.
