# Screen 13: Hill Fort

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure-map service modal that lets the visiting hero upgrade
eligible army stacks for a ruleset-defined resource cost. The Hill
Fort dialog overlays the adventure-map context (map viewport,
right-command panel, resource bar); those surrounding regions are
owned by screen [`07-adventure-map`](../07-adventure-map/). Upgrade
mutations dispatch through engine commands; selection and exit stay
UI-local.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Fixed `800 × 600` layout. The adventure map and right-side command
  panel remain visible behind a centered stone-fort modal carrying:
  the title plaque (`Hill Fort` + subtitle `Upgrade eligible stacks`),
  a 4-row `Current` column on the left, a 4-row `Upgrade To` column
  on the right, animated arrows between them, a status strip showing
  the currently selected pair and resource cost, and three buttons
  (`UPGRADE`, `ALL`, `CLOSE`). Match `mockup.html` exactly for
  placement, colors, and button labels.
- Use dense classic fantasy strategy UI: ornate gold frame,
  red/brown/stone panels, compact icon slots, right-click detail
  affordances, and bottom status/resource feedback.
- `mockup.html` carries the visible UI only. Logic, transitions, and
  implementation notes live in the sibling Markdown files.

### Component Tree
- `HillFortDialog`
  - `CurrentArmySlots`
  - `UpgradePathList`
  - `CostLedger`
  - `UpgradeButtons` (`UPGRADE`, `ALL`)
  - `CloseButton`

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `heroArmy` | `state.heroes.byId[selected].army` | Visiting hero's seven army slots. |
| `upgradeTargets` | `selectors.creatures.availableHillFortUpgrades` | Per-stack upgrade-path records returned by the owning reducer. |
| `selectedStack` | `state.ui.hillFort.selectedStackIndex` | Local UI slice; transient, never persisted. |
| `costPreview` | `selectors.economy.upgradeCostPreview` | Resource cost for the selected upgrade quantity. |
| `resources` | `state.players.active.resources` | Available resources for the affordability guard. `active` is shorthand for `state.players[state.currentPlayerId]`. |

### Mechanics Mapping
- Each stack upgrade resolves through the engine reducer owned by
  [`mvp.05-adventure-map.20-upgrade-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/20-upgrade-army-stack-command.md);
  Gate 2 validates creature upgrade path, town/faction capability,
  hero ownership, resource affordability, and destination army
  capacity before the command applies.
- UI selection stays local until the player confirms `UPGRADE` or
  `ALL`; neither selection nor close enter the deterministic command
  log.
- Costs, creature stats, and upgrade paths resolve through
  registries and content schemas — never hardcoded view logic.

### Animation Contract
- Eligible stack slots glow (`slotHot` + `glow` filter); the selected
  pair shows a pulsing arrow (`pulse` keyframe in `mockup.html`); on
  reducer-approved upgrade, the upgraded portrait flashes and the
  resource cost ticks down.
- Animation consumes reducer or selector results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback. The
  `@media (prefers-reduced-motion: reduce)` rule in `mockup.html` is
  the canonical example.

### Acceptance Criteria
- Mockup is visually distinct from sibling screens and follows this
  package's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- `interactions.md` covers every primary control, next screen, state
  update, animation cue, disabled case, and error path.
- `architecture.md` carries screen-specific diagrams, not copied
  archetype diagrams.
- `data-contracts.md` identifies the schema, config, localization,
  asset, sound, VFX, save, and replay fields required to implement
  the screen.

### AI Implementation Notes
- Screen slug `hill-fort`; system group `adventure`; curation marker
  `curated-pass-3`.
- Build runtime components from this package contract — never from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; deterministic
  gameplay records carry stable IDs and scalar values only.
- Two of the four control tokens are **schema-backed commands**
  (`UPGRADE_ARMY_STACK`, `UPGRADE_ALL_ELIGIBLE_STACKS`); two are
  **UI-local** by prefix (`SELECT_HILL_FORT_STACK`,
  `CLOSE_HILL_FORT`). See sibling
  [`interactions.md`](./interactions.md) for the per-control routing
  and [`data-contracts.md`](./data-contracts.md) for the coverage
  classification.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree (`HillFortDialog`, `CurrentArmySlots`,
  `UpgradePathList`, `CostLedger`, `UpgradeButtons`, `CloseButton`),
  button labels (`UPGRADE`, `ALL`, `CLOSE`), and the
  `Current` / `Upgrade To` column layout match the `data-action` and
  `data-item` attributes in `mockup.html`. Animation contract mirrors
  the `pulse`, `glow`, and `modalIn` rules in the mockup `<style>`
  block. Sibling [`architecture.md`](./architecture.md) Visual
  Composition diagram uses the same component names — aligned.
- **Schema: ✔** — `UPGRADE_ARMY_STACK` and
  `UPGRADE_ALL_ELIGIBLE_STACKS` are present in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  `SELECT_HILL_FORT_STACK` and `CLOSE_HILL_FORT` are cleared by the
  `SELECT_` / `CLOSE_` UI-local prefix policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
  Sibling [`data-contracts.md`](./data-contracts.md) carries the full
  schema list.
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.13-hill-fort-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/13-hill-fort-screen.md)
  reads this file first and lists
  [`mvp.05-adventure-map.20-upgrade-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/20-upgrade-army-stack-command.md)
  as a Dependency; that engine task in turn Reads First this screen's
  [`interactions.md`](./interactions.md).

## ⚠ Issues

- **`state.ui.hillFort.selectedStackIndex` not registered in
  `data-inventory.md`.** Transient UI slice; the persistence
  contract ("every persisted field is registered" — see
  [`data-inventory.md`](../../../data-inventory.md)) does not require
  a row for in-memory UI state. Soft cross-reference gap only: if the
  slice ever becomes session-persistent, the owning task
  [`phase-2.07-ui-screen-backlog.13-hill-fort-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/13-hill-fort-screen.md)
  must add a `low / in-memory / session` row before merge. Skill did
  not add the row itself (Hard Prohibition D).
