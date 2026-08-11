# AI Context & Scene Scanning

This page documents how OpenCrafter builds dynamic lore context (the "Story Codex" injection) and how scene scanning / alias matching works.

Where the code lives
- Primary prompt & scanning logic: `backend/src/services/ai.service.ts` in prepareContext()
- Project-wide scanning & auto-populate utilities: `backend/src/index.ts` (e.g., `/api/projects/:projectId/matrix/auto-populate` and related search routines)

What prepareContext() does (high-level)
1. Loads active provider settings (Ollama/OpenAI/Anthropic/OpenRouter/Gemini).
2. Loads the requested scene and its textual content from `scene_contents`.
3. Loads all Codex entries for the project (`codex_entries`).
4. Builds activeEntries by checking three conditions for each Codex entry:
   - If the scene's `metadata` JSON array explicitly contains the entry's id, it is included.
   - If the scene text (lowercased) contains the entry's `name` (simple substring).
   - If the entry has `aliases` (CSV), split them and include if any alias substring appears in the scene text.
5. Renders included activeEntries into a `codexContext` block and inserts it into the LLM system prompt.

Important code characteristics
- Matching technique in ai.service.prepareContext:
  - Simple lowercase substring checks (textToLower.includes(entry.name.toLowerCase())) and alias CSV splitting.
  - Metadata IDs take precedence and force inclusion.
  - No fuzzy matching, no stemming, and no ranking beyond selection.

Project-level scanning (auto-populate matrix & dialogue attribution)
- `index.ts` contains a scanning routine used by `/api/projects/:projectId/matrix/auto-populate`:
  - It builds a single search string from title + summary + content (lowercased).
  - For each character codex entry, it searches for word-boundary matches using a regex: `new RegExp(`\\b${term}\\b`, 'gi')` to count matches.
  - matchCount is used to classify role: >4 => 'pov', >=2 => 'participant', else 'mentioned'. These numeric thresholds and the role mapping are implemented in the code and can be tuned.

Where to tune behavior
- To change which Codex entries get included in the system prompt:
  - Edit `backend/src/services/ai.service.ts` near the activeEntries filter (search lines where metadataIds/includes and textToLower checks are done).
  - Replace substring checks with word-boundary regex to prevent partial/false-positive matches (e.g., `Ann` vs `annual`), or add fuzzy matching.

- To limit prompt length and token use:
  - Add a setting (e.g., `max_codex_entries_in_prompt`) and sort activeEntries by priority (metadata first, then frequency), and slice top N.
  - Summarize long Codex descriptions before injecting into the prompt to save context tokens.

- To change auto-populate thresholds (for roles):
  - Update `/api/projects/:projectId/matrix/auto-populate` logic in `backend/src/index.ts` to use different matchCount cutoffs or a weighted scoring system.

Recommendations and best practices
- Use word-boundary matching for names and aliases to reduce false positives.
- Expose inclusion thresholds & max entries as user-editable settings so authors can tune how liberal/strict the scanner is.
- Consider a token budget-aware selection step before adding codexContext: rank entries (metadata > frequency > explicit alias match) and keep the top-N that fit the budget.
- If you need fuzzy matching, implement it conservatively (low Levenshtein threshold) and prefer it only for short names to avoid false matches.

Example small improvement (safe, low-risk)
- Replace the substring check in ai.service with a word-boundary regex and trim aliases; add a setting to cap the number of entries included in codexContext. This reduces accidental matches and helps avoid hitting LLM context limits.

