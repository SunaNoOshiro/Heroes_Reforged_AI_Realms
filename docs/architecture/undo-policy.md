# Undo & Soft-Delete Policy

> Companion to [`docs/architecture/wiki/screens/55-save-load/`](./wiki/screens/55-save-load/),
> [`docs/architecture/diagrams/24-save-flow.md`](./diagrams/24-save-flow.md),
> and the persistence layer in [`persistence.md`](./persistence.md).
> Closes the "no undo on destructive commit" gap.

## 1. Scope

This file pins soft-delete + undo for the destructive flows where
a misclick is most costly:

- `DELETE_SAVE_SLOT`
- `OVERWRITE_SAVE_SLOT`

Future flows can opt in by reusing the same `state.ui.lastDestructive`
state slice and command vocabulary. Flows that route a different
destructive intent (pack uninstall, profile wipe, consent revoke) stay
on the click-through-resistance path defined in
[`60-confirmation-dialog`](./wiki/screens/60-confirmation-dialog/spec.md#click-through-resistance);
those are intentional, type-the-word actions and do not need a
secondary undo.

## 2. State Slice

```text
state.ui.lastDestructive: {
  scope: 'saveSlot' | 'profileWipe' | …,
  payload: Command,         // command that produced the soft-delete
  expiresAt: number,        // wall-clock ms
  toastMessageKey: string,  // localization key for the undo toast
  undoCommand: Command      // what UNDO_LAST_DESTRUCTIVE will dispatch
} | null
```

Cleared on `EXPIRE_LAST_DESTRUCTIVE` (TTL elapsed) or
`UNDO_LAST_DESTRUCTIVE` (user-driven undo). Never enters saves or the
canonical state hash.

## 3. Command Vocabulary

- `DELETE_SAVE_SLOT(slotId)` — the existing reducer marks the slot
  `softDeleted: true` and writes `tombstoneExpiresAt = now() + 5000 ms`.
  The slot is hidden from `selectors.persistence.saveSlotManifests` but
  the file remains on disk. `state.ui.lastDestructive` is populated.
- `OVERWRITE_SAVE_SLOT(slotId)` — the prior payload is cloned into the
  rolling overwrite ring (`selectors.persistence.recycle.savedSlots`)
  before the new payload writes. `state.ui.lastDestructive` points at
  the ring entry so undo can restore it.
- `UNDO_LAST_DESTRUCTIVE` — clears the tombstone fields (or restores
  from the overwrite ring) and clears `state.ui.lastDestructive`.
- `EXPIRE_LAST_DESTRUCTIVE` — scheduled effect dispatched at TTL; runs
  the underlying file-system delete (or drops the ring entry) and
  clears `state.ui.lastDestructive`.

## 4. UI Surface

- The `55-save-load` screen renders a non-modal toast at the bottom
  while `state.ui.lastDestructive != null && now() < expiresAt`.
- Toast contents: localized `toastMessageKey`, an `Undo` button, and a
  countdown indicator (visual only — the timer is authoritative).
- Pressing `Undo` dispatches `UNDO_LAST_DESTRUCTIVE`; the slot
  reappears with the previous metadata.
- Toast dismissal is gestural only; the underlying TTL still applies.

## 5. Defaults

- TTL: **5000 ms**.
- Configurable via the per-build constant in this document; the
  runtime never reads it from a user-facing config key.
- `OVERWRITE_SAVE_SLOT` shares the same TTL but uses the rolling
  overwrite ring as the storage backend (already documented in
  [`24-save-flow.md`](./diagrams/24-save-flow.md)).

## 6. Multiplayer

The host's save flow honors this contract; peer clients do not
autosave during a remote match (per
[`tasks/mvp/08-persistence/06-autosave.md`](../../tasks/mvp/08-persistence/06-autosave.md))
and therefore do not surface the toast.
