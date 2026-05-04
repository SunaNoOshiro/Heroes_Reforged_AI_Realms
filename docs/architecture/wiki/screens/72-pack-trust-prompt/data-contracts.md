# Screen 72: Pack Trust Prompt
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `manifest.schema.json` | Pack identity, capabilities, signature, contentRating. | `content-schema/schemas/manifest.schema.json` |
| `trust-store.schema.json` | Persisted trust decisions written on confirm. | `content-schema/schemas/trust-store.schema.json` |
| `publisher-registry.schema.json` | Drives the `signed-known` ribbon tier. | `content-schema/schemas/publisher-registry.schema.json` |
| `pack-revocation-list.schema.json` | Blocks `GRANT_PACK_TRUST` for revoked packs. | `content-schema/schemas/pack-revocation-list.schema.json` |
| `localization.schema.json` | UI labels, tier ribbons, capability copy, error messages. | `content-schema/schemas/localization.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `pack` | `selectors.packs.pendingTrustRequest` | The pack being reviewed. |
| `tier` | `selectors.packs.signatureTier` | `signed-known \| signed-unknown \| unsigned \| signature-failed`. |
| `transitive` | `selectors.packs.pendingTransitive` | Per-dependency rows; per-pack consent required. |
| `scope` | `state.ui.packTrust.scope` | `session \| save \| global` (default `session`). |
| `trustStore` | `selectors.packs.trustStore` | Read-only consult to skip prior decisions. |

### Commands And Events
- `OPEN_PACK_TRUST_PROMPT` from `packTrust.open`: Mount the prompt.
- `GRANT_PACK_TRUST` from `packTrust.trust`: Write `decision = "trust"`.
- `RUN_PACK_SANDBOXED` from `packTrust.sandboxed`: Write `decision = "sandboxed"`.
- `DENY_PACK_TRUST` from `packTrust.deny`: Write `decision = "deny"`.
- `CLOSE_PACK_TRUST_PROMPT` from `packTrust.cancel`: Drop the pending decision.
- `SET_PACK_TRUST_SCOPE` from `packTrust.setScope`: Update scope slice.
- `TOGGLE_PACK_TRUST_TRANSITIVE` from `packTrust.toggleTransitive`: Update per-dependency consent flags.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`

### Localization Keys
- `ui.pack-trust.identity.title`
- `ui.pack-trust.capabilities.title`
- `ui.pack-trust.transitive.title`
- `ui.pack-trust.scope.title`
- `ui.pack-trust.tier.signed-known`
- `ui.pack-trust.tier.signed-unknown`
- `ui.pack-trust.tier.unsigned`
- `ui.pack-trust.tier.signature-failed`
- `ui.pack-trust.error.revoked`
- `ui.pack-trust.error.unsafe-entry`
- `ui.pack-trust.error.too-large`
- `ui.pack-trust.error.bomb`
- `ui.pack-trust.error.too-many-entries`
- `ui.pack-trust.capability.formulas`
- `ui.pack-trust.capability.spells`
- `ui.pack-trust.capability.abilities`
- `ui.pack-trust.capability.assets`
- `ui.pack-trust.capability.no-scripts`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.pack-trust.background`
- `ui.pack-trust.frame`
- `ui.pack-trust.icons.tier`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.warn`, `audio.system.error`

### Save And Replay Fields
- This screen never writes save state.
- Trust-store writes are persisted in IndexedDB under a dedicated
  object store; not embedded in any save record.

### Validation And Fallback
- `tier = signature-failed` removes the trust button entirely; the
  user must Cancel or Deny. There is no soft-warning click-through.
- Revocation-list `reason in [malware, tampered]` packs cannot be
  trusted or sandboxed.
- All copy follows
  [`pack-trust.md` § Trust & Safety Phrasing](../../../pack-trust.md#7-trust--safety-phrasing).
