# Implementation Plan: 12 — Edge Cases

> Source audit: [docs/archive/readiness-audit/12-edge-cases.md](../readiness-audit/12-edge-cases.md)
>
> The audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from the audit into
> concrete documentation, schema, task, and tooling work.
>
> Nothing here invents gameplay. Every change formalizes a cross-cutting
> policy that is already implied by the deterministic-dispatcher /
> persistence / multiplayer-transport / renderer triangle but is not yet
> pinned in a single document.

---

## 1. Overview

**Scope.** Close the 13 gaps the edge-cases audit flagged across the
intersection of:

- command dispatcher (validation, ownership, input conflicts)
- deterministic reducer (overflow, negative-resource, state invariants)
- renderer (asset failure, animation rehydration, locale swap)
- persistence (save gating, storage quota, autosave-on-suspend)
- multiplayer transport (mid-combat disconnect, heartbeat under sleep)

The audit's framing makes the underlying problem clear: each subsystem
has *some* rule, but **no single document gathers the cross-cutting
policy**. Consequence: thirteen parallel implementers will silently
invent thirteen disjoint policies. This plan replaces that risk with a
single canonical reference doc plus per-subsystem schema/task changes.

**Readiness state today.** AI-Readiness scored **3/10**, tied with the
event system as the weakest section in the entire audit. Two areas are
firm (Q204 invalid payloads, Q208 state-vs-UI divergence). Eleven are
partial; two are unknown. The two unknowns — `0-resource transactions`
(Q209) and `storage quota exceeded` (Q218) — have no documented contract
at all and will throw / behave inconsistently the first time they fire
in production.

**Out of scope.** Authoring runtime engine code, building the IndexedDB
wrapper, shipping the renderer's asset-fallback chain. This plan
formalizes the contracts those layers must satisfy. No new gameplay
mechanic is invented; every clamp, gate, and predicate below is the
explicit version of an implicit assumption already in the docs.

---

## 2. Critical Fixes (Must Do First)

These five items must land before any task that touches dispatcher
validation, persistence writes, or AI-asset streaming. Each one, if
left open, will cause shipped code to either throw uncaught
`QuotaExceededError` / `RangeError`, drift between subsystems, or
violate the deterministic-replay contract.

1. **Edge-cases policy doc (Issue 3.A-0)** — single canonical
   `docs/architecture/edge-cases-policy.md` that the other twelve issues
   hyperlink into. Without this, fixes scatter across thirteen
   unrelated files and re-fragment the audit gap.
2. **Top-level current-actor gate (Issue 3.A-1)** — one-line dispatcher
   check that prevents the entire class of "forgot to encode ownership
   in this new command" bugs (Q205).
3. **Quota-exceeded handling (Issue 3.E-1, Q218)** — the audit explicitly
   names this as the highest-risk item. An autosave or AI-asset cache
   write currently throws with no recovery path; players will lose
   progress.
4. **Schema invariants for transactional commands (Issue 3.B-1, Q209)** —
   `quantity ≥ 1`, `cost ≥ 0` must be in the JSON-Schema before any
   command author writes a new validator; otherwise no-op zero commands
   pollute the replay log.
5. **State-shape invariants (Issue 3.B-2, Q210, Q211)** — declare
   `MAX_RESOURCE`, saturation policy, `resources[k] ≥ 0` post-dispatch
   assertion. Without these, overflow is silent and negative drains
   are undefined.

Items 1–5 are documentation + schema + a thin runtime guard each. None
require a renderer, network transport, or full IndexedDB layer to land.

---

## 3. System Improvements

Issues are grouped by the audit's natural axes: **Architecture &
Dispatcher Contracts**, **Schemas & State Invariants**, **UI & Screens**,
**Renderer & Assets**, and **Persistence / Multiplayer / Suspend**.

---

### Architecture & Dispatcher Contracts

#### Issue 3.A-0: No single cross-cutting edge-cases policy

