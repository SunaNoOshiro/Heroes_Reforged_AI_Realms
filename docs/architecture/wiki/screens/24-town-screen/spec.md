# Screen 24: Town Screen

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Town management panorama with clickable building hotspots, town and
visiting-hero army rows, daily-build state, service entry points
(build / recruit / mage / tavern / market), resource strip, and exit
back to the adventure map.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `anchor-v1`.
- Fixed 800×600 layout. Faction panorama fills the upper region;
  bottom red-brown management strip carries the town portrait,
  garrison row, visiting-hero row, service-button row, and resource
  strip.
- Classic fantasy-strategy chrome: ornate gold frame, red/brown/stone
  panels, compact icon slots, right-click detail affordances, status
  text in a horizontal plaque above the management strip.
- `mockup.html` is the visible-UI reference only. Logic, transitions,
  and implementation notes live in this package's Markdown files.

### Component Tree
- `TownScreen`
  - `TownPanorama` — faction panorama art.
  - `BuildingHotspots` — five clickable building groups in the
    mockup (Hall, Tavern, Fort, Guild, Market); the live registry
    is sourced from `state.towns.byId[selected].buildings`.
  - `TownHeader` — town name and currently-selected building plaque
    (e.g. `Electrising — Marketplace selected — Built today: no`).
  - `TownGarrisonRow` — seven slots bound to the town garrison.
  - `VisitingHeroRow` — seven slots bound to the visiting hero army.
  - `ServiceButtons` — `Build`, `Recruit`, `Mage`, `Tavern`,
    `Market`, `Exit`.
  - `BuildStatePlaque` — left-side portrait + gold income + capitol
    state.
  - `ResourceDateBar` — Wood / Ore / Mercury / Sulfur / Crystals /
    Kaelis / Gold + Month/Week/Day readout.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `town.id` | `state.towns.selectedTownId` | Current town context. |
| `town.buildings` | `state.towns.byId[selected].buildings` | Drives hotspot built state and service-button availability. |
| `dailyBuild` | `state.towns.byId[selected].builtToday` | Disables Build after the day's construction. |
| `garrison` | `state.towns.byId[selected].garrison` | Town-army row stacks. |
| `visitingHero` | `state.adventure.visitingHeroId` | Visiting-hero portrait, army row, and mage-guild eligibility. |

### Mechanics Mapping
- Building inspection (hotspot click), service routing, garrison /
  visiting-hero stack transfers, and exit use the town selectors and
  the commands listed in `data-contracts.md` § Commands And Events.
- Engine-level mutations (`BUILD_BUILDING`, `RECRUIT_UNITS`,
  `LEARN_SPELL`, `HIRE_TAVERN_HERO`, marketplace trades) are
  dispatched by the destination screens (30 / 25 / 29 / 28 / 26),
  not directly by this screen.
- The only engine command dispatched **on this screen** is the army
  row transfer; see `interactions.md`.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  map objects resolve through registries / content schemas, not
  hardcoded view logic.

### Animation Contract
- Hover: building hotspots glow per `slotHot` in the mockup.
- Daily build: a newly built structure brightens in the panorama on
  return from screen 30.
- Recruit counts tick in the building plaque after a recruit return.
- Army drag ghosts snap between legal slots; rejected drops snap back.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves the visible state change with static
  highlights and localized feedback (see `config.ui.reducedMotion`
  in `data-contracts.md`).

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  package's internal visual direction.
- Spec lists every visible region and the authoritative state
  binding for each.
- Interactions covers every service button, the building-hotspot
  click, the garrison and visiting-hero rows, disabled cases, and
  the error path for the only engine-dispatched command.
- Architecture file contains screen-specific diagrams that mirror
  interactions, not copied archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `town-screen`; system group: `town`; curation marker:
  `anchor-v1`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and the
  `Build / Recruit / Mage / Tavern / Market / Exit` service-button
  row match `mockup.html` (six `<g class="button">` rows under
  `data-action="town.*"`) and the sibling `interactions.md` table.
- **Schema: ✔** — Bindings dereference selectors only; engine
  schemas (`building.schema.json`, `unit.schema.json`,
  `hero.schema.json`, `command.schema.json`) are referenced from
  sibling `data-contracts.md`.
- **Tasks: ✔** — Owning task
  [`tasks/mvp/07-ui-shell/04-town-screen-modal.md`](../../../../../tasks/mvp/07-ui-shell/04-town-screen-modal.md)
  Reads First this file, depends on
  `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild` and
  `mvp.05-adventure-map.18-transfer-stack-commands`.

## ⚠ Issues

- **`screen-transition-graph.json` only registers the inbound
  `07-adventure-map → 24-town-screen` edge.** Sibling
  `architecture.md` shows outgoing transitions to `30-build-tree`,
  `25-building-recruitment-dialog`, `29-mage-guild`, `28-tavern`,
  `26-marketplace`, and `07-adventure-map`; none of those edges
  appear in
  [`docs/architecture/screen-transition-graph.json`](../../../screen-transition-graph.json).
  Per `command-schema.md` line on screen-interaction tokens,
  [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md)
  owns regenerating the graph; flagged here rather than rewritten
  silently because the file is generated and lives outside this
  package.
