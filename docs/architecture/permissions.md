# OS / Browser Permissions

> Closed allowlist of the browser / OS APIs the app may use. Adding
> any API not on this list requires an architecture amendment PR
> that updates this file AND adds a row in
> [`data-inventory.md`](./data-inventory.md) if the API can produce
> persisted data.

Companion docs:
[`persistence.md`](./persistence.md) (storage media derived from
this allowlist),
[`data-inventory.md`](./data-inventory.md) (per-field inventory of
what the allowed APIs persist),
[`ugc-safety.md`](./ugc-safety.md) (decoder / validator constraints
layered on top of allowed APIs),
[`runtime-requirements.md`](./runtime-requirements.md) (runtime
preconditions intersecting this allowlist),
[`error-ux.md`](./error-ux.md) (banner surface used by the
degradation matrix).

## 1. Allowlist

| API | Status | Purpose | Justification |
|-----|--------|---------|---------------|
| WebRTC `RTCDataChannel` | allowed | gameplay command transport | sole multiplayer transport; no media tracks |
| WebRTC ICE / STUN / TURN | allowed | NAT traversal | required by DataChannel |
| `IndexedDB` | allowed | persistence | per [`persistence.md`](./persistence.md) |
| `File System Access API` | allowed (optional desktop) | save export only | user-initiated; never background |
| `Clipboard read/write` | allowed | save-link share, content-report screenshot ref | user-gesture-only; no background read |
| `WebCrypto` | allowed | salt / hashing / future tokens | non-extractable keys |
| `Canvas` / `WebGL2` | allowed | renderer | rendering only; never reads CORS-tainted images |
| `HTMLCanvasElement.toBlob` | allowed | screenshot for content reports | user-initiated only |
| `Web Workers` | allowed | gameplay-AI workers, decoders | per [`ai-contract.md`](./ai-contract.md) and [`ugc-safety.md`](./ugc-safety.md) |
| `createImageBitmap` | allowed | image decode off-thread | required by [`ugc-safety.md` § Binary Asset Validators](./ugc-safety.md#binary-asset-validators) |
| `AudioContext.decodeAudioData` | allowed | audio decode | required by [`ugc-safety.md` § Binary Asset Validators](./ugc-safety.md#binary-asset-validators) |
| `Notification API` | deferred | n/a until amendment | requires architecture amendment |
| `Microphone` / `Camera` | deferred (voice chat out of MVP) | n/a until amendment | requires architecture amendment |
| `Geolocation` | forbidden | not used | banned indefinitely |
| `Contacts API` | forbidden | not used | banned indefinitely |
| `Bluetooth` / `Serial` / `USB` / `HID` | forbidden | not used | banned indefinitely |
| `localStorage` | forbidden | n/a | per [`persistence.md` § localStorage Ban](./persistence.md#2-localstorage-ban) |
| `document.cookie` (read/write from JS) | forbidden | n/a | per [`persistence.md` § Cookies](./persistence.md#3-cookies) |

`allowed` = usable today under the per-row constraint.
`deferred` = on the roadmap; an architecture amendment + new row
must land before any `src/` usage.
`forbidden` = banned indefinitely; CI lint (§ 4) blocks invocations.

## 2. Permission-Request Policy

Permission requests fire on **explicit user gesture** only — never
on session start, never on screen mount.

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

Every call site for `navigator.permissions.request`,
`Notification.requestPermission`, `navigator.storage.persist`,
`showOpenFilePicker`, `showSaveFilePicker`, and any future
`getUserMedia` MUST first dispatch
[`REQUEST_PERMISSION_RATIONALE`](./command-schema.md) (`local-ui`).
CI lint (§ 4) enforces this by refusing raw API invocations that
skip the rationale-helper import.

### Rationale Copy Convention

Localization keys per prompt-bearing scope:

- `permission.<scope>.prompt` — short title rendered above the OS prompt.
- `permission.<scope>.rationale` — body of the in-app pre-prompt.
- `permission.<scope>.deniedFallback` — body shown after a denial,
  explaining the degradation path.

Required scopes today: `storage`, `notifications`, `clipboardWrite`.
Add a row in this document and the localization namespace before
introducing a new scope.

### Degradation Matrix

| Scope             | Denied → Behavior                                                                  |
|-------------------|------------------------------------------------------------------------------------|
| `storage.persist` | session-only mode; persistent banner via [`error-ux.md`](./error-ux.md)            |
| `notifications`   | feature off, no error                                                              |
| `clipboardWrite`  | inline copy textarea fallback                                                      |
| `clipboardRead`   | feature off, no error                                                              |
| any other         | feature off, link to settings                                                      |

A denied permission MUST never break the screen; the surface
gracefully degrades and the rationale modal cites
`permission.<scope>.deniedFallback`.

## 3. Crash Reporting

Crash dumps live in-memory only at v1 and are exported only via a
user-initiated download. The redaction baseline lives in
[`data-inventory.md` § 4 Crash Dumps](./data-inventory.md#4-crash-dumps).
No crash dump leaves the device until a future architecture
amendment declares a network upload destination.

## 4. CI Enforcement

A lint rule scans `src/` for direct invocations of any forbidden API
(see § 1) and fails on any match outside an explicit allowlist.
Adding a new permitted API requires:

1. A row in § 1 of this document.
2. A row in [`data-inventory.md`](./data-inventory.md) if the API
   produces persisted data.
3. A privacy-pane disclosure on
   [`56-options`](./wiki/screens/56-options/) (the `PrivacyPane`
   inside the `Privacy` tab) if the API can correlate to a single
   device or session.

## 5. Cross-References

- [`docs/architecture/persistence.md`](./persistence.md) — concrete
  storage media derived from this allowlist.
- [`docs/architecture/data-inventory.md`](./data-inventory.md) —
  per-field inventory of what those APIs persist.
- [`docs/architecture/ugc-safety.md`](./ugc-safety.md) — decoder /
  validator constraints layered on top of the allowed APIs.
- [`docs/architecture/runtime-requirements.md`](./runtime-requirements.md)
  — runtime preconditions intersect with this allowlist.
- [`docs/architecture/command-schema.md`](./command-schema.md) —
  defines `REQUEST_PERMISSION_RATIONALE` (`local-ui`) referenced in
  § 2.

---

## 🔍 Sync Check

- **UI: ✔** — Privacy-pane disclosure cite resolves to
  [`56-options/spec.md`](./wiki/screens/56-options/spec.md), which
  declares `PrivacyPane` (incl. `ConsentRowList`, `AgeGateRow`,
  `ConsentHistoryPanel`) and `PrivacyDisclosureModal` inside a
  `Privacy` tab.
- **Schema: ✔ (n/a)** — Target references no schemas directly;
  registration of derived state slices (privacy options, consent,
  crash dump) lives in [`data-inventory.md`](./data-inventory.md)
  and [`schema-matrix.md`](./schema-matrix.md), both already
  populated.
- **Tasks: ⚠** — `command-schema.md` defines
  `REQUEST_PERMISSION_RATIONALE` and points back to this file's
  `#just-in-time-jit-rule` anchor (verified), but no entry in
  [`tasks/task-registry.json`](../../tasks/task-registry.json) names
  this file or owns the JIT rationale-helper / forbidden-API lint
  claimed in §§ 2 and 4. See `## ⚠ Issues`.

## ⚠ Issues

- **Missing owning task for the JIT rationale helper.** § 2
  asserts every call site for
  `navigator.permissions.request`, `Notification.requestPermission`,
  `navigator.storage.persist`, `showOpenFilePicker`,
  `showSaveFilePicker`, and future `getUserMedia` MUST go through a
  rationale helper that dispatches `REQUEST_PERMISSION_RATIONALE`,
  but no task in
  [`tasks/task-registry.json`](../../tasks/task-registry.json)
  registers this file in `Read First` or owns the helper module.
  Per CLAUDE.md ("Every described logic has a task"), a future task
  under `tasks/mvp/14-system/` (or the system-menu / options module)
  should add the helper, the call-site lint, and a
  `Read First: docs/architecture/permissions.md`. Suggested values:
  `Owned Paths` = `src/ui/permissions/requestPermissionRationale.ts`
  + the lint hook in `scripts/check-repo-contracts.mjs`;
  `Acceptance Criteria` includes a passing call-site grep and a
  failing-test demo for raw API invocation. Skill did not add the
  task itself (Hard Prohibition D — never edit cross-checked files).
- **Missing forbidden-API CI lint.** § 4 asserts a lint that scans
  `src/` for direct invocations of every forbidden row in § 1
  (`Geolocation`, `Bluetooth`/`Serial`/`USB`/`HID`, `Contacts`,
  `Notification` until amended, `localStorage`, `document.cookie`,
  raw `getUserMedia`). Grep across
  [`scripts/`](../../scripts/) finds no such check (only the
  `localStorage` / `document.cookie` ban from
  [`persistence.md`](./persistence.md) is implied by
  `tasks/mvp/02-content-schemas/25-safe-user-text-helper-and-jsx-lint.md`).
  Per CLAUDE.md root contract ("OS / browser API usage is bounded
  by `permissions.md`"), the same future task above should extend
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  to enumerate and fail on each forbidden symbol. Skill did not add
  the lint (Hard Prohibition D).