**Source:** All 13 audit questions; AI-Readiness rationale ("an AI agent
attempting to implement these tomorrow would silently invent thirteen
separate policies and leave them undocumented across thirteen different
files").

**Problem:**
The 13 edge-case answers each touch 2–4 subsystems (dispatcher,
reducer, renderer, persistence, transport). No file aggregates these
cross-cutting rules; each one is implied in fragments across
`command-schema.md`, `determinism.md`, `state-flow.md`, `content-platform.md`,
and several task files. There is no single document that an AI implementer
can read to understand "what does the system do under degraded
conditions."

**Impact:**
- Implementers re-derive policies from scratch per task.
- Policies drift between subsystems (e.g., dispatcher rejects a 0-quantity
  command but the UI assumes the slider's lower bound is 0).
- The audit's own Risks list cannot be cleared because there is no home
  for the answer.

**Solution:**
Create `docs/architecture/edge-cases-policy.md` as the single canonical
reference. Every other deliverable in this plan back-links to a section
of this file. Other docs add a one-line cross-reference rather than
duplicating policy text.

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — add cross-ref to `edge-cases-policy.md` near validation framework section
- [docs/architecture/determinism.md](../../architecture/determinism.md) — cross-ref overflow/wall-clock sections
- [docs/architecture/state-flow.md](../../architecture/state-flow.md) — cross-ref state-vs-UI rule
- [docs/architecture/content-platform.md](../../architecture/content-platform.md) — cross-ref asset-fallback policy
- [CLAUDE.md](../../../CLAUDE.md) — add `edge-cases-policy.md` to the "Read first" list as item between determinism and content-platform

**New Files:**
- `docs/architecture/edge-cases-policy.md` — sections: Invalid commands, Current-actor gate, Stale references, Input conflicts, Zero-resource transactions, Overflow & saturation, Negative resources, Save gating, Mid-combat disconnect, Locale swap, Asset-load failure, Wall-clock readers, Tab backgrounding, Storage quota.

**Implementation Steps:**
1. Create `edge-cases-policy.md` with one section per audit question (Q204–Q218); each section opens with the audit's defined or partial answer, followed by the new policy this plan adds.
2. For each section, link to the originating audit question and to the schema / task files that enforce the policy.
3. Add cross-references from the five upstream architecture docs.
4. Update `CLAUDE.md` "Read first" ordering.
5. Run `npm run validate` to verify no broken links.

**Dependencies:** none — this is the foundation other issues depend on.

**Complexity:** M (one large doc; mostly aggregating existing material plus 13 new policy paragraphs from sections 3.A–3.E below).

---

#### Issue 3.A-1: No top-level current-actor gate at dispatcher entry

**Source:** Q205 (⚠ Partial); Missing-Logic bullet 1; Risks bullet 1.

**Problem:**
Per-command validators encode ownership rules ad-hoc ("Town is friendly",
"Hero owned by player", "Mine is at hero position"). There is no top-level
`if (cmd.playerId !== state.currentPlayerId) → reject` gate at the
dispatcher entry. A future command author who forgets to add the
ownership precondition opens the door to a non-current actor mutating
state — and the multiplayer lockstep transport will not catch it because
it sequences but does not gate.

**Impact:**
- Determinism leak via per-command oversight.
- Multiplayer desync if one peer's validator includes the check and
  another peer's (older?) version does not.
- Cannot localize "not your turn" UX uniformly.

**Solution:**
Add a single check at the dispatcher entry, before all per-command
validators, returning a typed `ValidationError` with discriminant
`NOT_CURRENT_ACTOR`. Document the (small) set of commands that are
exempt (none in MVP; `LOAD_GAME`, `END_DAY` from a system trigger may
qualify in Phase 3 — explicitly enumerate any exemption with rationale).

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — add a "Gate 0: Current-actor check" entry to the three-gate framework (becomes four gates), with the exempt-commands enumeration.
- [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../../tasks/mvp/01-engine-core/06-command-dispatcher.md) — add an acceptance criterion: "A command with `playerId !== state.currentPlayerId` returns `ValidationError { code: 'NOT_CURRENT_ACTOR' }` and does not run any per-command validator."

**New Files:** none.

**Implementation Steps:**
1. Edit `command-schema.md` to insert Gate 0 above the existing three
   gates, with clear precedence rules.
2. Add the exempt-command enumeration table (initially empty / explicit
   "none in MVP").
3. Update the dispatcher task with the acceptance criterion and a unit-test
   sketch ("dispatch `MOVE_HERO` with `playerId=0` while `currentPlayerId=1`
   → `Result.err(ValidationError { code: 'NOT_CURRENT_ACTOR' })`, state
   unchanged").
4. Cross-link from `edge-cases-policy.md` § Current-actor gate.

**Dependencies:** Issue 3.A-0 (policy doc must exist for the cross-link target).

**Complexity:** S.

---

#### Issue 3.A-2: No `EntityNotFoundError` discriminant

**Source:** Q206 (⚠ Partial); Missing-Logic bullet 2.

**Problem:**
Per-command existence checks return generic `ValidationError`. There is
no discriminant the UI can branch on to render a specific cause string
("hero died" vs "town captured" vs "mine reverted to neutral"). Stable
IDs are not recycled, so the underlying detection works — but the
typed reason is missing.

**Impact:**
- UI must localize either every command-specific error or a single
  unhelpful "command failed" string.
- Multiplayer cannot show the *other* player's perspective ("the hero
  you targeted was killed by player 2 last turn").
- Replay viewer cannot annotate why a queued command failed.

**Solution:**
Add a structured `ValidationError` shape with discriminant `code` and
a typed `details` payload. Define `ENTITY_NOT_FOUND` as one of the
canonical codes, carrying `{ entityKind, id, lastKnownState? }`.

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — add a "ValidationError taxonomy" subsection enumerating: `MALFORMED_PAYLOAD`, `NOT_CURRENT_ACTOR`, `ENTITY_NOT_FOUND`, `INSUFFICIENT_RESOURCES`, `ILLEGAL_PHASE`, `OWNERSHIP_VIOLATION`, `UNREACHABLE_TARGET`, plus a structured `path` (JSON-pointer into payload).
- [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../../tasks/mvp/01-engine-core/06-command-dispatcher.md) — link to taxonomy; update acceptance criteria to assert that each existence-check failure returns `ENTITY_NOT_FOUND`.

**New Files:**
- `content-schema/validation-error.schema.json` — closed JSON-Schema with `oneOf` over the discriminant codes; required fields per code; `additionalProperties: false`.

**Implementation Steps:**
1. Author the JSON-Schema.
2. Add the taxonomy section to `command-schema.md`.
3. Update dispatcher task acceptance criteria to enumerate the codes its
   handlers may return.
4. Add a content-schema example file under `content-schema/examples/`
   covering each code (one example per code).
5. Cross-link from `edge-cases-policy.md` § Stale references.

**Dependencies:** Issue 3.A-0.

**Complexity:** M.

---

#### Issue 3.A-3: No input-conflict policy at UI dispatch boundary

**Source:** Q207 (⚠ Partial), Q59 cross-reference; Missing-Logic bullet 3;
Risks bullet 2.

**Problem:**
The deterministic reducer is single-threaded by contract, so engine-level
concurrency is impossible. But the UI can dispatch two commands within
a frame (e.g., a click + a hotkey both firing `END_DAY`). The dispatcher
will serialize them — but the second is a benign no-op or a state-already-
advanced redundant entry. The audit explicitly cross-references the UI
audit (Q59) which left this as an open input-conflict policy.

**Impact:**
- Replay log bloat from redundant `END_DAY` / `CAST_SPELL` entries.
- Confusing replays ("ended day twice").
- Potential double-spend in fast-fingered RECRUIT_UNITS sequences if a
  validator runs before the second click's race resolves.

**Solution:**
Two complementary mechanisms:
1. **Dispatcher-side single-flight** on `(playerId, kind)` for the
   non-idempotent command kinds (`END_DAY`, `END_BATTLE_TURN`,
   `START_BATTLE`). The second arrival within the same logical "tick"
   is rejected with `DUPLICATE_INTENT`.
2. **UI-side debounce** on the corresponding buttons / hotkeys (250 ms
   trailing edge). UI debounce reduces noise; dispatcher single-flight
   is the safety net.

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — add a "Single-flight commands" subsection listing the protected kinds and the rationale; add `DUPLICATE_INTENT` to the ValidationError taxonomy from Issue 3.A-2.
- [docs/architecture/wiki/screens/](../../architecture/wiki/screens/) — add a `interactions.md` policy line "End-day buttons and hotkeys are debounced 250 ms (trailing edge)" to: `04-adventure-map`, `12-battle-screen`, `54-system-menu` (or relevant screens that surface `END_DAY` / `END_BATTLE_TURN`).
- [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../../tasks/mvp/01-engine-core/06-command-dispatcher.md) — acceptance criterion "Dispatching the same `END_DAY` twice within one tick returns `DUPLICATE_INTENT` on the second call; state unchanged."

**New Files:** none.

**Implementation Steps:**
1. Add the policy section to `command-schema.md`.
2. Add the discriminant to the ValidationError taxonomy.
3. Update the affected screen `interactions.md` files (search them with
   `grep -l 'END_DAY\|END_BATTLE_TURN' docs/architecture/wiki/screens/*/interactions.md`).
4. Update dispatcher task with the acceptance criterion + unit-test sketch.
5. Cross-link from `edge-cases-policy.md` § Input conflicts.

**Dependencies:** Issue 3.A-2 (taxonomy must exist for the discriminant to land).

**Complexity:** S.

---

### Schemas & State Invariants

#### Issue 3.B-1: No `quantity ≥ 1` / `cost ≥ 0` invariant

**Source:** Q209 (❌ UNKNOWN); Missing-Logic bullet 4; Risks bullet 3.

**Problem:**
`RECRUIT_UNITS { quantity: 0 }`, `BUY_FROM_MARKET { amount: 0 }`, and a
free-cost spell after Mysticism are all unspecified. Validators say
"sufficient units available" (which `0 ≥ 0` trivially passes) and
"hero has enough resources" (which `0 ≥ 0` also passes). Allowing zero
bloats the log; rejecting it forces UI sliders to never bottom out.

**Impact:**
- Replay viewers and post-mortem tools display "16 zero-recruits in a row".
- Multiplayer log reconciliation works harder than it needs to.
- Future achievements / statistics ("units recruited this game") are
  contaminated by zeros.

**Solution:**
Pin the invariant in JSON-Schema where it belongs: `quantity` integer
fields default to `minimum: 1`. `cost` integer fields default to
`minimum: 0` (free actions remain expressible but must be intentional —
the rules formula declares `cost = 0` after Mysticism, not the command
payload). Document the rationale.

**Files to Update:**
- [content-schema/](../../../content-schema/) — open every command JSON-Schema (`recruit-units.schema.json`, `buy-from-market.schema.json`, `cast-spell.schema.json`, etc.) and add `minimum: 1` to integer `quantity` fields, `minimum: 0` to integer `cost` fields. Use a shared `$defs/positiveInteger` and `$defs/nonNegativeInteger` for consistency.
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — add a "Numeric invariants" subsection stating the default and where exceptions are explicitly opted in.
- [tasks/mvp/03-content-schema/](../../../tasks/mvp/03-content-schema/) — update the relevant schema-task files (`02-command-schemas.md` if it exists; otherwise the task that owns command schema authoring) to include the invariant in acceptance criteria.

**New Files:**
- `content-schema/$defs/numeric.json` — single source of `positiveInteger`, `nonNegativeInteger`, `resourceAmount`. Re-used via `$ref` from every command.

**Implementation Steps:**
1. Author `content-schema/$defs/numeric.json`.
2. Refactor each command schema to `$ref` the shared types.
3. Run `npm run validate:tasks` and `npm run validate` to catch any
   canonical-example file that violated the new minima (those examples
   then become regression tests).
4. Add the invariant section to `command-schema.md`.
5. Cross-link from `edge-cases-policy.md` § Zero-resource transactions.

**Dependencies:** none (schemas are self-contained).

**Complexity:** M (touches many command schemas; mechanical but broad).

---

#### Issue 3.B-2: No overflow / saturation policy

**Source:** Q210 (⚠ Partial); Missing-Logic bullet 5; Risks bullet 4.

**Problem:**
`determinism.md` requires "Document overflow bounds in the ruleset" but
no concrete `MAX_RESOURCE`, `MAX_STAT`, or saturation rule is declared.
JavaScript safe-integer ceiling is `2^53 − 1`; without a documented
intermediate cap, a max-stack creature multiplier can wrap silently.

**Impact:**
- Silent overflow → save corruption → multiplayer desync.
- No fuzz target verifies near-`MAX_INT` behavior.
- Pack authors writing high-tier creatures cannot reason about ceilings.

**Solution:**
Declare hard caps as named constants and a saturation policy: `clamp`
saturates at the cap; never wraps. Add a rules-eval guard that throws
in dev / saturates in prod when an intermediate exceeds `2^53 − 1`. Add
a fuzz target.

**Constants to declare:**
- `MAX_RESOURCE = 2_000_000_000` (per resource per player; matches the
  reference behaviour the audit cites).
- `MAX_UNIT_COUNT = 1_000_000` per stack (well below int32; exceeds any
  realistic gameplay scenario).
- `MAX_HERO_STAT = 99` (or whatever the rules pack declares; constant
  itself is config-driven, but the name is fixed).
- `MAX_INTERMEDIATE = 2 ** 53 - 1` — assertion ceiling for any
  multiply-first / divide-last formula step.

**Files to Update:**
- [docs/architecture/determinism.md](../../architecture/determinism.md) — add a "Saturation policy" subsection enumerating the constants and the `clamp`-saturates-not-wraps rule.
- [tasks/mvp/02-rules-engine/](../../../tasks/mvp/02-rules-engine/) — add an acceptance criterion to the formula evaluator task: "any intermediate result exceeding `MAX_INTERMEDIATE` triggers `OverflowError` in dev builds; saturates to the documented cap in prod."
- [content-schema/](../../../content-schema/) — wherever a `cost` / `gain` / `delta` integer field exists, set `maximum: MAX_RESOURCE` (or the relevant cap).

**New Files:**
- `src/engine/constants.ts` — central numeric-cap export (planning placeholder; lives under engine `ownedPaths`).
- `tests/fuzz/overflow.fuzz.ts` — fuzz target sketch (planning placeholder; covered by a new Phase-2 task).

**Implementation Steps:**
1. Add the saturation policy section to `determinism.md`.
2. Declare the constants in `src/engine/constants.ts` (module spec only —
   actual code lives behind the existing engine-core task).
3. Add maxima to the schemas.
4. Author a new task `tasks/phase-2/01-quality/NN-overflow-fuzz.md` that
   owns `tests/fuzz/overflow.fuzz.ts` and asserts the saturation policy.
5. Cross-link from `edge-cases-policy.md` § Overflow & saturation.

**Dependencies:** Issue 3.B-1 (numeric `$defs` are reused for the maxima).

**Complexity:** M.

---

#### Issue 3.B-3: No `resources[k] ≥ 0` state-shape invariant

**Source:** Q211 (⚠ Partial); Missing-Logic bullet 6; Risks bullet 4.

**Problem:**
Validation requires "enough resources" before deducting, which keeps
post-deduction values `≥ 0` — but no canonical state-shape invariant
asserts this, and no policy describes what happens to a curse / drain
effect ticking against a 0 balance.

**Impact:**
- A bug in a future reducer or a malformed pack could produce a negative
  balance with no detection until UI renders `−5 gold`.
- Drain-against-zero behavior is undefined; gameplay testers will see
  inconsistent behavior across drains, debuffs, and upkeep.

**Solution:**
1. Declare the invariant in `determinism.md`: every `resources[k] ≥ 0`
   and every `unit.count ≥ 0` after every dispatch.
2. The canonical state serializer asserts the invariant and throws
   `InvariantViolation` in dev / clamps to 0 in prod.
3. Drain-against-zero policy: drains floor at 0; no debt accumulates.
   Document this on the relevant rules / effects file (the effect
   registry section under `docs/architecture/effect-registry.md`).

**Files to Update:**
- [docs/architecture/determinism.md](../../architecture/determinism.md) — add "State-shape invariants" subsection.
- [docs/architecture/effect-registry.md](../../architecture/effect-registry.md) — add a "Drain semantics" subsection: drains clamp at 0 per tick, no debt.
- [content-schema/state-snapshot.schema.json](../../../content-schema/) — add `minimum: 0` to all resource and unit-count fields (or `$ref` the `nonNegativeInteger` from Issue 3.B-1).
- [tasks/mvp/01-engine-core/](../../../tasks/mvp/01-engine-core/) — add an acceptance criterion to the reducer task: "post-dispatch state passes the canonical state-shape invariant assertion."

**New Files:** none.

**Implementation Steps:**
1. Add invariant subsection to `determinism.md`.
2. Add drain-clamp subsection to `effect-registry.md`.
3. Update state schema with minima.
4. Update reducer task acceptance criteria.
5. Cross-link from `edge-cases-policy.md` § Negative resources.

**Dependencies:** Issue 3.B-1 (shared `$defs`).

**Complexity:** S.

---

### UI & Screens

#### Issue 3.C-1: No save-gating predicate, no animation rehydration

**Source:** Q212 (⚠ Partial); Missing-Logic bullet 7; Risks bullet 5.

**Problem:**
The save record is purely logical, so saving mid-animation is safe in
principle — but no documented predicate `canSaveNow(state)` enumerates
*when* the Save button is disabled. The system menu task implies "after
guard approval and exit animation" without enumerating the guard. The
audit also flags that animation timeline rehydration on load is
unspecified (cross-reference Q201).

**Impact:**
- Players may be allowed to save mid-battle in MVP, then on load the
  game re-enters battle at a different sub-frame.
- Multiplayer save-during-turn-lock is undefined — could let a player
  save mid-other-player's-turn.
- Hero level-up modal mid-display + save → load may skip the level-up
  choice entirely.

**Solution:**
1. Define `canSaveNow(state): { allowed: boolean, reason?: string }`
   pure function. Returns `false` (with localized reason ID) during:
   - active battle (between START_BATTLE and END_BATTLE)
   - multiplayer turn lock when `state.currentPlayerId !== state.localPlayerId`
   - any open modal that requires a player choice (`level-up`,
     `creature-dilemma`, `prompt`)
   - mid-end-of-day animation (until END_DAY post-animation hook fires)
2. UI surfaces "Save disabled — finish battle to save" (or equivalent
   per reason) on the Save Game menu item.
3. Animation timeline rehydration: on load, replay the command log to
   the saved offset; the animation timeline starts empty (no in-flight
   animations) — re-emitted events from replay execute synchronously
   with no timeline scheduling. The first post-load command schedules
   animations normally.

**Files to Update:**
- [docs/architecture/wiki/screens/54-system-menu/interactions.md](../../architecture/wiki/screens/54-system-menu/interactions.md) — replace the existing one-liner with the full predicate enumeration.
- [docs/architecture/wiki/screens/55-save-load/interactions.md](../../architecture/wiki/screens/55-save-load/interactions.md) — add the disabled-state UX line.
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) — add acceptance criterion: "load replays log silently; animation timeline starts empty."
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md](../../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md) — add "rehydration mode" subsection: replay-time event emissions skip the animation scheduler.
- [docs/architecture/state-flow.md](../../architecture/state-flow.md) — add a `canSaveNow` reference and link to the predicate enumeration.

**New Files:**
- `content-schema/save-eligibility.md` — short doc declaring the predicate, the four enumerated `disallowed` reasons, and the localization-string IDs (`save.disabled.in_battle`, `save.disabled.not_your_turn`, `save.disabled.modal_open`, `save.disabled.animating`).

**Implementation Steps:**
1. Author `save-eligibility.md`.
2. Update the four screen / task files.
3. Add the localization-string IDs to the canonical localization table
   ([content-schema/localization](../../../content-schema/) — exact path TBD by reading the dir).
4. Cross-link from `edge-cases-policy.md` § Save gating.

**Dependencies:** Issue 3.A-0.

**Complexity:** M.

---

#### Issue 3.C-2: No locale-swap mid-game policy

**Source:** Q214 (⚠ Partial); Missing-Logic bullet 9; Risks bullet 8.

**Problem:**
Locale switching swaps the active pack and re-renders, but in-flight
strings (open tooltip, mid-display modal, just-emitted battle log line)
are unspecified — they may stay in the previous locale until reopened.
RTL layout flip protocol is not documented. Save-loaded-under-different-
locale UX is undefined.

**Impact:**
- Mid-modal swap leaves half-translated UI surfaces.
- RTL switch leaves HUD misaligned.
- Players changing locale mid-game see inconsistent state.

**Solution:**
1. **Locale change is presentation-only**, never a deterministic command.
2. UI emits `LOCALE_CHANGED` to a side-channel observable (not the
   command log). All subscribed selectors re-render. Open transient
   surfaces (tooltips, popovers, hover cards) are dismissed; modals
   that require a player choice re-render in-place with new strings.
3. RTL: setting `dir="rtl"` on the body element flips logical-property
   layout (margin-inline-start, etc.); the renderer uses logical CSS
   throughout. Atlases with embedded text resolve via the locale-variant
   chain (already documented in diagram 19). Battle-canvas mirroring
   is **not** done (combat layout is symmetric in MVP); document this
   exception.
4. Save metadata includes `localeAtSave`; load shows no warning if the
   active locale differs (display strings re-resolve normally).

**Files to Update:**
- [docs/architecture/wiki/screens/56-options/interactions.md](../../architecture/wiki/screens/56-options/interactions.md) — add the policy: "Switching `language` triggers a `LOCALE_CHANGED` UI event; tooltips/popovers dismiss; modals re-render in place; body `dir` toggles for RTL locales."
- [docs/architecture/diagrams/18-string-resolution.md](../../architecture/diagrams/18-string-resolution.md) — add a "Mid-game locale swap" subsection.
- [docs/architecture/diagrams/19-locale-variants.md](../../architecture/diagrams/19-locale-variants.md) — add a note that the battle canvas does not mirror in MVP.
- [tasks/mvp/06-renderer/](../../../tasks/mvp/06-renderer/) — add an acceptance criterion to the relevant renderer/theming task: "all layout uses logical CSS properties; switching `dir` does not require a renderer reset."
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) — extend save metadata with `localeAtSave: string`.

