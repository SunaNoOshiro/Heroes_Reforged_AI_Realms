# Data Inventory And Wipe-Scope Policy

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Maintain the canonical [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)
table — one row per persisted field, sensitivity tier, retention
TTL, and `WIPE_LOCAL_DATA` scope coverage. Wire a CI registry-scan
under `npm run validate:tasks` that fails when an IndexedDB store
literal in `src/persistence/` has no inventory row.

Read First:
- [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)
- [`docs/architecture/persistence.md`](../../../docs/architecture/persistence.md)
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)

Inputs:
- Per-slice mapping in `persistence.md`.

Outputs:
- `docs/architecture/data-inventory.md` (already authored).
- `scripts/check-data-inventory-coverage.mjs` — registry-scan lint.

Owned Paths:
- `docs/architecture/data-inventory.md`
- `scripts/check-data-inventory-coverage.mjs`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- The inventory document carries one row per persisted field with
  sensitivity, retention, and wipe scope columns.
- `scripts/check-data-inventory-coverage.mjs` exits non-zero on any
  IndexedDB store literal not present in the inventory table.
- The lint is wired into `npm run validate:tasks`.

Verify:
- npm run validate

Estimated Time:
- 3 hours
