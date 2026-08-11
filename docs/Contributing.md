# Contributing & Local Development

Thanks for wanting to contribute! This section covers how to set up a local dev environment and some recommended contribution guidelines.

Local development
1. Backend

```bash
cd backend
npm install
npm run dev
```

- Backend runs on port 3005 by default. It uses SQLite (check `backend/data/` for runtime DB when using Docker). Settings are persisted to the `settings` table.

2. Frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend Vite server runs on port 5173 and proxies API requests to the backend in development.

Style & testing
- TypeScript is used across the project. Please run a build check before opening a PR:

```bash
# Backend
cd backend
npm run build

# Frontend (build step will run tsc -b)
cd frontend
npm run build
```

Documentation & Wiki
- Docs live in `docs/` (this wiki). Keep docs up to date when making changes to scanning, AI behavior, or API signatures.

How to propose changes
- Fork the repo, create a topic branch, push your changes and open a pull request against `main`.
- Provide a clear PR description, including:
  - What you changed and why
  - Any DB migrations required (for schema changes)
  - Any settings or runtime changes users must make

Large feature additions
- Open an issue first to discuss design & approach (include examples and API contract changes). This helps avoid duplicated work and ensures alignment with project goals.

Security
- Do not commit secrets (API keys). Settings are stored in the database via the Settings API; add notes in README about where to configure keys.

