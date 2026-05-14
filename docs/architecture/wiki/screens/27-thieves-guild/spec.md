# Screen 27: Thieves Guild

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Read-only intelligence ranking screen. A grid of opponent rows
× intelligence columns (towns, heroes, gold, army strength,
artifacts, …). Columns visible only up to the player's thieves
guild access; the rest stay covered.

### Visual Direction
Original internal UI contract. Never seed implementation from
third-party captures, copied franchise art, or external product
pixels.

### Visual Contract
- Curation status: `curated-pass-2`.
- Wide ranking parchment: player banners down the left, intelligence
  columns across the top, covered cells for unavailable cells.
- Fixed 800 × 600 layout, ornate gold frame, red / brown / stone
  panels, compact icon slots, right-click detail affordances,
  bottom status / resource feedback.
- `mockup.html` contains visible UI only; logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- `ThievesGuildDialog`
  - `PlayerBannerRows`
  - `IntelligenceColumns`
  - `CoveredCells`
  - `RankSortHeader`
  - `CloseButton`

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `players` | `state.players.all` | Player order and colors. |
| `intelligenceLevel` | `state.townServices.thievesGuildLevel` | Controls visible columns. |
| `rankings` | `state.intelligence.rankings` | Computed ranking rows. |
| `selectedPlayer` | `state.ui.thievesGuild.selectedPlayerId` | Local selected row. |

### Mechanics Mapping
- Visible columns derive from thieves guild access plus scenario
  visibility rules; the screen reads intelligence state and never
  mutates gameplay.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas, not
  hardcoded view logic.

### Animation Contract
- Columns reveal left-to-right based on intelligence level; the
  selected player row glows; unavailable cells stay covered.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and every authoritative state
  binding.
- `interactions.md` covers every primary control: next screen,
  state update, animation, disabled case, error path.
- `architecture.md` contains screen-specific diagrams, not copied
  archetype diagrams.
- `data-contracts.md` identifies the schema / config / localization /
  asset / sound / VFX / save / replay fields required to implement
  the screen.

### AI Implementation Notes
- Screen slug: `thieves-guild`; system group: `town`; curation
  marker: `curated-pass-2`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree and state bindings agree with `mockup.html` regions, sibling `architecture.md` § Visual Composition (`PlayerBannerRows`, `IntelligenceColumns`, `CoveredCells`, `RankSortHeader`, `CloseButton`), and sibling `interactions.md` § State Changes.
- **Schema: ✔** — Selectors `state.players.all`, `state.townServices.thievesGuildLevel`, `state.intelligence.rankings`, `state.ui.thievesGuild.selectedPlayerId` are mirrored verbatim in sibling `data-contracts.md` § Runtime State Selectors.
- **Tasks: ✔** — Owning task `phase-2.07-ui-screen-backlog.27-thieves-guild-screen` ([`tasks/phase-2/07-ui-screen-backlog/27-thieves-guild-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/27-thieves-guild-screen.md)) lists every visible region and binding in its Read First / Acceptance Criteria.

## ⚠ Issues

_None._
