# Screen 61: AI Turn Indicator

System: `system` · Screen slug: `ai-turn-indicator` ·
Archetype: `curated-ai-turn-indicator` · Curation: `curated-pass-6`.

## 1. Screen Package

- Mockup: [`mockup.html`](./mockup.html) — visual reference only.
- Interactions: [`interactions.md`](./interactions.md) — per-control
  behavior, timing, disabled / error rules.
- Data Contracts: [`data-contracts.md`](./data-contracts.md) — schemas,
  selectors, commands, assets, localization.
- Architecture Diagrams: [`architecture.md`](./architecture.md) — load,
  interaction, and animation flows.

## 2. Description

Adventure-map overlay shown while a non-human player resolves its
turn. It surfaces the active AI color, a phase-by-phase progress
indicator, current activity text, and a fast-forward control. The
overlay never makes gameplay decisions: it only renders the AI
command batch the engine is replaying.

## 3. Visual Direction

- Original internal UI contract. Never use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.
- Dense classic-fantasy strategy palette: ornate gold frame, red /
  brown / stone panels, fixed `800 × 600` layout, compact icon slots,
  bottom status / resource feedback.

## 4. Visual Contract

- Z-Layer: **400** per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Background: adventure map continues to render but is dimmed; the
  overlay floats above it as a compact banner.
- Banner contents (left → right): player-color crest pulse, label
  block (`{Color} Player Turn` over current activity), and a row of
  progress beads marking phase completion (lit = done, dim = pending).
- Status bar (bottom of the map): one-line natural-language
  description of what the AI is currently doing
  (e.g. *"Blue AI is moving heroes and resolving towns."*).
- `mockup.html` shows visible UI only; logic, transitions, and
  implementation notes live in the Markdown package files.

## 5. Component Tree

```
AiTurnIndicator
├── DimmedAdventureMap        # background, non-interactive
├── PlayerCrest               # color disk + pulse animation
├── ProgressBeads             # one bead per AI phase
├── ActivityText              # localized "currentPhase" string
└── SpeedControls             # fast-forward button (see § 8)
```

## 6. State Bindings

| Element | Bound to | Notes |
|---|---|---|
| `aiPlayer` | `state.turn.activePlayerId` | AI player currently acting. |
| `aiPhase` | `state.ai.currentPhase` | Enum: `planning`, `moving`, `combat`, `town`, `done`. |
| `commandBatch` | `state.ai.visibleCommandBatch` | Commands the renderer is currently replaying. |
| `speed` | `config.ui.aiTurnSpeed` | Presentation speed only — never a gameplay input. |
| `interruptGuard` | `selectors.ai.canFastForwardOrPause` | Whether fast-forward / pause is currently allowed. |

UI-only state (hover, focus, drag ghost, animation frame) stays out
of deterministic gameplay state.

## 7. Mechanics Mapping

- The overlay **observes** AI command generation and replay; it
  never decides outcomes. Deterministic AI commands flow through the
  same command bus as human commands.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas, not
  hardcoded view logic.

## 8. Animation Contract

- `PlayerCrest` rotates / pulses while the AI acts.
- `ProgressBeads` advance one bead per completed command batch.
- The map camera pans to the location of each visible AI action.
- On AI-turn end, the overlay fades out and control returns to the
  next human player.
- Animation consumes reducer / route results — never decides them.
- Reduced-motion mode (`config.ui.reducedMotion = true`) replaces
  motion with static highlights and localized feedback per
  [`animation-contract.md`](../../../animation-contract.md).

## 9. Acceptance Criteria

- Layout, bindings, and commands match `mockup.html`,
  `interactions.md`, and `data-contracts.md`.
- All visible regions are listed in § 5 with authoritative state
  bindings from § 6.
- Every primary control's behavior, next-screen route, state update,
  animation, disabled case, and error path is covered in
  `interactions.md`.
- `architecture.md` diagrams are screen-specific (not copied
  archetype diagrams) and mirror the interactions in this package.
- Schema / config / localization / asset / sound / VFX / save /
  replay references are enumerated in `data-contracts.md`.

## 10. AI Implementation Notes

- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; deterministic
  gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — `mockup.html` exposes only the `aiTurn.fastForward`
  button; `aiTurn.speed` and `aiTurn.complete` have no visible
  surface in the mockup. The spec keeps `SpeedControls` because
  sibling [`interactions.md`](./interactions.md) and
  [`data-contracts.md`](./data-contracts.md) both bind it.
- **Schema: ✔** — `state.ai.currentPhase` enum (`planning |
  moving | combat | town | done`) is taken from the original spec
  and mirrored in sibling docs.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.61-ai-turn-indicator-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/61-ai-turn-indicator-screen.md)
  references all four package files in its Read First block.

## ⚠ Issues

- **Mockup missing speed / complete affordances.** `mockup.html`
  shows a single `aiTurn.fastForward` button. The
  `aiTurn.speed` control referenced in `interactions.md` and the
  implicit `aiTurn.complete` route handoff have no `data-action`
  hook in the SVG. Per
  [`.agents/rules/ui.md`](../../../../../.agents/rules/ui.md),
  mockup is the visual reference; the owning task
  `phase-2.07-ui-screen-backlog.61-ai-turn-indicator-screen` should
  either (a) extend the mockup with a speed selector + auto-fade
  hook, or (b) demote `SpeedControls` to a single fast-forward
  affordance in this spec. Skill did not edit the mockup (Hard
  Prohibition D).
- **`state.ai.currentPhase` / `state.ai.visibleCommandBatch` not
  in data-inventory.md.** No row exists in
  [`data-inventory.md`](../../../data-inventory.md) for either
  slice. Per CLAUDE.md root contract, registration is only required
  for **persisted** fields; if these stay session-transient
  in-memory state they need no row. If they are persisted (save /
  replay), the AI runtime owner (`mvp.10-heuristic-ai.*`) must add
  rows before merge.
