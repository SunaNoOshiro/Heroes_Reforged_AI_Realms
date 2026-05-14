# Onboarding & Consent

> Companion to [`privacy.md`](./privacy.md), [`age-gate.md`](./age-gate.md),
> [`new-install-defaults.md`](./new-install-defaults.md), and
> [`permissions.md`](./permissions.md). Surfaced by screen
> [`76-onboarding-consent`](./wiki/screens/76-onboarding-consent/),
> the Privacy tab in [`56-options`](./wiki/screens/56-options/), and the
> [`30-onboarding-consent`](./diagrams/30-onboarding-consent.md) diagram.

## 1. Policy Version

```text
policyVersion = 1
```

The runtime, the on-device consent store, and every persisted
[`consent.schema.json`](../../content-schema/schemas/consent.schema.json)
record carry this integer. A bump invalidates every `state === 'granted'`
record for the affected scopes and re-routes the user through
`76-onboarding-consent` at the next reachable boundary.

## 2. Consent Scopes

```text
ConsentScope ::=
    storage         (tier: required)
  | multiplayer     (tier: optional)
  | aiGeneration    (tier: optional)
  | telemetry       (tier: optional)
  | crashReports    (tier: optional)
  | analytics       (tier: optional)
  | unsignedPacks   (tier: optional, method: session)
```

Each scope must be captured before its gated surface activates:

| Scope          | Gated surface                                                            |
|----------------|--------------------------------------------------------------------------|
| `storage`      | first IndexedDB write (saves, profile, audit). Required.                 |
| `multiplayer`  | first WebRTC `RTCPeerConnection` / WebSocket signal (IP exposure).       |
| `aiGeneration` | first AI gateway call (off-device prompt transmission).                  |
| `telemetry`    | first metrics-sink emission (off by default).                            |
| `crashReports` | first crash-report upload (off by default).                              |
| `analytics`    | first analytics SDK init (no SDK ships at v1; toggle declares default).  |
| `unsignedPacks`| per-lobby ack when any pack in the session is unsigned.                  |

## 3. Onboarding Flow

**Trigger.** The first reachable action on `01-main-menu` checks
`state.profile.consent.storage.state`. If `unset`, the screen router
navigates to
[`76-onboarding-consent`](./wiki/screens/76-onboarding-consent/).

**Steps.** One screen, three sequential rows:

1. **Age gate** — written to `config.player.ageGate`, **not** under
   consent. See [`age-gate.md`](./age-gate.md).
2. **Required tier** — `storage` row, pre-accepted with explanation.
3. **Optional tier** — one row per optional scope, default OFF.
   Disclosures attached:
   - `multiplayer` — IP-exposure disclosure.
   - `aiGeneration` — off-device prompt-transmission disclosure.
   - `telemetry` / `crashReports` / `analytics` — "off by default —
     never read without your consent".

**On `Continue`.** Dispatches, in order:

- `GRANT_CONSENT(scope)` for every accepted toggle.
- `RECORD_CONSENT_AUDIT(scope, fromState, toState, policyVersion,
  method='explicit')` for every transition.

`unset → denied` is recorded when the user explicitly leaves an
optional row off; this distinguishes "didn't read the row" from
"read and declined".

**Output selector.** After `Continue`, every guarded surface routes
through one canonical selector:

```text
selectFeatureAvailability(scope, ageGate, consent)
  // closed AND of the age-gate matrix and consent.scope.state === 'granted'
```

Surfaces consume this selector — they never re-derive the predicate.

## 4. Re-Prompting

The runtime re-prompts a scope when **any** of the following holds:

- `consent.<scope>.state === 'unset'` and the gated surface is being entered.
- `consent.<scope>.policyVersion < onboarding.policyVersion`.
- the user revoked the scope from the Privacy tab and is now reaching the gated surface.

A re-prompt opens the same `76-onboarding-consent` screen focused on
the single triggering scope. `Cancel` returns to the caller; the
gated action is **not** retried automatically.

## 5. Storage

| Slice                                | Schema                                                                                       | Notes                                |
|--------------------------------------|----------------------------------------------------------------------------------------------|--------------------------------------|
| `state.profile.consent.<scope>`      | [`consent.schema.json`](../../content-schema/schemas/consent.schema.json)                    | One record per scope.                |
| `state.profile.consentAuditLog`      | [`consent-audit-log.schema.json`](../../content-schema/schemas/consent-audit-log.schema.json) | Capped ring buffer (default 256).    |
| `config.player.ageGate`              | inline enum (see [`age-gate.md`](./age-gate.md))                                             | Not under consent.                   |

