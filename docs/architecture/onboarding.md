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
record for the affected scopes and re-routes the user through the
onboarding screen at the next reachable boundary.

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

Reasons each scope must be captured before the gated surface activates:

| Scope          | Surface gated                                                     |
|----------------|-------------------------------------------------------------------|
| `storage`      | first IndexedDB write (saves, profile, audit). Required.          |
| `multiplayer`  | first WebRTC `RTCPeerConnection` / WebSocket signal (IP exposure).|
| `aiGeneration` | first AI gateway call (off-device prompt transmission).           |
| `telemetry`    | first metrics-sink emission (off by default).                     |
| `crashReports` | first crash-report upload (off by default).                       |
| `analytics`    | first analytics SDK init (no SDK ships at v1; toggle declares default). |
| `unsignedPacks`| per-lobby ack when any pack in the session is unsigned.           |

## 3. Onboarding Flow

The first reachable action on `01-main-menu` checks
`state.profile.consent.storage.state`. If `unset`, the screen router
immediately navigates to
[`76-onboarding-consent`](./wiki/screens/76-onboarding-consent/).
The flow is one screen with three sequential steps:

1. **Age gate** — see [`age-gate.md`](./age-gate.md). Stored under
   `config.player.ageGate`, not under consent.
2. **Required tier** — `storage` row, pre-accepted with explanation.
3. **Optional tier** — one row per optional scope, default OFF.
   `multiplayer` carries the IP-exposure disclosure; `aiGeneration`
   carries the off-device prompt-transmission disclosure;
   `telemetry` / `crashReports` / `analytics` carry their respective
   "off by default — never read without your consent" copy.

`Continue` dispatches `GRANT_CONSENT(scope)` for every accepted toggle
and `RECORD_CONSENT_AUDIT(scope, fromState, toState, policyVersion,
method='explicit')` for every transition. `unset → denied` is recorded
when the user explicitly leaves a row off (this distinguishes "didn't
read the row" from "read and declined").

After `Continue`, every guarded surface's selector flips:

```text
selectFeatureAvailability(scope, ageGate, consent)
  // closed AND of ageGate matrix and consent.scope.state === 'granted'
```

Implementations consume this single canonical selector — no surface
should re-derive the predicate.

## 4. Re-Prompting

The runtime re-prompts a scope when **any** of the following is true:

- `consent.<scope>.state === 'unset'` and the gated surface is being entered
- `consent.<scope>.policyVersion < onboarding.policyVersion`
- the user revoked the scope from the Privacy tab and is now reaching the gated surface

A re-prompt is the same `76-onboarding-consent` screen, focused on the
single scope that triggered it. The user can `Cancel` and return to the
caller; the gated action is not retried automatically.

## 5. Storage

| Slice                                | Schema                                                                 | Notes |
|--------------------------------------|------------------------------------------------------------------------|-------|
| `state.profile.consent.<scope>`      | [`consent.schema.json`](../../content-schema/schemas/consent.schema.json) | One record per scope. |
| `state.profile.consentAuditLog`      | [`consent-audit-log.schema.json`](../../content-schema/schemas/consent-audit-log.schema.json) | Capped ring buffer (default 256). |
| `config.player.ageGate`              | inline enum (see [`age-gate.md`](./age-gate.md))                        | Not under consent. |

All three slices are wiped by `WIPE_LOCAL_DATA scope=profile|all` per
[`data-inventory.md`](./data-inventory.md).

## 6. Save Imports

Exported saves embed `ConsentSnapshot` (see
[`consent.schema.json#/$defs/ConsentSnapshot`](../../content-schema/schemas/consent.schema.json)).
On import, the runtime dispatches `IMPORT_CONSENT_SNAPSHOT(snapshot)`,
which routes the user through `76-onboarding-consent` with the
snapshot pre-filled and `method: 'import'`. Imports never auto-grant
consent; the user must confirm each row on this device.