**New Files:** none.

**Implementation Steps:**
1. Update the four files above.
2. Add the `localeAtSave` field to the save schema.
3. Cross-link from `edge-cases-policy.md` § Locale swap.

**Dependencies:** Issue 3.A-0.

**Complexity:** S.

---

### Renderer & Assets

#### Issue 3.D-1: No asset-load failure policy

**Source:** Q215 (⚠ Partial); Missing-Logic bullet 10.

**Problem:**
"Missing presentation may fall back" is the principle, but the fallback
chain order, retry policy, user notification rule, and gameplay-vs-
presentation boundary for AI-pipeline records are unspecified.

**Impact:**
- Mid-game AI-asset 404 silently shows placeholder forever; player
  doesn't know to retry.
- IndexedDB-cache-full causes re-fetch every session (no policy says
  whether to surface this).
- A creature animation manifest (which encodes attack frame *timing* —
  partly gameplay) currently treated as presentation may diverge across
  peers if one peer fell back to placeholder timing.

**Solution:**
1. **Fallback chain order:** `locale variant → faction default → generic
   placeholder`. Generic placeholder is a built-in asset bundled with
   the app, never absent.
2. **Retry policy:** 1× retry with 500 ms backoff on first failure;
   subsequent failures within session use placeholder without further
   retry.
