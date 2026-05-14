# Screen 45: Combat Tactics Phase

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Pre-combat deployment phase. Friendly stacks may be repositioned
within legal hexes granted by the hero's tactics skill; the enemy
side is locked. Starting battle freezes deployment and hands the
turn order to the combat initiative queue
([`38-combat-screen`](../38-combat-screen/spec.md)).

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Fixed 800×600 layout: ornate gold frame, stone/wood panels, hex
  battlefield with shaded deployment column on the left and locked
  enemy column on the right, bottom tactics command strip, and
  resource/date footer.
- The mockup (`mockup.html`) carries visible UI only; logic,
  transitions, animation timing, and command routing live in the
  Markdown package files. See `## ⚠ Issues` for the mockup
  command-strip drift.

### Component Tree
- `TacticsPhaseScreen`
  - `DeploymentZone` — shaded legal hexes for friendly placement.
  - `FriendlyStacks` — draggable attacker stacks within the zone.
  - `EnemyPreview` — locked defender stacks (read-only).
  - `MoveBudgetPlaque` — remaining tactics moves indicator.
  - `StartBattleButton` — commits deployment and enters combat.
  - `IllegalPlacementFeedback` — transient overlay for rejected drops.

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `tacticsAvailable` | `state.battle.tactics.enabled` | Phase is active. |
| `deploymentZone` | `state.battle.tactics.legalHexes` | Legal placement hexes. |
| `friendlyStacks` | `state.battle.armies.attacker.stacks` | Movable stack positions. |
| `enemyPreview` | `state.battle.armies.defender.stacks` | Locked enemy stacks. |
| `remainingMoves` | `state.battle.tactics.remainingMoves` | Tactics move budget. |

All bindings are read through the store or a boundary adapter, never
by reaching into sim internals.

### Mechanics Mapping
- Repositioning is allowed only inside `legalHexes` and only before
  initiative begins; `START_BATTLE_AFTER_TACTICS` freezes deployment
  and transitions to the first initiative turn.
- Drag previews are UI-local drafts; they do not enter the
  deterministic command log until `PLACE_TACTICS_STACK` is accepted.
- Costs, stacks, heroes, and battle records resolve through
  registries / content schemas, not hardcoded view logic.
- The reducer pair (`PLACE_TACTICS_STACK`, `START_BATTLE_AFTER_TACTICS`)
  is owned by
  [`mvp.09-tactical-combat.12-tactics-phase-engine`](../../../../../tasks/mvp/09-tactical-combat/12-tactics-phase-engine.md).

### Animation Contract
- Legal deployment cells glow; the stack drag-ghost snaps to the
  nearest allowed hex; illegal placements flash red and bounce back;
  `START_BATTLE_AFTER_TACTICS` wipes away zone overlays before
  routing to `38-combat-screen`.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode replaces glow / wipe with static highlights and
  localized status text.

### Acceptance Criteria
- Mockup is visually distinct from sibling battle screens and matches
  this screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions cover every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file holds screen-specific diagrams, not archetype
  copies.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields needed for runtime.

### AI Implementation Notes
- Screen slug: `tactics-phase`; system group: `battle`; curation
  marker: `curated-pass-2`.
- Build runtime components from the package contract, not from
  third-party captures.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — Component tree and bindings align with `data-contracts.md` and `architecture.md`. The mockup (`mockup.html`) renders a six-button command strip (`tactics-phase.spell|wait|defend|auto|retreat|end`) that has no counterpart in `interactions.md`, and the visible UI lacks an explicit Start Battle / Reset affordance. See sibling `interactions.md` § Actions and `## ⚠ Issues` below.
- **Schema: ✔** — `state.battle.tactics.*` selectors and the bound reducer commands `PLACE_TACTICS_STACK` / `START_BATTLE_AFTER_TACTICS` match [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json). State slices are transient battle state (not a persisted slice), so no [`data-inventory.md`](../../../data-inventory.md) row is required.
- **Tasks: ✔** — Owning UI task [`phase-2.07-ui-screen-backlog.45-tactics-phase-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/45-tactics-phase-screen.md) Reads First all four package files; engine task [`mvp.09-tactical-combat.12-tactics-phase-engine`](../../../../../tasks/mvp/09-tactical-combat/12-tactics-phase-engine.md) owns the two reducer commands referenced here.

## ⚠ Issues

- **Mockup command strip not mapped to interactions.** `mockup.html` renders six buttons with `data-action="tactics-phase.{spell,wait,defend,auto,retreat,end}"`, but `interactions.md` § Actions describes only `tactics.dragStack`, `tactics.placeStack`, `tactics.startBattle`, `tactics.reset`. The labels (Spell / Wait / Defend / Retreat) overlap with combat-phase actions owned by [`38-combat-screen/interactions.md`](../38-combat-screen/interactions.md), suggesting either (a) the mockup leaks combat-phase chrome into the tactics phase, or (b) the tactics phase exposes a subset of those buttons that needs documenting. Per Hard Prohibition B (`doc-audit` § 9), this audit did not invent the missing rows. The owning UI task ([`phase-2.07-ui-screen-backlog.45-tactics-phase-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/45-tactics-phase-screen.md)) should decide whether the mockup is amended to show `StartBattleButton` + reset affordance, or `interactions.md` is extended to cover the visible strip.
- **No visible Start Battle / Reset affordance.** Component tree lists `StartBattleButton`; the mockup does not render it. Same owner closes the gap when reconciling the mockup with `interactions.md`.
