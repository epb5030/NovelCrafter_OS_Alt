# Architecture & Code Layout

High-level layout

- backend/ — Express TypeScript backend
  - src/index.ts — main server and API routes
  - src/services/ai.service.ts — orchestration of LLM calls, building system prompts and codex context
  - src/services/compiler.service.ts — compile/export logic (epub/docx/markdown/html)
  - src/config/database.ts — SQLite connection helper
  - data/ — runtime SQLite DB location (persisted volume in Docker)

- frontend/ — React + Vite client
  - src/ — React app, editors, Codex UI, planner UI

Key technologies
- TypeScript (frontend + backend)
- Express for REST API
- Vite + React for client
- SQLite for persistence (sqlite3 package)
- LLM integrations supported: Ollama (local & cloud), OpenAI, Anthropic, OpenRouter, Gemini (via settings)

How components interact
- Frontend calls backend API endpoints under `/api/*` for projects, codex, outline, scene content, AI generation, exports.
- AIService.prepareContext() (backend/src/services/ai.service.ts) builds a system prompt containing style settings and a "codexContext" block derived from Codex entries that match the active scene.
- generateStream() handles streaming logic and provider-specific SSE parsing.

Where to look first (for contributors)
- Start with `backend/src/index.ts` to see available API endpoints and where the AI dispatch occurs (`/api/ai/generate`, `/api/ai/generate-stream`).
- Inspect `backend/src/services/ai.service.ts` to understand how prompts are built and how Codex entries are matched into the LLM context.
- For export/compile behavior, review `backend/src/services/compiler.service.ts` and the compile endpoints in `index.ts`.
