# Screen 14: War Machine Factory

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure-map service modal where the visiting hero buys war
machines (ballista, ammo cart, first-aid tent, catapult) for gold
and equips them into hero rack slots. The dialog overlays the
adventure-map context (map viewport, right-command panel, resource
bar); those surrounding regions are owned by screen
[`07-adventure-map`](../07-adventure-map/). Purchase dispatches a
schema-backed engine command; selection and exit stay UI-local.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Fixed `800 × 600` layout. The adventure map and right-side command
  panel remain visible behind a centered workshop modal carrying:
  the title plaque (`War Machine Factory` + subtitle `Buy siege and
  support machines`), a left `Workshop` panel with a 2×2 machine bay
  grid (`Ballista`, `Ammo`, `Tent`, `Catapult`), a right `Hero Rack`
  column showing owned/empty machine slots, a status strip
  (`Selected <machine> — price <gold> gold — slot <state>`), and two
  buttons (`BUY`, `CLOSE`). Match `mockup.html` exactly for
  placement, colors, and button labels.
- Use dense classic fantasy strategy UI: ornate gold frame,
  red/brown/stone panels, compact icon slots, right-click detail
  affordances, and bottom status/resource feedback.
- `mockup.html` carries the visible UI only. Logic, transitions, and
  implementation notes live in the sibling Markdown files.

### Component Tree
- `WarMachineFactory`
  - `MachineBayGrid`
  - `HeroMachineRack`
  - `PriceLedger` (status strip)
  - `BuyButton`
  - `CloseButton`

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `shopStock` | `state.mapObjects.byId[factoryId].warMachineStock` | Per-factory available machines and restock flags. |
| `heroMachines` | `state.heroes.byId[selected].warMachines` | Visiting hero's machine rack slots. |
| `selectedMachine` | `state.ui.warMachineFactory.selectedMachineId` | Local UI slice; transient, never persisted. |
| `price` | `selectors.economy.selectedWarMachinePrice` | Gold cost and affordability for `selectedMachine`. |
| `resources` | `state.players.active.resources.gold` | Gold available for the affordability guard. `active` is shorthand for `state.players[state.currentPlayerId]`. |

### Mechanics Mapping
- Purchase resolves through the engine reducer owned by
  [`phase-2.01-spells-artifacts.11-buy-war-machine-command`](../../../../../tasks/phase-2/01-spells-artifacts/11-buy-war-machine-command.md),
  which validates factory availability, hero ownership, slot
  compatibility, and resource cost before applying.
- UI selection stays local until the player confirms `BUY`; neither
  selection nor close enter the deterministic command log.
- Machine catalogue, prices, and slot rules resolve through
  registries and content schemas — never hardcoded view logic.

### Animation Contract
- Hovered machine bay lights up (`slotHot` + `glow` filter); the
  selected bay holds the glow; on reducer-approved purchase, the
  bought bay stamps `SOLD`, the gold counter ticks down, and the
  acquired machine slides into the matching `HeroMachineRack` slot.
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
- Screen slug `war-machine-factory`; system group `adventure`;
  curation marker `curated-pass-3`.
- Build runtime components from this package contract — never from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; deterministic
  gameplay records carry stable IDs and scalar values only.
- One of the three control tokens is a **schema-backed command**
  (`BUY_WAR_MACHINE`); the other two are **UI-local** by prefix
  (`SELECT_WAR_MACHINE`, `CLOSE_WAR_MACHINE_FACTORY`). See sibling
  [`interactions.md`](./interactions.md) for the per-control routing
  and [`data-contracts.md`](./data-contracts.md) for the coverage
  classification.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree (`WarMachineFactory`, `MachineBayGrid`,
  `HeroMachineRack`, `PriceLedger`, `BuyButton`, `CloseButton`),
  button labels (`BUY`, `CLOSE`), and the workshop / hero-rack
  column layout match the `data-action` and `data-item` attributes
  in `mockup.html`. Animation contract mirrors the `slotHot`, `glow`,
  and `modalIn` rules in the mockup `<style>` block. Sibling
  [`architecture.md`](./architecture.md) Visual Composition diagram
  uses the same component names — aligned.
- **Schema: ✔** — `BUY_WAR_MACHINE` is present in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (`$defs.buyWarMachine`, required: `heroId`, `factoryId`,
  `warMachineId`, `metadata`); `SELECT_WAR_MACHINE` and
  `CLOSE_WAR_MACHINE_FACTORY` clear via the `SELECT_` / `CLOSE_`
  UI-local prefix policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
  Sibling [`data-contracts.md`](./data-contracts.md) carries the
  full schema list.
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.14-war-machine-factory-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/14-war-machine-factory-screen.md)
  reads this file first and lists
  [`phase-2.01-spells-artifacts.11-buy-war-machine-command`](../../../../../tasks/phase-2/01-spells-artifacts/11-buy-war-machine-command.md)
  as a Dependency; that engine task in turn Reads First sibling
  [`interactions.md`](./interactions.md).

## ⚠ Issues

- **`state.ui.warMachineFactory.selectedMachineId` not registered
  in `data-inventory.md`.** Transient UI slice, not persisted, so
  the [`data-inventory.md`](../../../data-inventory.md) contract
  ("every persisted field is registered") does not require a row.
  Soft cross-reference gap only: if the slice ever becomes
  session-persistent, the owning task
  [`phase-2.07-ui-screen-backlog.14-war-machine-factory-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/14-war-machine-factory-screen.md)
  must add a `low / in-memory / session` row before merge. Skill did
  not edit `data-inventory.md` (Hard Prohibition D).
