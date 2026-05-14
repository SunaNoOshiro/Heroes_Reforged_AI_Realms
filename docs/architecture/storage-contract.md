# Storage & File-Picker Contract

> Canonical home for storage-transport pinning (IndexedDB primary,
> OPFS optional) and the closed list of file-picker invocations.

Companion docs:
- [`persistence.md`](./persistence.md) — per-slice storage mapping.
- [`permissions.md`](./permissions.md) — JIT rationale rule for any
  permission-bearing call (incl. `showOpenFilePicker`,
  `showSaveFilePicker`).
- [`pack-trust.md`](./pack-trust.md) — what happens after the picker
  hands back a file (size, ratio, schema, quarantine).
- [`command-schema.md`](./command-schema.md) — defines
  `INSTALL_PACK_FROM_FILE` and `REQUEST_PERMISSION_RATIONALE`.

## 1. Storage Transport

| Use case | Primary medium | Notes |
|---|---|---|
| Saves, profile, packs, audit | IndexedDB | per [`persistence.md`](./persistence.md) |
| User-initiated save export | File System Access | optional; user-driven only |
| Optional large-blob workspace | OPFS | optional; never replaces IndexedDB |
| Auth tokens | **forbidden at v1** | per [`persistence.md` § Token & Secret Storage](./persistence.md#5-token--secret-storage) |

OPFS is opt-in. Any call site lives behind a JIT rationale per
[`permissions.md`](./permissions.md), and falls back to IndexedDB
without surfacing an error when OPFS is unavailable.

## 2. File-Picker Rules

Every file-picker invocation in `src/` MUST come from the closed
list below. Each entry pins explicit MIME types and bans the
`Allow All Files` escape hatch via `excludeAcceptAllOption: true`.
Both `showOpenFilePicker` and `showSaveFilePicker` are
permission-bearing, so each call site MUST first dispatch
`REQUEST_PERMISSION_RATIONALE` per
[`permissions.md` § Just-In-Time (JIT) Rule](./permissions.md#just-in-time-jit-rule).

### Save Import

```ts
showOpenFilePicker({
  types: [{
    description: 'Heroes save',
    accept: { 'application/x-heroes-save': ['.heroessave'] }
  }],
  excludeAcceptAllOption: true,
  multiple: false
})
```

Owned by [`70-save-import`](./wiki/screens/70-save-import/);
dispatched from `OPEN_SAVE_IMPORT`.

### Pack Import

```ts
showOpenFilePicker({
  types: [{
    description: 'Heroes pack',
    accept: { 'application/zip': ['.heroespack', '.zip'] }
  }],
  excludeAcceptAllOption: true,
  multiple: false
})
```

Owned by [`71-pack-manager`](./wiki/screens/71-pack-manager/);
dispatched from `INSTALL_PACK_FROM_FILE`.

### Save Export

```ts
showSaveFilePicker({
  suggestedName: `<saveName>.heroessave`,
  types: [{
    description: 'Heroes save',
    accept: { 'application/x-heroes-save': ['.heroessave'] }
  }]
})
```

User-initiated only.

## 3. Banned Patterns

The following patterns are forbidden in `src/`:

- `<input type="file" webkitdirectory>` — exposes a directory tree.
- `showDirectoryPicker` — exposes arbitrary user content.
- `showOpenFilePicker({ … })` without `excludeAcceptAllOption: true`.
- `showOpenFilePicker({ … })` without an explicit `types[]` array.
- File-picker invocations from non-user-gesture handlers (mount,
  effect, timer, network reply, etc.).

A future CI lint should enforce these — see `## ⚠ Issues`. The
adjacent banned-storage-API lint at
[`tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md`](../../tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md)
is the natural co-location, but currently scopes only
`dangerouslySetInnerHTML`, `localStorage.setItem`, and
`document.cookie =`.

## 4. Cross-References

- [`persistence.md`](./persistence.md) — per-slice storage mapping.
- [`permissions.md`](./permissions.md) — JIT rationale rule for any
  permission-bearing call.
- [`pack-trust.md`](./pack-trust.md) — what happens after the picker
  hands back a file (size, ratio, schema, quarantine).
- [`command-schema.md`](./command-schema.md) —
  `INSTALL_PACK_FROM_FILE`, `REQUEST_PERMISSION_RATIONALE`.

---

## 🔍 Sync Check

- **UI: ✔** — Save Import owner
  [`70-save-import`](./wiki/screens/70-save-import/) and Pack Import
  owner [`71-pack-manager`](./wiki/screens/71-pack-manager/) resolve.
  Their `interactions.md` rows reference `OPEN_SAVE_IMPORT` and
  `INSTALL_PACK_FROM_FILE` and treat the file picker as a black box;
  the MIME / option pins live here by design (single source of truth).
- **Schema: ✔ (n/a)** — Target binds no schemas directly. The save
  payload format is owned by
  [`save.schema.json`](../../content-schema/schemas/save.schema.json)
  and the pack manifest by
  [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json),
  both per [`pack-trust.md`](./pack-trust.md).
- **Tasks: ⚠** —
  [`command-schema.md`](./command-schema.md) attributes
  `INSTALL_PACK_FROM_FILE` to
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  and the save-import flow to
  [`tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`](../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md);
  both tasks exist in
  [`tasks/task-registry.json`](../../tasks/task-registry.json).
  However, neither task lists this file in `Read First`, and no task
  owns the file-picker / OPFS lint claimed in §§ 2–3. See
  `## ⚠ Issues`.

## ⚠ Issues

- **Missing CI lint for the file-picker banned patterns.** § 3 lists
  five patterns it labels "forbidden in `src/`", but no script in
  [`scripts/`](../../scripts/) enforces them. The cited
  [`tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md`](../../tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md)
  scopes only `dangerouslySetInnerHTML`, `localStorage.setItem`, and
  `document.cookie =`. Per CLAUDE.md root contract ("OS / browser
  API usage is bounded by `permissions.md`"), a future task —
  suggested under `tasks/mvp/08-persistence/` next to the save-
  import / pack-manager owners — should add
  `scripts/lint-banned-file-pickers.mjs` enumerating the five
  patterns and wire it into `npm run validate`. Suggested
  acceptance criteria: zero-hit grep for `webkitdirectory`,
  `showDirectoryPicker`, `showOpenFilePicker(` calls missing
  `excludeAcceptAllOption: true` or `types`, and call-site call-
  graph check for non-user-gesture entry. Skill did not add the
  task or lint (Hard Prohibition D — never edit cross-checked
  files).
- **OPFS not on the `permissions.md` allowlist.** § 1 names OPFS as
  an allowed optional medium and the prose points at
  [`permissions.md`](./permissions.md) for the JIT rationale, but
  the [`permissions.md` § Allowlist](./permissions.md#1-allowlist)
  table lists no OPFS / `navigator.storage.getDirectory` row (only
  `IndexedDB` and `File System Access API`).
  [`runtime-requirements.md` § RR-05](./runtime-requirements.md#rr-05-storage--indexeddb--50-mb-opfs-preferred-when-present)
  treats OPFS as preferred when `navigator.storage.getDirectory`
  resolves, so the API is in load-bearing use. Per
  `permissions.md`'s own amendment policy ("Adding any API not on
  this list requires an architecture amendment PR that updates this
  file"), `permissions.md` § 1 should add an OPFS row. Skill did
  not edit `permissions.md` (Hard Prohibition D).
- **Save-import / pack-manager tasks do not list this file in
  `Read First`.** This file is the canonical home of the picker pins
  and the OPFS posture, but
  [`tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`](../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md)
  and
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  cite only `pack-trust.md` and the screen package. Implementers
  may miss the MIME pins. Both tasks should append
  `docs/architecture/storage-contract.md` to their `Read First`.
  Skill did not edit the tasks (Hard Prohibition D).
