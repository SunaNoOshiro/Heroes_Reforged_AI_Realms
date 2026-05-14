# Age Gate

> Companion to [`onboarding.md`](./onboarding.md),
> [`privacy.md`](./privacy.md),
> [`new-install-defaults.md`](./new-install-defaults.md),
> [`pack-trust.md`](./pack-trust.md), and
> [`chat-safety.md`](./chat-safety.md). Defines the
> `config.player.ageGate` field and the minor-strict feature matrix.
> COPPA-conservative defaults apply until the user picks otherwise.

## 1. Stored Value

```text
config.player.ageGate ::= 'unknown' | 'under13' | 'over13'
```

- Default: `'unknown'`, treated as `'under13'` until the user picks.
- Stored under `config.player`, persisted to IndexedDB
  `hr-profile.options` per
  [`data-inventory.md`](./data-inventory.md). **Not** under
  [`consent.schema.json`](../../content-schema/schemas/consent.schema.json):
  the age gate is not a consent itself; it gates **whether** consent
  prompts even render.
- Captured at the top of
  [`76-onboarding-consent`](./wiki/screens/76-onboarding-consent/) and
  revisable from the Privacy tab in
  [`56-options`](./wiki/screens/56-options/).
- Written through `SET_AGE_GATE` (and the local-ui draft
  `SET_AGE_GATE_DRAFT`) per
  [`command-schema.md`](./command-schema.md).

## 2. Feature Matrix

| Scope | `unknown` | `under13` | `over13` |
|---|---|---|---|
| `consent.multiplayer` | denied | denied | unset → user-prompted |
| `consent.aiGeneration` | denied | denied | unset → user-prompted |
| `consent.telemetry` | denied | denied | unset → user-prompted |
| `consent.crashReports` | denied | denied | unset → user-prompted |
| `consent.analytics` | denied | denied | unset → user-prompted |
| Lobby chat | disabled | disabled | enabled |
| Public lobbies | disabled | disabled | n/a (none exist at v1) |
| Packs with `manifest.contentRating.overallRating > 'everyone'` | filtered | filtered | rendered |

Transition rules:

- `unknown` is treated as `under13` everywhere in the matrix.
- `under13 → over13` does **not** auto-grant any optional consent;
  every scope stays `unset` until the user explicitly accepts.
- `over13 → under13` (or `unknown`) force-denies every optional-tier
  consent per
  [`56-options` spec](./wiki/screens/56-options/spec.md#privacy-tab).

## 3. Canonical Selector

```text
selectFeatureAvailability(scope, ageGate, consent)
  // closed AND of the matrix above and consent.<scope>.state === 'granted'
```

Every guarded surface imports this selector and renders its output
as enabled / disabled controls. No surface re-derives the predicate.

## 4. Pack Filter

When `config.player.ageGate ∈ {'unknown', 'under13'}`, the pack
picker in
[`02-new-game-setup`](./wiki/screens/02-new-game-setup/) and
[`71-pack-manager`](./wiki/screens/71-pack-manager/) hides packs
whose `manifest.contentRating.overallRating` is above `'everyone'`
(see [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)).
Filtering is silent — no toast, the pack simply does not appear.
Pack signature / hash gates run unchanged.

## 5. Persistence

- Wiped by `WIPE_LOCAL_DATA scope=profile|all` per
  [`data-inventory.md`](./data-inventory.md).
- Profile-side, not gameplay-side: the value never enters the engine
  command log, `stateHash`, or `canonicalContentHash`.

## 6. Compliance Notes

The matrix above is **conservative**, not legally exhaustive. Real
COPPA / PEGI / ESRB compliance lives in the legal review cycle at
[`docs/legal/compliance.md`](../legal/compliance.md). The age gate
is the technical hook through which a legal decision later becomes
a runtime default.

---

## 🔍 Sync Check

- **UI: ✔** — Age-gate row, Privacy-tab control, and transition
  behavior match
  [`76-onboarding-consent/spec.md`](./wiki/screens/76-onboarding-consent/spec.md),
  [`76-onboarding-consent/interactions.md`](./wiki/screens/76-onboarding-consent/interactions.md),
  and
  [`56-options/spec.md`](./wiki/screens/56-options/spec.md#privacy-tab).
- **Schema: ✔** — `consent.schema.json` `ConsentScope` enum
  (`storage`, `multiplayer`, `aiGeneration`, `telemetry`,
  `crashReports`, `analytics`, `unsignedPacks`) and
  `manifest.schema.json` `contentRating.overallRating` enum
  (`everyone | teen | mature`) align with the matrix; both rows are
  registered in [`schema-matrix.md`](./schema-matrix.md). The
  `config.player.ageGate` slice is registered in
  [`data-inventory.md`](./data-inventory.md) (row: `age gate`,
  store `hr-profile.options`).
- **Tasks: ✔** — Owning runtime task is
  [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md)
  (lists this doc in its Read First and asserts the `under13`
  force-deny behavior). Commands `SET_AGE_GATE` /
  `SET_AGE_GATE_DRAFT` are defined in
  [`command-schema.md`](./command-schema.md).

## ⚠ Issues

_None._