3. **User notification:** non-modal toast "Some visuals couldn't load"
   shown once per session, not per asset.
4. **Gameplay-vs-presentation boundary:** any field that affects
   deterministic state (frame timing, hitbox geometry, projectile
   speed) is **gameplay** and must be in the gameplay record (loaded
   pre-session), not the streamed asset. Streamed assets carry only
   pixels / audio waveforms.
5. **AI-pipeline records:** the existing pre-ingest validation
   (Phase-3 02-ai-generation tasks 02–04) remains the fail-loud gate.
   Runtime never accepts an AI-generated *gameplay* record.

**Files to Update:**
- [docs/architecture/content-platform.md](../../architecture/content-platform.md) — extend the "missing visuals fall back" rule with the chain order, retry, and notification policy.
- [docs/architecture/diagrams/19-locale-variants.md](../../architecture/diagrams/19-locale-variants.md) — add the chain order at the bottom of the Mermaid flow.
- [tasks/mvp/04-content-runtime/](../../../tasks/mvp/04-content-runtime/) — add an acceptance criterion to the asset-resolver task: "404 or fetch-failure → 1× retry @ 500 ms → placeholder + once-per-session toast."
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) — add the gameplay-vs-presentation boundary section: "AI-generated assets carry pixels/audio only. Frame timing and hitbox data are gameplay records, gated by the pre-ingest validator."

