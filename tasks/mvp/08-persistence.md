# Module: Persistence (M1)

Save and load game state via IndexedDB. Saves use a log-only format — only the seed and command log are stored; state is reconstructed by replay. This makes saves tiny and replay possible from any point.

**Milestone**: M1 — Strategic Vertical  
**Total Estimate**: ~16 hours  
**Exit Criteria**: Player can save, close the browser tab, reopen, and resume exactly where they left off.

---

## Task Files

- [01-indexeddb-wrapper.md](08-persistence/01-indexeddb-wrapper.md)
  🤖 Task 1: IndexedDB wrapper (~3h)
- [02-log-only-save-format.md](08-persistence/02-log-only-save-format.md)
  🧠⚠️ Task 2: Log-only save format (~4h)
- [03-save-load-ui.md](08-persistence/03-save-load-ui.md)
  🤖 Task 3: Save / load UI (~3h)
- [04-scenario-loader.md](08-persistence/04-scenario-loader.md)
  🤖 Task 4: Scenario loader (~3h)
- [05-export-import-json.md](08-persistence/05-export-import-json.md)
  🤖 Task 5: Export / import JSON (~3h)
