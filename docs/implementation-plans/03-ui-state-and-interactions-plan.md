# Implementation Plan: 03 — UI State & Interactions

> Source audit: [docs/readiness-audit/03-ui-state-and-interactions.md](../readiness-audit/03-ui-state-and-interactions.md)
>
> This plan converts the audit's ❌ UNKNOWN, ⚠ Partial, Missing Logic,
> and Risk items into concrete documentation, schema, screen-package,
> and task work. Nothing here invents gameplay; every change formalizes
> a cross-screen contract that is already implied by the existing wiki
> packages and architecture docs but not pinned at a single canonical
> location.

---

## 1. Overview

**Scope.** Close the thirteen gaps the UI-state-and-interactions audit
flagged as blocking cross-screen consistency, accessibility, modal
correctness, replay-safe input handling, and AI-agent screen
implementation:

1. Aggregated screen-transition graph + screen-router FSM (Q49, Q50)
2. Selector purity contract (Q47)
3. Component-state matrix and state-combination precedence
   (Q52, Q53)
4. Canonical `ErrorState` schema (Q54)
5. Modal-stack data structure + max-depth contract (Q60)
6. Modal dismissal policy — Esc, click-outside, by severity (Q61)
7. Element-level focus restoration (Q62)
8. Hotkey registry + per-screen hotkey columns (Q56, Q61)
9. Gesture taxonomy — double-click, long-press, drag-and-drop (Q58)
10. Input-arbitration / conflict-resolution contract (Q59)
11. Touch + gamepad input contracts (Q57)
12. Pending / in-flight command UI contract (Q55)
13. Tooltip lifecycle — stale anchor + timing constants (Q64, Q65)
14. Undo/redo contract — minimum viable for the map editor (Q63)

**Readiness state today.** AI-Readiness scored **6 / 10**. The
single-screen contract is excellent: 65 packages × 5 files, uniform
action/command/disabled tables, namespaced `state.ui.*` slots, and a
strict reducer-only mutation rule. What is missing is the
**cross-screen layer**: the graph that connects screens, the rules
that compose component states, the schema that shapes errors, the
arbitration that orders input, and the stack that nests modals.

Closing the gaps in this plan should push the readiness score to
**8.5 / 10** without writing any runtime code — every item below
produces docs, schemas, or screen-package edits, plus task records
that pull the work into the existing `npm run tasks:next` queue.

**Out of scope.** Authoring runtime UI code, choosing visual styling,
re-curating screen mockups, building the WebGPU path, or implementing
the M5 lockstep transport. Frame-lag and renderer/UI-seam contracts
belong to the [02-ui-rendering-system](02-ui-rendering-system-plan.md)
plan and are not duplicated here.

---

## 2. Critical Fixes (Must Do First)

These must land before any new screen-implementation task starts. They
are ordered by blast radius — each one, if left open, will fragment
behavior across the 65 screen packages and silently corrupt save
or replay flows.

1. **Component-state matrix + combination precedence (Issue 3.A-3)** —
   without normative `{idle, hover, pressed, disabled, focused, error,
   loading}` rules and a precedence table, two AI agents implementing
   different screens will diverge on visible behavior.
2. **Modal-stack contract (Issue 3.A-4)** — single-shot `callerRoute`
   silently fails on ≥ 3-level nesting, which the existing
   `54-system-menu` → `60-confirmation-dialog` chain already implies.
3. **Input-arbitration contract (Issue 3.A-6)** — without a click+key
   precedence rule, the synchronous reducer can dispatch two commands
   for one user action, producing replay-divergent inputs that break
   M5 lockstep before it ships.
4. **`ErrorState` schema (Issue 3.B-1)** — every screen currently
   invents its own error shape; any cross-screen error pipe (toast
   tray, recoverable-error panel, telemetry sink) needs a shared
   record before screens land.
5. **Screen-router FSM + transition graph (Issue 3.A-1)** — without
   an aggregated graph, agents cannot validate that a navigation they
   add is reachable or reversible, and dependency ordering between
   screen tasks cannot be enforced by `validate:tasks`.

---

## 3. System Improvements

### Architecture

#### Issue 3.A-1: Screen-router FSM + aggregated transition graph

**Source:** Q49 (⚠ Partial), Q50 (⚠ Partial), Missing Logic bullet 1

**Problem:**
Each screen's `interactions.md` lists a "Next Screen" column, but no
document aggregates every legal transition across the 65 packages.
The router itself is described prose-style, not as a formal FSM. The
existing `docs/architecture/screen-command-coverage.json` covers
commands, not navigation topology. There is no top-level UI-router
state machine to validate reachability or detect orphan screens.

**Impact:**
- AI agents cannot validate a transition they add is reachable from
  the main menu or reversible to it.
- `validate:tasks` cannot detect a screen package that has no inbound
  transition.
- Multiplayer (M5) has no canonical "what screens are valid mid-turn"
  rule to gate spectator state-sync.
- Refactors that delete or rename a screen route silently leave
  dangling references in other screen `interactions.md`.

**Solution:**
1. Create `docs/architecture/ui-routing.md` defining:
   - The `ScreenRoute` enum (one entry per package, mirroring
     `wiki/screens/index.json`).
   - The `RouterState = { active: ScreenRoute, modalStack: ModalEntry[] }`
     shape (modal stack covered by Issue 3.A-4).
   - Transition rules: declarative `from → to` records, route guards,
     pre-transition exit animations, and the rejection contract.
   - Group-level invariants (e.g. battle screens are only reachable
     while engine `phase = "battle"`).
2. Add `docs/architecture/screen-transition-graph.json` — generated
   from each screen's `interactions.md` "Next Screen" column by a new
   `npm run generate:screen-transition-graph` script (writing to
   `docs/architecture/`). Each entry: `{ from, to, trigger, guard }`.
3. Add a Mermaid render of the graph at the top of `ui-routing.md`,
   regenerated by the same script.
4. Extend `npm run validate` to fail on:
   - a screen package with zero inbound transitions (orphan);
   - a `Next Screen` reference that does not resolve to an
     `index.json` package id;
   - a transition whose `guard` references a selector that does not
     exist in `selectors.*` (registry covered by Issue 3.A-2).

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) —
  add `ui-routing.md` and `screen-transition-graph.json` to the
  architecture index
- [CLAUDE.md](../../CLAUDE.md) — append `ui-routing.md` to the
  read-first list under architecture docs
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md)
  — reference the generated graph and require new screens to declare
  inbound transitions
- [package.json](../../package.json) — register
  `generate:screen-transition-graph` and wire it into `validate`
- [scripts/](../../scripts/) — extend the validate runner

