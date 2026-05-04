# Screen 73: UGC Publish Disclaimer
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `manifest.schema.json` | Candidate pack identity + `aiProvenance`. | `content-schema/schemas/manifest.schema.json` |
| `localization.schema.json` | UI labels, policy bullets, error messages. | `content-schema/schemas/localization.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `pack` | `selectors.publish.candidatePack` | The candidate pack being exported. |
| `policyVersion` | `selectors.publish.policyVersion` | Hex hash of the active content-policy doc. |
| `acks` | `state.ui.publish.acks` | Per-checkbox boolean state. |
| `destination` | `state.ui.publish.destination` | OS file-picker result. |

### Commands And Events
- `OPEN_PUBLISH_DISCLAIMER` from `publish.open`: Mount the modal.
- `TOGGLE_PUBLISH_RIGHTS_ACK` from `publish.toggleRights`: Toggle the
  rights checkbox.
- `TOGGLE_PUBLISH_POLICY_ACK` from `publish.togglePolicy`: Toggle the
  policy checkbox.
- `ACCEPT_PUBLISH_DISCLAIMER` from `publish.accept`: Writes
  `signed-acks/<contentHash>.json` into the archive; chained to
  `EXPORT_SCENARIO_AS_PACK`.
- `EXPORT_SCENARIO_AS_PACK` from `publish.accept`: Triggers the OS
  file-picker for the destination path.
- `CLOSE_PUBLISH_DISCLAIMER` from `publish.cancel`: Drops the
  candidate pack from staging.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`

### Localization Keys
- `ui.publish.policy.title`
- `ui.publish.policy.body`
- `ui.publish.policy.bullet.no-infringement`
- `ui.publish.policy.bullet.no-minors-sexual`
- `ui.publish.policy.bullet.no-targeted-harassment`
- `ui.publish.policy.bullet.no-illegal`
- `ui.publish.policy.ack.rights`
- `ui.publish.policy.ack.policy`
- `ui.publish.policy.required-checks`
- `ui.publish.policy.export-button`
- `ui.publish.policy.cancel-button`
- `ui.publish.policy.local-only-notice`
- `ui.common.ok`, `ui.common.cancel`

### Asset, Sound, And VFX IDs
- `ui.publish.background`
- `ui.publish.frame`
- `audio.ui.hover`, `audio.ui.click`

### Save And Replay Fields
- This screen never writes save state.
- Per-pack ack file is written inside the exported `.hrmod`
  archive at `signed-acks/<contentHash>.json`; not embedded in any
  save record.

### Validation And Fallback
- Both ack checkboxes MUST be true before export enables.
- Local-only notice copy follows the
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys)
  rule.
