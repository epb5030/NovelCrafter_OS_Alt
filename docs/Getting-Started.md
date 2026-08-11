# Getting Started

This page covers quick ways to run OpenCrafter locally or with Docker.

Quick Docker-based run (recommended):

1. Clone the repository:

```bash
git clone https://github.com/epb5030/NovelCrafter_OS_Alt.git
cd NovelCrafter_OS_Alt
```

2. Start the application with Docker Compose (builds the frontend and runs the backend + SQLite):

```bash
docker compose up -d
```

3. Open the app in your browser:

- Production (served by backend): http://localhost:3000
- Development frontend (Vite): http://localhost:5173 (if running separately)

Local development (run frontend and backend separately):

Backend

```bash
cd backend
npm install
npm run dev   # uses ts-node, defaults to port 3005
```

Frontend

```bash
cd frontend
npm install
npm run dev   # vite dev server, port 5173
```

Notes
- SQLite DB is stored in `backend/data/novels.db` when using compose; DB and settings (API keys, provider selection) are persisted there.
- Environment variables and settings are stored via the Settings API and DB — check `backend/src/config/database.ts` and requests to `/api/settings`.
- If using local Ollama, default local endpoint is `http://localhost:11434` unless changed in Settings.