**New Files:**
- `resources/placeholders/` — directory for the bundled generic placeholders (planning placeholder; actual files added by the asset-pack task).

**Implementation Steps:**
1. Update the four files.
2. Cross-link from `edge-cases-policy.md` § Asset-load failure.

**Dependencies:** Issue 3.A-0.

**Complexity:** S.

---

### Persistence / Multiplayer / Suspend

#### Issue 3.E-1: No `QuotaExceededError` policy (HIGHEST PRIORITY)

**Source:** Q218 (❌ UNKNOWN); Missing-Logic bullet 13; Risks bullet 7
(audit calls this the largest unaddressed failure mode).

**Problem:**
IndexedDB caps at ~50 MB on Safari and ~unbounded with prompts on
Chrome/Firefox. There is no `QuotaExceededError` handler, no per-store
budget, no eviction policy, no UX flow. An autosave or AI-asset cache
write that fails will currently throw with no recovery.

**Impact:**
- Player loses progress on a single autosave write.
- AI-asset cache failure cascades to placeholder-everywhere session.
- Safari's 7-day eviction of backgrounded IndexedDB databases is
  completely undocumented.

**Solution:**
1. **Catch `QuotaExceededError` at the IndexedDB wrapper boundary.**
   Every write returns `Result<void, StorageError>`.
