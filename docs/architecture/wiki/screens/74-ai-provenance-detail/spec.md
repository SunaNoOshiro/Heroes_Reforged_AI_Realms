# Screen 74: AI Provenance Detail

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Player-facing surface that surfaces `manifest.aiProvenance` and the
referenced `GeneratedFaction.notes` for an AI-generated pack.
Triggered by the `[AI]` badge on hero / unit / faction info-cards
or from the pack-manager (screen 71). Read-only; no mutation. Per
[`ugc-safety.md`](../../../ugc-safety.md) and audit 21 (Q396).

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-info modal over the dimmed caller.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in Markdown package files.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| pack | selectors.packs.byId(targetPackId) | `{ id, version, contentHash, aiProvenance }`. |
| provenance | selectors.packs.aiProvenance(targetPackId) | `manifest.aiProvenance` re-asserted from `GeneratedFaction.notes`. |
| inspectable | selectors.packs.aiProvenance(targetPackId).playerInspectable | When `false`, the body collapses to "AI-generated; details unavailable." |

### Mechanics Mapping
- Reads only. The screen never dispatches a gameplay command.
- When `aiProvenance.present === false`, the screen does not render
  (the badge is not shown, the command is not registered).
- The truncated prompt excerpt (max 280 chars) is sanitized via the
  text contract from
  [`ugc-safety.md` § Text Sanitization Contract](../../../ugc-safety.md#3-text-sanitization-contract).

### Animation Contract
- Modal drops in over the dimmed caller; sections crossfade.
  Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup shows provider, model, generated date, token count,
  truncated prompt, generation seed, and pack `contentHash`.
- Spec lists all visible regions and authoritative state bindings.
- Interactions cover open, close, and the `playerInspectable=false`
  collapsed state.
- Architecture file contains screen-specific diagrams.
- Data contracts identify schema/config/localization fields required.

### AI Implementation Notes
- Screen slug: `ai-provenance-detail`; system group: `system`;
  curation marker: `curated-pass-1`.
- Localization keys live under `ui.ai-provenance.*` per
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys).
- Owning task:
  [`tasks/phase-2/05-mod-system/13-ai-provenance-detail-screen.md`](../../../../../tasks/phase-2/05-mod-system/13-ai-provenance-detail-screen.md).
