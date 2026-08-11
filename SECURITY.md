# Security Policy

OpenCrafter takes security and author privacy seriously. As a self-hosted AI novel studio, your manuscripts, codex entries, and credentials remain private on your local machine or server.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability or sensitive data exposure in OpenCrafter, please report it responsibly:

1. **Do NOT open a public GitHub issue** for undisclosed security vulnerabilities.
2. Email your findings directly to the maintainers at **security@opencrafter.local** or submit a private report via **GitHub Security Advisories**.
3. Include details of the vulnerability, steps to reproduce, and any proof-of-concept code.

### Security Response Timeline
- **Acknowledgement**: Within 48 hours.
- **Assessment & Patch**: Critical vulnerabilities will be patched within 7 business days.

## Local Data & AI Privacy
- **API Keys & Credentials**: AI API keys (OpenAI, Anthropic, Gemini, OpenRouter, Ollama Cloud) are stored locally in SQLite (`backend/data/novels.db`) and are never sent to third-party telemetry servers.
- **Local LLMs**: When using local Ollama, your manuscript text never leaves your local network.
