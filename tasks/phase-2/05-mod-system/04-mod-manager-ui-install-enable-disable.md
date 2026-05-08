# Mod Manager UI — Install, Enable, Disable

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
In-game mod manager screen. Lists all installed packs, shows their status, and allows install/enable/disable/uninstall.

Read First:
- `docs/architecture/wiki/screens/54-system-menu/spec.md`
- `docs/architecture/wiki/screens/54-system-menu/interactions.md`
- `docs/architecture/wiki/screens/54-system-menu/data-contracts.md`
- `docs/architecture/wiki/screens/54-system-menu/architecture.md`
- `docs/architecture/wiki/screens/54-system-menu/mockup.html`

Inputs:
- IndexedDB content store (`08-persistence.md` Task 1)
- Tasks 1–3
- Screen package `docs/architecture/wiki/screens/54-system-menu/`

Outputs:
- `src/ui/components/ModManager.tsx`
- List: pack name, author, version, signature status, sandbox badge, enabled toggle
- Install: drag-and-drop or file picker for `.hrmod` files
- Uninstall: removes pack from IndexedDB
- Warning: disabling an active pack mid-game is not allowed (must return to main menu)
- Conflict detection: warns if two packs define the same unit/building IDs
- Override visualization: for every entry in
  `loadedPack.overrides[]` surfaces `target`, `kind`, `source` (the
  overriding pack), and `reason` so the player sees *why* a baseline
  record was replaced. Backed by the resolver's `overrideMap` from
  [`mvp.02b-asset-pipeline.12-pack-resolver-algorithm`](../../mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md)
  and the override task
  [`phase-2.05-mod-system.08-override-precedence-and-patch-merge`](./08-override-precedence-and-patch-merge.md).
- Error rendering: every load failure renders by the
  `pack.error.*` code from
  [`pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)
  (no ad-hoc error strings). Severity drives blocking vs warning UI.

Owned Paths:
- `src/ui/components/ModManager.tsx`

Dependencies:
- phase-2.05-mod-system.01-zip-pack-loader-jszip-plus-manifest-parser
- phase-2.05-mod-system.02-ed25519-signature-verification
- phase-2.05-mod-system.03-sandbox-mode-for-ai-generated-packs

Acceptance Criteria:
- Dropping a valid `.hrmod` file installs it and shows it in the list
- Dropping an invalid file shows an error toast
- Conflict warning appears when two packs share an ID
- Disabled packs are not loaded at game start
- Layout, bindings, and commands match `docs/architecture/wiki/screens/54-system-menu/mockup.html`, `docs/architecture/wiki/screens/54-system-menu/interactions.md`, and `docs/architecture/wiki/screens/54-system-menu/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
