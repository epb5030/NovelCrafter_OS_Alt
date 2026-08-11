# Security & Privacy Policy

OpenCrafter takes security and author privacy seriously. As a self-hosted AI novel studio, your manuscripts, codex entries, and credentials remain private on your local machine or server.

---

## ⚠️ Database Privacy Warning

The SQLite database file (**`backend/data/novels.db`**) contains your project prose, codex lore entries, plot beats, and configured settings.

- **DO NOT commit `backend/data/novels.db` to git repositories or make it public.**
- `.gitignore` is pre-configured to ignore `backend/data/` and `*.db` files.

---

## 🔑 API Key Management & Server-Side Encryption

1. **Environment Variable Priority (Recommended)**:
   Define keys in `.env` or system environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `OLLAMA_CLOUD_API_KEY`). Environment variables always take precedence over SQLite settings.

2. **AES-256-GCM Encryption**:
   API keys saved via the Studio Settings UI are encrypted on disk with **AES-256-GCM** using a master secret key.

3. **1-Click Key Clearing**:
   To strip stored keys from SQLite, click **"Clear All Stored Keys"** in the Studio Settings UI or invoke `POST /api/settings/clear-keys`.

---

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

---

## Reporting a Vulnerability

If you discover a security vulnerability or sensitive data exposure in OpenCrafter, please report it responsibly:

1. **Do NOT open a public GitHub issue** for undisclosed security vulnerabilities.
2. Email your findings directly to the maintainers at **security@opencrafter.local** or submit a private report via **GitHub Security Advisories**.
3. Include details of the vulnerability, steps to reproduce, and any proof-of-concept code.

### Security Response Timeline
- **Acknowledgement**: Within 48 hours.
- **Assessment & Patch**: Critical vulnerabilities will be patched within 7 business days.