**New Files:**
- `docs/architecture/ui-routing.md`
- `docs/architecture/screen-transition-graph.json` (generated)
- `scripts/generate-screen-transition-graph.ts` (or `.mjs`, matching
  the existing wiki-generator style)

**Implementation Steps:**
1. Inventory every `Next Screen` reference across
   [`docs/architecture/wiki/screens/`](../architecture/wiki/screens/)
   and reconcile any inconsistent target ids.
2. Draft `ui-routing.md` with sections: Decision, Route Enum,
   `RouterState` Shape, Transition Records, Guards, Group
   Invariants, Modal Stack Reference (links Issue 3.A-4), Generated
   Graph.
3. Implement `generate-screen-transition-graph.ts` that parses each
   `interactions.md`, extracts `Next Screen` rows, and emits the JSON
   plus the Mermaid block injected into `ui-routing.md`.
4. Add validation rules in the existing `validate:tasks` pipeline.
5. Run `npm run validate` and fix any newly surfaced orphan or
   dangling-reference defects in the wiki packages.

**Dependencies:** none.

**Complexity:** L

---

#### Issue 3.A-2: Selector purity contract

**Source:** Q47 (⚠ Partial), Improvements bullet 8

**Problem:**
Selectors (`selectors.mapObjects.publicTooltipInfo`,
`selectors.persistence.canSaveCurrentGame`,
`selectors.session.restartGuard`, etc.) are referenced in
specs, but there is no explicit "selectors are pure" contract.
[`docs/architecture/determinism.md`](../architecture/determinism.md)
forbids `Math.random()`, `Date.now()`, and async timing in
*deterministic paths*, but selectors live in `src/ui/`, which is
documented as "non-deterministic" — leaving the rule ambiguous for
the UI layer.

**Impact:**
- A selector that calls `Date.now()` or reads `localStorage` will
  cause apparent UI desync between two players in M5 (selectors that
  feed `publicTooltipInfo` should agree across clients on the same
  state).
- Snapshot tests for selectors become flaky.
- No automated lint exists, so drift is undetectable until a
  divergence-only bug ships.

**Solution:**
1. Add a `## Selector Purity` section to a new
   `docs/architecture/ui-state-contract.md` (Issue 3.A-3) declaring:
   - Every function under `selectors.*` MUST be pure: no side
     effects, no I/O, no clocks, no RNG, no module-level mutable
     state.
   - Selectors MAY use stable memoization (e.g. `reselect`,
     Zustand's `shallow`); cache keys must be derived from inputs.
   - Selectors must accept `state` (and optional pure args) and
     return a new value or a referentially-stable reference when
     inputs are unchanged.
2. Add a new task that lands an ESLint rule (or equivalent) banning
   `Math.random()`, `Date.now()`, `performance.now()`,
   `crypto.randomUUID()`, and `await` inside files matching
   `src/**/selectors/**`.
3. Add a unit-test contract (or harness) under
   `tests/selectors/purity.spec.ts` that runs each selector twice
   on identical input and asserts deep equality.

**Files to Update:**
- `docs/architecture/ui-state-contract.md` (created in Issue 3.A-3)
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — add a forward-link clarifying that UI selectors share the
  purity rule even though the layer itself is non-deterministic
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md)
  — note the contract for selector authors

**New Files:**
- `eslint-rules/no-impure-selectors.cjs` (when `src/ui/` lands —
  scaffolded now as a doc-only stub if the lint pipeline is not yet
  wired)

**Implementation Steps:**
1. Author the `## Selector Purity` section.
2. Specify the lint rule in pseudocode in the contract; defer
   implementation to the task that introduces real selector code.
3. Cross-link from `determinism.md`.
4. Open a follow-up task `tasks/mvp/07-ui-shell/<n>-selector-purity-lint.md`.

**Dependencies:** Issue 3.A-3 (host doc).

**Complexity:** S

---

#### Issue 3.A-3: Component-state matrix + state-combination precedence

**Source:** Q52 (⚠ Partial), Q53 (❌ UNKNOWN), Missing Logic bullet 2

**Problem:**
No normative document declares that every interactive control MUST
define `{idle, hover, pressed, disabled, focused, error, loading}`,
and the resolution rule for overlapping states (e.g. `hover +
disabled`, `focus + error`, `loading + error`) is undefined. Each
screen's Animation Contract covers a subset and lists states
sequentially, not as composable layers.

**Impact:**
- Two screens implement `disabled + hover` differently — one suppresses
  the hover glow, the other shows it — and visual QA cannot say which
  is correct.
- Accessibility audits fail: focus rings disappear under disabled
  state because no precedence rule was written.
- Error overlays during loading flicker because both states paint
  simultaneously.

**Solution:**
1. Create `docs/architecture/ui-state-contract.md` defining:
   - **Normative state set:** every interactive control must support
     `idle`, `hover`, `pressed`, `disabled`, `focused`, `error`, and
     `loading`. Missing visuals fall back to the `idle` baseline.
   - **Precedence table:**
     - `disabled` suppresses `hover` and `pressed` but NOT `focused`.
     - `error` overlays all states except `loading`.
     - `loading` overlays `idle` only; `error` wins if both fire.
     - `focused` is always rendered when present (a11y rule).
   - **Composition diagram** (Mermaid) showing the layer order:
     `[base | idle | hover/pressed | disabled | loading | focused
     ring | error overlay]`.
   - **Per-screen authoring rule:** each `spec.md` Animation Contract
     must enumerate the seven states or explicitly waive the
     non-applicable ones with a one-line justification.
2. Sweep the existing 65 screen packages once the contract is
   merged, tagging Animation Contract gaps with `TODO(state-matrix)`
   so they appear in the next-task queue.

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) — link
  to the new contract
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md)
  — add the seven-state authoring rule
- [docs/architecture/wiki/missing-states.md](../architecture/wiki/missing-states.md)
  — replace the prose acknowledgment with a pointer to the canonical
  contract
