# Screen 72: Pack Trust Prompt
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`pack-trust.md`](../../../pack-trust.md) — anchors
  [§ 4 Trust Anchors](../../../pack-trust.md#4-trust-anchors),
  [§ 5 Safe Mode](../../../pack-trust.md#5-safe-mode),
  [§ 7 Phrasing](../../../pack-trust.md#7-trust--safety-phrasing),
  [§ 8 Content Rating](../../../pack-trust.md#8-content-rating),
  [§ 10 Error Codes](../../../pack-trust.md#10-error-codes).
- [`command-schema.md` § Save-Import & Pack-Trust](../../../command-schema.md#save-import--pack-trust-commands).
- [`data-inventory.md`](../../../data-inventory.md) row
  `trust store` (IndexedDB `hr-trust.decisions`).
- Owning task:
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md).

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `manifest.schema.json` | Pack identity, `capabilities`, `signature`, `contentRating`. | [`content-schema/schemas/manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json) |
| `trust-store.schema.json` | Persisted trust decisions written on confirm. | [`content-schema/schemas/trust-store.schema.json`](../../../../../content-schema/schemas/trust-store.schema.json) |
| `publisher-registry.schema.json` | Drives the `signed-known` ribbon tier via `manifest.signature.keyId` lookup. | [`content-schema/schemas/publisher-registry.schema.json`](../../../../../content-schema/schemas/publisher-registry.schema.json) |
| `pack-revocation-list.schema.json` | Blocks `GRANT_PACK_TRUST` for revoked packs; ceilings deprecated / user-revoked at `sandboxed`. | [`content-schema/schemas/pack-revocation-list.schema.json`](../../../../../content-schema/schemas/pack-revocation-list.schema.json) |
| `localization.schema.json` | UI labels, tier ribbons, capability copy, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

### Runtime State Selectors
| UI Element | Selector / state path | Notes |
| --- | --- | --- |
| `pack` | `selectors.packs.pendingTrustRequest` | The pack under review. |
| `tier` | `selectors.packs.signatureTier` | `signed-known \| signed-unknown \| unsigned \| signature-failed`. |
| `transitive` | `selectors.packs.pendingTransitive` | Per-dependency rows; per-pack consent required. |
| `scope` | `state.ui.packTrust.scope` | `session \| save \| global` (default `session`). |
| `trustStore` | `selectors.packs.trustStore` | Read-only consult; skip if prior decision exists. |

### Commands And Events
Canonical list in
[`command-schema.md` § Save-Import & Pack-Trust](../../../command-schema.md#save-import--pack-trust-commands).
Type column: `command` enters the engine adapter; `local-ui` only
mutates UI-state slices.

| Action ID | Token | Type | Effect |
| --- | --- | --- | --- |
| `packTrust.open` | `OPEN_PACK_TRUST_PROMPT` | local-ui | Mount the prompt. |
| `packTrust.trust` | `GRANT_PACK_TRUST` | command | Write `decision = "trust"`. |
| `packTrust.sandboxed` | `RUN_PACK_SANDBOXED` | command | Write `decision = "sandboxed"`. |
| `packTrust.deny` | `DENY_PACK_TRUST` | command | Write `decision = "deny"`. |
| `packTrust.cancel` | `CLOSE_PACK_TRUST_PROMPT` | local-ui | Drop the pending decision. |
| `packTrust.setScope` | `SET_PACK_TRUST_SCOPE` | local-ui | Update `state.ui.packTrust.scope`. |
| `packTrust.toggleTransitive` | `TOGGLE_PACK_TRUST_TRANSITIVE` | local-ui | Update per-dependency consent flag. |

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`

### Localization Keys
Canonical inventory in
[`pack-trust.md` § 10 Error Codes](../../../pack-trust.md#10-error-codes).

- Titles: `ui.pack-trust.identity.title`,
  `ui.pack-trust.capabilities.title`,
  `ui.pack-trust.transitive.title`,
  `ui.pack-trust.scope.title`.
- Tier ribbon: `ui.pack-trust.tier.signed-known`,
  `ui.pack-trust.tier.signed-unknown`,
  `ui.pack-trust.tier.unsigned`,
  `ui.pack-trust.tier.signature-failed`.
- Errors: `ui.pack-trust.error.revoked`,
  `ui.pack-trust.error.unsafe-entry`,
  `ui.pack-trust.error.too-large`,
  `ui.pack-trust.error.bomb`,
  `ui.pack-trust.error.too-many-entries`.
- Capability rows: `ui.pack-trust.capability.formulas`,
  `ui.pack-trust.capability.spells`,
  `ui.pack-trust.capability.abilities`,
  `ui.pack-trust.capability.assets`,
  `ui.pack-trust.capability.no-scripts`.
- Shared: `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`.

### Asset, Sound, And VFX IDs
- `ui.pack-trust.background`
- `ui.pack-trust.frame`
- `ui.pack-trust.icons.tier`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.warn`,
  `audio.system.error`

### Save And Replay Fields
- This screen never writes save state.
- Trust-store writes persist to IndexedDB `hr-trust.decisions`
  (registered in
  [`data-inventory.md`](../../../data-inventory.md) row
  `trust store`); not embedded in any save record.

### Validation And Fallback
- `tier = signature-failed` removes the trust button entirely; the
  user must Cancel or Deny. There is no soft-warning click-through.
- Revocation entries with `reason ∈ {malware, tampered}` cannot be
  trusted or sandboxed (`ui.pack-trust.error.revoked`).
- Revocation entries with `reason ∈ {deprecated, user-revoked}`
  ceiling the decision at `sandboxed`.
- Author-declared `manifest.contentRating` is advisory only
  ([`pack-trust.md` § 8 Content Rating](../../../pack-trust.md#8-content-rating)).
- All copy follows
  [`pack-trust.md` § 7 Trust & Safety Phrasing](../../../pack-trust.md#7-trust--safety-phrasing).

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, command tokens, selectors, and
  localization keys match sibling [`spec.md`](./spec.md),
  [`interactions.md`](./interactions.md), and
  [`architecture.md`](./architecture.md); `mockup.html`
  `data-action` attributes match the Action IDs in this table.
- **Schema: ✔** — `decision`, `scope`, capability enum, ribbon
  tier, and `(packId, contentHash)` key match
  [`trust-store.schema.json`](../../../../../content-schema/schemas/trust-store.schema.json),
  [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json),
  [`publisher-registry.schema.json`](../../../../../content-schema/schemas/publisher-registry.schema.json),
  and
  [`pack-revocation-list.schema.json`](../../../../../content-schema/schemas/pack-revocation-list.schema.json);
  rows present in
  [`schema-matrix.md`](../../../schema-matrix.md) for `Manifest`,
  `TrustStore`, `PublisherRegistry`, `PackRevocationList`. Trust
  store row registered in
  [`data-inventory.md`](../../../data-inventory.md).
- **Tasks: ✔** — Schemas owned by
  [`mvp.02-content-schemas.29-publisher-registry-schema`](../../../../../tasks/mvp/02-content-schemas/29-publisher-registry-schema.md),
  [`30-pack-revocation-list-schema`](../../../../../tasks/mvp/02-content-schemas/30-pack-revocation-list-schema.md),
  [`31-trust-store-schema`](../../../../../tasks/mvp/02-content-schemas/31-trust-store-schema.md);
  screen and runtime owned by
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md).

## ⚠ Issues

- **Three local-ui tokens are not registered in
  [`command-schema.md`](../../../command-schema.md).**
  `CLOSE_PACK_TRUST_PROMPT`, `SET_PACK_TRUST_SCOPE`, and
  `TOGGLE_PACK_TRUST_TRANSITIVE` appear in the Commands And Events
  table above and in sibling [`interactions.md`](./interactions.md)
  but are absent from the canonical Save-Import & Pack-Trust list in
  `command-schema.md`. The owning task
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  must add `local-ui` rows for these three tokens; CI surfaces the
  gap via
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  and `npm run validate:commands`. Skill did not edit
  `command-schema.md` (Hard Prohibition D). See sibling
  [`spec.md`](./spec.md) — aligned.
