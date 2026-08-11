# Changelog

All notable changes to **OpenCrafter Studio** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-08-11

### Added
- **Phase 9: Interactive Story Map & World Cartography Studio**:
  - Interactive cartography canvas with dark parchment grid, compass rose accent, and custom pin positioning.
  - Pin classifications (*Cities, Fortresses, Wilderness, Landmarks, Dungeons, Portals*) linked to Codex entries.
  - Color-coded character journey paths connecting sequential location waypoints.
  - Spatial travel distance and duration calculator with transport speed dials (*Foot, Horseback, Carriage, Ship, Wyvern Flight, Portal*).
  - 1-Click **"Auto-Map Codex Locations"** tool.
- **AES-256-GCM Server-Side Encryption**: Encrypt sensitive API keys before saving to SQLite database.
- **Environment Variable Priority**: `process.env` overrides SQLite DB settings for secure deployment.
- **1-Click Stored Key Wiping**: `POST /api/settings/clear-keys` and UI clear button.
- **Community Governance & CI Workflows**: `CODE_OF_CONDUCT.md`, `AUTHORS.md`, `MAINTAINERS.md`, `CODEOWNERS`, `.prettierrc`, `dependabot.yml`, and `release.yml`.

---

## [1.2.0] - 2026-08-11

### Added
- **Phase 7: Native EPUB 3 & Word DOCX Binary Compiler**:
  - EPUB 3 zip archive generator with metadata, OPF manifest, NCX table of contents, and typography themes (*Classic Garamond, Modern Sans, Vintage Typewriter*).
  - OpenXML DOCX generator supporting Shunn Literary Submission format.
- **Phase 8: AI Character Voice Tuner & Dialogue Doctor**:
  - Speech persona configuration in Codex.
  - Chapter dialogue extraction and speaker attribution parser.
  - Global Voice Distinctiveness Health Score & AI dialogue tuning endpoint.

---

## [1.1.0] - 2026-08-11

### Added
- **Phase 5: Character Arc & Plot Beat Matrix**:
  - 2D grid matrix mapping characters and subplots across chapters.
  - Pacing wave curves and POV screen-time bar charts.
- **Phase 6: Multi-Track Story Timeline & Chronology**:
  - 4 parallel chronology tracks (*Main Story Arc, Character Backstories, World Lore, Subplots*).
  - Timeline auto-generation from outline scenes.

---

## [1.0.0] - 2026-08-10

### Added
- Initial Release of **OpenCrafter Studio**:
  - SSE real-time AI co-writer text streaming engine.
  - Codex lore network graph with `@` mention parser.
  - Project dashboard and multi-pen-name profile switcher.
