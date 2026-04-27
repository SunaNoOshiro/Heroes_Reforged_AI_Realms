# IndexedDB Wrapper

Status: planned

Module: [Persistence (M1)](../08-persistence.md)

Description:
Thin async wrapper around IndexedDB with three object stores: `saves`, `scenarios`, `content`. Handles open/upgrade/error lifecycle. Exposes simple get/set/delete/list operations per store.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- None (standalone module)

Outputs:
- `src/persistence/db.ts`
- `openDB(): Promise<GameDB>`
- `GameDB.saves`: `{ get(id), set(id, data), delete(id), list() }`
- `GameDB.scenarios`: same interface
- `GameDB.content`: same interface
- Auto-upgrades schema on version bump (current version: 1)

Owned Paths:
- `src/persistence/db.ts`

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module

Acceptance Criteria:
- `openDB()` resolves in < 50ms on first open
- `set` + `get` round-trip preserves exact object
- `list()` returns all entries sorted by last modified date
- Works in Chrome, Firefox, Safari (no fallbacks needed for MVP)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
