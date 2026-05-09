# Persistence

> Closed allowlist of storage media. Per-slice mapping. The `localStorage`
> ban predates the auth surface so the first auth implementer cannot
> default to it.

## 1. Per-Slice Mapping

| Slice | Medium | DB / Object store | Async | Quota |
|-------|--------|-------------------|-------|-------|
| Saves (`save.schema.json` blobs) | IndexedDB | `hr-saves.slots` | yes | per-origin browser quota |
| Profile (high-scores, achievements) | IndexedDB | `hr-profile.profile` | yes | small (<1 MiB) |
| Privacy options | IndexedDB | `hr-profile.privacy` | yes | small |
| Consent records (`consent.schema.json`) | IndexedDB | `hr-profile.consent` | yes | small |
| Consent + privacy audit log | IndexedDB | `hr-profile.audit` | yes | small (capped ring buffers) |
| Known peers (`peer-allowlist.schema.json`) | IndexedDB | `hr-profile.knownPeers` | yes | small (LRU 256) |
| UI options (volume, language, hotkeys, age gate) | IndexedDB | `hr-profile.options` | yes | small |
| Local salt (raw bytes) | IndexedDB | `hr-profile.keys` | yes | tiny |
| Outbound content reports | IndexedDB | `hr-profile.reports` | yes | small |
| Pack store (`.hrmod` bytes + extracted records) | IndexedDB + (optional) FS-Access | `hr-packs.packs` | yes | large |
| Trust store | IndexedDB | `hr-trust.decisions` | yes | small |
| Lobby chat | in-memory only | n/a | n/a | n/a |
| Crash dumps | in-memory only at v1 | n/a | n/a | n/a |
| Auth tokens | **forbidden at v1** | n/a | n/a | n/a |

The four IndexedDB databases are: `hr-saves`, `hr-profile`,
`hr-packs`, `hr-trust`. Each store name is a stable ID; renaming a
store requires a migration entry under
[`tasks/mvp/02-content-schemas/23-schema-migration-policy-and-example.md`](../../tasks/mvp/02-content-schemas/23-schema-migration-policy-and-example.md).

## 2. localStorage Ban

`localStorage` is **banned for any slice in the table above**. It is
reserved only for **non-sensitive UI state** that does not need async
access (currently: zero rows).

- High-tier slices (per [`data-inventory.md`](./data-inventory.md))
  MAY NEVER use `localStorage`.
- Medium-tier slices MAY NOT use `localStorage`; the async cost is
  acceptable.
- Low-tier slices MAY NOT use `localStorage` either; the unified
  `WIPE_LOCAL_DATA` handler depends on a single backend.

CI gate: a lint rule (under
`tasks/mvp/02-content-schemas/25-safe-user-text-helper-and-jsx-lint.md`)
scans `src/` for `localStorage.setItem` and `document.cookie =` and
fails on any match outside an explicit allowlist (currently empty).

## 3. Cookies

Cookies are banned client-side. Future signed-in flows will
use HTTP-only cookies set by the signaling server, unreadable from
JS. Reading or writing `document.cookie` from any module under `src/`
is a CI failure.

## 4. File System Access API

`FS-Access` is optional (Electron-style desktop wrappers may use it
for save export); when used, it is **always alongside** IndexedDB,
never replacing it, so browser-only installs work.

User-initiated only. Never used to silently mirror state to disk.

## 5. Token & Secret Storage

`localStorage` is forbidden for any token, secret, or key. This rule
predates the auth surface.

Permitted future patterns (when an auth surface lands):

- HTTP-only cookies set by the signaling server (the auth boundary
  lives server-side).
- Non-extractable WebCrypto `CryptoKey` instances stored in
  IndexedDB (the key is opaque to JS and survives reload).

WebRTC TURN credentials are short-lived and ephemeral by design;
never persisted.

The local salt declared by [`data-inventory.md`](./data-inventory.md)
is non-sensitive outside the device threat model and lives in
IndexedDB `hr-profile.keys`. It is regenerated on `WIPE_LOCAL_DATA
scope=profile|all`.

## 6. Analytics

No analytics SDK is loaded at v1. Any future SDK is **gated behind
`state.privacy.options.analyticsOptIn`** with no network calls before
opt-in. The opt-in toggle in screen 56 (Privacy pane) is the only
switch. The "Reset analytics ID" affordance lives in screen 56
alongside the toggle.

## 7. Migration

Object-store names are stable IDs. Renaming any store requires a
migration entry registered with the migration registry from
[`tasks/mvp/08-persistence/08-migration-registry.md`](../../tasks/mvp/08-persistence/08-migration-registry.md).
The save-schema migration policy in
[`tasks/mvp/02-content-schemas/23-schema-migration-policy-and-example.md`](../../tasks/mvp/02-content-schemas/23-schema-migration-policy-and-example.md)
is the canonical pattern.

## 8. Cross-References

- [`docs/architecture/data-inventory.md`](./data-inventory.md) — per-field
  inventory; this document owns the medium choice, the inventory owns
  what each store contains.
- [`docs/architecture/permissions.md`](./permissions.md) — `IndexedDB`
  is on the allowlist; no other persistent medium is.
- [`docs/architecture/ugc-safety.md`](./ugc-safety.md) — UGC text and
  binary validators run **before** any persistence write.
- [`docs/architecture/diagrams/24-save-flow.md`](./diagrams/24-save-flow.md)
  — save composition; the "Write to disk" step resolves to
  IndexedDB store `hr-saves.slots`.