- All 65 [docs/architecture/wiki/screens/*/spec.md](../architecture/wiki/screens/)
  — add `TODO(state-matrix)` markers where gaps exist (no content
  rewrite in this issue; that is Issue 3.D-1)

**New Files:**
- `docs/architecture/ui-state-contract.md`

**Implementation Steps:**
1. Draft the contract with the normative set and precedence table.
2. Add the Mermaid composition diagram.
3. Open a sibling sweep task to add `TODO` markers to existing
   screen specs (covered by Issue 3.D-1).
4. Cross-link from `overview.md`, `wiki/README.md`, and
   `missing-states.md`.

**Dependencies:** none.

**Complexity:** M

---

#### Issue 3.A-4: Modal-stack data structure + max-depth contract

**Source:** Q60 (⚠ Partial), Q62 (⚠ Partial), Missing Logic
bullets 4 & 6

**Problem:**
Modals (`60-confirmation-dialog`, `54-system-menu`,
`09-map-object-dialog`, `25-building-recruitment-dialog`,
`40-pre-battle-dialog`, `48-level-up-dialog`,
`51-split-stack-dialog`, `52-artifact-combine-dialog`) each store a
single `callerRoute`. The existing `54-system-menu` →
`60-confirmation-dialog` chain already implies a 2-level stack, and a
3-level case (e.g. recruitment → confirm overspend → another confirm)
will break with single-shot remembering. Element-level focus
restoration (which control had focus before the modal opened) is also
not specified.

**Impact:**
- A 3-deep modal sequence loses the bottom caller and lands the user
  on the wrong screen on close.
- Focus jumps to the document body after modal close, breaking
  keyboard navigation flow on every modal-heavy screen (Hero, Town,
  Marketplace).
- Saves taken with a modal open serialize an inconsistent
  `state.ui.*` shape across the screens that own different `caller*`
  fields.

**Solution:**
1. Add a `## Modal Stack` section to `ui-routing.md` (Issue 3.A-1)
   defining:
   - `state.ui.modalStack: ModalEntry[]` replacing per-screen
     `callerRoute` fields.
   - `ModalEntry = { id: ModalId, openedAt: Tick, callerRoute:
     ScreenRoute, previousFocusElementId: string | null,
     params: ModalParams }`.
   - Maximum depth: **3** (anything deeper is a design smell;
     reducer rejects the 4th `MODAL_OPEN`).
   - Push/pop semantics: `MODAL_OPEN` pushes; `MODAL_CLOSE` pops the
     top; `MODAL_REPLACE` pops then pushes (used for "are you sure?"
     escalations).
   - Save/replay rule: the modal stack is part of `state.ui.*` and
     therefore **excluded from save and replay state** (consistent
     with the existing rule that local UI drafts do not flow into
     saves).
2. Add `content-schema/schemas/modal-entry.schema.json` defining
   `ModalEntry` and `ModalId` enum sourced from the wiki package
   list.
3. Sweep all modal-using screens to replace `state.ui.<name>.callerRoute`
   bindings with `state.ui.modalStack[top]` reads in their `spec.md`
   and `data-contracts.md`.

**Files to Update:**
- `docs/architecture/ui-routing.md` (created in 3.A-1)
- All modal-using screen packages under
  [docs/architecture/wiki/screens/](../architecture/wiki/screens/) —
  `spec.md`, `data-contracts.md`, `interactions.md`
- [content-schema/schemas/README.md](../../content-schema/schemas/README.md)
  — register the new schema
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)
  — add the new entry

**New Files:**
- `content-schema/schemas/modal-entry.schema.json`
- `content-schema/examples/modal-entry/<id>.json` — one canonical
  example per existing modal screen

**Implementation Steps:**
1. Author the `## Modal Stack` section in `ui-routing.md`.
2. Author `modal-entry.schema.json` with `ModalId` derived from the
   wiki `index.json` modal entries.
3. Author canonical examples mirroring the existing modal flows
   (`54-system-menu` → `60-confirmation-dialog`).
4. Sweep modal screen packages and replace `callerRoute` fields with
   the `modalStack` reference (covered by Issue 3.D-2).
5. Run `npm run validate:contracts` and `npm run validate:tasks`.

**Dependencies:** Issue 3.A-1 (host doc).

**Complexity:** L

---

#### Issue 3.A-5: Modal dismissal policy

**Source:** Q61 (❌ UNKNOWN), Missing Logic bullet 5

**Problem:**
Only explicit Cancel/Resume buttons are documented. No modal declares
whether `Esc` closes it, whether a click on the scrim outside the
modal closes it, or whether the policy varies by severity (e.g.
destructive-confirm vs. informational popup).

**Impact:**
- Users press Esc and nothing happens; pressing Esc again triggers
  some other binding (e.g. cancel a drag, system menu).
- Click-outside-to-close on a destructive-confirm dialog accidentally
  cancels a permanent action.
- Implementer drift: every screen ships a different dismissal policy.

**Solution:**
1. Add a `## Dismissal Policy` section to `ui-routing.md` defining
   per-`severity` rules:
   - `severity: "info"` — Esc closes; click-outside closes.
   - `severity: "warn"` — Esc closes; click-outside closes only if
     the modal has a passive Cancel.
   - `severity: "destructive"` — Esc maps to Cancel; click-outside
     does **not** close.
   - `severity: "system"` (system menu, recoverable error) — Esc
     closes; click-outside ignored.
2. Extend `ModalEntry` (Issue 3.A-4) with a required `severity` field.
3. Sweep modal `interactions.md` to add an explicit row for
   `Esc → confirm.cancel` / `system.resume` etc., per the policy.

**Files to Update:**
- `docs/architecture/ui-routing.md`
- `content-schema/schemas/modal-entry.schema.json` (Issue 3.A-4)
- All modal screen packages — `interactions.md`

**New Files:** none.

**Implementation Steps:**
1. Author the dismissal policy section.
2. Add `severity` to the schema with an enum.
3. Sweep modal screens (Issue 3.D-2 captures the screen sweep).

**Dependencies:** Issue 3.A-1, Issue 3.A-4.

**Complexity:** S

---

#### Issue 3.A-6: Input-arbitration / conflict-resolution contract

**Source:** Q59 (❌ UNKNOWN), Missing Logic bullet 9

**Problem:**
No documentation defines what happens when a click and a hotkey fire
on the same control, when end-turn is requested while AI animation is
still playing, when a drag is in progress and Esc is pressed, or when
a modal opens during a hover-tooltip fade.

**Impact:**
- A double-dispatched `END_TURN` command produces a divergent replay
  log between two clients (M5 lockstep failure).
- Drag-in-progress + Esc orphans a `state.ui.drag.*` slot, leaking UI
  state across screen transitions.
- Concurrent click + hotkey on `confirm.confirm` runs the action twice.

**Solution:**
Create `docs/architecture/ui-input-arbitration.md` defining:
1. **Single-emit rule:** a control may emit at most one command per
   "input gesture" (where a gesture starts at pointerdown / keydown
   and ends at pointerup / keyup). The DOM shell enforces this with
   a per-control debounce token.
2. **Precedence:** when a click and a hotkey fire within the same
   frame, the **first** one wins; the second is dropped silently.
3. **Animation gate:** while `state.ui.animations.endTurnInFlight`
   is true, all `END_TURN` and turn-affecting commands are rejected
   loudly with a localized "wait for current turn" error.
4. **Esc precedence ladder:**
   `(1) cancel drag → (2) close top modal → (3) close pinned tooltip
   → (4) open system menu`.
5. **Drag cancellation:** drag-in-progress + Esc clears
   `state.ui.drag.*` and emits `feedback.drag.cancel`.
6. **Replay safety:** every command goes through the same debounce
   path so command logs are identical regardless of input modality.

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) — link
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — add a "single-emit per gesture" appendix referencing this doc
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md)
  — require `interactions.md` to declare any animation gates

**New Files:**
- `docs/architecture/ui-input-arbitration.md`

**Implementation Steps:**
1. Draft the contract with the six sections above.
2. Add a sequence diagram (`docs/architecture/diagrams/27-input-arbitration.md`)
   showing click + hotkey racing through the debounce token.
3. Cross-link from `determinism.md`, `state-flow.md`, and the
   wiki README.

**Dependencies:** none.

**Complexity:** M

---

#### Issue 3.A-7: Gesture taxonomy

**Source:** Q58 (❌ UNKNOWN), Missing Logic bullet 8

**Problem:**
Only right-click (open tooltip) and tooltip hold-delay are
formalized. Double-click, long-press, drag-and-drop, and multi-touch
gestures are undefined. Drag is mentioned only as a "drag ghost" UI
artifact with no source/target/drop-acceptance contract.

**Impact:**
- Authors who want "double-click hero portrait → open hero" cannot
  declare it because the gesture has no name in the schema.
- Drag-and-drop for army splits, artifact equip, and marketplace
  trades has no canonical interaction shape.
- Touch tap vs. long-press is ambiguous on tablet, the stated MVP
  target.

**Solution:**
Create `docs/architecture/ui-gestures.md` defining the gesture
taxonomy and binding format for `interactions.md`:
1. **`click`** — single primary-button press + release within
   ≤ 300 ms and ≤ 4 px movement.
2. **`double-click`** — two `click` events on the same target
   within ≤ 400 ms.
3. **`right-click` / `context`** — single secondary-button press; on
   touch, mapped to long-press.
4. **`long-press`** — primary press held ≥ 600 ms with ≤ 8 px
   movement; emits `feedback.long-press.start` after threshold.
5. **`drag`** — primary press + > 8 px movement before release;
   produces `dragstart`, `dragmove`, `dragend` events with
   `state.ui.drag.{sourceId, sourceKind, ghostPosition,
   acceptedTargetIds}`.
6. **`pinch`, `pan`, `wheel`** — viewport-only; not used for UI
   panel input.
7. **Drop acceptance:** drop targets declare an
   `accepts: DragKind[]` array; the renderer highlights legal
   targets while drag is in flight.
8. **Cancellation:** Esc cancels any active gesture (deferred to
   Issue 3.A-6 ladder).
9. Numeric thresholds (300 ms, 600 ms, 8 px) are pinned in the new
   `ruleset.ui.timing.*` block (Issue 3.D-3).

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) — link
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md)
  — require `interactions.md` to use canonical gesture names

**New Files:**
- `docs/architecture/ui-gestures.md`

**Implementation Steps:**
1. Draft the taxonomy.
2. Add a Mermaid state diagram showing the gesture FSM (idle →
   pressed → drag → drop / click / long-press / cancel).
3. Cross-link from `wiki/README.md`.
4. Open a sweep task that adds gesture columns to interaction
   tables for screens that already imply these gestures (army
   split, artifact equip, marketplace) — captured in Issue 3.D-2.

**Dependencies:** Issue 3.A-6 (cancellation rule lives there).

**Complexity:** M

---

#### Issue 3.A-8: Tooltip lifecycle — stale anchor + timing constants

**Source:** Q64 (✔ Defined but missing constants), Q65 (❌ UNKNOWN),
Missing Logic bullets 11 & 13

**Problem:**
Tooltip flow is well-specified at the open/pin/close level, but two
gaps remain:
- **Stale anchor:** what happens when the tooltip's underlying
  object is destroyed, captured, fogged, or hidden mid-display.
- **Timing constants:** the hold-delay duration is undefined; whether
  all tooltips share one delay or vary is unstated.

**Impact:**
- A tooltip pinned to a creature stack that dies in combat references
  a stale id; the renderer crashes or renders empty boxes.
- Inconsistent hold delays across screens (200 ms vs. 800 ms) feel
  like bugs to playtesters.
- Multiplayer captures: a pinned tooltip on a tile that becomes
  fogged leaks information about the now-hidden object.

**Solution:**
1. Add a `## Tooltip Lifecycle` section to `ui-state-contract.md`
   defining:
   - On every tick, the tooltip controller re-resolves
     `selectors.mapObjects.publicTooltipInfo(state, pinnedObjectId)`.
     If the selector returns `null` (object destroyed or fogged),
     the tooltip auto-dismisses with a `feedback.tooltip.invalidate`
     animation.
   - On ownership change, the tooltip re-renders against the new
     visibility scope (`selectors.scouting.hiddenTooltipFields`
     filters the body).
   - On pinned-target removal, the tooltip closes; the pin is
     cleared; no localized error is shown (this is a passive change).
2. Pin numeric timing constants in a new `ruleset.ui.timing` block
   (Issue 3.D-3): `tooltipHoldDelayMs: 350`,
   `tooltipFadeInMs: 120`, `tooltipFadeOutMs: 80`. All values are
   content-driven, not code-baked.
3. Update `docs/architecture/wiki/screens/18-map-object-tooltip/`
   `interactions.md` and `spec.md` with an explicit
   "stale-anchor" row.

**Files to Update:**
- `docs/architecture/ui-state-contract.md` (Issue 3.A-3)
- [docs/architecture/wiki/screens/18-map-object-tooltip/interactions.md](../architecture/wiki/screens/18-map-object-tooltip/interactions.md)
- [docs/architecture/wiki/screens/18-map-object-tooltip/spec.md](../architecture/wiki/screens/18-map-object-tooltip/spec.md)
- [docs/architecture/wiki/screens/50-creature-info/spec.md](../architecture/wiki/screens/50-creature-info/spec.md)
  — adopt the same hold-delay constant

**New Files:** none (timing constants land in
`content-schema/schemas/ruleset.schema.json`, Issue 3.D-3).

**Implementation Steps:**
1. Author the `## Tooltip Lifecycle` section.
2. Edit the tooltip screen packages.
3. Add `ui.timing` to the ruleset schema (Issue 3.D-3).

**Dependencies:** Issue 3.A-3, Issue 3.D-3.

**Complexity:** S

---

#### Issue 3.A-9: Keyboard navigation + hotkey registry

**Source:** Q56 (⚠ Partial), Q61 (❌ UNKNOWN), Missing Logic bullet 7

**Problem:**
`selectedRow` bindings are referenced as supporting "keyboard and
pointer navigation", but there is no global hotkey registry, no
focus-order rule, no tab-trap contract, and no per-screen hotkey
column in `interactions.md`. The wiki README's authoring rules
already require hotkeys to be listed; current files just don't
populate them.

**Impact:**
- Modal-heavy screens (Hero, Town, Marketplace) ship as mouse-only
  and need expensive accessibility retrofitting.
- Hotkeys conflict between screens because no one owns a global
  registry.
- Esc / Enter behavior is reinvented per modal (related to
  Issue 3.A-5).

**Solution:**
1. Create `docs/architecture/ui-hotkeys.md` defining:
   - Hotkey naming convention (`screen.action`,
     `global.system-menu`, `global.help`).
   - Global hotkeys (Esc, Enter, F10, etc.) and their precedence
     vs. screen-local hotkeys.
   - Focus-order rules: every interactive element declares a
     `focusOrder: int` in its component spec; Tab/Shift-Tab walks
     the order; modals trap focus inside the modal.
   - Element-level focus restoration: on modal close, focus returns
     to `state.ui.modalStack[top].previousFocusElementId` (already
     defined in Issue 3.A-4).
2. Add `content-schema/schemas/hotkey.schema.json` declaring a
   global registry of `{ id, defaultBinding, scope, screenId? }`.
3. Add a `Hotkeys` column to every screen's `interactions.md` (sweep
   covered by Issue 3.D-2).
4. Add validation: any `interactions.md` row with a `Hotkey` cell
   must reference an id that exists in the hotkey registry.

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) — link
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md)
  — make the Hotkeys column mandatory
- [docs/architecture/wiki/missing-states.md](../architecture/wiki/missing-states.md)
  — replace the prose acknowledgment with a pointer to the contract
- [content-schema/schemas/README.md](../../content-schema/schemas/README.md)
  — register the new schema
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)
  — add the new entry
- All 65 [docs/architecture/wiki/screens/*/interactions.md](../architecture/wiki/screens/)
  — adds Hotkeys column (Issue 3.D-2)

