# Contributing to OpenCrafter Studio

Thank you for your interest in contributing to OpenCrafter! We welcome contributions from developers, fiction authors, UI designers, and technical writers.

---

## Code of Conduct

Please be respectful, collaborative, and constructive when interacting with maintainers and fellow contributors.

---

## How to Contribute

### 1. Reporting Bugs
- Check existing issues to verify the bug hasn't already been reported.
- Open a new issue using the **[Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)**.
- Provide clear steps to reproduce, expected behavior, and error tracebacks.

### 2. Proposing Features
- Open a new issue using the **[Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)**.
- Describe the problem your proposed feature solves and how it fits into OpenCrafter's writing & worldbuilding suite.

### 3. Pull Request Process
1. **Fork the Repository** and create a feature branch (`git checkout -b feat/my-new-feature`).
2. **Set Up Local Environment**:
   ```bash
   npm --prefix backend install
   npm --prefix frontend install
   ```
3. **Make Your Changes**:
   - Ensure clean code formatting.
   - Run typechecks and builds before committing:
     ```bash
     npm --prefix frontend run build && npm --prefix backend run build
     ```
4. **Commit & Push**:
   - Use clear commit messages (`feat: add character voice tuning`, `fix: quote attribution regex`).
5. **Open a Pull Request**:
   - Fill out the **[Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md)**.

---

## Project Structure

- `frontend/src/`: React frontend UI, custom themes, components (Timeline, Matrix, Cartography, Voice Doctor, Compiler).
- `backend/src/`: Node.js Express server, SQLite schema, AI streaming service handlers (`ai.service.ts`), binary EPUB/DOCX compiler (`compiler.service.ts`).
- `docs/`: Comprehensive technical documentation, architecture overview, and API reference.

---

## License

By contributing to OpenCrafter, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
