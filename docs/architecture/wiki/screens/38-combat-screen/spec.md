# Screen 38: Combat Screen

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Tactical combat board: hex grid, stack placement, active-unit halo,
hero portraits, action bar, target highlights, damage feedback, and
combat log.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `anchor-v1`.
- Layout: 800 × 600 ornate gold frame. Battlefield covers the upper
  ~78 % with translucent hex overlay; armies on left/right; hero
  panels flank the right side; action bar + status hint anchor the
  bottom; a resource/date bar runs along the foot.
- Dense classic fantasy strategy UI: red/brown/stone panels, compact
  icon slots, right-click detail affordances, bottom status/resource
  feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in this package's Markdown files.

### Component Tree
- CombatScreen
  - Battlefield
  - HexOverlay
  - ArmyStacks
  - ActiveStackHalo
  - TargetPreview (movement path + damage float)
  - HeroPortraits
  - ActionBar
  - StatusHint
  - CombatLog
  - ResourceDateBar

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `battle.phase` | `state.battle.phase` | Tactics, active turn, animation lock, or result phase. |
| `activeStack` | `state.battle.activeStackId` | Current initiative actor. |
| `legalHexes` | `state.battle.legalTargets` | Reducer/combat-rules output. |
| `combatLog` | `state.battle.log` | Localized event log from deterministic outcomes. |
| `pendingAnimation` | `state.ui.battle.pendingAnimation` | Presentation-only timeline from reducer result. |
| `opponentDisconnect` | `state.net.opponentDisconnect` | `OpponentDisconnect \| null`; drives banner + forfeit modal. Non-deterministic — see [`determinism.md` § Clock Policy](../../../determinism.md#clock-policy). |

### Mechanics Mapping
- Deterministic reducer commands cover: initiative, movement,
  melee/ranged attack, wait, defend, spell casting, morale/luck,
  death, retreat, surrender, and victory check.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, abilities, stacks, heroes, and units
  resolve through registries / content schemas — never hardcoded in
  view logic.

### Animation Contract
- Active stack halo pulses; legal movement hexes glow.
- Movement path renders as an animated dashed arc; attack lunge /
  recoil and projectile arcs play **after** command acceptance;
  damage floats float up from the reducer result.
- Animation consumes reducer or route results — it never decides
  gameplay outcomes.
- Reduced-motion mode preserves all visible state changes with
  static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and its authoritative state binding.
- Interactions covers every primary control: next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams — not copied
  archetype diagrams.
- Data contracts identify every schema, config, localization, asset,
  sound, VFX, save, and replay field required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `combat-screen`; system group: `battle`; curation
  marker: `anchor-v1`.
- Build runtime components from this package contract, not from
  third-party captures.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — Mockup `mockup.html` shows three action buttons (`combat.auto`, `combat.retreat`, `combat.surrender`) that this spec acknowledges in Mechanics Mapping ("retreat, surrender") but the sibling [`interactions.md`](./interactions.md) does not row-document. See `## ⚠ Issues`.
- **Schema: ✔** — Every state path resolves: `state.battle.*` and `state.ui.battle.*` are gameplay state owned by [`mvp.09-tactical-combat`](../../../../../tasks/mvp/09-tactical-combat/); `state.net.opponentDisconnect` is non-deterministic per [`determinism.md` § Clock Policy](../../../determinism.md#clock-policy).
- **Tasks: ✔** — Owning task [`mvp.09-tactical-combat.11-combat-hud-overlay`](../../../../../tasks/mvp/09-tactical-combat/11-combat-hud-overlay.md) lists all four target files in its Read First; its acceptance criteria already enumerate retreat and auto-combat handlers.

## ⚠ Issues

- **Mockup buttons not row-documented in interactions.md.** Mockup defines `combat.auto`, `combat.retreat`, `combat.surrender` buttons; spec lists `retreat` and `surrender` as deterministic commands and `mvp.09-tactical-combat.11-combat-hud-overlay` lists `retreat` and `auto-combat` as required handlers. Per CLAUDE.md ("content packs are the extension boundary; stable IDs are public API"), the owning HUD task must add the three corresponding rows to [`interactions.md`](./interactions.md), each mapping to a canonical command kind (likely `RETREAT_BEFORE_BATTLE` / `ACCEPT_BATTLE_SURRENDER` for the engine side or, where the flow opens another screen, `41-surrender-cost-dialog`). Sibling spec aligned — see sibling [`interactions.md`](./interactions.md) § Actions.
- **HeroPortraits position note in earlier wording.** Earlier copy described portraits as "framing the top"; mockup places them on the right side. Rewrote inline to match the visual reference. Sibling [`architecture.md`](./architecture.md) Visual Composition uses the canonical component name and is unaffected.
