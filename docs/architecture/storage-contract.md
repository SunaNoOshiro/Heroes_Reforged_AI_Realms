# Storage & File-Picker Contract

> Companion to [`persistence.md`](./persistence.md) and
> [`permissions.md`](./permissions.md). Plan 23 / Q442 introduces the
> file-picker rules; this document is the canonical home for both
> storage transport pinning (IndexedDB primary, OPFS optional) and the
> closed list of file-picker invocations.

## 1. Storage Transport

| Use case                       | Primary medium       | Notes                                 |
|--------------------------------|----------------------|---------------------------------------|
| Saves, profile, packs, audit   | IndexedDB            | per [`persistence.md`](./persistence.md) |
| User-initiated save export     | File System Access   | optional; user-driven only            |
| Optional large-blob workspace  | OPFS                 | optional; never replaces IndexedDB    |
| Auth tokens                    | (forbidden until Plan 25) | see [`persistence.md`](./persistence.md) |

OPFS is opt-in. Code that lives behind a JIT rationale per
[`permissions.md`](./permissions.md). When OPFS is unavailable, the
flow falls back to IndexedDB without surfacing an error to the user.

## 2. File-Picker Rules (plan 23 / Q442)

All file pickers in the app are restricted to the closed list below.
Every entry pins explicit MIME types and bans the
`Allow All Files` escape hatch.

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

Owned by [`70-save-import`](./wiki/screens/70-save-import/) and
plan 20.

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

Owned by [`71-pack-manager`](./wiki/screens/71-pack-manager/) and
plan 20.

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

The following patterns are forbidden in `src/` and gated by CI:

- `<input type="file" webkitdirectory>` — exposes a directory tree.
- `showDirectoryPicker()` — exposes arbitrary user content.
- `showOpenFilePicker({ … })` calls **without** `excludeAcceptAllOption: true`.
- `showOpenFilePicker({ … })` calls **without** an explicit `types[]` array.
- File-picker invocations from non-user-gesture handlers (mount,
  effect, timer, network reply, etc.).

CI enforcement lives alongside the existing JSX safe-text lint
(`tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md`).

## 4. Cross-References

- [`persistence.md`](./persistence.md) — per-slice storage mapping.
- [`permissions.md`](./permissions.md) — JIT rationale rule for any
  permission-bearing call.
- [`pack-trust.md`](./pack-trust.md) — what happens after the picker
  hands back a file (size, ratio, schema, quarantine).