2. **Per-store byte budgets:**
   - `saves`: unbounded (player decides via Save UI when to delete).
   - `scenarios`: unbounded.
   - `content`: 100 MB soft cap; LRU eviction triggered at 90 MB.
   - `ai-cache`: 200 MB soft cap; LRU eviction triggered at 180 MB.
3. **Eviction order on quota error:**
   - First, evict `ai-cache` LRU until 50 MB free.
   - Second, evict `content` LRU until 50 MB free.
   - Third, prune oldest `auto-N` autosave slot if any exist.
   - Fourth, surface a non-modal toast: "Storage full — manage saves."
   - Fifth (only if all above failed), throw `StorageExhausted` to
     caller (e.g., manual save) so the UI can show an actionable modal.
4. **Warning threshold:** at 90% of available quota, show a one-time
   per-session toast "Storage nearly full — consider exporting saves."
5. **Safari 7-day eviction:** document in the persistence audit's
   risk section and rely on user-initiated "Export saves" UX (already
   planned). No code mitigation possible for Safari's policy.
6. **Diagnostics:** persist `state.persistence.budgets` in-memory only
   (not in save records) for the dev-mode debug overlay.

**Files to Update:**
- [tasks/mvp/08-persistence/01-indexeddb-wrapper.md](../../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md) — add the entire policy as acceptance criteria; rename owned paths to include the eviction module.
- [docs/archive/readiness-audit/08-persistence-save-system.md](../readiness-audit/08-persistence-save-system.md) — note in margin (NOT modifying audit content, but adding the cross-link section at the end if other audits do this; otherwise leave the audit untouched per the plan's rules and only update non-audit files).
- [docs/architecture/wiki/screens/55-save-load/interactions.md](../../architecture/wiki/screens/55-save-load/interactions.md) — add "Storage full — manage saves" toast spec.

**New Files:**
- `tasks/mvp/08-persistence/NN-quota-handling.md` — new task owning the wrapper-level eviction logic, per-store budgets, and the warning-threshold toast. Sized small. Gated by `01-indexeddb-wrapper.md`.
- `content-schema/storage-error.schema.json` — `StorageError` discriminant: `QUOTA_EXCEEDED`, `IDB_VERSION_ERROR`, `IDB_BLOCKED`, `IDB_DATA_CORRUPTION`.
- `docs/architecture/storage-policy.md` — the full canonical policy doc that the task and the wrapper code reference.

**Implementation Steps:**
1. Author `docs/architecture/storage-policy.md` with the eviction order,
   budgets, and warning threshold.
2. Author `content-schema/storage-error.schema.json`.
3. Author the new `tasks/mvp/08-persistence/NN-quota-handling.md` task
   (dependencies: `01-indexeddb-wrapper`; ownedPaths: `src/persistence/quota.ts`,
   `src/persistence/eviction.ts`).
4. Update `01-indexeddb-wrapper.md` to reference and depend on the new task.
5. Update Save/Load screen `interactions.md` with the toast spec.
6. Run `npm run validate:tasks` and `npm run generate:task-registry`.
7. Cross-link from `edge-cases-policy.md` § Storage quota.

**Dependencies:** Issue 3.A-0; Issue 3.A-2 (StorageError reuses the
discriminant pattern from ValidationError).

**Complexity:** L (new task + new policy doc + multi-file updates +
schema; this is the largest single deliverable in the plan).

---

#### Issue 3.E-2: No combat-specific disconnect / pause policy

**Source:** Q213 (⚠ Partial); Missing-Logic bullet 8.

**Problem:**
The 30 s reconnect window and 120 s forfeit threshold cover generic
disconnect, but combat-specific behaviour is not called out: does the
combat clock pause? Does AI take over the absent player's stack? Is
there a per-combat checkpoint for faster catch-up?

**Impact:**
- Inconsistent UX: still-connected player either waits with no feedback
  (clock paused) or sees AI play their opponent's stack with no
  notification.
- Multiplayer perception of fairness breaks down without a documented
  rule.

**Solution:**
1. **Combat clock pauses** during the reconnect window. The still-
   connected player sees a "Opponent disconnected — 0:30 to reconnect"
   banner.
2. **AI does not take over** the absent player's stack during the
   reconnect window (forces fairness; matches audit Q146 deferral).
3. **At 120 s**, defender wins by forfeit (or attacker, if defender is
   the disconnected party — i.e., the still-present player wins the
   combat). Combat resolves; the absent player's hero is treated as
   defeated; the still-present player resumes the adventure-map turn.
4. **No per-combat checkpoint** in MVP. Reconnecting peer replays the
   full pre-combat state + commands; deterministic reducer guarantees
   identical state. Phase-3 may revisit if reconnect time becomes
   problematic.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md](../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md) — add a "Combat-specific behaviour" subsection.
- [docs/architecture/wiki/screens/12-battle-screen/interactions.md](../../architecture/wiki/screens/12-battle-screen/interactions.md) — add the disconnect-banner spec and the forfeit modal.
- [docs/architecture/wiki/screens/12-battle-screen/data-contracts.md](../../architecture/wiki/screens/12-battle-screen/data-contracts.md) — add the `OpponentDisconnect` UI-state shape `{ peerId, secondsRemaining }`.

**New Files:** none.

**Implementation Steps:**
1. Update the three files above.
2. Add localization-string IDs `mp.combat.disconnect_banner`,
   `mp.combat.forfeit_modal`.
3. Cross-link from `edge-cases-policy.md` § Mid-combat disconnect.