**New Files:**
- `docs/architecture/ui-hotkeys.md`
- `content-schema/schemas/hotkey.schema.json`
- `content-schema/examples/hotkey/global-default.json`

**Implementation Steps:**
1. Draft `ui-hotkeys.md`.
2. Author `hotkey.schema.json` + canonical examples.
3. Update wiki README to require the new column.
4. Open the per-screen sweep task (Issue 3.D-2).
5. Add validator rule.

**Dependencies:** Issue 3.A-4 (focus restoration field).

**Complexity:** L

---

#### Issue 3.A-10: Touch + gamepad input contracts

**Source:** Q57 (⚠ Partial)

**Problem:**
Touch is in scope at the renderer level (tablet, pinch zoom, scroll
wheel), but no per-screen touch interaction contracts (tap targets,
swipe semantics, pinch on UI panels) exist. Controller is mentioned
only as "controller focus" in tooltip bindings, with no mapping or
analog-stick contract. There is no Gamepad API reference.

**Impact:**
- Tablet builds (a stated MVP target) ship without testable touch
  contracts; layout regressions are caught only by manual QA.
- Controller support added later requires re-spec'ing every screen.
- `data-contracts.md` for buttons and lists never declared minimum
  tap-target sizes (44 × 44 px is the typical accessibility floor).

