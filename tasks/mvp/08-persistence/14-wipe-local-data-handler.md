# WIPE_LOCAL_DATA Handler

Module: [Persistence](../08-persistence.md)

Description:
Implement the `WIPE_LOCAL_DATA` command handler. Iterates the rows
declared in [`data-inventory.md`](../../../docs/architecture/data-inventory.md),
not a hand-coded list. Accepts a `scope: "all" | "saves" | "profile" | "chat"`
payload; reloads the page after wipe to drop in-memory state.
Routes through screen 60-confirmation-dialog before executing.

Read First:
- [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)
- [`docs/architecture/persistence.md`](../../../docs/architecture/persistence.md)
- [`docs/architecture/wiki/screens/54-system-menu/interactions.md`](../../../docs/architecture/wiki/screens/54-system-menu/interactions.md)
- [`docs/architecture/wiki/screens/56-options/interactions.md`](../../../docs/architecture/wiki/screens/56-options/interactions.md)

Inputs:
- IndexedDB databases declared in `persistence.md`: `hr-saves`,
  `hr-profile`, `hr-packs`, `hr-trust`.
- Sensitivity tiers from the inventory document.

Outputs:
- `src/persistence/wipe-local-data.ts`
- `src/persistence/__tests__/wipe-local-data.test.ts`

Owned Paths:
- `src/persistence/wipe-local-data.ts`
- `src/persistence/__tests__/wipe-local-data.test.ts`

Dependencies:
- mvp.02-content-schemas.33-data-inventory-and-wipe-scope-policy
- mvp.08-persistence.13-display-name-hash-and-salt

Acceptance Criteria:
- `scope=all` clears every IndexedDB database listed in the
  inventory and reloads the page.
- `scope=saves` clears only `hr-saves.*`; the salt is preserved.
- `scope=profile` clears only `hr-profile.*` and `hr-trust.*`;
  saves are preserved.
- `scope=chat` is a no-op today (no persistent chat surface) but
  exists so a future feature cannot regress it.
- Tests exercise each scope and verify the post-wipe inventory
  consistency.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