**Dependencies:** Issue 3.A-0.

**Complexity:** S.

---

#### Issue 3.E-3: No `visibilitychange` / `pagehide` policy

**Source:** Q217 (⚠ Partial); Missing-Logic bullet 12; Risks bullet 6.

**Problem:**
Renderer pause is documented; sim has no idle work; but multiplayer
heartbeat under backgrounding (mobile / battery throttling) can drop
below the 6 s host-migration threshold and trigger an unwanted host
migration. Audio mute, autosave on suspend, and resume reconciliation
are all undocumented.

**Impact:**
- Mobile users get spurious host migrations.
- Audio plays in background, annoying users.
- Autosave never fires on tab close.
- "Resume after sleep" leaves stale UI for an arbitrary period.

**Solution:**
1. **Audio:** mute on `visibilitychange:hidden`; restore on `:visible`.
2. **Autosave:** flush a "tab-resume save" on `:hidden` (best-effort —
   uses `navigator.sendBeacon`-style synchronous IDB write where possible,
   wrapped in a 50 ms timeout; falls back to no-save if budget exceeded).
3. **Multiplayer heartbeat:** on `:hidden`, send a `WILL_BACKGROUND`
   transport message that extends the peer's heartbeat tolerance from
   6 s to 30 s for the next minute. After 60 s of continuous
   backgrounding, normal 6 s threshold resumes (mobile sleep ≈ disconnect).
4. **Renderer:** existing rAF cleanup remains; restart only on `:visible`.
5. **Resume reconciliation:** on `:visible`, request a peer state-hash
   comparison; if hashes match, resume; if not, treat as a desync and
   trigger the existing reconnection flow.

**Files to Update:**
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md](../../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md) — extend the existing rAF-cleanup acceptance criterion with the audio-mute and autosave-flush hooks.
- [tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md](../../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md) — add the `WILL_BACKGROUND` extension protocol.
- [tasks/mvp/08-persistence/](../../../tasks/mvp/08-persistence/) — add a "tab-resume autosave" acceptance criterion to the autosave task (or create one if it doesn't exist; cross-reference Q160's deferred autosave-cadence work).

**New Files:**
- `docs/architecture/visibility-policy.md` — short canonical doc enumerating every subsystem's `visibilitychange` behavior.

**Implementation Steps:**
1. Author `visibility-policy.md`.
2. Update the three task files.
3. Cross-link from `edge-cases-policy.md` § Tab backgrounding.

**Dependencies:** Issue 3.A-0; depends on the autosave-cadence work
deferred from Q160 (so this issue's autosave hook is best-effort until
Q160 lands a full cadence policy).

**Complexity:** M.

---

#### Issue 3.E-4: No consolidated wall-clock readers inventory

**Source:** Q216 (⚠ Partial); Missing-Logic bullet 11.

**Problem:**
`determinism.md` forbids wall-clock in deterministic paths, but no
single inventory lists every subsystem allowed to read it and how each
degrades on a backward / DST jump.

**Impact:**
- A future contributor adds `Date.now()` somewhere, breaks determinism,
  and reviewers have no rule to point at.
- Save metadata sort flips on backward clock jump with no documented
  expectation.

**Solution:**
Add a "Wall-clock readers" subsection to `determinism.md` enumerating:

| Subsystem | Reads | On jump |
|---|---|---|
| `SaveRecord.metadata.createdAt` | Wall-clock at save time | Captures the jumped value; sort uses `max(savedAt, createdAt)` for stability |
| `SaveRecord.metadata.savedAt` | Wall-clock at save time | Same as above |
| Save-list "modified N minutes ago" | `Date.now() - savedAt` | Display only; negative values render as "just now" |
| Signaling-server room TTL | Wall-clock | Server-side; client reads server time; immune to client clock |
| Renderer rAF delta-time | `performance.now()` (monotonic) | Immune |
| Audio scheduling | `audioContext.currentTime` (monotonic) | Immune |

Plus the rule: **no other subsystem may read wall-clock**; lint-level
enforcement via a `no-wall-clock` ESLint rule scoped to
`src/engine/`, `src/rules/`, `src/content-runtime/`.

**Files to Update:**
- [docs/architecture/determinism.md](../../architecture/determinism.md) — add the table and the lint rule reference.

**New Files:**
- `tasks/mvp/01-engine-core/NN-no-wall-clock-lint.md` — small task to author the ESLint rule; ownedPaths: `eslint-rules/no-wall-clock.js`.

**Implementation Steps:**
1. Add the table to `determinism.md`.
2. Author the lint-rule task.
3. Cross-link from `edge-cases-policy.md` § Wall-clock readers.

**Dependencies:** Issue 3.A-0.

**Complexity:** S.

---

## 4. Suggested Task Breakdown

Each issue maps to one or more concrete pieces of work. Items already
covered by an existing task are noted; new tasks are flagged.

- [ ] **Author `docs/architecture/edge-cases-policy.md`** (Issue 3.A-0; one large doc)
- [ ] **Author `docs/architecture/storage-policy.md`** (Issue 3.E-1)
- [ ] **Author `docs/architecture/visibility-policy.md`** (Issue 3.E-3)
- [ ] **Add Gate 0 (current-actor) to `command-schema.md` + dispatcher task** (Issue 3.A-1)
- [ ] **Author `content-schema/validation-error.schema.json` + taxonomy section** (Issue 3.A-2)
- [ ] **Add single-flight + UI-debounce policy across screens + dispatcher task** (Issue 3.A-3)
- [ ] **Author `content-schema/$defs/numeric.json` + refactor command schemas** (Issue 3.B-1)
- [ ] **Add saturation policy + constants + new fuzz task** (Issue 3.B-2)
- [ ] **Add state-shape invariant + drain-clamp policy** (Issue 3.B-3)
- [ ] **Author `content-schema/save-eligibility.md` + update screen interactions** (Issue 3.C-1)
- [ ] **Update locale-swap policy across screens, diagrams, save schema** (Issue 3.C-2)
- [ ] **Update content-platform asset-fallback chain + retry + notification + AI boundary** (Issue 3.D-1)
- [ ] **NEW TASK: `tasks/mvp/08-persistence/NN-quota-handling.md`** (Issue 3.E-1)
- [ ] **Author `content-schema/storage-error.schema.json`** (Issue 3.E-1)
- [ ] **Update battle screen + reconnection task with combat-disconnect policy** (Issue 3.E-2)
- [ ] **Update renderer/multiplayer/persistence tasks with visibilitychange hooks** (Issue 3.E-3)
- [ ] **NEW TASK: `tasks/mvp/01-engine-core/NN-no-wall-clock-lint.md`** (Issue 3.E-4)
- [ ] **Update `determinism.md` with wall-clock readers inventory + table** (Issue 3.E-4)
- [ ] **Add task-system entries: 4 new tasks + 1 fuzz task; run `npm run generate:task-registry`** (cross-cutting)

