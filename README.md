# OpenCrafter 🖋️🤖

OpenCrafter is a self-hostable, open-source alternative to Novelcrafter. It is designed for novelists who want to write and plan their stories privately, offline (using local LLMs like Ollama), or using cloud LLM APIs, while maintaining absolute ownership of their manuscript, character sheets, and lore books.

---

## Key Features

- **Project Dashboard**: Create, list, delete, and manage multiple books. Export full backups as a single nested JSON file, and restore them easily on any server.
- **The Codex (Story Bible)**: Define character sheets, settings, items, and magic systems. Give items custom names and comma-separated aliases.
- **Dynamic Lore Context**: OpenCrafter automatically scans your scene text as you type, matching occurrences of character names or aliases. When using the AI Co-Writer or chatting, only the relevant codex cards are attached as instructions!
- **Outline Planner**: Sequence acts, chapters, and scenes. Rearrange chapters, write plot synopses, track drafting states, and attach Codex entities explicitly.
- **Scene Editor**: Distraction-free content-editable drafting canvas with autosaving, active word count tracking, and selection-highlight helpers.
- **Context-Aware AI Chat & Co-Writing**:
  - **Continue Writing**: Instruct the AI to generate the next paragraph, seamlessly maintaining your tone, outline parameters, and current Codex lore.
  - **Edit Selection**: Highlight text and provide instruction (e.g. "make it more descriptions", "shorten dialogue") to transform sections in-place.
  - **Scene Chat**: Converse with the AI about details of the active scene. Easily insert ideas and dialogue suggestions straight into your draft.
  - **Auto-Summarize**: Let the AI read your scene draft and generate/update the plot card summary.
- **Configurable LLM Integrations**:
  - **Ollama**: Connect to locally hosted models (e.g., `llama3`, `mistral`, `gemma`) for 100% offline, private, and free writing.
  - **OpenAI / Anthropic**: Plug in your custom API keys to use Claude 3.5 Sonnet, GPT-4o, or GPT-4o-mini.
  - **OpenRouter**: Access hundreds of open-source and proprietary models with custom configurations.

---

## Quick Start: Self-Hosting with Docker

The easiest way to run OpenCrafter is using Docker. It builds the React client, spins up the Express server, and sets up a persistent SQLite volume folder.

1. Clone or copy this repository to your self-hosted server.
2. Run the compose script:
   ```bash
   docker compose up -d
   ```
3. Open your browser and navigate to **`http://localhost:3000`**.
4. All database records (including API keys) are stored securely inside the `./data/novels.db` SQLite file on your host machine.

---

## Local Development Setup

If you wish to run the client and server separately for development:

### 1. Run the Backend
```bash
cd backend
npm install
npm run dev # Starts express server on http://localhost:3000
```

### 2. Run the Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev # Starts Vite development server on http://localhost:5173
```
Open **`http://localhost:5173`** in your browser. In development mode, the React app automatically proxies API requests to the backend running on port `3000`.
