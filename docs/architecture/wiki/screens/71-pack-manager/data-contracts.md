# Screen 71: Pack Manager
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
| `trust-store.schema.json` | Persisted user trust decisions. | `content-schema/schemas/trust-store.schema.json` |
| `publisher-registry.schema.json` | Publisher signing-key list driving the signed-known tier. | `content-schema/schemas/publisher-registry.schema.json` |
| `pack-revocation-list.schema.json` | Client-local revocation surface. | `content-schema/schemas/pack-revocation-list.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `installed` | `selectors.packs.installed` | Ordered manifest snapshots. |
| `trustStore` | `selectors.packs.trustStore` | Per-pack trust decisions. |
| `filter` | `state.ui.packManager.filter` | `all \| canonical \| third-party \| sandboxed \| denied`. |
| `selectedPackId` | `state.ui.packManager.selectedPackId` | Highlights the row whose actions are active. |
| `modeIndicator` | `selectors.session.moddedIndicator` | Mirrors the status-bar modded badge. |

### Commands And Events
- `OPEN_PACK_MANAGER` from `packManager.open`: Mount the manager.
- `INSTALL_PACK_FROM_FILE` from `packManager.install`: Open file picker → traversal sanitizer → screen 72.
- `GRANT_PACK_TRUST` from `packManager.trust`: Write `decision = "trust"`.
- `RUN_PACK_SANDBOXED` from `packManager.sandboxed`: Write `decision = "sandboxed"`.
- `REVOKE_PACK_TRUST` from `packManager.revoke`: Drop trust-store entry.
- `REMOVE_PACK` from `packManager.remove`: Uninstall pack.
- `CLOSE_PACK_MANAGER` from `packManager.close`: Return to caller.
- `SET_PACK_MANAGER_FILTER` from `packManager.filter`: Update filter slice.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`

### Localization Keys
- `ui.pack-manager.filter.title`
- `ui.pack-manager.list.title`
- `ui.pack-manager.actions.title`
- `ui.pack-trust.tier.signed-known`
- `ui.pack-trust.tier.signed-unknown`
- `ui.pack-trust.tier.unsigned`
- `ui.pack-trust.tier.signature-failed`
- `ui.pack-trust.error.revoked`
- `ui.pack-trust.capability.formulas`
- `ui.pack-trust.capability.spells`
- `ui.pack-trust.capability.abilities`
- `ui.pack-trust.capability.assets`
- `ui.pack-trust.capability.no-scripts`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.pack-manager.background`
- `ui.pack-manager.frame`
- `ui.pack-manager.icons.tier`
- `audio.ui.hover`, `audio.ui.click`

### Save And Replay Fields
- This screen never writes save state.
- Trust-store writes are persisted in IndexedDB under a dedicated
  object store; not embedded in any save record.

### Validation And Fallback
- All actions consult the trust-anchor lookup precedence in
  [`pack-trust.md` § Trust Anchors](../../../pack-trust.md#4-trust-anchors)
  before mutating the trust store.
- Revocation-list `reason in [malware, tampered]` packs cannot be
  trusted or sandboxed; only `REMOVE_PACK` is enabled.
