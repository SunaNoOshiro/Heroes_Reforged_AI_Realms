# Save / Load UI

Status: planned

Module: [Persistence (M1)](../08-persistence.md)

Description:
Save/load screen accessible from the HUD. Shows existing save slots, allows naming saves, and confirms before overwriting.

Read First:
- `docs/architecture/wiki/screens/55-save-load/spec.md`
- `docs/architecture/wiki/screens/55-save-load/interactions.md`
- `docs/architecture/wiki/screens/55-save-load/data-contracts.md`
- `docs/architecture/wiki/screens/55-save-load/architecture.md`
- `docs/architecture/wiki/screens/55-save-load/mockup.html`

Inputs:
- Zustand store (`07-ui-shell.md` Task 2)
- IndexedDB wrapper (Task 1)
- Save format (Task 2)
- Screen package `docs/architecture/wiki/screens/55-save-load/`

Outputs:
- `src/ui/components/SaveLoadScreen.tsx`
- Save tab: text input for name + "Save Game" button
- Load tab: list of saves (name, date, turn number) + "Load" button per entry
- Overwrite confirmation dialog
- Delete save button (with confirmation)

Owned Paths:
- `src/ui/components/SaveLoadScreen.tsx`

Dependencies:
- mvp.08-persistence.01-indexeddb-wrapper
- mvp.08-persistence.02-log-only-save-format

Acceptance Criteria:
- Saving creates a new entry in the list within 200ms
- Loading replays the game and shows adventure map within 2 seconds (7-day save)
- Attempting to load save from deleted content pack shows warning
- 10 save slots minimum (no hard limit)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/55-save-load/mockup.html`, `docs/architecture/wiki/screens/55-save-load/interactions.md`, and `docs/architecture/wiki/screens/55-save-load/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