**Solution:**
1. Create `docs/architecture/ui-input-modalities.md` defining:
   - **Touch:** every interactive control declares a minimum
     tap-target size (44 × 44 px); long-press is the touch
     equivalent of right-click; pinch / pan are viewport-only.
   - **Mouse:** baseline; all gestures from Issue 3.A-7 apply.
   - **Keyboard:** see `ui-hotkeys.md`.
   - **Gamepad:** Phase 2 scope; defer the binding map to a Phase 2
     task but reserve the namespace `gamepad.*` and the
     `state.ui.input.activeModality: "mouse" | "touch" | "keyboard"
     | "gamepad"` slot.
2. Add `state.ui.input.activeModality` to the global UI state
   slot inventory.

**Files to Update:**
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md)
  — link to the new modalities doc
- [docs/architecture/overview.md](../architecture/overview.md) — link
- `docs/architecture/ui-state-contract.md` — add the
  `activeModality` slot

**New Files:**
- `docs/architecture/ui-input-modalities.md`

**Implementation Steps:**
1. Draft the contract.
2. Add `activeModality` to the state slot inventory.
3. Defer gamepad mapping to a Phase 2 task placeholder.

**Dependencies:** Issue 3.A-7.

**Complexity:** M

---

#### Issue 3.A-11: Pending / in-flight command UI contract

**Source:** Q55 (⚠ Partial), Missing Logic implied

**Problem:**
Per-domain pending state slots exist (`state.pendingBattle.*`,
`state.ui.confirmation.pendingAction`, `state.ui.loading.taskId`,
`state.ui.adventure.pathPreview`), but there is no canonical
"command in-flight" indicator. The reducer is synchronous, so
"command queued" → "command applied" → "animation playing" is a
sequence with no formal contract.

**Impact:**
- Animation desync: end-turn animation plays while the next AI turn
  has already mutated state, causing jitter.
- Players double-click an attack button and dispatch two commands,
  each producing different animation timelines.
- M5 lockstep needs a "wait for animation" gate; without one, peers
  diverge on what's visible.

**Solution:**
1. Add a `## Command Lifecycle` section to `ui-state-contract.md`
   defining the four phases:
   - **Drafting** — UI-only state (e.g.
     `state.ui.adventure.pathPreview`, `state.ui.targeting.draft`).
     No save effect.
   - **Pending confirmation** — `state.ui.confirmation.pendingAction`
     holds a serialized command awaiting user OK.
   - **Applied** — reducer has run; state is final; no UI flag
     needed.
   - **Animating** — `state.ui.animations.activeTimelineId` holds the
     animation timeline driven by the last applied command. Gates
     for `END_TURN`, `BATTLE_ACTION`, `SPELL_CAST` block until null.
2. Add the `state.ui.animations.activeTimelineId` slot.
3. Add a debounce reference (Issue 3.A-6) so double-click cannot
   queue two commands.

**Files to Update:**
- `docs/architecture/ui-state-contract.md`
- [docs/architecture/state-flow.md](../architecture/state-flow.md) —
  cross-reference the lifecycle

**New Files:** none.

**Implementation Steps:**
1. Author the section.
2. Add the new state slot.
3. Cross-link from `state-flow.md` and `ui-input-arbitration.md`.

**Dependencies:** Issue 3.A-3, Issue 3.A-6.

**Complexity:** S

---

#### Issue 3.A-12: Undo / redo contract (map editor minimum)

