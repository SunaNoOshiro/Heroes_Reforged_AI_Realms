# Screen 40: Pre-Battle Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Pre-battle confirmation modal. Compares attacker and defender hero
portraits, unit stacks, terrain, and tactics availability, then lets
the player choose Fight, Auto-Resolve, or Retreat.

### Visual Direction
Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Z-Layer: **1000** per [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed 800 × 600 layout. Two opposing hero/army panels face each
  other across a central `VS` emblem; a terrain/tactics status row
  sits below the panels; `FIGHT` / `AUTO` / `RETREAT` buttons anchor
  the bottom of the modal; the standard resource/date bar runs along
  the foot of the frame.
- Dense classic fantasy strategy UI: ornate gold frame, red/brown
  stone panels, compact icon slots, right-click detail affordances.
- `mockup.html` carries the visible UI only. Logic, transitions,
  bindings, schemas, and command routing live in the sibling
  Markdown files.

### Component Tree
- PreBattleDialog
  - AttackerPanel (hero portrait slot + up to 7 unit slots with stack count)
  - DefenderPanel (mirror — defender hero, neutral stack, or town garrison)
  - ArmyComparison (`VS` emblem; pulses with relative-strength feedback)
  - TerrainPreview (terrain id readout in the status row)
  - TacticsIndicator (tactics-availability state in the same status row)
  - FightRetreatButtons (`FIGHT`, `AUTO`, `RETREAT`)
  - ResourceDateBar (inherited from the global shell)

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `attacker` | `state.pendingBattle.attacker` | Attacking hero record plus army stacks. |
| `defender` | `state.pendingBattle.defender` | Defending hero, neutral stack template, or town garrison. |
| `terrain` | `state.pendingBattle.terrainId` | Battlefield terrain id; resolves through the terrain registry. |
| `tacticsAvailable` | `state.pendingBattle.tacticsAvailable` | `true` ⇒ Fight routes to `45-tactics-phase`; `false` ⇒ Fight routes to `38-combat-screen`. |
| `retreatAllowed` | `state.pendingBattle.retreatAllowed` | Retreat button guard; `false` disables the button. |

The `state.pendingBattle.*` slice is staged when the engine accepts
`INITIATE_BATTLE` (see [`command-schema.md` § INITIATE_BATTLE](../../../command-schema.md#initiate_battle))
and drained when Fight, Auto-Resolve, or Retreat is dispatched.
Today neither [`state-shape.md`](../../../state-shape.md) nor
[`data-inventory.md`](../../../data-inventory.md) registers the
slice — gap flagged in `## ⚠ Issues`.

### Mechanics Mapping
- Pre-battle is a confirmation layer: the dialog never mutates
  gameplay state. Fight / Auto / Retreat dispatch the canonical
  commands listed in [`data-contracts.md`](./data-contracts.md), and
  the reducer initialises tactical or auto-resolve state.
- Costs, hero stats, unit stacks, terrain ids, and tactics rules
  resolve through registries and content schemas — never hardcoded
  in view logic.
- UI previews (relative-strength meter, stack tooltip) stay local
  until a listed command or route guard accepts them.

### Animation Contract
- Army strength bars fill in; the central `VS` emblem pulses while
  the modal is open.
- Fight route fades into `38-combat-screen` or `45-tactics-phase`
  once the dispatcher accepts the command; Auto-Resolve cross-fades
  to `39-battle-results`.
- A disabled `RETREAT` button shakes briefly when clicked while
  `retreatAllowed === false`.
- Animation consumes reducer or route results — it never decides
  gameplay outcomes.
- Reduced-motion mode preserves every visible state change with
  static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and its authoritative state
  binding.
- Interactions covers every primary control: next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify every schema, config, localization, asset,
  sound, VFX, save, and replay field required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `pre-battle-dialog`; system group: `battle`;
  curation marker: `curated-pass-2`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — [`mockup.html`](./mockup.html) renders the three
  buttons (`FIGHT`, `AUTO`, `RETREAT`) and clickable `data-item`
  stack slots. Sibling [`interactions.md`](./interactions.md) lists
  the three buttons plus a `preBattle.inspectArmy` UI-local row; the
  mockup does not draw an explicit inspect affordance, so the
  control is implicit (right-click on a stack slot). See `## ⚠ Issues`.
- **Schema: ❌** — The five `state.pendingBattle.*` paths bound here
  are not registered in [`state-shape.md`](../../../state-shape.md)
  (which only describes `state.battle` while `phase === "battle"`)
  nor in [`data-inventory.md`](../../../data-inventory.md). Detail in
  `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.40-pre-battle-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/40-pre-battle-dialog-screen.md)
  Reads First all five package files; engine-side dependencies on
  `mvp.05-adventure-map.06-auto-resolve-combat` and
  `mvp.09-tactical-combat.11-combat-hud-overlay` resolve via that
  task's `Dependencies` list.

## ⚠ Issues

- **`state.pendingBattle.*` slice not registered anywhere.** This
  spec, [`interactions.md`](./interactions.md), and
  [`data-contracts.md`](./data-contracts.md) bind five selectors
  under `state.pendingBattle.*` (`attacker`, `defender`,
  `terrainId`, `tacticsAvailable`, `retreatAllowed`).
  [`state-shape.md`](../../../state-shape.md) defines `state.battle`
  (entered on `INITIATE_BATTLE`, cleared on `BATTLE_RESOLVED`) but
  no `pendingBattle` peer; [`data-inventory.md`](../../../data-inventory.md)
  has no matching row. Per CLAUDE.md ("every persisted field is
  registered in `data-inventory.md`"), the owning task
  [`phase-2.07-ui-screen-backlog.40-pre-battle-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/40-pre-battle-dialog-screen.md)
  must reconcile: either add a `state.pendingBattle` row to both
  files, or migrate the bindings to a section of `state.battle` that
  exists pre-tactics (e.g. `state.battle.preBattle`). Suggested
  values for a `data-inventory.md` row: `domain=battle`,
  `owner=phase-2.07-ui-screen-backlog.40-pre-battle-dialog-screen`,
  `persistence=memory`, `retention=transient` (cleared by
  `START_BATTLE_AFTER_TACTICS` / `AUTO_RESOLVE_BATTLE` /
  `RETREAT_BEFORE_BATTLE`). No edit made here per Hard Prohibition
  D.
- **Inspect-army affordance is implicit in the mockup.** Sibling
  [`interactions.md`](./interactions.md) lists `preBattle.inspectArmy`
  as a local-ui row; [`mockup.html`](./mockup.html) draws the
  clickable `data-item="N"` stack slots but no visible "inspect"
  control. The owning task should either (a) annotate the mockup
  with the right-click tooltip affordance, or (b) drop the row from
  `interactions.md`. Flagged rather than silently rewritten because
  the mockup is reference-only (Hard Prohibition D).
