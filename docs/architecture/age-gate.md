# Age Gate

> Companion to [`onboarding.md`](./onboarding.md),
> [`privacy.md`](./privacy.md),
> [`new-install-defaults.md`](./new-install-defaults.md),
> [`pack-trust.md`](./pack-trust.md), and
> [`chat-safety.md`](./chat-safety.md). This file introduces the
> `config.player.ageGate` field and the minor-strict feature matrix.
> COPPA-conservative defaults apply until the user picks otherwise.

## 1. Stored Value

```text
config.player.ageGate ::= 'unknown' | 'under13' | 'over13'
```

Default `'unknown'`, treated as `'under13'` for safety until the user
picks. Stored under `config.player`, not under
[`consent.schema.json`](../../content-schema/schemas/consent.schema.json) —
the age gate is not a consent itself; it gates **whether** consent
prompts even render.

The age gate is captured at the top of
[`76-onboarding-consent`](./wiki/screens/76-onboarding-consent/) and
revisable from the Privacy tab in
[`56-options`](./wiki/screens/56-options/).

## 2. Feature Matrix

| Scope                            | `unknown` | `under13` | `over13` |
|----------------------------------|-----------|-----------|----------|
| `consent.multiplayer`            | denied    | denied    | unset → user-prompted |
| `consent.aiGeneration`           | denied    | denied    | unset → user-prompted |
| `consent.telemetry`              | denied    | denied    | unset → user-prompted |
| `consent.crashReports`           | denied    | denied    | unset → user-prompted |
| `consent.analytics`              | denied    | denied    | unset → user-prompted |
| Lobby chat             | disabled  | disabled  | enabled  |
| Public lobbies                   | disabled  | disabled  | n/a (none exist at v1) |
| Packs with `contentRating.overallRating > 'everyone'` | filtered | filtered | rendered |

`unknown` is treated as `under13`. Switching from `under13` to `over13`
in the Privacy tab does **not** auto-grant any optional consent; every
consent stays `unset` until the user explicitly accepts.

## 3. Selector

The single canonical selector consumed by every gated surface:

```text
selectFeatureAvailability(scope, ageGate, consent)
  // closed AND of the matrix above and consent.<scope>.state === 'granted'
```

No surface should re-derive this predicate; every guarded surface
imports the selector and surfaces its output as enabled / disabled
controls.

## 4. Pack Filter

When `config.player.ageGate ∈ {'unknown', 'under13'}`, the pack picker
in `02-new-game-setup` and `71-pack-manager` filters out packs whose
`manifest.contentRating.overallRating` is above `'everyone'`.
Filtering is silent (no toast) — the pack simply does not appear in
the picker. Pack signature / hash gates run unchanged.

## 5. Persistence

`config.player.ageGate` is wiped by
`WIPE_LOCAL_DATA scope=profile|all` per
[`data-inventory.md`](./data-inventory.md). The value is profile-side,
not gameplay-side; it never enters the engine command log,
`stateHash`, or `canonicalContentHash`.

## 6. Compliance Notes

The matrix above is **conservative**, not legally exhaustive. Real
COPPA / PEGI / ESRB compliance requires the legal review cycle in
[`docs/legal/compliance.md`](../legal/compliance.md). The age gate is
the technical hook through which a legal decision later becomes a
runtime default.
