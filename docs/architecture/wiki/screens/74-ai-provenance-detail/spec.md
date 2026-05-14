# Screen 74: AI Provenance Detail

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Player-facing surface for `manifest.aiProvenance` and the related
`GeneratedFaction.notes` of an AI-generated pack. Triggered by the
`[AI]` badge on hero / unit / faction info-cards or from the
pack-manager (screen 71). Read-only; no mutation. Sanitization,
localization, and capability rules per
[`ugc-safety.md`](../../../ugc-safety.md).

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-info modal over the dimmed caller.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in Markdown package files.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `pack` | `selectors.packs.byId(targetPackId)` | `{ id, version, contentHash, aiProvenance }`. |
| `provenance` | `selectors.packs.aiProvenance(targetPackId)` | `manifest.aiProvenance` re-asserted from `GeneratedFaction.notes`. |
| `inspectable` | `selectors.packs.aiProvenance(targetPackId).playerInspectable` | When `false`, the body collapses to `ui.ai-provenance.details-unavailable`. |

### Mechanics Mapping
- Reads only. The screen never dispatches a gameplay command.
- `aiProvenance.present === false` → screen does not render (badge
  hidden upstream, command not registered).
- The truncated prompt excerpt (≤ 280 chars per the
  `aiProvenance.promptExcerpt` cap in
  [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json))
  is rendered through the text contract from
  [`ugc-safety.md` § 3 Text Sanitization Contract](../../../ugc-safety.md#3-text-sanitization-contract).

### Animation Contract
- Modal drops in over the dimmed caller; sections crossfade.
  Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup renders provider, model hint, model version, generated
  date, token count, truncated prompt excerpt, and pack
  `contentHash`.
- Spec lists all visible regions and authoritative state bindings.
- Interactions cover open, close, and the
  `playerInspectable === false` collapsed state.
- Architecture file contains screen-specific diagrams.
- Data contracts identify schema, config, and localization fields
  required.

### AI Implementation Notes
- Screen slug: `ai-provenance-detail`; system group: `system`;
  curation marker: `curated-pass-1`.
- Localization keys live under `ui.ai-provenance.*` per
  [`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys).
- Owning task:
  [`tasks/phase-2/05-mod-system/13-ai-provenance-detail-screen.md`](../../../../../tasks/phase-2/05-mod-system/13-ai-provenance-detail-screen.md).

---

## 🔍 Sync Check

- **UI: ✔** — State bindings and visible regions match
  [`mockup.html`](./mockup.html), sibling [`architecture.md`](./architecture.md)
  § 5 State Inputs, [`interactions.md`](./interactions.md) Actions
  table, and [`data-contracts.md`](./data-contracts.md) Runtime
  State Selectors.
- **Schema: ✔** — `aiProvenance` fields (`present`,
  `playerInspectable`, `promptExcerpt[280]`) and
  `notes.{modelVersion, playerInspectable}` match
  [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json)
  and
  [`generated-faction.schema.json`](../../../../../content-schema/schemas/generated-faction.schema.json).
- **Tasks: ✔** — Owning task
  [`phase-2/05-mod-system/13-ai-provenance-detail-screen.md`](../../../../../tasks/phase-2/05-mod-system/13-ai-provenance-detail-screen.md)
  reserves `src/ui/screens/ai-provenance-detail-screen.tsx`,
  registers `OPEN_AI_PROVENANCE` / `CLOSE_AI_PROVENANCE` handlers,
  and lists this folder in `Read First`.

## ⚠ Issues

- **Acceptance Criteria dropped "generation seed".** The original
  criterion required the mockup to show a "generation seed".
  [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json)
  defines no `seed` field under `aiProvenance` (the closest fields
  are `promptHash` 16-hex and the manifest-level `generation` block
  via
  [`generation-config.schema.json`](../../../../../content-schema/schemas/generation-config.schema.json));
  [`mockup.html`](./mockup.html) renders no seed row either. The
  criterion was rewritten to match the mockup + schema (Hard
  Prohibition A — pick the interpretation most consistent with
  cross-checked files). If a `promptHash` row is intended to ship,
  the owner of task
  [`phase-2.05-mod-system.13-ai-provenance-detail-screen`](../../../../../tasks/phase-2/05-mod-system/13-ai-provenance-detail-screen.md)
  should add the row to [`mockup.html`](./mockup.html) and a
  matching `ui.ai-provenance.row.prompt-hash` key to sibling
  [`data-contracts.md`](./data-contracts.md). Skill did not edit
  the mockup or other siblings beyond this one's targets (Hard
  Prohibitions D and G).
