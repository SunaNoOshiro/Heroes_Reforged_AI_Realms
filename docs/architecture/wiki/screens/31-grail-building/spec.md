# Screen 31: Grail Building

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md` (this file — owns components, state bindings, animation contract)
- Interactions: `interactions.md` (controls, commands, errors)
- Data Contracts: `data-contracts.md` (schemas, assets, localization, save/replay)
- Architecture Diagrams: `architecture.md` (per-screen flow diagrams)

### Description
Town grail-building ceremony. Triggered after a hero carrying the grail
artifact reaches a town the same player owns; the player chooses to
construct the faction-specific grail wonder, which applies permanent
town/player bonuses.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Fixed 800×600 layout with ornate gold frame and red/brown/stone
  panels (dense classic-fantasy strategy chrome).
- Centered ceremonial dialog over a darkened town panorama. Two side
  panels: left holds the delivered grail relic on a pedestal; right
  holds the faction wonder preview with town/owner header and a
  bullet list of permanent bonuses.
- Bottom of dialog: BUILD and CANCEL action buttons.
- `mockup.html` is canonical for visible regions and data hooks. All
  logic, transitions, and gameplay rules live in the Markdown package
  files.

### Component Tree
- `GrailBuildingDialog`
  - `RelicPedestal` — left panel; renders the delivered grail visual
  - `WonderPreview` — right panel; faction wonder header + bonus list
  - `TownBonusList` — bullets in `WonderPreview` summarizing bonuses
  - `ConfirmBuildButton` — dispatches `grail.build`
  - `CancelButton` — dispatches `grail.cancel`
  - `CeremonyVfx` — VFX overlay played on successful build

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `townId` | `state.towns.selectedTownId` | Town receiving the grail. |
| `deliveringHero` | `state.adventure.visitingHeroId` | Hero carrying the grail artifact. |
| `grailRecord` | `state.scenario.grail` | Scenario grail block (`coordinate`, `fragmentCount`) — added by `mvp.05-adventure-map.22-obelisk-visits-and-grail-state`. |
| `wonderDefinition` | `selectors.towns.factionGrailBuilding` | Faction-specific grail building record + bonuses. |
| `bonusPreview` | `selectors.towns.grailBonusPreview` | Income, growth, spell, or faction-specific bonus summary for `TownBonusList`. |

UI-only state (hover, focused plaque, button highlight, animation
frame) stays out of deterministic gameplay state per the screen
package contract.

### Mechanics Mapping
- Action consumes the grail delivery state, validates town ownership
  and that no grail building already exists in the town, creates the
  faction-specific grail structure, and applies the per-faction
  bonuses.
- All previews stay local until `BUILD_GRAIL_STRUCTURE` is accepted by
  the engine reducer.
- Costs, buildings, factions, and bonus values resolve through
  registries / content schemas — never hardcoded in view code.

### Animation Contract
- On successful build: relic rises from the hero slot, town wonder
  beam flashes over the panorama, bonus plaques illuminate, and the
  built hotspot remains glowing.
- Animation consumes reducer / route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves the visible state changes with static
  highlights and localized feedback (no relic rise, no beam).

### Acceptance Criteria
- `mockup.html` is visually distinct from sibling screens and follows
  this package's internal visual direction.
- This file lists every visible region and authoritative state
  binding.
- `interactions.md` covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- `architecture.md` contains screen-specific diagrams that mirror —
  rather than re-invent — the contract here.
- `data-contracts.md` lists every schema, config, localization,
  asset, sound, VFX, save, and replay field needed to implement the
  screen.

### AI Implementation Notes
- Screen slug: `grail-building`; system group: `town`; curation
  marker: `curated-pass-4`.
- Build runtime components from this package only.
- Resolve presentation through asset IDs / manifests; deterministic
  gameplay commands use stable IDs and scalar values per
  [`command-schema.md`](../../../command-schema.md).

---

## 🔍 Sync Check

- **UI: ⚠** — `mockup.html` shows BUILD and CANCEL buttons; the
  Component Tree above now lists both (`ConfirmBuildButton`,
  `CancelButton`). Sibling `interactions.md` § Actions agrees on the
  three action IDs. The mockup has no interactive bonus-plaque
  affordance, but `interactions.md` declares `grail.inspect` (local-
  ui) — see `## ⚠ Issues`.
- **Schema: ✔** — `BUILD_GRAIL_STRUCTURE` matches
  [`command.schema.json` `$defs.buildGrailStructure`](../../../../../content-schema/schemas/command.schema.json)
  (required: `kind`, `townId`, `grailArtifactId`, `metadata`). The
  scenario `grail` block referenced by `state.scenario.grail` is the
  one declared by
  [`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md)
  on `scenario.schema.json`.
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.31-grail-building-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/31-grail-building-screen.md)
  Reads-First all four files in this package; engine command task
  [`phase-2.05-mod-system.07-build-grail-structure-command`](../../../../../tasks/phase-2/05-mod-system/07-build-grail-structure-command.md)
  Reads-First sibling `interactions.md`.

## ⚠ Issues

- **`grail.inspect` action has no mockup affordance.** Sibling
  `interactions.md` declares `grail.inspect` (local-ui →
  `SELECT_GRAIL_BONUS`) but `mockup.html` renders `TownBonusList` as
  static text with no per-row plaque cursor or focus ring. Per
  [`.agents/rules/ui.md`](../../../../../.agents/rules/ui.md), the
  five sibling files must agree. Owner: UI task
  [`phase-2.07-ui-screen-backlog.31-grail-building-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/31-grail-building-screen.md).
  Suggested fix: either add interactive `<g data-action="grail.inspect">`
  rows over each bonus line in `mockup.html`, or drop the
  `grail.inspect` row from `interactions.md` and the
  `SELECT_GRAIL_BONUS` reference from `data-contracts.md`. Skill did
  not edit `mockup.html` (reference-only) or sibling targets'
  semantics (Hard Prohibition B).
- **`state.scenario.grail` not in data-inventory.** This screen reads
  `state.scenario.grail`, populated by
  [`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md)
  via an additive `scenario.schema.json` block. Grep of
  [`data-inventory.md`](../../../data-inventory.md) finds no
  matching row. Per CLAUDE.md root contract ("every persisted field
  is registered in data-inventory.md"), the obelisk task must add the
  row before this slice ships. Suggested values: domain=`scenario`,
  owner=`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`,
  persistence=`indexeddb` (within scenario save), retention=`session`.
  Skill did not add the row (Hard Prohibition D).
