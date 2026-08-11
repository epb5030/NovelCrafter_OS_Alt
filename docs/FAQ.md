# FAQ & Troubleshooting

Q: Where is the scene scanning logic that decides which Codex entries become part of the LLM prompt?
A: See `backend/src/services/ai.service.ts` (prepareContext). It uses scene.metadata, substring matches on entry name, and alias CSV matching.

Q: Why is my character being incorrectly matched to a scene?
A: The scanner uses simple substring checks in the AI prompt builder and word-boundary regex in the auto-populate routine. Short names can cause false positives. Consider adding an alias that is more unique or using metadata to explicitly include/exclude entries for the scene.

Q: How can I limit how much Codex data is sent to the model?
A: Currently no hard cap is enforced. To limit token usage, add a setting (e.g., `max_codex_entries_in_prompt`) and change `ai.service.prepareContext()` to slice activeEntries before building the codexContext. Another approach is to summarize long entry descriptions before injecting them.

Q: Which LLM providers are supported and where are provider settings stored?
A: Supported providers include Ollama (local & cloud), OpenAI, Anthropic, OpenRouter, Gemini. Provider credentials and chosen model are stored in the `settings` table and read by `AIService.getSetting()`.

Q: Where is the SQLite DB stored?
A: When running with Docker Compose, the DB is persisted to `backend/data/novels.db` (mounted by the compose file). In local dev you may get an ephemeral DB unless you configure a persistent path.

If you need help with a specific issue or want me to create a migration, add a UI setting, or implement one of the tuning recommendations, tell me which change you want and I will prepare a PR.