# 3. UI STATE & INTERACTIONS

### Q: 46. Is UI state separate from game state, or derived from it?

**Status:** ✔ Defined

**Answer:**
UI state is **separate** from gameplay state. The architecture explicitly distinguishes:
- Authoritative **gameplay state** owned by the deterministic reducer in `src/engine/`.
- **UI state** held under `state.ui.*` (e.g. `state.ui.confirmation.*`, `state.ui.adventure.pathPreview`, `state.ui.tooltips.pinnedObjectId`, `state.ui.loading.*`, `state.ui.systemMenu.callerRoute`, `state.ui.unsavedDrafts`).
- **Read-only derived views** consumed via selectors (e.g. `selectors.mapObjects.publicTooltipInfo`, `selectors.persistence.canSaveCurrentGame`, `selectors.session.restartGuard`).

Each screen `interactions.md` repeats the rule: *"UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state."*

**Evidence:**
- [docs/architecture/state-flow.md](../architecture/state-flow.md) — Boundary table; renderer is read-only, UI emits commands.
- [docs/architecture/wiki/screens/01-main-menu/interactions.md](../architecture/wiki/screens/01-main-menu/interactions.md) — `state.ui.*` vs `state.shell.*` split.
- [docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md](../architecture/wiki/screens/60-confirmation-dialog/interactions.md) — `state.ui.confirmation.*` namespace.
- [docs/architecture/wiki/screens/18-map-object-tooltip/interactions.md](../architecture/wiki/screens/18-map-object-tooltip/interactions.md) — `state.ui.tooltips.*`, `state.ui.pointer.*`.
- [docs/architecture/overview.md](../architecture/overview.md) — "Gameplay and presentation stay separate" (Core Rule #3).

---

### Q: 47. If derived, are all derivations pure functions?

**Status:** ⚠ Partial

**Answer:**
Derivations live behind named **selectors** (`selectors.mapObjects.publicTooltipInfo`, `selectors.scouting.hiddenTooltipFields`, `selectors.persistence.hasLoadableSave`, `selectors.persistence.canSaveCurrentGame`, `selectors.session.restartGuard`) and the deterministic-path rules forbid `Math.random()`, `Date.now()`, async timing, and uncontrolled floats — which strongly implies pure derivation. However, there is **no explicit "selectors are pure" contract** and no implementation yet (`src/ui/`, `src/renderer/` contain only README stubs). Purity is asserted by convention, not enforced by a test or type rule.

**Evidence:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — Forbidden in deterministic paths section.
- [docs/architecture/wiki/screens/](../architecture/wiki/screens/) — selector references but no schema for selector contracts.
- Missing: explicit "selectors must be pure" assertion in any of [docs/architecture/](../architecture/) docs.

---

### Q: 48. If separate, how is divergence prevented?

**Status:** ✔ Defined

**Answer:**
The single mutation path is enforced architecturally:
- **UI never mutates state directly** — it only emits commands.
- The engine's command dispatcher is the **only** writer (`state' = apply(state, command)`).
- The renderer is read-only. UI bindings are listed per screen as `state.* refreshes <element> after the owning reducer or local UI draft changes`.
- Determinism stack (seeded RNG, fixed-point math, canonical serializer, replay API, fuzz harness) and `(seed, contentHash, command log)` triple ensure the reducer is the only source of truth.
- Local UI drafts (e.g. setup wizard fields, path preview, tooltip pin) explicitly do **not** flow into save/replay state.

**Evidence:**
- [docs/architecture/state-flow.md:56-58](../architecture/state-flow.md#L56-L58) — *"The arrow from F → O is the only path state changes take. Rendering reads state; the UI emits commands; the engine owns the reducer. No other mutation path exists."*
- [docs/architecture/determinism.md](../architecture/determinism.md) — `state = apply(state, command)` reducer rule.
- [docs/architecture/overview.md](../architecture/overview.md) — repo shape and core rules.

---

### Q: 49. What screens exist, and are all transitions between them enumerated?

**Status:** ⚠ Partial

**Answer:**
**65 screens** are fully enumerated in 8 categories:
- Menus & Game Setup (01–06)
- Adventure Map (07–23)
- Town & Castle (24–37)
- Battle (38–45)
- Hero & Army (46–53)
- System & Dialogs (54–61)
- Multiplayer (62–64)
- Editor (65)

Each screen package has `mockup.html`, `spec.md`, `interactions.md`, `data-contracts.md`, and `architecture.md`. Per-screen `interactions.md` lists every action with a "Next Screen" column.

However, **there is no global state-transition graph / matrix** that aggregates every legal transition across screens. Transitions are recoverable only by reading every screen's interactions table and reconciling them. `docs/architecture/screen-command-coverage.json` covers commands, not navigation graph topology.

**Evidence:**
- [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json) — full enumeration.
- [docs/architecture/wiki/screens/01-main-menu/interactions.md](../architecture/wiki/screens/01-main-menu/interactions.md) — example "Next Screen" column.
- Missing: aggregated `screen-transition-graph.md` or equivalent.

---

### Q: 50. Is there a screen-state machine, and is it formal (FSM) or ad hoc?

**Status:** ⚠ Partial

**Answer:**
**Ad hoc** at the screen-router level. There is no formal FSM definition for screen transitions. Routes are described prose-style ("can route to `02-new-game-setup` after guard approval and exit animation") in each screen's `interactions.md`. The migration plan and wiki README do not define a router state machine.

Formal state machines exist only for sub-systems:
- **Engine `phase`** field: `"player_turn" | "ai_turn" | "battle" | "game_over"` (`AdventureState`).
- **Hotseat turn-handoff state machine** is planned as a phase-2 task.
- **Tactical battle** is a nested reducer.

**Evidence:**
- [tasks/mvp/05-adventure-map/01-strategic-game-state-model.md](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md) — engine `phase` enum.
- [tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md](../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md) — planned, not implemented.
- Missing: top-level UI router/screen FSM definition.

---

### Q: 51. What happens when a transition is requested from an invalid state?

**Status:** ✔ Defined

**Answer:**
Every screen's `interactions.md` repeats the same uniform rejection contract:
- *"Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail."*
- *"Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly."*
- *"On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback."*

Pre-action prevention is via control-disabling guards. Post-rejection, the caller screen stays open with a localized error message. Invalid content IDs / rejected commands fail loudly (not silently). Asset-resolution failures may use a fallback; gameplay-rule failures must not.

**Evidence:**
- [docs/architecture/wiki/screens/](../architecture/wiki/screens/) — every `interactions.md` "Disabled And Error Cases" section.
- Missing: enumerated guard taxonomy (which guard fires on which transition).

---

### Q: 52. Are all UI states (idle, hover, pressed, disabled, focused, error, loading) defined per component?

**Status:** ⚠ Partial

**Answer:**
The animation contracts and disabled/error sections cover **hover, pressed, disabled, error, and loading**:
- Hover: "hovered command icon glow"
- Pressed: "pressed command depresses"
- Disabled: "Disable controls when … fail"
- Error: "show localized error text, and play failure feedback" (`ui.main-menu.errors.*` localization keys)
- Loading: dedicated screen (`59-loading-screen`) with `state.ui.loading.taskId` / `progress` / `errors`.

**Idle** and **focused** are weaker:
- "Idle" is implicit in animation contracts ("creature portrait idles") but not a contract field.
- "Focused" is referenced (`state.ui.kingdomOverview.selectedRowId` "for keyboard and pointer navigation"; "Object under pointer or controller focus") but no per-component focus-state visual contract is enumerated.

There is no normative component-state matrix that says "every interactive control MUST define states {idle, hover, pressed, disabled, focused, error, loading}".

**Evidence:**
- [docs/architecture/wiki/screens/01-main-menu/spec.md](../architecture/wiki/screens/01-main-menu/spec.md) — Animation Contract.
- [docs/architecture/wiki/screens/59-loading-screen/spec.md](../architecture/wiki/screens/59-loading-screen/spec.md) — loading taxonomy.
- [docs/architecture/wiki/screens/08-kingdom-overview/spec.md](../architecture/wiki/screens/08-kingdom-overview/spec.md) — focus row.
- Missing: canonical "component states" definition document.

---

### Q: 53. Are state combinations (e.g. hover+disabled) explicitly resolved?

**Status:** ❌ UNKNOWN

**Answer:**
No documentation defines the resolution rule when component states overlap. Standard patterns (disabled wins over hover; focused remains visible while disabled; error overlays loading) are nowhere specified. The Animation Contract sections describe states sequentially, not as composable layers.

**Evidence:**
- No matches in [docs/architecture/wiki/](../architecture/wiki/) for "hover+disabled", "state precedence", or "state combination".
- Missing: component state resolution table.

---

### Q: 54. What is the canonical error state representation?

**Status:** ⚠ Partial

**Answer:**
Two error surfaces are defined:
1. **Localized error text** rendered on the caller screen via localization keys (e.g. `ui.main-menu.errors.*`); each screen lists its own error key namespace in `data-contracts.md`. Backed by `localization.schema.json`.
2. **Recoverable load errors** stored at `state.ui.loading.errors` with a `RecoverableErrorPanel` component on the Loading Screen (`59-loading-screen`).

There is no central `ErrorState` schema — no agreed shape for `{ code, severity, message, recoveryActions, retryable }`. Each screen handles errors locally by binding to its own slice.

**Evidence:**
- [docs/architecture/wiki/screens/59-loading-screen/spec.md](../architecture/wiki/screens/59-loading-screen/spec.md) — `state.ui.loading.errors`.
- [docs/architecture/wiki/screens/01-main-menu/data-contracts.md](../architecture/wiki/screens/01-main-menu/data-contracts.md) — `ui.main-menu.errors.*` localization keys.
- Missing: canonical `ErrorState` schema in [content-schema/schemas/](../../content-schema/schemas/).

---

### Q: 55. How are partial / pending states (e.g. "spell being cast") visualized?

**Status:** ⚠ Partial

**Answer:**
Per-domain pending state slots exist:
- `state.pendingBattle.*` for pre-battle dialog (attacker, defender, terrain, tactics, retreat).
- `state.ui.confirmation.pendingAction` for awaiting confirmation.
- `state.ui.loading.taskId` / `progress` for loading.
- `state.ui.adventure.pathPreview` for hero path preview.
- Spell targeting routes through dedicated screens (`17-adventure-spell-targeting`, `44-combat-spell-targeting`) with a "spell targeting draft".

Visualization patterns: dotted path march, pulsing halos, animated crest rotation, target cursor, "modal pops in", "warning icon pulses".

There is **no canonical "in-flight command" indicator** for the synchronous reducer model — because the reducer is synchronous and pure, "spell being cast" is not a runtime async state but a sequence of (a) targeting screen, (b) command dispatched, (c) animation timeline. No formal contract distinguishes "command queued" from "command applied" from "animation playing".

**Evidence:**
- [docs/architecture/wiki/screens/40-pre-battle-dialog/spec.md](../architecture/wiki/screens/40-pre-battle-dialog/spec.md) — `state.pendingBattle.*`.
- [docs/architecture/wiki/screens/17-adventure-spell-targeting/](../architecture/wiki/screens/17-adventure-spell-targeting/) — targeting flow.
- Missing: formal "command in-flight" UI contract.

---

### Q: 56. Is keyboard navigation specified, or only mouse?

**Status:** ⚠ Partial

**Answer:**
Keyboard navigation is **referenced but not enumerated**:
- `selectedRow` bindings are explicitly described as "for keyboard and pointer navigation" (Kingdom Overview, others).
- `missing-states.md` lists "keyboard focus traversal for modal-heavy screens" as a *Lower Priority Variant* — i.e. acknowledged as a gap.
- No global hotkey table exists. The wiki README authoring rules say `interactions.md` should include "every button, **hotkey**, route, command, …" but only mouse/click and right-click are populated in current files.
- No focus-order, tab-trap, or ARIA-equivalent contract.

**Evidence:**
- [docs/architecture/wiki/missing-states.md](../architecture/wiki/missing-states.md) — accessibility section.
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md) — hotkey requirement.
- [docs/architecture/wiki/screens/08-kingdom-overview/spec.md](../architecture/wiki/screens/08-kingdom-overview/spec.md) — focus row binding.
- Missing: per-screen hotkey columns in interactions tables; global hotkey registry.

---

### Q: 57. Are gamepad / touch inputs in scope?

**Status:** ⚠ Partial

**Answer:**
- **Touch:** Renderer must run on "desktop + tablet" with WebGL2 context loss recovery for tablet suspend/resume; camera supports "mobile pinch + scroll wheel". Touch is in scope at the renderer level, but no per-screen touch interaction contracts (tap targets, swipe, pinch on UI panels) exist.
- **Controller:** Mentioned only as "Object under pointer or controller focus" in tooltip bindings. No controller mapping, no analog-stick navigation contract.
- **Gamepad API:** No reference.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:13,92](../architecture/renderer-technology-choice.md) — desktop + tablet, pinch zoom.
- [docs/architecture/wiki/screens/18-map-object-tooltip/spec.md](../architecture/wiki/screens/18-map-object-tooltip/spec.md) — "controller focus" mention.
- Missing: input-mapping contract; per-screen touch interaction tables.

---

### Q: 58. How are double-clicks, long-presses, and drag gestures defined?

**Status:** ❌ UNKNOWN

**Answer:**
Only **right-click** (open tooltip) and **hold delay** (tooltip fade-in) are formally specified. Other gestures are not defined:
- Double-click: no references.
- Long-press: no references (only "hold delay" for tooltip rendering, not as an input gesture).
- Drag: "drag ghost" mentioned only as a *transient UI-only* artifact ("stay outside deterministic gameplay state") with no associated interaction contract for drag-source / drag-target / drop-acceptance / drag-cancel.

**Evidence:**
- [docs/architecture/wiki/screens/18-map-object-tooltip/interactions.md](../architecture/wiki/screens/18-map-object-tooltip/interactions.md) — right-click + hold delay.
- Missing: gesture taxonomy; double-click behaviors (e.g. open hero on double-click of portrait); drag-and-drop contract for army stacks / artifacts.

---

### Q: 59. What happens on simultaneous conflicting input (click + key)?

**Status:** ❌ UNKNOWN

**Answer:**
No documentation defines input-conflict resolution. There is no specified policy for:
- Mouse-click vs. simultaneous hotkey on the same control.
- Modal-open while a hover-tooltip is mid-fade.
- End-turn requested while AI animation is still playing.
- Drag-in-progress + Esc.

**Evidence:**
- No matches for "conflict", "input precedence", "race", "input lock" in [docs/architecture/wiki/](../architecture/wiki/).
- Missing: input-arbitration / input-lock contract.

---

### Q: 60. Are modal stacks supported, and how deep can they nest?

**Status:** ⚠ Partial

**Answer:**
Modals exist (`60-confirmation-dialog`, `54-system-menu`, `09-map-object-dialog`, `25-building-recruitment-dialog`, `40-pre-battle-dialog`, `48-level-up-dialog`, `51-split-stack-dialog`, `52-artifact-combine-dialog`). Each modal stores a `callerRoute` to return to (`state.ui.confirmation.callerRoute`, `state.ui.systemMenu.callerRoute`).

Examples that imply 2-level stacking exist — System Menu → Main Menu opens `60-confirmation-dialog`, so the caller is itself a modal. However:
- No explicit **modal stack** data structure (`state.ui.modalStack: ModalEntry[]`).
- No declared **maximum nesting depth**.
- No rule for whether modals serialize to a stack or replace each other.

The single-`callerRoute` field implies one-level remembering, which would break with 3+ deep nesting.

**Evidence:**
- [docs/architecture/wiki/screens/54-system-menu/interactions.md](../architecture/wiki/screens/54-system-menu/interactions.md) — `system.mainMenu` → `60-confirmation-dialog`.
- [docs/architecture/wiki/screens/60-confirmation-dialog/spec.md](../architecture/wiki/screens/60-confirmation-dialog/spec.md) — single `callerRoute` field.
- Missing: explicit modal stack schema; max-depth contract.

---

### Q: 61. What dismisses a modal — Esc, click-outside, both, neither?

**Status:** ❌ UNKNOWN

**Answer:**
Only **explicit Cancel/Resume buttons** are defined (e.g. `confirm.cancel`, `system.resume`). No documentation says whether:
- **Esc** closes any modal.
- **Click-outside / scrim click** closes any modal.
- These behaviors vary by modal severity (e.g. destructive vs. informational).

The wiki README requires `interactions.md` to list "every … hotkey", but no current `interactions.md` records an Esc binding.

**Evidence:**
- [docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md](../architecture/wiki/screens/60-confirmation-dialog/interactions.md) — only Confirm/Cancel button actions.
- [docs/architecture/wiki/screens/54-system-menu/interactions.md](../architecture/wiki/screens/54-system-menu/interactions.md) — only Resume button.
- Missing: dismissal-policy contract per modal severity tier.

---

### Q: 62. How is focus restored after modal close?

**Status:** ⚠ Partial

**Answer:**
**Route-level** restoration is defined: closing a modal returns to `callerRoute` (e.g. `state.ui.systemMenu.callerRoute`, `state.ui.confirmation.callerRoute`). This restores the **screen**.

**Element-level focus** restoration (which button or list-row was focused before opening the modal) is **not specified**. There is no `state.ui.focus.previousElementId` slot nor a "focus restore" rule in any spec. The `selectedRowId`-style fields exist per screen but are not declared as the focus-restoration targets.

**Evidence:**
- [docs/architecture/wiki/screens/54-system-menu/interactions.md](../architecture/wiki/screens/54-system-menu/interactions.md) — `callerRoute` restore.
- [docs/architecture/wiki/screens/60-confirmation-dialog/spec.md](../architecture/wiki/screens/60-confirmation-dialog/spec.md) — `callerRoute` only.
- Missing: element-level focus stack / restoration rule.

---

### Q: 63. Is undo/redo supported in any UI flow?

**Status:** ❌ UNKNOWN

**Answer:**
No undo/redo support is defined anywhere in the architecture or task system. The deterministic command-log model would technically allow time-travel debugging (replay through N-1 commands), but no UI flow surfaces it. The Map Editor (`65-map-editor`) is the most natural undo/redo candidate, but its package does not specify undo behavior. No `state.ui.history`, no `UNDO_LAST_COMMAND`, no editor "undo stack" appears.

**Evidence:**
- No matches for "undo" / "redo" in [docs/architecture/wiki/](../architecture/wiki/) or [docs/planning/](../planning/) (only one unrelated reference in audit notes).
- Missing: undo/redo contract — particularly for the map editor.

---

### Q: 64. Are tooltips delayed, instant, or hover-locked?

**Status:** ✔ Defined

**Answer:**
Map-object tooltips are **delayed** (hold-delay fade-in) and **pinnable** (hover-locked variant). Behavior:
- Right-click opens tooltip (`tooltip.open`).
- Pin keeps tooltip visible while pointer moves (`tooltip.pin` → `state.ui.tooltips.pinnedObjectId`).
- "Open details" routes to `09-map-object-dialog` or `50-creature-info`.
- Close clears UI draft only.
- *"Tooltip fades in after hold delay, tracks the object anchor, pins with a brass tack, and fades out without changing gameplay state."*

The exact delay duration (ms) is not numerically defined.

**Evidence:**
- [docs/architecture/wiki/screens/18-map-object-tooltip/interactions.md](../architecture/wiki/screens/18-map-object-tooltip/interactions.md) — full tooltip flow.
- [docs/architecture/wiki/screens/18-map-object-tooltip/spec.md:46](../architecture/wiki/screens/18-map-object-tooltip/spec.md#L46) — Animation Contract.
- Missing: numeric delay constant; whether *all* tooltips share the same delay or it varies (creature-info "Hover ability" is described differently).

---

### Q: 65. What happens when state changes while a tooltip is open?

**Status:** ❌ UNKNOWN

**Answer:**
No rule defines tooltip behavior under concurrent state change. Specifically undefined:
- Underlying object destroyed/owned-by-another (combat death, capture).
- Object becomes hidden by fog of war.
- Pin target removed from map.
- Selectors that feed `publicTooltipInfo` returning a new shape.

The general rejection contract ("show localized error text, and play failure feedback") is generic and does not specifically cover the open-tooltip-stale-data case. No "tooltip auto-dismiss on stale anchor" rule.

**Evidence:**
- [docs/architecture/wiki/screens/18-map-object-tooltip/interactions.md](../architecture/wiki/screens/18-map-object-tooltip/interactions.md) — no stale-data clause.
- Missing: tooltip-invalidation contract.

---

## 🔍 Summary

### Missing Logic
- **Aggregated screen-transition graph** — no global FSM/matrix; transitions only listed per-screen.
- **Component state matrix** — `{idle, hover, pressed, disabled, focused, error, loading}` not normatively defined per component, and combinations (hover+disabled, focus+error) are unresolved.
- **Canonical `ErrorState` schema** — error rendering is ad hoc per screen, without a shared `{code, severity, message, recoverable, retryAction}` shape.
- **Modal stack data structure** — `callerRoute` is a single field; no nesting depth declared.
- **Modal dismissal policy** — Esc / click-outside behavior unspecified; only explicit Cancel/Resume buttons.
- **Element-level focus restoration** — only screen-level `callerRoute` is restored; no previous-element focus stack.
- **Hotkey registry** — `interactions.md` template asks for hotkeys, but tables omit them.
- **Gesture taxonomy** — double-click, long-press, drag-and-drop, multi-touch UI gestures are undefined.
- **Input-conflict resolution** — no policy for click+key, end-turn during animation, drag+Esc, etc.
- **Undo/redo** — absent everywhere, including the map editor.
- **Tooltip stale-data rule** — no contract for what happens when the underlying object changes mid-display.
- **Selector purity contract** — convention only; no enforced rule that selectors are pure functions.
- **Numeric timing constants** — tooltip hold-delay, animation durations, debounce/throttle thresholds are unstated.

### Risks
- **Implementer drift:** With component states and modal mechanics undefined, two engineers (or two AI agents) will produce inconsistent UI behaviors that look correct in isolation but conflict when composed.
- **Accessibility debt:** No keyboard-focus-traversal contract means modal-heavy screens (Hero, Town, Marketplace) will ship as mouse-only and need expensive retrofitting.
- **Multi-modal correctness bug:** A single `callerRoute` field cannot represent a 3-level modal stack; first time it's reached, focus and route restoration will silently break.
- **Race conditions:** Without input-conflict policy, simultaneous click+hotkey on End Turn / Cast Spell can dispatch two commands or stall the queue, producing replay-divergent inputs.
- **Tooltip lifecycle bug:** A tooltip pinned to a stack that dies in combat or is captured will reference a stale object — no invalidation rule defined.
- **Map-editor authoring friction:** No undo/redo will be a usability blocker the moment authors start editing.
- **Touch claims unproven:** "Desktop + tablet" support claimed at renderer level but UI does not enumerate touch targets, swipe semantics, or mobile-specific layouts.

### Improvements
- Add `docs/architecture/ui-state-contract.md` covering: component state matrix, state-combination precedence (disabled wins, focus persists, error overlays loading), and a normative `ErrorState` schema.
- Add `docs/architecture/ui-routing.md` aggregating the screen graph with a generated transition matrix, modal-stack semantics, max nesting depth, and dismissal policies (Esc, click-outside) keyed by `severity`.
- Add a `Hotkeys` column to every screen's `interactions.md` and a global hotkey registry under `content-schema/schemas/hotkey.schema.json`.
- Add a gesture/input-arbitration spec defining double-click, long-press, drag-and-drop, focus-restoration stack, and click+key precedence.
- Add a `state.ui.modalStack: ModalEntry[]` slot with `previousFocusElementId`, replacing single-shot `callerRoute` fields.
- Add a tooltip-lifecycle rule (auto-dismiss on stale anchor; re-bind on selector change).
- Pin numeric timing constants (tooltip delay ms, animation durations) in a UI ruleset record so they are content-driven, not code-baked.
- Declare an explicit "selectors are pure" contract and add a lint/test that forbids `Math.random()` / `Date.now()` in selector files once `src/ui/` has code.
- Define an undo/redo contract at minimum for the map editor — leveraging the existing command-log pattern.

### AI-Readiness
**Score:** 6 / 10

**Reason:**
The strategic boundaries are excellent: gameplay vs UI state separation is enforced in prose, the reducer is the only writer, screen packages are exhaustively scaffolded (65 screens × 5 files), every screen advertises actions/commands/disabled-cases in a uniform table, and selectors / state slices are namespaced consistently. An AI agent can confidently implement *one screen in isolation*.

What blocks a higher score:
- **Cross-screen behavior is under-specified** — modal stacks, focus restoration, dismissal policies, input arbitration, gesture taxonomy, hotkeys, and undo/redo are absent. Two AI agents implementing different screens will diverge on these.
- **No global screen-transition graph** means an agent cannot validate that a navigation it adds is reachable / reversible.
- **Component state matrix and error schema are implicit**, forcing each agent to reinvent rules that should be shared.
- **No source code yet** — `src/ui/`, `src/renderer/`, `src/engine/` are README-only, so contracts are purely textual; nothing is validated by tests.

Closing the cross-screen gaps (routing matrix, modal stack, hotkey registry, gesture spec, ErrorState schema) would push this to 8.5 / 10 without writing a line of runtime code.
