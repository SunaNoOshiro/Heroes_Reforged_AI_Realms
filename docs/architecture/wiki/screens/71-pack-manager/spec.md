# Screen 71: Pack Manager

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Tabular surface that enumerates installed packs, distinguishes
trusted from sandboxed, and surfaces revoke / remove / install
actions. Routes the install path through screen 72 (pack-trust
prompt). Backed by [`trust-store.schema.json`](../../../../../content-schema/schemas/trust-store.schema.json),
[`publisher-registry.schema.json`](../../../../../content-schema/schemas/publisher-registry.schema.json),
and [`pack-revocation-list.schema.json`](../../../../../content-schema/schemas/pack-revocation-list.schema.json).

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-list dialog over the dimmed system menu caller.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in Markdown package files.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| installed | selectors.packs.installed | Manifest snapshots for every mounted or installed pack. |
| trustStore | selectors.packs.trustStore | Persisted trust decisions per `(packId, contentHash)`. |
| filter | state.ui.packManager.filter | `all \| canonical \| third-party \| sandboxed \| denied`. |
| selectedPackId | state.ui.packManager.selectedPackId | Highlights the row whose actions are active. |
| modeIndicator | selectors.session.moddedIndicator | Mirrors the status-bar badge while the screen is open. |

### Mechanics Mapping
- Reads pack registries; never mutates engine gameplay state.
- All trust-decision writes go through `GRANT_PACK_TRUST`,
  `RUN_PACK_SANDBOXED`, `DENY_PACK_TRUST`, or `REVOKE_PACK_TRUST`,
  which write to the trust store.
- Install path runs the traversal sanitizer per
  [`pack-trust.md` § Resource Limits](../../../pack-trust.md#1-resource-limits)
  before opening screen 72.

### Animation Contract
- Row highlight slides on selection; trust-state badge transitions
  colour on decision write. Reduced-motion mode preserves visible
  state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup shows the full filter row, the installed-pack table, and
  the action footer.
- Spec lists all visible regions and authoritative state bindings.
- Interactions cover install / trust / sandboxed / revoke / remove
  / close.
- Architecture file contains screen-specific diagrams.
- Data contracts identify schema/config/localization fields required.

### AI Implementation Notes
- Screen slug: `pack-manager`; system group: `system`; curation
  marker: `curated-pass-1`.
- Localization keys live under `ui.pack-manager.*` and
  `ui.pack-trust.*`.
- Owning task:
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md).
