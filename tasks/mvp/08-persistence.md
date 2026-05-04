# Module: Persistence (M1)

Save and load game state via IndexedDB. Saves use a log-only format — only the seed and command log are stored; state is reconstructed by replay. This makes saves tiny and replay possible from any point.

**Milestone**: M1 — Strategic Vertical  
**Total Estimate**: ~16 hours  
**Exit Criteria**: Player can save, close the browser tab, reopen, and resume exactly where they left off.

---

## Self-Contained Brief

- **Purpose**: IndexedDB-backed save/load using log-only format
  (seed + command log); replay reconstructs state.
- **Public surface**: storage policy in
  [`docs/architecture/storage-policy.md`](../../docs/architecture/storage-policy.md);
  replay format in
  [`docs/architecture/replay-format.md`](../../docs/architecture/replay-format.md);
  consumes engine through canonical-JSON serialization (no
  separate cross-module TS contract beyond the engine seam in
  [`src/contracts/`](../../src/contracts/)).
- **Side effects**: row "src/persistence/" in
  [`docs/architecture/side-effect-matrix.md`](../../docs/architecture/side-effect-matrix.md)
  (boundary: IndexedDB / localStorage; never mutates engine).
- **NFR**: NFR-START-02, NFR-START-03 in
  [`docs/architecture/non-functional-requirements.md`](../../docs/architecture/non-functional-requirements.md).
- **Exit criteria**: see header.

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
- [09-quota-handling.md](08-persistence/09-quota-handling.md)
  🤖 Task 9: Quota handling and LRU eviction (~6h)
