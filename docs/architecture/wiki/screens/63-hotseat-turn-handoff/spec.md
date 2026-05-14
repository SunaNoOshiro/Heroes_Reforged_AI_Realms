# Screen 63: Hotseat Turn Handoff

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- Engine state machine: [`tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md`](../../../../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md)
- UI screen task: [`tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md)
- Z-Stack contract: [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract)

### Description
Privacy handoff between hotseat players. The previous player's map
is hidden behind a full-screen cover until the next player presses
BEGIN. Sits between the prior seat's `END_DAY` and the next seat's
adventure-map input unblock.

### Visual Direction
Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Z-Layer: `1000` (Modal dialogs) per [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed 800x600 layout. Full-screen player-color banner and shield
  over the covered map, with next-player name, turn date, privacy
  warning, and a single BEGIN button.
- Visual idiom: dense classic-fantasy strategy chrome — ornate gold
  frame, red / brown / stone panels, compact icon slots.
- `mockup.html` contains visible UI only; logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- `HotseatTurnHandoff`
  - `PrivacyCover`
  - `PlayerColorBanner`
  - `TurnDatePlaque`
  - `BeginTurnButton`

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `nextPlayer` | `state.turn.activePlayerId` | Player whose turn is about to be shown. |
| `calendar` | `state.calendar.currentDate` | Current turn date. |
| `privacyCover` | `state.ui.hotseat.coverActive` | Presentation flag; map hidden while true. |
| `playerName` | `state.players.byId[next].displayName` | Localized or player-entered name. |
| `pendingAnnouncements` | `selectors.turn.pendingStartOfTurnAnnouncements` | Week / month / event popups dequeued after BEGIN. |

### Mechanics Mapping
- Appears only after the previous seat's `END_DAY` commits and the
  engine state machine enters `awaiting_confirm`.
- BEGIN reveals the next-player view; no gameplay commands are
  accepted while the cover is active.
- UI previews stay in local draft state until a listed command or
  route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries and content schemas, not
  hardcoded view logic.

### Animation Contract
- Previous map shutters close; next-player color banner unfurls;
  shield pulses; BEGIN opens the shutters onto the adventure map.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves the visible state changes with
  static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions covers every primary control, next-screen route,
  state update, animation, disabled, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema, config, localization, asset,
  sound, VFX, save, and replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `hotseat-turn-handoff`; system group: `multiplayer`;
  curation marker: `curated-pass-6`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime resolves presentation through asset IDs and manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — Component tree matches [`mockup.html`](./mockup.html) (cover, banner, date plaque, BEGIN). Mockup does **not** render an Options button referenced by sibling [`interactions.md`](./interactions.md) / [`data-contracts.md`](./data-contracts.md); see issues below.
- **Schema: ⚠** — Z-Layer `1000` matches [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract). State binding `state.ui.hotseat.coverActive` is not registered in [`data-inventory.md`](../../../data-inventory.md); see issues for the persisted-vs-transient classification gap.
- **Tasks: ❌** — Read First in [`63-hotseat-turn-handoff-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md) covers this file. Engine task [`07-hotseat-turn-state-machine.md`](../../../../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md) requires the cover state to derive from `AdventureState.phase`, not from a sibling `state.ui.hotseat.coverActive` slice — conflict surfaced below.

## ⚠ Issues

- **Shadow state versus engine state machine.** `privacyCover` is bound to `state.ui.hotseat.coverActive`, but the engine state machine acceptance criterion is explicit: "encoded as a `phase` enum on `AdventureState`, no shadow state stored elsewhere" ([`07-hotseat-turn-state-machine.md`](../../../../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md)). The presentation flag should derive from `AdventureState.phase ∈ {awaiting_confirm}` rather than persisting a parallel boolean. Skill did not change the binding (Hard Prohibition A — state path is a stable ID). Owners: `phase-2.08-meta-systems.07-hotseat-turn-state-machine` plus the screen UI task's selector layer.
- **Missing `data-inventory.md` row for `state.ui.hotseat.coverActive`.** Per CLAUDE.md root contract ("every persisted field is registered in `data-inventory.md`"), the slice needs an inventory row classifying it as transient UI state (no persistence) — or, preferably, the slice is removed in favor of the engine phase enum (see prior bullet). Suggested values if kept: domain=`ui`, owner=`phase-2.08-meta-systems.07-hotseat-turn-state-machine`, persistence=`in-memory`, retention=`session`. Skill did not edit [`data-inventory.md`](../../../data-inventory.md) (Hard Prohibition D).
- **`BeginTurnButton` is the only mockup affordance.** Sibling [`interactions.md`](./interactions.md) lists a second action `hotseat.options` routing to `56-options`; [`mockup.html`](./mockup.html) draws no such control. Resolution requires either an updated mockup (owner approval) or the sibling files dropping the action. Skill did not edit `mockup.html` (reference-only) and did not invent a component (Hard Prohibition B).
