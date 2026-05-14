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
| `manifest.schema.json` | `aiProvenance` block (`present`, `providerId`, `modelHint`, `modelVersion`, `generatedAt`, `promptHash`, `tokenCount`, `playerInspectable`, `promptExcerpt[280]`); pack identity (`id`, `version`, `contentHash`). | `content-schema/schemas/manifest.schema.json` |
| `generated-faction.schema.json` | `notes.modelVersion` / `notes.playerInspectable`; referenced for non-faction packs only when shipped alongside. | `content-schema/schemas/generated-faction.schema.json` |
| `localization.schema.json` | UI labels, section headers, error messages. | `content-schema/schemas/localization.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `pack` | `selectors.packs.byId(targetPackId)` | `{ id, version, contentHash }`. |
| `provenance` | `selectors.packs.aiProvenance(targetPackId)` | `manifest.aiProvenance`. |
| `inspectable` | `selectors.packs.aiProvenance(targetPackId).playerInspectable` | Drives the collapsed-body case. |

### Commands And Events
- `OPEN_AI_PROVENANCE` from `aiProvenance.open` — mount the modal.
- `CLOSE_AI_PROVENANCE` from `aiProvenance.close` — drop the modal.
- `OPEN_CONTENT_REPORT` from `aiProvenance.report` — route to
  screen 75 with `{ targetType: "ai-faction", targetId: pack.id }`
  pre-filled.

All three are local-ui via the `OPEN_` / `CLOSE_` prefix list in
[`screen-command-coverage.json`](../../../screen-command-coverage.json);
they do not enter the deterministic engine command log. Catalogued
in
[`command-schema.md` § UGC, Privacy & Content-Report Commands](../../../command-schema.md#ugc-privacy--content-report-commands).

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

The `ui.ai-provenance.*` namespace is reserved by
[`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys).

### Asset, Sound, And VFX IDs
- `ui.ai-provenance.background`
- `ui.ai-provenance.frame`
- `audio.ui.hover`, `audio.ui.click`

### Save And Replay Fields
- This screen never writes save state.
- `manifest.aiProvenance` is part of the pack's manifest, not the
  save record; saves carry only `packHashes[]` and inherit
  provenance via the loaded pack registry. Per-field retention for
  `manifest.aiProvenance.promptExcerpt` is registered in
  [`data-inventory.md`](../../../data-inventory.md) (line 35).

### Validation And Fallback
- `aiProvenance.present === false` → screen does not mount.
- `aiProvenance.playerInspectable === false` → body collapses to a
  single `ui.ai-provenance.details-unavailable` line.
- All copy follows
  [`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys).

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and commands match sibling
  [`spec.md`](./spec.md) State Bindings and
  [`interactions.md`](./interactions.md) Actions; localization
  keys match the `ui.ai-provenance.*` namespace declared in
  [`ugc-safety.md` § 7](../../../ugc-safety.md#7-localization-keys).
- **Schema: ✔** — `aiProvenance` block (lines 119–135) and `notes`
  object (lines 52–65) match
  [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json)
  and
  [`generated-faction.schema.json`](../../../../../content-schema/schemas/generated-faction.schema.json)
  exactly. `Manifest` and `GeneratedFaction` rows present in
  [`schema-matrix.md`](../../../schema-matrix.md) (lines 35, 51).
- **Tasks: ✔** — Owning task
  [`phase-2/05-mod-system/13-ai-provenance-detail-screen.md`](../../../../../tasks/phase-2/05-mod-system/13-ai-provenance-detail-screen.md)
  lists this folder in `Read First`, names the
  `OPEN_AI_PROVENANCE` / `CLOSE_AI_PROVENANCE` handlers, and
  registers the screen-75 routing payload.

## ⚠ Issues

_None._
