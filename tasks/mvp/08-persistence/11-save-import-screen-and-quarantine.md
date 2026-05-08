# Save Import Screen + Quarantine

Module: [Persistence (M1)](../08-persistence.md)

Description:
Implement the quarantined save-import flow as screen 70. Owns the
in-memory staging selector, the size/ratio caps, the per-pack
consent rows, the compatibility seal (ok / skew / tamper /
unsupported), and the rolling overwrite ring used by
`RESTORE_OVERWRITTEN_SAVE`.

Read First:
- [`docs/architecture/wiki/screens/70-save-import/spec.md`](../../../docs/architecture/wiki/screens/70-save-import/spec.md)
- [`docs/architecture/wiki/screens/70-save-import/interactions.md`](../../../docs/architecture/wiki/screens/70-save-import/interactions.md)
- [`docs/architecture/wiki/screens/70-save-import/data-contracts.md`](../../../docs/architecture/wiki/screens/70-save-import/data-contracts.md)
- [`docs/architecture/wiki/screens/70-save-import/architecture.md`](../../../docs/architecture/wiki/screens/70-save-import/architecture.md)
- [`docs/architecture/wiki/screens/70-save-import/mockup.html`](../../../docs/architecture/wiki/screens/70-save-import/mockup.html)
- [`docs/architecture/pack-trust.md`](../../../docs/architecture/pack-trust.md)

Inputs:
- Save schema validator from Task 10
- Trust prompt screen from Task 12

Outputs:
- `src/ui/screens/save-import-screen.tsx` (and supporting components
  named under the screen package's Component Tree)
- `src/persistence/save-import.ts` orchestrating the staging area,
  caps, validate, and slot promote
- Selectors: `selectors.persistence.import.staging`,
  `selectors.persistence.recycle.savedSlots`,
  `selectors.persistence.selectedSaveCompatibility`

Owned Paths:
- `src/ui/screens/save-import-screen.tsx`
- `src/persistence/save-import.ts`

Dependencies:
- mvp.08-persistence.10-save-schema-and-validator
- mvp.08-persistence.01-indexeddb-wrapper
- mvp.08-persistence.03-save-load-ui

Acceptance Criteria:
- Layout, bindings, and commands match
  [`docs/architecture/wiki/screens/70-save-import/spec.md`](../../../docs/architecture/wiki/screens/70-save-import/spec.md),
  [`docs/architecture/wiki/screens/70-save-import/interactions.md`](../../../docs/architecture/wiki/screens/70-save-import/interactions.md),
  and
  [`docs/architecture/wiki/screens/70-save-import/data-contracts.md`](../../../docs/architecture/wiki/screens/70-save-import/data-contracts.md).
- Imports rejected before decompression when over 4 MiB
  (`ui.save-import.reject.too-large`).
- Imports aborted on >200x decompression ratio
  (`ui.save-import.reject.bomb`).
- Schema-validate failures terminate without a click-through path:
  `ui.save-import.reject.too-new`, `ui.save-import.reject.no-migration`.
- `compatibility.status = "tamper"` is terminal — there is no
  `Continue anyway` button.
- Quarantine staging is in-memory only; cleared on
  `CANCEL_SAVE_IMPORT`, on tab unload, and on import completion.
- Overwrite promotes the previous slot contents into the rolling
  ring (cap 3 entries per slot, 7-day TTL) consumed by
  `RESTORE_OVERWRITTEN_SAVE`.
- A safe-mode session refuses imports referencing non-canonical
  packs with `ui.save-import.reject.safe-mode-blocks-pack`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
