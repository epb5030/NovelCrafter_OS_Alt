# 📖 OpenCrafter Studio

<p align="center">
  <img src="https://raw.githubusercontent.com/epb5030/NovelCrafter_OS_Alt/main/docs/assets/banner.png" alt="OpenCrafter Studio Banner" width="100%" error="this.style.display='none'" />
</p>

<p align="center">
  <strong>The Ultimate Self-Hosted AI Novel Writing OS & Story Architecture Studio</strong>
</p>

<p align="center">
  <a href="https://github.com/epb5030/NovelCrafter_OS_Alt/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-gold.svg" alt="License: MIT"></a>
  <a href="https://github.com/epb5030/NovelCrafter_OS_Alt/actions"><img src="https://img.shields.io/badge/CI-Passing-success.svg" alt="CI: Passing"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v20.x-blue.svg" alt="Node.js: 20.x"></a>
  <a href="https://ollama.com"><img src="https://img.shields.io/badge/AI-Ollama%20%7C%20Gemini%20%7C%20OpenAI%20%7C%20Anthropic-purple.svg" alt="AI Compatibility"></a>
</p>

---

## 🔒 Security, Privacy & Runtime Defaults

> **⚠️ PRIVACY & DATABASE WARNING**:
> The SQLite database file (**`backend/data/novels.db`**) stores your project manuscript prose, codex lore entries, plot matrix items, and configured studio settings.
> **NEVER commit `backend/data/` or `*.db` to git repositories or push them to public GitHub repos.**

### Key Management Best Practices

1. **Environment Variable Priority (Recommended for Production)**:
   Define your API keys in your environment or `.env` file. Environment variables **always override** database settings:
   ```bash
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GEMINI_API_KEY=AIzaSy...
   OPENROUTER_API_KEY=sk-or-...
   OLLAMA_CLOUD_API_KEY=...
   ```
2. **Server-Side AES-256-GCM Encryption**:
   If you configure API keys via the Studio Settings UI, OpenCrafter automatically encrypts sensitive keys using **AES-256-GCM** before writing to SQLite.
3. **1-Click Stored Key Wiping**:
   You can strip all API keys from the SQLite database at any time by clicking **"🧹 Clear All Stored Keys"** in the Studio Settings UI or sending a POST request to `/api/settings/clear-keys`.

---

## 🌟 Overview

**OpenCrafter** is an open-source, privacy-first alternative to commercial novel-writing software. Designed for fiction authors, worldbuilders, and story architects, OpenCrafter provides real-time AI co-writing, interactive plot matrix tracking, multi-track story timelines, cartographic world mapping, character voice tuning, and 1-click publishing compilation into ready-to-publish **EPUB 3** e-books and industry-standard **Microsoft Word (.docx)** manuscripts.

---

## ✨ Key Features

### 🤖 Multi-Provider AI Co-Writer Engine
- **Real-Time SSE Streaming**: Seamless prose continuation, beat expansion, and line rewrites.
- **Provider Support**: Ollama (local offline), Ollama Cloud & Remote GPU Host, Google Gemini (1M+ context streaming), OpenAI (GPT-4o), Anthropic Claude 3.5, and OpenRouter.
- **Style Presets**: Configure Point of View (First Person, Third Limited, Omniscient), Tense (Past, Present), Tone, and Custom Author Guidelines.

### 📖 Story Codex & Lore Network Graph
- Inline `@` mentions with instant lore cards for characters, locations, items, and magic systems.
- Visual 2D force-directed relationship graph with interactive node dragging and connection inspector.

### 📊 2D Character Arc & Plot Beat Matrix
- Interactive grid mapping characters and subplots across chapters.
- Visual POV screen-time distribution bar charts and dramatic tension pacing wave curves.
- Manuscript auto-scanner to track character roles (Absent, Mentioned, Present, POV) per scene.

### ⏱️ Multi-Track Story Timeline & Chronology Engine
- 4 parallel chronology tracks: *Main Story Arc*, *Character Backstories & Lifelines*, *World Lore & Historical Eras*, and *Subplots*.
- Filter by track, assign importance badges (*Climax, Turning Point*), and auto-generate timeline events directly from manuscript outline scenes.

### 🗺️ World Cartography & Interactive Story Map
- Cartographic parchment canvas with drag-and-drop location pins (*Cities, Fortresses, Wilderness, Landmarks, Dungeons, Portals*).
- Trace color-coded character journey paths across chapters.
- Spatial travel calculator (on foot, horseback, carriage, sailing ship, flight, portal) estimating distance in miles/leagues and duration in days.

### 🎤 AI Character Voice Tuner & Dialogue Doctor
- Configure Codex speech personas: explicit voice traits, catchphrases, formality register (1-5), and speech cadence (*Punchy, Eloquent, Rambling, Cryptic*).
- Extract spoken dialogue across manuscript chapters with speaker attribution.
- Calculate **Global Voice Distinctiveness Score** and contraction usage ratios.
- 1-Click AI dialogue line tuner to enforce authentic character voice.

### 📦 Native EPUB 3 & Word DOCX Binary Book Compiler
- **EPUB 3 E-Books**: Generates valid `.epub` packages with custom cover art, dynamic Table of Contents, and typography themes (*Classic Garamond, Modern Sans, Vintage Typewriter*).
- **Microsoft Word (.docx)**: Compiles industry-standard Shunn literary submission format (double spaced, 1-inch margins, Times New Roman, author title page) and clean reading drafts.

### 👤 Author Profiles & Social Sign-In
- Multi-pen-name switcher and global studio preferences.
- Google & GitHub OAuth 2.0 Single Sign-On flow with local fallback.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS Design System, Lucide Icons.
- **Backend**: Node.js, Express, SQLite (`better-sqlite3` / `sqlite`), Archiver (Binary EPUB/DOCX zip packaging), Node Crypto (AES-256-GCM).
- **AI Streaming**: Server-Sent Events (SSE) streaming API handlers.

---

## 🚀 Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org) v18+ or v20+
- [npm](https://www.npmjs.com) v9+
- (Optional) [Ollama](https://ollama.com) installed locally for 100% offline private AI writing.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/epb5030/NovelCrafter_OS_Alt.git
   cd NovelCrafter_OS_Alt
   ```

2. **Install dependencies**:
   ```bash
   npm --prefix backend install
   npm --prefix frontend install
   ```

3. **Set up Environment Variables**:
   ```bash
   cp .env.example .env
   ```

4. **Run in Development Mode**:
   ```bash
   npm --prefix backend run dev
   # In a second terminal:
   npm --prefix frontend run dev
   ```
   Open **`http://localhost:3000`** in your browser.

5. **Build and Run Production Server**:
   ```bash
   npm --prefix frontend run build
   npm --prefix backend run build
   node backend/dist/index.js
   ```
   Open **`http://localhost:3005`** in your browser.

---

## 🐳 Docker Deployment

Run OpenCrafter using Docker Compose:

```bash
docker-compose up -d --build
```
Access the application at `http://localhost:3005`.

---

## 🔒 Security & Privacy

OpenCrafter is designed with local-first privacy:
- Your manuscript text, project databases, and API keys are stored locally on your machine in `backend/data/novels.db`.
- When using local Ollama, no story content ever leaves your local network.
- For vulnerability reports, please see our [SECURITY.md](SECURITY.md).

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
