# Screen 43: Siege Combat Variant

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Siege battlefield variant with walls, gate, towers, moat, catapult target preview, breaching state, and defender/attacker stack placement.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Battlefield is split by a large castle wall: defender stacks occupy battlements / right side, attackers approach from the left, and wall/gate targets are highlighted.
- Dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` carries visible UI only. Logic, transitions, and implementation notes live in the markdown package files.

### Component Tree
- `SiegeCombatScreen`
  - `Battlefield`
  - `CastleWalls`
  - `GateAndMoat`
  - `TowerNodes`
  - `CatapultTargetPreview`
  - `ArmyStacks`
  - `ActionBar`

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `wallState` | `state.battle.siege.wallSegments` | HP/breach state by segment. |
| `gateState` | `state.battle.siege.gate` | Gate open / broken / blocked state. |
| `towerState` | `state.battle.siege.towers` | Tower ammo and targeting. |
| `catapultTarget` | `state.ui.battle.catapultTarget` | Local selected siege target. |
| `activeStack` | `state.battle.activeStackId` | Current combat actor. |

### Mechanics Mapping
- Extends combat with wall segments, gate blocking, tower shots, moat penalties, catapult targeting, and breach state in deterministic battle commands.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries and content schemas, never hardcoded view logic.

### Animation Contract
- Catapult arcs toward selected wall; impact dust plays after reducer result; breached wall segment darkens; tower shot flashes from battlement.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema / config / localization / asset / sound / VFX / save / replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug `siege-combat`; system group `battle`; curation marker `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests; deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — `ActionBar` is listed as a single component but `mockup.html` shows six labeled buttons (`siege-combat.spell`, `.wait`, `.defend`, `.auto`, `.retreat`, `.end`) that no sibling file enumerates. See `## ⚠ Issues`. Sibling files: [`interactions.md`](./interactions.md), [`architecture.md`](./architecture.md).
- **Schema: ✔** — Bindings reference reducer-owned slices (`state.battle.siege.*`, `state.battle.activeStackId`) and one UI draft (`state.ui.battle.catapultTarget`); no schema enums asserted here.
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.43-siege-combat-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/43-siege-combat-screen.md) lists this file in `Read First`; engine dependencies [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../../../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md) and [`phase-2.01-spells-artifacts.14-fire-catapult-command`](../../../../../tasks/phase-2/01-spells-artifacts/14-fire-catapult-command.md) reference this package.

## ⚠ Issues

- **Undocumented `ActionBar` buttons.** `mockup.html` lines 72–96 show six buttons (`siege-combat.spell`, `.wait`, `.defend`, `.auto`, `.retreat`, `.end`) but `ActionBar` is listed here as a single component, and sibling `interactions.md` does not enumerate them. Per [`.agents/rules/ui.md`](../../../../../.agents/rules/ui.md) ("read all five together") and [`screen-command-coverage.json`](../../../screen-command-coverage.json), `interactions.md` is the system of record for per-control rows. Suggested rows for the sibling file (mapped through `commandAliases`): Spell → `SPELL_CAST`, Wait → `BATTLE_WAIT`, Defend → `BATTLE_DEFEND`, Auto → `AUTO_RESOLVE_BATTLE`, Retreat → `RETREAT_BEFORE_BATTLE`. The `End` button has no obvious canonical kind in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (`END_HERO_TURN` / `END_DAY` target outer turns, not combat) and should be resolved by the owning task before runtime — flagged here so the sibling rewrite does not invent one. Did not add rows to `interactions.md` per audit rule B.
- **Missing data-inventory rows for `state.battle.siege.*`.** This file asserts `wallSegments`, `gate`, and `towers` are bound from `state.battle.siege.*`, and [`data-inventory.md`](../../../data-inventory.md) has no matching row. Per CLAUDE.md root contract ("every persisted field is registered in data-inventory.md"), [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../../../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md) (the runtime owner) must add rows. Suggested values: domain=`battle`, owner=`phase-2.01-spells-artifacts.13-siege-state-machine`, persistence=`memory` (battle-scoped), retention=`battle`. Skill did not add the rows itself (audit rule D — never edit cross-checked files).
