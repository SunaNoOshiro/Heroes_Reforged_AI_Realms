# Undo / Soft-Delete For Save Slots

Status: planned

Module: [Persistence (M2)](../08-persistence.md)

Description:
Add the soft-delete + undo model declared in
[`docs/architecture/undo-policy.md`](../../../docs/architecture/undo-policy.md)
for `DELETE_SAVE_SLOT` and `OVERWRITE_SAVE_SLOT`. Adds
`state.ui.lastDestructive`, the 5-second tombstone TTL, the
`UNDO_LAST_DESTRUCTIVE` and `EXPIRE_LAST_DESTRUCTIVE` commands, and
the non-modal undo toast surfaced by screen
[`55-save-load`](../../../docs/architecture/wiki/screens/55-save-load/).

Plan 23 § 3.1 (Q438 — "No undo on destructive commit").

Read First:
- [`docs/architecture/undo-policy.md`](../../../docs/architecture/undo-policy.md)
- [`docs/architecture/wiki/screens/55-save-load/interactions.md`](../../../docs/architecture/wiki/screens/55-save-load/interactions.md)
- [`docs/architecture/diagrams/24-save-flow.md`](../../../docs/architecture/diagrams/24-save-flow.md)

Inputs:
- Default TTL: **5000 ms**.
- Reuse the rolling overwrite ring from
  [`pack-trust.md` § Save Quarantine](../../../docs/architecture/pack-trust.md#2-save-quarantine).

Outputs:
- `src/persistence/undo-soft-delete.ts`
- `src/persistence/__tests__/undo-soft-delete.test.ts`

Owned Paths:
- `src/persistence/undo-soft-delete.ts`
- `src/persistence/__tests__/undo-soft-delete.test.ts`

Owned Paths (shared):
- `src/state/ui/save-load-slice.ts` — extends the slice with
  `lastDestructive`.

Dependencies:
- mvp.08-persistence.01-indexeddb-wrapper
- mvp.08-persistence.06-autosave

Acceptance Criteria:
- `src/state/ui/save-load-slice.ts` is **owned by** the existing UI shell tasks; this task is additive (one new `lastDestructive` field plus the `UNDO_LAST_DESTRUCTIVE` / `EXPIRE_LAST_DESTRUCTIVE` reducers) and must not rewrite the existing slot list, autosave ring, or recycle ring.
- `DELETE_SAVE_SLOT` marks the slot `softDeleted: true` with
  `tombstoneExpiresAt = now() + 5000 ms`; the file remains on disk
  while the toast is mounted.
- `OVERWRITE_SAVE_SLOT` clones the prior payload into the rolling
  overwrite ring before the new payload writes.
- `UNDO_LAST_DESTRUCTIVE` clears the tombstone (or restores the ring
  entry) and clears `state.ui.lastDestructive`.
- `EXPIRE_LAST_DESTRUCTIVE` runs the underlying file-system delete at
  TTL.
- The toast renders only while
  `state.ui.lastDestructive != null && now() < expiresAt`.
- Peer clients in a remote match do not autosave and do not surface
  the toast.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
