# Screen 23: Hero Prison

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure prison dialog. Releases an imprisoned hero into the visiting
player's roster when capacity, ownership, and spawn-tile rules pass.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Fixed 800×600 modal layered over the adventure map; barred prison
  cell portrait dominates the dialog with hero summary and roster
  status to its right.
- Dense classic fantasy strategy UI: ornate gold frame, red/brown/stone
  panels, compact icon slots, bottom status/resource feedback strip.
- `mockup.html` carries visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- `HeroPrisonDialog`
  - `PrisonCellPortrait`
  - `ImprisonedHeroSummary`
  - `RosterCapacityPanel`
  - `ReleaseLeaveButtons`

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `prisonId` | `state.ui.adventure.pendingPrisonId` | Visited prison object (UI-local route state). |
| `imprisonedHero` | `state.mapObjects.byId[prisonId].heroId` | Hero record locked inside the prison. |
| `rosterSlots` | `selectors.heroes.availableRosterSlots` | Active player's hero capacity and free slots. |
| `releaseGuard` | `selectors.heroes.prisonReleaseGuard` | Eligibility verdict and disabled reason. |
| `spawnTile` | `selectors.mapObjects.prisonReleaseTile` | Tile where the released hero spawns. |

### Mechanics Mapping
- Release validates prison object state, active player roster capacity,
  hero record availability, and scenario rules before creating the hero
  on the map. The authoritative verdict comes from
  `selectors.heroes.prisonReleaseGuard`.
- UI previews stay local until a listed command or route guard accepts
  them.
- Heroes, map objects, and resources resolve through registries and
  content schemas — never hardcoded view logic.

### Animation Contract
- Release: cell bars lift, prisoner portrait brightens, roster slot
  glows, released hero appears beside the prison, prison object marks
  visited.
- Inspect / Leave: standard dialog cross-fade or close; no gameplay
  animation.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and its authoritative state binding.
- `interactions.md` covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- `architecture.md` contains screen-specific diagrams, not copied
  archetype diagrams.
- `data-contracts.md` identifies the schema, config, localization,
  asset, sound, VFX, save, and replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `hero-prison`; system group: `adventure`; curation
  marker: `curated-pass-3`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; deterministic
  gameplay commands carry stable IDs and scalar values only.

---

## 🔍 Sync Check

- **UI: ⚠** — Component tree, bindings, and Release animation match
  [`mockup.html`](./mockup.html) and sibling
  [`interactions.md`](./interactions.md). The mockup does **not**
  render a `prison.inspectHero` control even though
  `interactions.md` and `data-contracts.md` list it; flagged in
  Issues.
- **Schema: ✔** — Selector paths and hero/map-object references align
  with the schemas listed in
  [`data-contracts.md`](./data-contracts.md).
- **Tasks: ✔** — Owned by
  [`phase-2.07-ui-screen-backlog.23-hero-prison-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/23-hero-prison-screen.md);
  release reducer owned by
  [`mvp.05-adventure-map.12-release-prison-hero-command`](../../../../../tasks/mvp/05-adventure-map/12-release-prison-hero-command.md).
  Both reference this screen package in Read First.

## ⚠ Issues

- **Inspect-hero control absent in mockup.** `interactions.md` and
  `data-contracts.md` list `prison.inspectHero` →
  `OPEN_IMPRISONED_HERO_PREVIEW` routing to
  `46-hero-screen`, but [`mockup.html`](./mockup.html) renders only
  the RELEASE and LEAVE buttons. Either the mockup needs an inspect
  affordance (e.g. portrait right-click or summary-row link) or the
  inspect interaction must be dropped from the contract. The screen
  owner
  [`phase-2.07-ui-screen-backlog.23-hero-prison-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/23-hero-prison-screen.md)
  must reconcile. Suggested: add a portrait/summary right-click
  affordance to the mockup since the summary panel is already
  read-only.