**Source:** Q63 (❌ UNKNOWN), Missing Logic bullet 10

**Problem:**
No undo/redo support is defined. The deterministic command-log model
would technically allow time-travel debugging, but no UI flow exposes
it. The Map Editor (`65-map-editor`) is the most natural undo
candidate, and its package is silent on the topic.

**Impact:**
- Map editor is unusable for non-trivial authoring.
- Future undo support in dialogs (typo in hero name, accidental
  overspend) has no foundation.

**Solution:**
1. Add a `## Undo / Redo` section to `ui-state-contract.md`
   restricted to the map editor for MVP:
   - The editor maintains an `state.editor.history.commandLog:
     EditorCommand[]` and `state.editor.history.cursor: int`.
   - `editor.undo` decrements cursor and re-applies the prefix.
   - `editor.redo` increments cursor.
   - History is bounded (`ruleset.ui.editor.maxHistory: 200`).
   - Editor commands are a separate stream from gameplay commands;
     they do not enter saves or replays.
2. Update [docs/architecture/wiki/screens/65-map-editor/](../architecture/wiki/screens/65-map-editor/)
   `spec.md` and `interactions.md` to declare the undo/redo
   bindings and Ctrl-Z / Ctrl-Y hotkeys.
3. Defer in-game undo (e.g. spell cast undo) to Phase 2 explicitly.

**Files to Update:**
- `docs/architecture/ui-state-contract.md`
- [docs/architecture/wiki/screens/65-map-editor/spec.md](../architecture/wiki/screens/65-map-editor/spec.md)
- [docs/architecture/wiki/screens/65-map-editor/interactions.md](../architecture/wiki/screens/65-map-editor/interactions.md)
- [docs/architecture/wiki/screens/65-map-editor/data-contracts.md](../architecture/wiki/screens/65-map-editor/data-contracts.md)

**New Files:** none.

**Implementation Steps:**
1. Author the section.
2. Edit the map editor screen package.
3. Add `ruleset.ui.editor.maxHistory` (Issue 3.D-3).

**Dependencies:** Issue 3.A-3, Issue 3.D-3.

**Complexity:** M

---

### Schemas

#### Issue 3.B-1: Canonical `ErrorState` schema

**Source:** Q54 (⚠ Partial), Missing Logic bullet 3

**Problem:**
Two error surfaces exist (localized error text per screen and
recoverable load errors at `state.ui.loading.errors`), but there is
no central `ErrorState` schema. Every screen invents its own shape.

**Impact:**
- Cross-screen error pipes (toast tray, telemetry sink, recoverable
  panel) cannot consume a shared shape.
- Error logging / replay-divergence analysis cannot key on stable
  fields.
- Localization fallback rules differ per screen.

**Solution:**
Add `content-schema/schemas/error-state.schema.json` defining:

```json
{
  "code": "ui.combat.invalidTarget",
  "severity": "warn",
  "messageKey": "ui.combat.errors.invalidTarget",
  "messageParams": { "targetId": "stack-3" },
  "recoverable": true,
  "retryAction": { "kind": "RECAST_SPELL" }
}
```

Fields: `code` (stable enum), `severity`
(`info | warn | error | fatal`), `messageKey` (localization id),
`messageParams` (object), `recoverable` (bool), `retryAction`
(optional `Command`).

**Files to Update:**
- [content-schema/schemas/README.md](../../content-schema/schemas/README.md)
  — register
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)
  — add the entry
- [docs/architecture/wiki/screens/59-loading-screen/spec.md](../architecture/wiki/screens/59-loading-screen/spec.md)
  — refactor to read from the canonical shape
- All screens that bind `errors.*` localization keys — note the
  schema link in `data-contracts.md` (Issue 3.D-2)

**New Files:**
- `content-schema/schemas/error-state.schema.json`
- `content-schema/examples/error-state/recoverable-load.json`
- `content-schema/examples/error-state/invalid-target.json`
- `content-schema/examples/error-state/save-failed.json`

**Implementation Steps:**
1. Author the schema.
2. Author 3 canonical examples covering the three severity tiers.
3. Refactor `59-loading-screen` `state.ui.loading.errors` typing to
   reference the schema.
4. Cross-link from `ui-state-contract.md`.
5. Run `npm run validate:contracts`.

**Dependencies:** Issue 3.A-3.

**Complexity:** M

---

#### Issue 3.B-2: Modal entry + modal id schemas

**Source:** Q60 (⚠ Partial)

Covered structurally in Issue 3.A-4 (schema lives at
`content-schema/schemas/modal-entry.schema.json`).
This sub-issue exists to ensure the schema matrix and validation
runner index it.

**Files to Update:**
- [content-schema/schemas/README.md](../../content-schema/schemas/README.md)
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)

**New Files:** see Issue 3.A-4.

**Dependencies:** Issue 3.A-4.

**Complexity:** S

---

#### Issue 3.B-3: Hotkey registry schema

**Source:** Q56 (⚠ Partial)

Covered structurally in Issue 3.A-9 (schema lives at
`content-schema/schemas/hotkey.schema.json`).

**Files to Update:**
- [content-schema/schemas/README.md](../../content-schema/schemas/README.md)
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)

**New Files:** see Issue 3.A-9.

**Dependencies:** Issue 3.A-9.

**Complexity:** S

---

### UI / Screens

#### Issue 3.D-1: Animation Contract sweep — seven-state matrix

**Source:** Q52 (⚠ Partial), Q53 (❌ UNKNOWN)

**Problem:**
Once Issue 3.A-3 lands `ui-state-contract.md`, every screen
`spec.md`'s Animation Contract must enumerate the seven normative
states (`idle`, `hover`, `pressed`, `disabled`, `focused`, `error`,
`loading`) or waive the inapplicable ones with a one-line
justification.

**Impact:**
- Without the sweep, the contract is theoretical; agents will not
  see the rule applied at the screen level.

**Solution:**
1. For each screen package under
   [docs/architecture/wiki/screens/](../architecture/wiki/screens/),
   audit the Animation Contract against the seven states.
2. Add missing states or explicit waivers.
3. Re-render the wiki HTML via `npm run generate:wiki`.

