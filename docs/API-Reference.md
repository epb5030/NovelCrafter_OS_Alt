# API Reference (Selected Endpoints)

This is a concise reference for the most important API endpoints used by the frontend and automation scripts. Refer to `backend/src/index.ts` for full implementation.

Projects
- GET /api/projects — list all projects
- GET /api/projects/:id — get project details
- POST /api/projects — create project
- GET /api/projects/:id/export — export project JSON (includes codex, outline, scene_contents)
- GET /api/projects/:projectId/export/manuscript?format=markdown|html&download=true — export compiled manuscript

Codex (Story Bible)
- GET /api/projects/:projectId/codex — list codex entries
- POST /api/projects/:projectId/codex — create codex entry
- PUT /api/projects/:projectId/codex/:id — update codex entry
- GET /api/projects/:projectId/codex-relationships — codex graph relationships

Outline & Scenes
- GET /api/projects/:projectId/outline — get outline elements
- POST /api/projects/:projectId/outline — create act/chapter/scene
- GET /api/scenes/:sceneId/content — get scene content
- PUT /api/scenes/:sceneId/content — save scene content
- Scene snapshots: `/api/scenes/:sceneId/snapshots` endpoints for history, restore, etc.

AI / LLM
- POST /api/ai/generate — non-streaming generation (payload: sceneId, action, prompt, selection, beats, styleOverrides)
- POST /api/ai/generate-stream — SSE streaming generation; server pushes newline-delimited SSE events containing chunks

Analysis & Tools
- GET /api/projects/:projectId/outline-stats — word counts and stats
- GET /api/projects/:projectId/dialogue/analysis — character dialogue analysis
- POST /api/projects/:projectId/matrix/auto-populate — scan scenes to auto-populate scene-character matrix

Settings
- GET /api/settings — read saved settings
- POST /api/settings — write settings (bulk insert/update)

Notes
- Many endpoints expect `projectId` and will update `projects.updated_at` on changes.
- AI endpoints use `backend/src/services/ai.service.ts` for building prompts and provider dispatch; tune settings there if you need different model behavior.
