# Desktop Sandboxing (pre-emptive)

No desktop wrapper exists today; the repo runs in the browser. The
rules below are pre-emptive — the **day** a Tauri or Electron build
is attempted, the file-system attack surface is already scoped
instead of being added under deadline pressure.

Companion docs:
- [`trust-boundaries.md` § 3](./trust-boundaries.md#3-per-component-matrix)
  — `Future desktop wrapper → OS filesystem` row in the
  per-component matrix.
- [`pack-contract.md`](./pack-contract.md) — pack archive shape
  this doc protects.
- [`asset-loading.md`](./asset-loading.md) — canonical ZIP /
  traversal rules referenced by § 4.
- [`csp.md`](./csp.md) — strict project CSP the wrapper inherits.
- [`permissions.md`](./permissions.md) — OS-API allow-list.
- [`screen-scaling.md`](./screen-scaling.md) — breakpoint shim
  required before exposing window resize.
- [`non-functional-requirements.md`](./non-functional-requirements.md)
  — installer / memory budgets that motivate the wrapper choice.
- [`pack-signing-key.md`](../operations/pack-signing-key.md) —
  custody / rotation flow reused by the distribution-signing key.

---

## 1. Wrapper choice

**Tauri** is preferred:
- Smaller attack surface than Electron (no embedded Node.js).
- Per-IPC-command allow-list at the Rust side prevents accidental
  exposure of the host filesystem.
- Smaller installer / lower memory footprint matches the budget in
  [`non-functional-requirements.md`](./non-functional-requirements.md).

**Electron** is a permitted fallback under the constraints in § 3.

The chosen wrapper is logged in
[`docs/planning/decision-log.md`](../planning/decision-log.md) when
the decision is made; this file does not lock it in absolutely.

---

## 2. Tauri rules

If Tauri ships, the build configuration MUST set:

| Key | Value | Why |
|---|---|---|
| `tauri.conf.json → app.security.csp` | the strict project CSP per [`csp.md`](./csp.md). | inherits the deny-by-default browser layer. |
| `tauri.allowlist.fs.scope` | app config dir + user-chosen file-picker results only; no wildcard, no parent-dir traversal. | Tauri's default file-system access is broader than the browser's; this scope is the only thing that prevents a compromised pack handler from reading `~/.ssh/id_rsa`. |
| `tauri.allowlist.http.scope` | AI gateway + signaling endpoints only; no wildcard. | bounds outbound traffic to declared zones. |
| Update channel | code-signed, pinned by public key; custody per [`pack-signing-key.md`](../operations/pack-signing-key.md). | prevents binary swaps in transit. |
| Window resize | disabled by default; never expose `set-resizable: true` without the [`screen-scaling.md`](./screen-scaling.md) breakpoint shim. | breakpoint logic is a hard precondition for resize. |

---

## 3. Electron rules (fallback)

If Electron is selected, the `BrowserWindow` constructor MUST pin:

| Setting | Value | Why |
|---|---|---|
| `webPreferences.sandbox` | `true` | renderer runs in the Chromium sandbox; no Node access. |
| `webPreferences.contextIsolation` | `true` | world separation between preload and content. |
| `webPreferences.nodeIntegration` | `false` | no `require()` from renderer. |
| `webPreferences.nodeIntegrationInWorker` | `false` | no `require()` from worker. |
| `webPreferences.webSecurity` | `true` | same-origin enforcement. |
| `app.allowRendererProcessReuse` | `true` (default) | smaller surface across navigations. |

A preload script may expose a typed RPC surface via
`contextBridge.exposeInMainWorld`. The surface is closed by name
(no `**/*` wildcards) and validates every argument against the
[`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json)
shape before forwarding.

---

## 4. ZIP extraction

Both wrappers MUST sanitize ZIP archive paths against `../`
traversal per [`asset-loading.md`](./asset-loading.md). A traversal
attempt fires `SecurityEvent.pack_traversal_attempt` (defined in
[`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json))
and aborts the load.

Extraction pipeline:
1. Open the archive with a streaming reader; no full extraction to
   a temp dir.
2. For each entry, normalize the path; if it contains `..`, `~`,
   or an absolute prefix, reject the archive.
3. Refuse symlink entries entirely.
4. Cap per-entry size and total uncompressed size before any byte
   is written.

---

## 5. Permissions

The desktop wrapper does not gain new OS APIs without an amendment
to [`permissions.md`](./permissions.md). If a future wrapper needs
(e.g.) the camera or the system tray, a row lands in
`permissions.md` first; the wrapper-side allow-list mirrors it.

---

## 6. Distribution surface

Public binaries are signed with the maintainer's distribution key
(separate custody from the pack-signing key). Custody and rotation
follow the existing flow per
[`pack-signing-key.md`](../operations/pack-signing-key.md); a
parallel section lands in that doc when the first binary releases.

---

## 🔍 Sync Check

- **UI: ✔** — Build / runtime contract only; no UI surfaces are claimed by this doc.
- **Schema: ✔** — `SecurityEvent.pack_traversal_attempt` is registered in [`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json) and snapshotted in `content-schema/enums.snapshot.json`. The preload-RPC validator references [`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json), which exists.
- **Tasks: ✔** — Pre-emptive doc by design; no owning task is expected today. Inbound reference from [`trust-boundaries.md` § 3](./trust-boundaries.md#3-per-component-matrix) `Future desktop wrapper` row resolves; no orphan tasks point here.

## ⚠ Issues

_None._
