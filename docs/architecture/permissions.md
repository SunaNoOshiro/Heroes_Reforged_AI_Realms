# OS / Browser Permissions

> Closed allowlist of the browser / OS APIs the app may use. Adding
> any API not on this list requires an architecture amendment PR
> that updates this file AND adds a row in
> [`data-inventory.md`](./data-inventory.md) if the API can produce
> persisted data.

## 1. Allowlist

| API | Purpose | Justification |
|-----|---------|---------------|
| WebRTC `RTCDataChannel` | gameplay command transport | sole multiplayer transport; no media tracks |
| WebRTC ICE / STUN / TURN | NAT traversal | required by DataChannel |
| `IndexedDB` | persistence | per [`persistence.md`](./persistence.md) |
| `File System Access API` | save export only (optional desktop) | user-initiated; never background |
| `Clipboard read/write` | save-link share, content-report screenshot ref | user-gesture-only; no background read |
| `WebCrypto` | salt / hashing / future tokens | non-extractable keys |
| `Canvas` / `WebGL2` | renderer | rendering only; never reads CORS-tainted images |
| `HTMLCanvasElement.toBlob` | screenshot for content reports | user-initiated only |
| `Web Workers` | gameplay-AI workers, decoders | per [`ai-contract.md`](./ai-contract.md) and [`ugc-safety.md`](./ugc-safety.md) |
| `createImageBitmap` | image decode-off-thread | required by [`ugc-safety.md` § Binary Asset Validators](./ugc-safety.md#binary-asset-validators) |
| `AudioContext.decodeAudioData` | audio decode | required by [`ugc-safety.md` § Binary Asset Validators](./ugc-safety.md#binary-asset-validators) |
| `Notification API` | (deferred) | requires architecture amendment |
| `Microphone` / `Camera` | (deferred; voice chat out of MVP) | requires architecture amendment |
| `Geolocation` | forbidden | not used; banned indefinitely |
| `Contacts API` | forbidden | not used; banned indefinitely |
| `Bluetooth` / `Serial` / `USB` / `HID` | forbidden | not used; banned indefinitely |
| `localStorage` | forbidden | per [`persistence.md`](./persistence.md) § localStorage Ban |
| `document.cookie` (read/write from JS) | forbidden | per [`persistence.md`](./persistence.md) § Cookies |

## 2. Permission-Request Policy

Permission requests fire on **explicit user gesture** only — never on
session start, never on screen mount.

- Clipboard read/write requires a click or keyboard shortcut on a UI
  affordance that explicitly names the target.
- File-System-Access save export requires the user to pick a
  destination via the OS picker.
- Future microphone / camera (deferred) MUST display a localized
  pre-prompt before the OS prompt.

### Just-In-Time (JIT) Rule

Every native browser permission prompt MUST be preceded by an in-app
rationale modal whose copy comes from the localization namespace
`permission.<scope>.rationale`. The rationale modal explains:

1. What the app is about to ask the OS for.
2. What the app does with the result.
3. What the app **falls back to** if the user denies (per the
   degradation matrix below).

Concretely, every call site for `navigator.permissions.request`,
`Notification.requestPermission`, `navigator.storage.persist`,
`showOpenFilePicker`, `showSaveFilePicker`, and any future
`getUserMedia` MUST first dispatch a `REQUEST_PERMISSION_RATIONALE`
modal. CI enforces this by linting for raw API invocations and
demanding the rationale-helper import.

### Rationale Copy Convention

Localization keys for each prompt-bearing scope:

- `permission.<scope>.prompt` — short title rendered above the OS prompt.
- `permission.<scope>.rationale` — body of the in-app pre-prompt.
- `permission.<scope>.deniedFallback` — body shown after a denial,
  explaining the degradation path.

Required scopes today: `storage`, `notifications`, `clipboardWrite`.
Add a row in this document and the localization namespace before
introducing a new scope.

### Degradation Matrix

| Scope             | Denied → Behavior                                      |
|-------------------|--------------------------------------------------------|
| `storage.persist` | session-only mode; persistent banner via `error-ux.md` |
| `notifications`   | feature off, no error                                  |
| `clipboardWrite`  | inline copy textarea fallback                          |
| `clipboardRead`   | feature off, no error                                  |
| any other         | feature off, link to settings                          |

A denied permission must never break the screen; the surface gracefully
degrades and the rationale modal cites
`permission.<scope>.deniedFallback`.

## 3. Crash Reporting

Crash dumps live in-memory only at v1 and are exported only via a
user-initiated download. The redaction baseline lives in
[`data-inventory.md` § 4 Crash Dumps](./data-inventory.md#4-crash-dumps).
No crash dump leaves the device until a future architecture
amendment declares a network upload destination.

## 4. CI Enforcement

A lint rule scans `src/` for direct invocations of any forbidden API
(see the table above) and fails on any match outside an explicit
allowlist. Adding a new permitted API requires:

1. A row in this document.
2. A row in [`data-inventory.md`](./data-inventory.md) if the API
   produces persisted data.
3. A privacy-pane disclosure on screen 56 if the API can correlate
   to a single device or session.

## 5. Cross-References

- [`docs/architecture/persistence.md`](./persistence.md) — concrete
  storage media derived from this allowlist.
- [`docs/architecture/data-inventory.md`](./data-inventory.md) — per-field
  inventory of what those APIs persist.
- [`docs/architecture/ugc-safety.md`](./ugc-safety.md) — decoder /
  validator constraints layered on top of the allowed APIs.
- [`docs/architecture/runtime-requirements.md`](./runtime-requirements.md)
  — runtime preconditions intersect with this allowlist.