---

## 5. Execution Order

Order minimizes rework — schemas and policy docs first, task / runtime
hooks second, multiplayer + persistence last (depend on the discriminant
shapes from earlier steps).

1. **Issue 3.A-0** — `edge-cases-policy.md` skeleton with one section
   per audit question (sections initially empty / "TBD: see Issue X").
2. **Issue 3.B-1** — numeric `$defs` + command-schema refactor (no
   downstream dependencies; can land in parallel).
3. **Issue 3.A-2** — `ValidationError` taxonomy + JSON-Schema (unblocks
   3.A-1, 3.A-3, 3.E-1).
4. **Issue 3.A-1** — Gate 0 current-actor check.
5. **Issue 3.A-3** — Input single-flight + debounce.
6. **Issue 3.B-2** — Overflow constants + saturation policy.
7. **Issue 3.B-3** — State-shape invariants + drain-clamp.
8. **Issue 3.E-4** — Wall-clock inventory + lint rule.
9. **Issue 3.D-1** — Asset-fallback chain.
10. **Issue 3.C-2** — Locale-swap policy.
11. **Issue 3.C-1** — Save-gating predicate + animation rehydration.
12. **Issue 3.E-1** — `QuotaExceededError` handling (largest task; depends
    on 3.A-2's discriminant pattern).
13. **Issue 3.E-3** — Visibility policy (depends on 3.E-1's autosave
    eviction logic for the tab-resume save's fallback path).
14. **Issue 3.E-2** — Mid-combat disconnect (depends on 3.A-0 only;
    placed last because it touches Phase-3 multiplayer task).
15. **Backfill `edge-cases-policy.md` sections** with concrete content
    extracted from each landed issue.
16. **Run `npm run validate`** to verify the full repo passes.

---

## 6. Risks if Not Implemented

Direct from the audit, with implementation impact:

- **Determinism leakage** if any future command author forgets ownership;
  no top-level gate to catch it. Multiplayer desync, replay corruption.
  *(Issue 3.A-1)*
- **Replay log bloat** from no-op zero commands; post-mortem and
  statistics tools see contaminated data. *(Issue 3.B-1)*
- **Silent integer overflow** wraps a max-stack creature multiplier;
  saves corrupt mid-game. *(Issue 3.B-2)*
- **Negative resource debt** with a curse drain produces an undefined-
  behavior balance display and may block turn end. *(Issue 3.B-3)*
- **Save-during-combat ambiguity** lets save → load → replay re-enter
  combat at a different sub-frame; players blame "the game". *(Issue 3.C-1)*
- **Heartbeat false-positive** triggers unwanted host migration on
  backgrounded mobile tabs. *(Issue 3.E-3)*
- **Storage exhaustion** is the largest unaddressed failure mode in the
  entire repo: a single autosave throws, players lose progress, no UX
  to recover. *(Issue 3.E-1; Q218 was flagged in the persistence audit
  too — second strike.)*
- **Asset cascade**: an AI-pipeline asset that crosses presentation /
  gameplay (animation manifest with attack-frame timings) currently has
  no documented runtime policy; could fail loud or fall back silently
  depending on which subsystem catches it first. *(Issue 3.D-1)*
- **Locale UX gaps** leave half-translated UI surfaces and misaligned
  RTL layouts. *(Issue 3.C-2)*
- **Combat disconnect uncertainty** breaks multiplayer perception of
  fairness; no rule to point at when a peer drops at 50% HP. *(Issue 3.E-2)*

---

## 7. AI Implementation Readiness

**Score before this plan:** 3/10 (per audit).

**Score after this plan lands fully:** 8/10.

**What this plan adds toward AI readiness:**
- Single canonical `edge-cases-policy.md` an AI agent can read once and
  cite for every degraded-condition decision. (Audit explicitly named
  the missing canonical doc as the cause of the 3/10.)
- Closed `ValidationError` and `StorageError` discriminants so handlers
  can pattern-match instead of guessing.
- Schema-level numeric invariants (`minimum`, `maximum`) catch
  overflow / zero-quantity bugs at JSON-Schema validation time, before
  any handler runs.
- ESLint rule for wall-clock makes the "no `Date.now()` in deterministic
  paths" rule machine-enforceable.
- Two new tasks (`NN-quota-handling`, `NN-no-wall-clock-lint`) plus one
  Phase-2 fuzz task slot directly into the existing `tasks/mvp/`
  ownership model; `npm run tasks:next` will surface them once
  dependencies clear.

**What this plan does NOT close** (kept honest, blocks higher score):
- Q160 autosave cadence (deferred to persistence audit's plan).
- Q146 bot-ownership-in-MP (deferred to multiplayer audit's plan;
  3.E-2 explicitly defers to it).
- Q201 animation timeline rehydration is touched (3.C-1) but the full
  detail of "what does the animation timeline look like on load" is
  the event-system audit's plan to fully specify.
- Phase-3 AI-generation pipeline runtime safety (only the
  presentation-vs-gameplay boundary is sharpened here; the full
  validation pipeline is covered by `tasks/phase-3/02-ai-generation/`).

After this plan lands, the residual 2/10 gap to a perfect score sits
behind these four other audits, not behind further edge-case work.
