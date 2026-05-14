# Undo & Soft-Delete Policy

> Companion docs:
> [`wiki/screens/55-save-load/`](./wiki/screens/55-save-load/) (toast
> surface and slot bindings),
> [`diagrams/24-save-flow.md`](./diagrams/24-save-flow.md) (overwrite
> ring composition),
> [`persistence.md`](./persistence.md) (storage media),
> [`60-confirmation-dialog/spec.md#click-through-resistance`](./wiki/screens/60-confirmation-dialog/spec.md#click-through-resistance)
> (the alternative path for type-the-word destructive flows).
>
> Owning task:
> [`tasks/mvp/08-persistence/27-undo-soft-delete.md`](../../tasks/mvp/08-persistence/27-undo-soft-delete.md).
> Closes the "no undo on destructive commit" gap.

## 1. Scope

Soft-delete + undo applies to the destructive save-slot flows where a
misclick is most costly:

- `DELETE_SAVE_SLOT`
- `OVERWRITE_SAVE_SLOT`

Future flows opt in by reusing the same `state.ui.lastDestructive`
slice and command vocabulary.

**Out of scope.** Pack uninstall, profile wipe, and consent revoke
stay on the type-the-word click-through-resistance path in
[`60-confirmation-dialog`](./wiki/screens/60-confirmation-dialog/spec.md#click-through-resistance);
those are intentional actions and do not need a secondary undo.

## 2. State Slice

```text
state.ui.lastDestructive: {
  scope: 'saveSlot' | 'profileWipe' | …,  // closed enum; extend as flows opt in
  payload: Command,                        // command that produced the soft-delete
  expiresAt: number,                       // wall-clock ms
  toastMessageKey: string,                 // localization key for the undo toast
  undoCommand: Command                     // dispatched by UNDO_LAST_DESTRUCTIVE
} | null
```

- Cleared on `UNDO_LAST_DESTRUCTIVE` (user-driven) or
  `EXPIRE_LAST_DESTRUCTIVE` (TTL elapsed).
- Never enters saves or the canonical state hash; UI-only.

## 3. Command Vocabulary

| Command | Effect |
|---|---|
| `DELETE_SAVE_SLOT(slotId)` | Marks the slot `softDeleted: true` and writes `tombstoneExpiresAt = now() + 5000 ms`. The slot is hidden from `selectors.persistence.saveSlotManifests` but the file stays on disk. Populates `state.ui.lastDestructive`. |
| `OVERWRITE_SAVE_SLOT(slotId)` | Clones the prior payload into the rolling overwrite ring (`selectors.persistence.recycle.savedSlots`) before the new payload writes. `state.ui.lastDestructive` points at the ring entry. |
| `UNDO_LAST_DESTRUCTIVE` | Clears the tombstone fields (or restores from the overwrite ring) and clears `state.ui.lastDestructive`. |
| `EXPIRE_LAST_DESTRUCTIVE` | Scheduled effect dispatched at TTL; runs the underlying file-system delete (or drops the ring entry) and clears `state.ui.lastDestructive`. |

The four kinds are registered as runtime-only / persistence-side
tokens (not engine-reducer commands) per
[`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](./command-schema.md#consent-onboarding--destructive-ux-commands).

## 4. UI Surface

- Screen [`55-save-load`](./wiki/screens/55-save-load/) renders a
  non-modal toast at the bottom of the slot list while
  `state.ui.lastDestructive != null && now() < expiresAt`.
- **Toast contents:** localized `toastMessageKey`, an `Undo` button,
  and a countdown indicator (visual only — the TTL timer is
  authoritative).
- **Undo:** pressing the button dispatches `UNDO_LAST_DESTRUCTIVE`;
  the slot reappears with its previous metadata.
- **Dismissal:** gestural only. The underlying TTL still applies and
  `EXPIRE_LAST_DESTRUCTIVE` fires on schedule.

Behavior and copy live in
[`55-save-load/interactions.md` § Soft-Delete Toast](./wiki/screens/55-save-load/interactions.md#soft-delete-toast).

## 5. Defaults

- **TTL:** 5000 ms (applies to both `DELETE_SAVE_SLOT` and
  `OVERWRITE_SAVE_SLOT`).
- The TTL is a per-build constant owned by this document; the
  runtime never reads it from a user-facing config key.
- `OVERWRITE_SAVE_SLOT` shares the TTL but uses the rolling overwrite
  ring as the storage backend, documented in
  [`24-save-flow.md`](./diagrams/24-save-flow.md).

## 6. Multiplayer

- The host's save flow honors this contract.
- Peer clients do not autosave during a remote match (per
  [`tasks/mvp/08-persistence/06-autosave.md`](../../tasks/mvp/08-persistence/06-autosave.md))
  and therefore do not surface the toast.

---

## 🔍 Sync Check

- **UI: ✔** — Toast surface, bindings, and copy match [`55-save-load/interactions.md` § Soft-Delete Toast](./wiki/screens/55-save-load/interactions.md#soft-delete-toast) and [`55-save-load/data-contracts.md`](./wiki/screens/55-save-load/data-contracts.md) (`lastDestructive`, `recycleRing`, `DELETE_SAVE_SLOT`, `OVERWRITE_SAVE_SLOT`, `UNDO_LAST_DESTRUCTIVE`, `EXPIRE_LAST_DESTRUCTIVE`).
- **Schema: ✔** — The four kinds are registered as runtime-only / persistence-side tokens in [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](./command-schema.md#consent-onboarding--destructive-ux-commands) and do not enter the engine `Command` `oneOf`; that matches the doc's "never enters saves or the canonical state hash" clause. `state.ui.lastDestructive` is transient UI state and is not in scope for [`data-inventory.md`](./data-inventory.md) (persisted fields only).
- **Tasks: ✔** — Owning task [`mvp.08-persistence.27-undo-soft-delete`](../../tasks/mvp/08-persistence/27-undo-soft-delete.md) reads this doc first, declares all four commands as acceptance criteria, and matches the 5000 ms TTL.

## ⚠ Issues

- **`OVERWRITE_SAVE_SLOT` and `REQUEST_DELETE_SAVE_SLOT` are not registered in [`screen-command-coverage.json`](./screen-command-coverage.json).** The coverage file registers `DELETE_SAVE_SLOT`, `UNDO_LAST_DESTRUCTIVE`, `EXPIRE_LAST_DESTRUCTIVE`, and `RESTORE_OVERWRITTEN_SAVE`, but the screen-55 interactions table and this doc dispatch `OVERWRITE_SAVE_SLOT` (and route Delete via `REQUEST_DELETE_SAVE_SLOT`). Per CLAUDE.md ("Screen interaction tokens are checked by `screen-command-coverage.json` and `npm run validate:commands`"), one of: (a) the coverage file gains owner rows for these two tokens (owner: `mvp.08-persistence.27-undo-soft-delete` for `OVERWRITE_SAVE_SLOT`; `mvp.07-ui-shell.*` or the save-load task for `REQUEST_DELETE_SAVE_SLOT`), (b) the schema enum adds them, or (c) the tokens are aliased. Flagged rather than rewritten because the fix lives in a cross-checked file (Hard Prohibition D).