**Files to Update:**
- All 65 [docs/architecture/wiki/screens/*/spec.md](../architecture/wiki/screens/)

**New Files:** none.

**Implementation Steps:**
1. Author a sweep template (a one-page checklist) under
   `docs/architecture/wiki/_templates/animation-states.md`.
2. Apply the template per screen in chunks of 10.
3. Regenerate the wiki.

**Dependencies:** Issue 3.A-3.

**Complexity:** L

---

#### Issue 3.D-2: Per-screen sweep — Hotkeys, Modal stack, Gestures, Errors

**Source:** Q56, Q60, Q58, Q54

**Problem:**
The new contracts (hotkey registry, modal stack, gestures,
ErrorState) require touching every modal-using and
gesture-using screen package's `interactions.md`,
`data-contracts.md`, and `spec.md`. This is a single coordinated
sweep; running each contract sweep independently would re-edit the
same files four times.

**Impact:**
- Without a coordinated sweep, screens drift between contracts as
  they land at different times.

**Solution:**
1. Compile a sweep checklist under
   `docs/architecture/wiki/_templates/contract-sweep.md` listing the
   four contracts.
2. Apply per screen package, in groups, finishing each screen's four
   updates in one commit.

**Files to Update:**
- All [docs/architecture/wiki/screens/](../architecture/wiki/screens/) packages
  (mainly modals + tooltip-using screens for the first pass; rest of
  the screens for hotkeys + gestures)

**New Files:**
- `docs/architecture/wiki/_templates/contract-sweep.md`

**Implementation Steps:**
1. Author the template.
2. Sweep modal screens first (highest impact).
3. Sweep gesture-using screens (drag-drop heavy: army split,
   artifact equip, marketplace).
4. Sweep remaining screens for hotkeys.
5. Regenerate the wiki.

**Dependencies:** Issues 3.A-4, 3.A-5, 3.A-7, 3.A-9, 3.B-1.

**Complexity:** L

---

#### Issue 3.D-3: UI ruleset — numeric timing constants

**Source:** Q64 (timing), Improvements bullet 7

**Problem:**
Tooltip hold-delay, animation durations, debounce/throttle
thresholds, gesture-detection thresholds, and editor history limits
are unstated or inconsistent across screens. They should be
content-driven, not code-baked.

**Impact:**
- Two screens use 200 ms vs. 800 ms hold-delays, feeling like bugs.
- Tweaking timing for QA requires a code change rather than a
  content edit.
- Localization-driven layouts (which need debounce on text fields)
  cannot tune their own thresholds.

**Solution:**
1. Extend [content-schema/schemas/ruleset.schema.json](../../content-schema/schemas/ruleset.schema.json)
   with a `ui.timing` sub-record:
   ```json
   {
     "ui": {
       "timing": {
         "tooltipHoldDelayMs": 350,
         "tooltipFadeInMs": 120,
         "tooltipFadeOutMs": 80,
         "doubleClickWindowMs": 400,
         "longPressMs": 600,
         "dragThresholdPx": 8,
         "inputDebounceMs": 50,
         "endTurnAnimationMaxMs": 4000
       },
       "editor": { "maxHistory": 200 }
     }
   }
   ```
2. Update existing canonical example
   `content-schema/examples/ruleset/<id>.json` to include the new
   block.
3. Cross-link from `ui-state-contract.md`, `ui-gestures.md`, and
   `ui-input-arbitration.md`.

**Files to Update:**
- [content-schema/schemas/ruleset.schema.json](../../content-schema/schemas/ruleset.schema.json)
- [content-schema/examples/ruleset/](../../content-schema/examples/)
  — update the canonical example
- [docs/architecture/effect-registry.md](../architecture/effect-registry.md)
  — note the new ruleset section if relevant

**New Files:** none.

**Implementation Steps:**
1. Add the schema block additively (no breaking change).
2. Update canonical example.
3. Run `npm run validate:contracts`.

**Dependencies:** none (additive; can land before consumer issues).

**Complexity:** S

---

### Tasks

#### Issue 3.E-1: New tasks — author-and-implement contracts

**Source:** all issues above

**Problem:**
None of the new contracts (`ui-routing.md`, `ui-state-contract.md`,
`ui-input-arbitration.md`, `ui-gestures.md`, `ui-hotkeys.md`,
`ui-input-modalities.md`, `error-state.schema.json`,
`hotkey.schema.json`, `modal-entry.schema.json`,
`ruleset.ui.timing`) are currently represented in the task system.
`npm run tasks:next` cannot surface them; `validate:tasks` cannot
enforce screen-package coverage of the new fields.

**Impact:**
- AI-driven execution skips the work because it isn't in the queue.
- Schema ownership rules (every schema must have a canonical task
  reference) fail validation once the new schemas land.

**Solution:**
Create new task records under `tasks/mvp/07-ui-shell/` and
`tasks/mvp/08-content-platform/` (or the appropriate adjacent
section, matching existing layout):

1. `tasks/mvp/07-ui-shell/<n>-screen-router-fsm.md` — Issue 3.A-1
2. `tasks/mvp/07-ui-shell/<n>-component-state-matrix.md` — Issue 3.A-3
3. `tasks/mvp/07-ui-shell/<n>-modal-stack.md` — Issue 3.A-4 + 3.A-5
4. `tasks/mvp/07-ui-shell/<n>-input-arbitration.md` — Issue 3.A-6
5. `tasks/mvp/07-ui-shell/<n>-gesture-taxonomy.md` — Issue 3.A-7
6. `tasks/mvp/07-ui-shell/<n>-tooltip-lifecycle.md` — Issue 3.A-8
7. `tasks/mvp/07-ui-shell/<n>-hotkey-registry.md` — Issue 3.A-9
8. `tasks/mvp/07-ui-shell/<n>-input-modalities.md` — Issue 3.A-10
9. `tasks/mvp/07-ui-shell/<n>-command-lifecycle.md` — Issue 3.A-11
10. `tasks/mvp/07-ui-shell/<n>-selector-purity-lint.md` — Issue 3.A-2
11. `tasks/mvp/08-content-platform/<n>-error-state-schema.md` —
    Issue 3.B-1
12. `tasks/phase-2/08-meta-systems/<n>-map-editor-undo-redo.md` —
    Issue 3.A-12 (Phase 2 because the editor is itself Phase 2 / mvp
    boundary, mirror existing layout)
13. `tasks/mvp/07-ui-shell/<n>-screen-package-contract-sweep.md` —
    Issue 3.D-1 + 3.D-2

Each task record must:
- declare `Owned Paths` against the new docs/schemas it produces;
- declare `Dependencies` per the dependency list above;
- list `verifyCommands` that include
  `npm run validate:contracts`, `npm run validate:tasks`, and
  (where applicable) `npm run generate:wiki`;
- cite the screen packages it sweeps in `Owned Paths (shared)`.

**Files to Update:**
- [tasks/task-registry.json](../../tasks/task-registry.json)
  (regenerated automatically)
- [docs/planning/implementation-log.md](../planning/implementation-log.md)
  — note the new task batch

**New Files:** thirteen task markdown files listed above.

**Implementation Steps:**
1. Use an existing task as a template
   ([`tasks/mvp/07-ui-shell/02-zustand-store.md`](../../tasks/mvp/07-ui-shell/02-zustand-store.md)
   is a good shape).
2. Author each task with explicit `Owned Paths` matching this plan's
   New Files lists.
3. Run `npm run generate:task-registry` and `npm run validate:tasks`.

**Dependencies:** none (this is the entry point that pulls every
other issue into the queue).

**Complexity:** L

---

## 4. Suggested Task Breakdown

- [ ] Author `docs/architecture/ui-routing.md` + screen-transition
      graph generator (Issue 3.A-1)
- [ ] Author `docs/architecture/ui-state-contract.md` with
      component-state matrix, selector purity, tooltip lifecycle,
      command lifecycle, undo/redo sections (Issues 3.A-2, 3.A-3,
      3.A-8, 3.A-11, 3.A-12)
- [ ] Add `state.ui.modalStack` and the modal dismissal policy
      (Issues 3.A-4, 3.A-5)
- [ ] Author `docs/architecture/ui-input-arbitration.md`
      (Issue 3.A-6)
- [ ] Author `docs/architecture/ui-gestures.md` (Issue 3.A-7)
- [ ] Author `docs/architecture/ui-hotkeys.md` + per-screen Hotkeys
      column (Issue 3.A-9)
- [ ] Author `docs/architecture/ui-input-modalities.md`
      (Issue 3.A-10)
- [ ] Add `content-schema/schemas/error-state.schema.json` +
      examples (Issue 3.B-1)
- [ ] Add `content-schema/schemas/modal-entry.schema.json` +
      examples (Issue 3.A-4 / 3.B-2)
- [ ] Add `content-schema/schemas/hotkey.schema.json` + examples
      (Issue 3.A-9 / 3.B-3)
- [ ] Extend `ruleset.schema.json` with `ui.timing` and
      `ui.editor` blocks (Issue 3.D-3)
- [ ] Sweep all 65 screen packages for the seven-state matrix
      (Issue 3.D-1)
- [ ] Sweep modal/gesture/error/hotkey screens for the new
      contracts (Issue 3.D-2)
- [ ] Author 13 new task records under `tasks/mvp/07-ui-shell/`,
      `tasks/mvp/08-content-platform/`, and
      `tasks/phase-2/08-meta-systems/` (Issue 3.E-1)
- [ ] Update [CLAUDE.md](../../CLAUDE.md) and
      [docs/architecture/overview.md](../architecture/overview.md)
      with the new doc index entries
- [ ] Run `npm run validate` after each batch and after the final
      sweep

---

## 5. Execution Order

1. **Issue 3.E-1** (task records) — pulls all subsequent work into
   the `tasks:next` queue so AI agents can pick from it.
2. **Issue 3.D-3** (ruleset timing block) — additive, unblocks
   tooltip and gesture contracts.
3. **Issue 3.B-1** (`ErrorState` schema) — referenced by the state
   contract.
4. **Issue 3.A-3** (`ui-state-contract.md`) — host doc for purity,
   state matrix, tooltip, command lifecycle, undo/redo sections.
5. **Issue 3.A-2** (selector purity contract section).
6. **Issue 3.A-1** (`ui-routing.md` + transition graph).
7. **Issue 3.A-4** (modal stack) + **3.A-5** (dismissal policy).
8. **Issue 3.A-6** (input arbitration).
9. **Issue 3.A-7** (gesture taxonomy).
10. **Issue 3.A-8** (tooltip lifecycle — depends on 3.A-3 and 3.D-3).
11. **Issue 3.A-9** (hotkey registry).
12. **Issue 3.A-10** (input modalities).
13. **Issue 3.A-11** (command lifecycle).
14. **Issue 3.A-12** (map editor undo/redo).
15. **Issue 3.D-1** (animation contract sweep).
16. **Issue 3.D-2** (coordinated screen-package sweep).
17. Final `npm run validate` + `npm run generate:wiki`.

---

## 6. Risks if Not Implemented

| Risk | Source | Consequence |
| --- | --- | --- |
| Implementer drift on component states | Q52, Q53 | Two AI agents produce divergent visual behaviors that look correct in isolation. |
| Modal stack overflow | Q60 | First 3-deep modal sequence silently drops the bottom caller; route + focus restoration breaks. |
| Replay divergence from input race | Q59 | Click + hotkey on End Turn dispatches twice; M5 lockstep fails; saves desync. |
| Tooltip lifecycle bugs | Q65 | Pinned tooltip on a destroyed stack references stale id; renderer crashes or leaks fogged information. |
| Accessibility debt | Q56 | Modal-heavy screens ship as mouse-only; expensive a11y retrofits later. |
| Map-editor unusability | Q63 | Authors blocked the moment they make a non-trivial edit; forces in-flight feature work to detour through editor UX fixes. |
| Touch claim unverifiable | Q57 | "Tablet supported" is documentation only; first tablet test shows broken tap targets and fights the renderer. |
| Per-screen `ErrorState` drift | Q54 | Cross-screen toast tray and telemetry sink cannot consume errors; localization fallback differs per screen. |
| Selector impurity | Q47 | A `Date.now()` in a selector causes silent multiplayer divergence; flaky snapshot tests. |
| Numeric timing inconsistency | Q64 | Tooltip delays vary 200 ms ↔ 800 ms across screens; feels like bugs. |
| Orphan screens | Q49 | A screen package with no inbound transition ships unreachable; `validate:tasks` does not catch it. |

---

## 7. AI Implementation Readiness

**Score (today):** 6 / 10 — single-screen contract is excellent
(65 packages × 5 files, namespaced state slots, reducer-only
mutation), but the cross-screen layer is implicit.

**Score after this plan lands:** **8.5 / 10**.

What this plan adds:
- Aggregated screen-transition graph + router FSM → reachability is
  machine-checkable.
- Component-state matrix with precedence → no per-agent visual drift.
- `ErrorState` + `ModalEntry` + `Hotkey` schemas → cross-screen pipes
  share a stable shape.
- Input arbitration + gesture taxonomy → replay-safe input handling.
- `ruleset.ui.timing` + `ui.editor` → all numeric thresholds are
  content-driven.
- Selector purity contract + lint rule → silent multiplayer
  divergence pre-empted.
- Map-editor undo/redo → unblocks Phase 2 authoring.

What still blocks 10 / 10:
- No runtime code yet — contracts are textual and validated only by
  schema and link checks; full enforcement waits for `src/ui/` to
  land.
- Phase 2 gamepad mapping deliberately deferred.
- Touch is contract-only; first real tablet pass may surface
  layout-level gaps that require new screen mockups.

Closing those final gaps is a Phase 2 / runtime concern, not a
documentation gap, and is correctly out of scope for this plan.
