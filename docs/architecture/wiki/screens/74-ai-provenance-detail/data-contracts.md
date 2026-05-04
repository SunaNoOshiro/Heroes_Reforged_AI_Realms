# Screen 74: AI Provenance Detail
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `manifest.schema.json` | `aiProvenance` block; pack identity. | `content-schema/schemas/manifest.schema.json` |
| `generated-faction.schema.json` | `notes` (`playerInspectable`, `modelVersion`); referenced for non-faction packs only when shipped alongside. | `content-schema/schemas/generated-faction.schema.json` |
| `localization.schema.json` | UI labels, section headers, error messages. | `content-schema/schemas/localization.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `pack` | `selectors.packs.byId(targetPackId)` | `{ id, version, contentHash }`. |
| `provenance` | `selectors.packs.aiProvenance(targetPackId)` | `manifest.aiProvenance`. |
| `inspectable` | `selectors.packs.aiProvenance(targetPackId).playerInspectable` | Drives the collapsed-body case. |

### Commands And Events
- `OPEN_AI_PROVENANCE` from `aiProvenance.open`: Mount the modal.
- `CLOSE_AI_PROVENANCE` from `aiProvenance.close`: Drop the modal.
- `OPEN_CONTENT_REPORT` from `aiProvenance.report`: Route to screen 75.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`

### Localization Keys
- `ui.ai-provenance.title`
- `ui.ai-provenance.section.identity`
- `ui.ai-provenance.section.model`
- `ui.ai-provenance.section.prompt`
- `ui.ai-provenance.row.provider`
- `ui.ai-provenance.row.model-hint`
- `ui.ai-provenance.row.model-version`
- `ui.ai-provenance.row.generated-at`
- `ui.ai-provenance.row.token-count`
- `ui.ai-provenance.row.prompt-excerpt`
- `ui.ai-provenance.row.content-hash`
- `ui.ai-provenance.details-unavailable`
- `ui.ai-provenance.report-button`
- `ui.ai-provenance.close-button`
- `ui.common.ok`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.ai-provenance.background`
- `ui.ai-provenance.frame`
- `audio.ui.hover`, `audio.ui.click`

### Save And Replay Fields
- This screen never writes save state.
- `manifest.aiProvenance` is part of the pack's manifest, not the
  save record; saves only carry `packHashes[]` and inherit the
  provenance via the loaded pack registry.

### Validation And Fallback
- When `aiProvenance.present === false`, this screen does not mount.
- When `aiProvenance.playerInspectable === false`, the body
  collapses to a single line.
- All copy follows
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys).