All three slices are wiped by `WIPE_LOCAL_DATA scope=profile|all` per
[`data-inventory.md`](./data-inventory.md).

## 6. Save Imports

Exported saves embed `ConsentSnapshot` (see
[`consent.schema.json#/$defs/ConsentSnapshot`](../../content-schema/schemas/consent.schema.json)).
On import, the runtime dispatches `IMPORT_CONSENT_SNAPSHOT(snapshot)`,
which routes the user through `76-onboarding-consent` with the
snapshot pre-filled and `method: 'import'`.

Imports never auto-grant consent; the user must confirm each row on
this device.

---

## 🔍 Sync Check

- **UI: ✔** — Screen package
  [`76-onboarding-consent`](./wiki/screens/76-onboarding-consent/)
  matches: tiered rows (`AgeGateRow`, `RequiredTierGroup` for
  `storage`, `OptionalTierGroup` for `multiplayer` / `aiGeneration` /
  `telemetry` / `crashReports` / `analytics`) per
  [`spec.md`](./wiki/screens/76-onboarding-consent/spec.md), and the
  re-prompt cases (`unset` / stale `policyVersion` / Privacy-tab
  revoke / `IMPORT_CONSENT_SNAPSHOT`) per
  [`interactions.md`](./wiki/screens/76-onboarding-consent/interactions.md).
- **Schema: ✔** —
  [`consent.schema.json`](../../content-schema/schemas/consent.schema.json)
  `ConsentScope` enum (`storage | multiplayer | aiGeneration |
  telemetry | crashReports | analytics | unsignedPacks`) and
  [`consent-audit-log.schema.json`](../../content-schema/schemas/consent-audit-log.schema.json)
  capacity default `256` align with §§ 2 and 5; both rows are
  registered in [`schema-matrix.md`](./schema-matrix.md) (`Consent`,
  `ConsentAuditLog`). All three storage slices have rows in
  [`data-inventory.md`](./data-inventory.md) (`consent records`,
  `consent audit log`, `age gate`).
- **Tasks: ✔** — Owning runtime task
  [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md)
  lists this doc in *Read First* and pins the `policyVersion`
  constant to it; schema task
  [`mvp.02-content-schemas.42-consent-and-peer-allowlist-schemas`](../../tasks/mvp/02-content-schemas/42-consent-and-peer-allowlist-schemas.md)
  also reads it. Commands `GRANT_CONSENT`, `RECORD_CONSENT_AUDIT`,
  `REQUEST_CONSENT_PROMPT`, `IMPORT_CONSENT_SNAPSHOT`,
  `CANCEL_CONSENT_PROMPT`, and `WIPE_LOCAL_DATA` are defined in
  [`command-schema.md`](./command-schema.md).

## ⚠ Issues

- **No command writes `consent[scope].state = 'denied'` for an
  explicit user decline.** § 3 of this doc records `unset → denied`
  in the audit log when the user explicitly leaves an optional row
  off, but [`command-schema.md`](./command-schema.md) defines only
  `GRANT_CONSENT` (writes `'granted'`) and `REVOKE_CONSENT` (writes
  `'revoked'`) — there is no command that writes the `'denied'`
  state to `state.profile.consent[scope]`.
  [`76-onboarding-consent/interactions.md`](./wiki/screens/76-onboarding-consent/interactions.md)
  binds the `Decline optional` action to `REVOKE_CONSENT`, which
  per [`consent.schema.json`](../../content-schema/schemas/consent.schema.json)
  produces `'revoked'`, not `'denied'` — and the schema reserves
  `'denied'` for "age-gate or policy-driven default-off". The audit
  trail can record the transition, but the consent record itself
  has no path to `'denied'` from an explicit decline. Per CLAUDE.md
  root contract (closed enums, fail-loud), the gap must close
  before this flow ships. Suggested values: either add a
  `DENY_CONSENT` command to
  [`command-schema.md`](./command-schema.md) under "Consent,
  Onboarding & Destructive-UX Commands" (writes `'denied'`,
  payload `{ scope, method }`), or rewrite § 3 here and the
  decline-action row in
  [`76-onboarding-consent/interactions.md`](./wiki/screens/76-onboarding-consent/interactions.md)
  to record `unset → revoked` instead. Owning task is
  [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md).
  Skill preserved the target's `unset → denied` claim (Hard
  Prohibition A — never change meaning) and surfaces the gap here
  rather than silently rewriting it.
