# Desktop Sandboxing (pre-emptive)

> Source plan:
> [`docs/implementation-plans/31-trust-boundaries-and-logging-monitoring-plan.md`](../implementation-plans/31-trust-boundaries-and-logging-monitoring-plan.md).
> Cross-link: [`trust-boundaries.md`](./trust-boundaries.md) § 3
> ("Future desktop wrapper" row),
> [`pack-contract.md`](./pack-contract.md),
> [`asset-loading.md`](./asset-loading.md).

No desktop wrapper exists today. The repo runs in the browser. If
a Tauri or Electron build lands later, the rules below are
mandatory; they are pre-emptive so that the **day** a desktop
build is attempted, the file-system attack surface is already
scoped instead of being added under deadline pressure.

---

## 1. Wrapper choice

**Tauri** is the preferred wrapper. Reasons:
- Smaller attack surface than Electron (no embedded Node.js).
- Per-IPC-command allow-list at the Rust side prevents accidental
  exposure of the host filesystem.
- Smaller installer / lower memory footprint matches the project
  budget in
  [`non-functional-requirements.md`](./non-functional-requirements.md).

**Electron** is permitted as a fallback, with the constraints in
§ 3.

The wrapper choice is logged in
[`docs/planning/decision-log.md`](../planning/decision-log.md)
when made. This file does not lock it in absolutely.

---

## 2. Tauri rules

If Tauri ships, the build configuration must:

| Rule | Setting |
|---|---|
| Per-IPC allow-list | `tauri.conf.json → app.security.csp` set to the strict project CSP per [`csp.md`](./csp.md); `tauri.conf.json → tauri.allowlist.fs.scope` limited to the app config dir + user-chosen file pickers (no wildcard, no parent-dir traversal). |
| HTTP allow-list | `tauri.allowlist.http.scope` limited to the AI gateway and signaling endpoints; no wildcard. |
| Update channel | Code-signed, pinned by public key. The signing key custody flow follows [`pack-signing-key.md`](../operations/pack-signing-key.md). |
| Window resize | Disabled by default unless [`screen-scaling.md`](./screen-scaling.md) breakpoint logic is applied; never expose `set-resizable: true` without the breakpoint shim. |

Rationale: Tauri's default file-system access is broader than
the browser's; the `fs.scope` rule is the only thing that
prevents a compromised pack handler from reading
`~/.ssh/id_rsa`.

---

## 3. Electron rules (fallback)

If Electron is selected, the `BrowserWindow` constructor MUST
pin:

| Setting | Value | Rationale |
|---|---|---|
| `webPreferences.sandbox` | `true` | Renderer runs in a Chromium sandbox; no Node access. |
| `webPreferences.contextIsolation` | `true` | World separation between preload and content. |
| `webPreferences.nodeIntegration` | `false` | No `require()` from renderer. |
| `webPreferences.nodeIntegrationInWorker` | `false` | No `require()` from worker. |
| `webPreferences.webSecurity` | `true` | Same-origin enforcement. |
| `app.allowRendererProcessReuse` | `true` (default) | Smaller surface across navigations. |

A preload script may expose a typed RPC surface via
`contextBridge.exposeInMainWorld`; the surface is closed by name
(no `**/*` wildcards) and validates every argument against the
[`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json)
shape before forwarding.

---

## 4. ZIP extraction

Both wrappers MUST sanitize ZIP archive paths against `../`
traversal per [plan 28](../implementation-plans/28-asset-loading-and-sandboxing-plan.md).
A traversal attempt fires
`SecurityEvent.pack_traversal_attempt` and aborts the load.

The extraction code path is:
1. Open the archive with a streaming reader (no full extraction
   to a temp dir).
2. For each entry, normalize the path; if it contains `..`,
   `~`, or an absolute prefix, reject the archive.
3. Refuse symlink entries entirely.
4. Cap per-entry size + total uncompressed size before any byte
   is written.

---

## 5. Permissions

The desktop wrapper does not gain new OS APIs without an
amendment to [`permissions.md`](./permissions.md). If a future
wrapper needs (e.g.) the camera or the system tray, a row lands
in `permissions.md` first; the wrapper-side allow-list mirrors
it.

---

## 6. Distribution surface

Public binaries are signed with the maintainer's distribution
key (separate custody from the pack-signing key). Custody +
rotation follow the existing pack-signing flow per
[`pack-signing-key.md`](../operations/pack-signing-key.md), with
a parallel section that lands when the first binary releases.
