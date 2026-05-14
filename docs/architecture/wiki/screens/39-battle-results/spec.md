# Screen 39: Battle Results

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Post-combat result panel. Shows victory or defeat outcome, hero
experience gained, casualties on both sides, spoils (resources and
captured artifacts), and a continue button that routes back to the
adventure map or into the victory/defeat cinematic.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Z-Layer: 1000 per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed 800x600 layout: a centered parchment dialog over a dim
  battlefield with ornate gold frame, red/brown/stone panels, two
  casualty columns, a horizontal experience ribbon, a spoils row, and
  a single continue button bottom-right.
- Bottom resource/date strip and dense classic-fantasy chrome — see
  `mockup.html` for exact dimensions and slot positions.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- `BattleResultsDialog`
  - `OutcomeBanner` — VICTORY / DEFEAT / RETREAT / SURRENDER title.
  - `AttackerCasualties` — left column, labeled "Your losses".
  - `DefenderCasualties` — right column, labeled "Enemy losses".
  - `ExperienceBar` — horizontal ribbon with current/next-level fill
    and `+N XP` count.
  - `SpoilsRow` — gold / resource / artifact reward slots.
  - `ContinueButton` — single dismiss action; mockup renders "OK".

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `battle.outcome` | `state.battle.result.outcome` | Closed enum: `win` / `loss` / `retreat` / `surrender`. |
| `experience` | `state.battle.result.experienceGained` | Hero XP reward (integer ≥ 0). |
| `casualties` | `state.battle.result.casualties` | Per-side lost stacks (attacker / defender). |
| `spoils` | `state.battle.result.spoils` | Resources and captured artifacts. |
| `nextRoute` | `state.battle.result.returnRoute` | Adventure, town, defeat, or campaign route token consumed on continue. |

UI-only hover, focus, selected casualty row, tooltip target, drag
ghost, and animation frame stay outside deterministic state.

### Mechanics Mapping
- The engine applies the battle outcome exactly once via
  `BATTLE_RESOLVED` (see
  [`command-schema.md` § BATTLE_RESOLVED](../../../command-schema.md)):
  surviving stacks, hero experience, captured artifacts, spoils,
  retreat / surrender flags, and victory-condition triggers.
- This screen reads the resulting result slice and surfaces it; it
  does **not** mutate deterministic state.
- Costs, artifacts, stacks, heroes, and resource IDs resolve through
  registries and content schemas — no hardcoded view logic.

### Animation Contract
- Outcome banner drops in, experience bar fills, spoils slots appear
  in sequence, continue button glows after all slot animations
  settle. Animation is consumption of the reducer-produced result;
  it never decides gameplay outcomes.
- Reduced-motion mode shows the same final state with static
  highlights and localized feedback (no drop / fill / glow).

### Acceptance Criteria
- Mockup is visually distinct from other screens and matches this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema, config, localization, asset,
  sound, VFX, save, and replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `battle-results`; system group: `battle`; curation
  marker: `curated-pass-2`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs / manifests; gameplay
  reads use stable IDs and scalar values only.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, layout regions, and animation order
  match `mockup.html` and the timing claims in
  [`interactions.md`](./interactions.md). Mockup-label drift
  ("Your losses" / "Enemy losses" vs `AttackerCasualties` /
  `DefenderCasualties` component names; button glyph "OK" vs
  component name `ContinueButton`) is presentation/i18n only and
  noted in `## ⚠ Issues`.
- **Schema: ⚠** — Outcome / experience / casualties / spoils /
  returnRoute are read through the store but no per-field row is
  registered. The closed `Command` enum in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  defines `BATTLE_RESOLVED` (engine clears `state.phase` from
  `"battle"`) but does not define the `state.battle.result` sub-shape
  the screen reads.
- **Tasks: ❌** — Owning task
  [`tasks/phase-2/07-ui-screen-backlog/39-battle-results-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/39-battle-results-screen.md)
  references this package as a Read First; state slices below are
  not registered in
  [`data-inventory.md`](../../../data-inventory.md) (gap shared with
  sibling [`38-combat-screen`](../38-combat-screen/data-contracts.md)
  per its own trailer).

## ⚠ Issues

- **`state.battle.result.*` not modeled in `state-shape.md`.**
  Spec binds five fields under `state.battle.result.*`, but
  [`state-shape.md` § 1](../../../state-shape.md) only documents
  in-battle keys (`battleId`, `battleStacks`, `battlefield`,
  `initiativeQueue`, `log`, `events`, `tacticsPlacement`) and notes
  the inner reducer runs while `state.phase === "battle"`.
  `BATTLE_RESOLVED` in
  [`command-schema.md`](../../../command-schema.md) transitions the
  phase back to `"adventure"` and updates winner / loser armies, but
  does not name a `result` payload destination. Per CLAUDE.md ("every
  persisted field is registered in `data-inventory.md`"), the
  owning engine task for `BATTLE_RESOLVED` (Phase-2 battle-result
  wiring) must add the sub-shape to `state-shape.md` and register a
  row in `data-inventory.md`. Suggested values: domain=`battle`,
  owner=`tasks/phase-2/07-ui-screen-backlog/39-battle-results-screen.md`
  (consumer) + the BATTLE_RESOLVED producer task, persistence=`save
  records only` (not standalone), retention=`session`. Not rewritten
  here per Hard Prohibition D (never edit cross-checked files).
- **Mockup label drift.** Mockup uses perspective labels
  ("Your losses" / "Enemy losses") but the component tree uses
  party-based names (`AttackerCasualties` / `DefenderCasualties`).
  Both are acceptable — components stay perspective-neutral while
  the rendered string is localized — but the localization keys must
  resolve to the rendered labels. Captured under
  `ui.battle-results.status.*` in
  [`data-contracts.md`](./data-contracts.md); flagged so the
  implementer does not name the localization keys after the
  component names.
- **Continue button glyph "OK".** Mockup renders the dismiss button
  as `OK`. The component is `ContinueButton`. Treat the rendered
  text as a localization key (`ui.battle-results.actions.continue`
  or equivalent) so a future visual revision can change the glyph
  without renaming the component.
