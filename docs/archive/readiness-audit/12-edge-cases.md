# 12. EDGE CASES

> Audit pass over the questions originally listed in this file. Each
> question is preserved verbatim and answered against the current repo
> state (planning + content schemas + task specs; runtime engine code
> does not yet exist).
>
> **Important framing:** edge cases sit at the intersection of the
> command dispatcher (validation), the deterministic reducer (math /
> resource bounds), the renderer (presentation, asset loading), the
> persistence layer (saves, quota), and the multiplayer transport
> (disconnect, reconnect, host migration). Many edge-case answers
> therefore land at ⚠ Partial because individual subsystems define a
> rule, but no single document gathers the cross-cutting policy.

---

### Q: 204. What happens on invalid command payload — reject, sanitize, crash?

**Status:** ✔ Defined

**Answer:**
**Reject — never sanitize, never crash.** The command dispatcher is a
pure reducer with a strict validation framework that runs **before**
any state mutation. Three gates fire in order:
1. **Closed-schema validation** — every command kind has
   `additionalProperties: false`; payloads that fail JSON-Schema are
   rejected as malformed.
2. **Semantic validation** — referenced entities must exist (hero,
   town, building, mine), and resource preconditions must hold.
3. **State validation** — the transition must be legal for the current
   phase (e.g., `BUILD_BUILDING` only during a player's day).

Any failure returns `Result<…, ValidationError>` and **the state object
is not mutated** (referential equality is asserted by the dispatcher
acceptance criteria). There is no documented "best-effort sanitization"
path — fields are not coerced, defaulted, or stripped. A thrown handler
would be a determinism bug, not a feature.

What is **not** pinned: the shape of `ValidationError` (`code`,
`message`, structured `path`?), how the UI surfaces it (toast, modal,
disabled-control reason string), and whether validation errors are
written to a developer-side log.

**Evidence:**
- [docs/architecture/command-schema.md:471-484](../../architecture/command-schema.md#L471-L484) — three-gate validation framework
- [tasks/mvp/01-engine-core/06-command-dispatcher.md:10](../../../tasks/mvp/01-engine-core/06-command-dispatcher.md#L10) — "Validates it against current state (returns `ValidationError` if invalid)"
- [tasks/mvp/01-engine-core/06-command-dispatcher.md:41](../../../tasks/mvp/01-engine-core/06-command-dispatcher.md#L41) — "Dispatching an invalid command returns an error and does NOT mutate state"
- ❌ No spec for `ValidationError` shape, no UX rule for surfacing rejection

---

### Q: 205. What happens on a command from a non-current actor?

**Status:** ⚠ Partial

**Answer:**
**Caught by per-command semantic validation, not by a generic "is it
your turn" gate.** The dispatcher attaches `playerId` and `turn` as
metadata to every command, and individual command validators encode
ownership rules (`Town is friendly (owned by hero's player)`,
`Hero owned by player`, `Mine is at hero position`). Together these
prevent a non-active player from moving someone else's hero, building
in someone else's town, or recruiting from a foreign garrison — but
the rule is **per-command**, not centralised. There is no documented
single check at the top of the dispatcher of the form
`if cmd.playerId !== state.currentPlayerId → reject` outside of the
multiplayer lockstep gate (which queues commands per player until the
local turn boundary).

In multiplayer, the lockstep transport additionally enforces per-turn
ordering by sequencing commands `{ seq, playerId, turn, command }`, so
out-of-turn commands either arrive in the wrong turn slot (rejected)
or get queued for their owner's turn (held).

**Evidence:**
- [docs/architecture/command-schema.md:113](../../architecture/command-schema.md#L113) — "Town is friendly (owned by hero's player)"
- [docs/architecture/command-schema.md:189](../../architecture/command-schema.md#L189) — "playerId: number  // player owner"
- [docs/architecture/command-schema.md:465](../../architecture/command-schema.md#L465) — `{ kind, ..., turn: number, playerId: number }` metadata added by dispatcher
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) — turn-gated lockstep
- ❌ No top-level `currentPlayerId` gate documented at the dispatcher entry; relies on each handler enforcing ownership

---

### Q: 206. What happens on a command for a destroyed entity?

**Status:** ⚠ Partial

**Answer:**
**Caught by per-command existence checks; no global "stale reference"
sweep.** Each command's validation list begins with existence of its
referenced entities (`Hero exists`, `Town exists`, `Mine exists`,
`Mine is not already owned`, `Building is not already built`,
`Mine object is still on map`). A command targeting a destroyed entity
fails the first gate and returns `ValidationError` with no mutation.
Stable IDs are public API and never recycled, so a re-issued command
for an old ID will not silently bind to a new entity that took its
slot.

What is **not** pinned: a generic `EntityNotFoundError` discriminator,
whether the UI receives a typed reason ("hero died", "town captured",
"mine reverted to neutral") versus a plain "invalid command", and
what happens when a queued multiplayer command from another peer
references an entity that died on the local peer mid-turn (the
deterministic reducer means both peers reach the same destruction at
the same point in the log, so this should resolve consistently — but
the policy is not written down).

**Evidence:**
- [docs/architecture/command-schema.md:114](../../architecture/command-schema.md#L114) — "Dwelling exists and is owned by the town"
- [docs/architecture/command-schema.md:194-197](../../architecture/command-schema.md#L194-L197) — Mine existence checks
- [docs/architecture/glossary.md](../../architecture/glossary.md) — "stable IDs are public API"
- ❌ No documented `EntityNotFoundError` discriminant; no UX policy for stale references

---

### Q: 207. What happens on simultaneous mutations to the same entity?

**Status:** ✔ Defined (architecturally) / ⚠ Partial (UI input layer)

**Answer:**
**Cannot occur in deterministic state.** The dispatcher is a strict
serial reducer: `state' = apply(state, command)`. Commands are
processed one at a time, top-to-bottom in the log; a second command
sees the post-first-command state. There is no concurrency primitive
in the engine — no locks, no transactions, no compare-and-swap — and
none is needed because the reducer is single-threaded by contract.

The remaining concern is **at the UI input boundary**, where two
inputs (a click and a hotkey) could dispatch two commands within the
same frame. Audit Q59 flags this: there is no documented input-conflict
policy. Even there, the dispatcher would still serialize them — both
would apply in arrival order — but a second `END_DAY` or `CAST_SPELL`
might be a no-op against state already advanced by the first, which
is benign but produces redundant entries in the command log.

**Evidence:**
- [docs/architecture/command-schema.md:13](../../architecture/command-schema.md#L13) — "Command dispatcher is a pure reducer: `state' = apply(state, command)`"
- [docs/architecture/state-flow.md:50](../../architecture/state-flow.md#L50) — "Pure reducer; no I/O, no timing"
- [docs/archive/readiness-audit/03-ui-state-and-interactions.md:251-257](03-ui-state-and-interactions.md#L251-L257) — Q59: simultaneous click + hotkey input is not policy-pinned
- ❌ No input-debounce / single-flight policy at the UI dispatch boundary

---

### Q: 208. What happens if state and UI diverge — who wins?

**Status:** ✔ Defined

**Answer:**
**State wins, always.** The renderer is read-only over an immutable
`GameStateSnapshot`. UI components subscribe to state via selectors;
they never mutate it. When a command is dispatched and the reducer
returns new state, React/UI re-renders deterministically off the new
snapshot. If a UI control momentarily appears to disagree with state
(e.g., an optimistic hover preview, a stale tooltip), the next render
pass overwrites it. The state-flow doc is explicit: "Rendering
(read-only) … Subscribes to state; never mutates."

What this rules out:
- Optimistic UI that locally mutates and reconciles later (forbidden).
- "Pending" client-side state that could persist past a server reject
  (in single-player there is no server; in multiplayer the lockstep
  gate holds the command until peer confirmation).

What is **not** pinned: how transient UI state (modal-open, hover,
text-input draft) is namespaced (`state.ui.*` vs. component-local
React state) and how a forced re-render after a state change clears
stale modals — but these are presentation concerns and don't change
the "state wins" rule.

**Evidence:**
- [docs/architecture/state-flow.md:53-54](../../architecture/state-flow.md#L53-L54) — "Rendering (read-only) … Subscribes to state; never mutates"
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md:8](../../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md#L8) — snapshot-pull renderer; UI cannot diverge persistently
- [docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md](../../architecture/wiki/screens/62-multiplayer-setup/data-contracts.md) — transient UI state excluded from save/replay

---

### Q: 209. What happens on a 0-resource transaction?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** Validation requires "Hero or town has enough
resources" (which `0 ≥ 0` trivially satisfies) and "Sufficient units
available in growth pool" (which `quantity > 0` would imply but is
not stated as `> 0`). No command spec explicitly says
`quantity ≥ 1` or `cost > 0` is mandatory. Practical questions left
open:
- Does `RECRUIT_UNITS { quantity: 0 }` succeed as a no-op or fail
  validation?
- Does `BUY_FROM_MARKET { amount: 0 }` post a 0-for-0 trade?
- Does a free spell cost (cost = 0 mana after Mysticism) still
  serialize the deduction in the event log, and does the resource
  bar animate a 0-delta?

Allowing 0-quantity commands risks log bloat and confusing replays
("16 zero-recruits in a row"); rejecting them risks UI awkwardness
when the player drags a slider to zero.

**Evidence:**
- [docs/architecture/command-schema.md:115-116](../../architecture/command-schema.md#L115-L116) — "Sufficient units available", "Hero or town has enough resources"
- ❌ No `quantity ≥ 1` / `cost > 0` invariant in any command spec, schema, or rules doc

---

### Q: 210. What happens on integer overflow in stats or resources?

**Status:** ⚠ Partial

**Answer:**
**Overflow bounds are required to be documented per ruleset, but no
runtime overflow handling is specified.** The determinism doc states:
"Multiply first, divide with floor last. Document overflow bounds in
the ruleset." Caps live as integer stat-differential points
(`atkBonusCap=60`, `defReductionCap=60`) clamped *before* the per-point
ratio is applied, and hero / unit stats / resources are all
integers. JavaScript numbers are 53-bit-safe, which keeps the practical
ceiling at `2^53 − 1` for in-engine math.

What is **not** pinned:
- A hard cap for resources (max gold, max wood) — the reference
  behavior caps gold near `2_000_000_000`, but Heroes Reforged has no
  equivalent `MAX_GOLD` / saturation constant declared.
- An assertion / saturation / wrap policy if a formula does exceed its
  documented bound (does it `clamp` to MAX, throw, or wrap?).
- Whether `BigInt` is allowed in ruleset formulas (presumably no, since
  the AST evaluator is over fixed-point integers, not BigInt).
- A test or fuzz target that exercises near-overflow values.

**Evidence:**
- [docs/architecture/determinism.md:39-52](../../architecture/determinism.md#L39-L52) — Fixed-Point Conventions ("Document overflow bounds in the ruleset")
- [docs/architecture/determinism.md:63-64](../../architecture/determinism.md#L63-L64) — "All state numbers serialize as integer JSON literals. No exponents, no `Infinity`, no `NaN`."
- ❌ No declared `MAX_GOLD`, `MAX_STAT`, or saturation policy
- ❌ No overflow-fuzz test target

---

### Q: 211. What happens on negative resource values?

**Status:** ⚠ Partial

**Answer:**
**Negative resources should be unreachable through validated commands,
but no explicit invariant is asserted.** Each spending command
validates "Hero or town has enough resources" before deducting, which
keeps post-deduction values `≥ 0`. The fixed-point evaluator
includes `clamp` and `max(0, …)` primitives, so a formula that
mathematically yields a negative balance can be clamped at the rules
layer.

What is **not** pinned:
- A documented invariant `state.player.resources[k] ≥ 0` enforced by
  the serializer or a state-shape validator.
- A policy when a buggy reducer or content pack produces a negative
  value: does the canonical serializer reject it, or does the engine
  clamp at write time?
- Whether **negative deltas** (e.g., a curse that "drains 5 gold per
  turn" against a 0 balance) silently floor or apply a debt.

The "missing-states" catalog lists "insufficient resources" and
"cannot afford" as variant UI states (per Marketplace and Recruitment),
which is the user-facing half of the policy — the engine half is not
written.

**Evidence:**
- [docs/architecture/determinism.md:33-34](../../architecture/determinism.md#L33-L34) — `clamp`, `min`, `max` AST nodes
- [docs/architecture/wiki/missing-states.md:22-23](../../architecture/wiki/missing-states.md#L22-L23) — "insufficient resources", "cannot afford" as UI states
- [docs/architecture/command-schema.md:115-116](../../architecture/command-schema.md#L115-L116) — "Hero or town has enough resources" precondition
- ❌ No state-shape invariant `resources[k] ≥ 0` declared in schema or determinism doc

---

### Q: 212. What happens on a save mid-animation?

**Status:** ⚠ Partial

**Answer:**
**Save and animation are decoupled; saving mid-animation is safe by
design.** The save record is purely logical — `(seed, contentHashes,
commandLog, turnNumber, optional checkpoints)` — and contains **no**
animation, presentation, or renderer state. Animations live in the
event-log → animation-timeline pipeline, which is excluded from the
deterministic state envelope. Saving therefore captures the engine
state at command-log offset N regardless of whether a sword swing
sprite happens to be at frame 3 of 7 when the save button is pressed.

What is **not** pinned:
- Whether the **Save** menu is gated during specific UI moments
  (e.g., disabled during a player's End-of-Day animation, during a
  battle attack sequence, during a hero-level-up modal). The system
  menu task says "Save Game can route to `55-save-load` after guard
  approval and exit animation" — implying *some* gating, but the
  guard predicate is not enumerated.
- Whether there is a "save during battle" mode at all. The reference
  behavior treats combat as a no-save state: Save is unavailable from
  battle start until battle resolution returns to the adventure layer.
  The canonical task list does not state a Heroes Reforged equivalent
  rule.
- How the renderer's animation timeline rehydrates after a load (Q201
  flagged this).

**Evidence:**
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) — `SaveRecord` carries no animation state
- [docs/architecture/wiki/screens/54-system-menu/interactions.md:31-32](../../architecture/wiki/screens/54-system-menu/interactions.md#L31-L32) — "Save Game can route to 55-save-load after guard approval and exit animation"
- [docs/archive/readiness-audit/08-persistence-save-system.md](08-persistence-save-system.md) — save format is log-only
- ❌ No documented "save disabled during X" predicate; no save-during-combat policy
- ❌ No animation-timeline rehydration spec on load

---

### Q: 213. What happens on disconnect mid-combat?

**Status:** ⚠ Partial

**Answer:**
**Multiplayer reconnection covers it generically; combat-specific
behaviour is not called out.** The multiplayer reconnection task
specifies a 30-second invisible-catch-up window and a 120-second
"forfeit or wait" threshold. Heartbeat loss for 6 s triggers
host-migration election. The deterministic reducer means a
reconnecting peer can replay the missing command range — including
mid-combat commands — to reach an identical state.

What is **not** pinned for mid-combat specifically:
- Does the still-connected player's combat clock pause during the
  reconnect window, or do they continue with the AI temporarily
  resolving the absent player's stack? (Audit Q146 flagged "bot
  ownership in MP" as undefined.)
- Single-player AI vs. human disconnect during combat: not relevant
  (no remote peer), but a tab-close mid-combat without an autosave
  (Q160 flagged autosave cadence as undefined) loses the match.
- Whether a combat instance is checkpointed independently for
  faster mid-combat catch-up, or whether the full pre-combat state
  must be replayed.

**Evidence:**
- [tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md:32-34](../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md#L32-L34) — 30 s reconnect, 120 s forfeit
- [tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md](../../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md) — 6 s heartbeat election
- [docs/archive/readiness-audit/07-multiplayer.md](07-multiplayer.md) — Q132, Q148 on disconnect handling
- ❌ No combat-specific stall/pause policy; no AI-takeover-during-disconnect rule

---

### Q: 214. What happens on language/locale change mid-game?

**Status:** ⚠ Partial

**Answer:**
**UI strings re-resolve through the localization service; gameplay
state is unaffected.** All UI strings have stable IDs (e.g.
`unit.dragon.name`); the localization service looks them up in the
current locale pack with English fallback. Switching locale at runtime
swaps the active pack — already-rendered text is replaced on the next
render pass via standard React subscription. Locale-variant assets
(icons with embedded text, currency symbols) re-resolve through the
asset registry's "Has locale variant?" check on the same swap.

What is **not** pinned:
- Whether the locale change is itself a deterministic command in the
  engine (it should not be — locale is presentation-only) or a UI
  setting outside the command log. The Options screen lists
  `language` as a user-controllable setting alongside audio and
  animation speed, suggesting non-state.
- Whether **in-flight** strings (a tooltip already opened, a
  confirmation modal mid-display, a battle log line just emitted)
  retranslate in place or remain in the previous locale until next
  open.
- Whether RTL layout switches require a renderer reset (mirrored
  atlas, flipped HUD) — diagram 19 shows locale variants but the
  layout-mirror policy is not stated.
- Whether a save loaded under a different locale than it was created
  in shows any compatibility warning (architecturally none should
  be needed, but UX is undefined).

**Evidence:**
- [docs/architecture/diagrams/18-string-resolution.md](../../architecture/diagrams/18-string-resolution.md) — string resolution flow with English fallback
- [docs/architecture/diagrams/19-locale-variants.md](../../architecture/diagrams/19-locale-variants.md) — locale-variant asset resolution
- [docs/architecture/wiki/screens/56-options/spec.md](../../architecture/wiki/screens/56-options/spec.md) — `language` listed as a runtime user setting
- [docs/architecture/schema-matrix.md:36](../../architecture/schema-matrix.md#L36) — `Localization` schema for UI labels
- ❌ No spec for in-flight tooltip / modal retranslation policy
- ❌ No RTL layout-flip protocol

---

### Q: 215. What happens when an AI-generated asset fails to load mid-game?

**Status:** ⚠ Partial

**Answer:**
**Falls back per the "missing presentation may fall back" rule.**
Content-platform policy is explicit: "allow missing visuals to fall
back; reject missing gameplay requirements loudly." Screen
interactions echo the same: "Missing presentation assets may use
resolver fallback. Missing gameplay records, invalid content IDs, or
rejected commands fail loudly." So an AI-generated unit portrait that
404s mid-game falls back through the asset resolver chain (locale
variant → default → placeholder), without crashing the game or
desyncing state — gameplay reads IDs, not asset paths.

What is **not** pinned:
- The **fallback chain order** (locale variant → faction-default →
  generic placeholder?) and whether the placeholder is a built-in
  asset or a procedural "missing texture" indicator.
- Mid-game failure of a streamed AI asset: is the load retried, with
  what backoff, and is the user notified, or is the placeholder
  permanent for the session?
- Whether AI-generated *gameplay records* (a unit's stats coming from
  the AI generation pipeline) follow the "fail loud" rule — they
  should, since content-coherence + auto-balancer gates run before
  ingestion (Phase-3 02-ai-generation tasks 02–04).
- Quota / cache pressure: if IndexedDB is full and an AI asset can't
  be cached, the asset must still render (re-fetch each session) but
  no policy is stated.

**Evidence:**
- [docs/architecture/content-platform.md:86-87](../../architecture/content-platform.md#L86-L87) — "allow missing visuals to fall back; reject missing gameplay requirements loudly"
- [docs/architecture/wiki/screens/01-main-menu/interactions.md:37](../../architecture/wiki/screens/01-main-menu/interactions.md#L37) — "Missing presentation assets may use resolver fallback"
- [docs/architecture/diagrams/19-locale-variants.md](../../architecture/diagrams/19-locale-variants.md) — variant fallback to default
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) — AI content pipeline (validation gates pre-ingest, not at runtime load)
- ❌ No documented placeholder asset, retry policy, or user-notification rule for runtime asset-fetch failure

---

### Q: 216. What happens on system-clock changes during play?

**Status:** ⚠ Partial

**Answer:**
**Gameplay state is immune; UI timestamps may jump.** Determinism
forbids `Date.now()` and `performance.now()` in deterministic paths,
and replays must not contain wall-clock timestamps. Any in-game
"day/turn/clock" is a logical counter advanced by `END_DAY` / per-turn
commands, not a wall-clock reading. So jumping the OS clock forward,
backward, or across DST does not affect deterministic state, replay
integrity, or multiplayer hash agreement.

Where wall-clock **does** appear and may misbehave:
- `metadata.createdAt` / `metadata.savedAt` on save records — would
  capture the new (possibly absurd) clock value; sort order in the
  Save/Load slot list could flip.
- "Modified N minutes ago" UI hints (if any) would be wrong.
- The signaling-server WebSocket may use timestamps for room TTL;
  drift could expire a room early or late.
- The renderer uses `requestAnimationFrame`'s monotonic time for
  delta-time animation; this is unaffected by system-clock changes.

What is **not** pinned: an explicit "wall-clock is presentation-only"
policy section calling out exactly which subsystems read it, and how
a sudden clock change is handled (ignore-and-continue is implied).

**Evidence:**
- [docs/architecture/determinism.md:22](../../architecture/determinism.md#L22) — "Forbidden in deterministic paths: `Math.random()` and `Date.now()` / `performance.now()`"
- [docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md](../../architecture/wiki/screens/62-multiplayer-setup/data-contracts.md) — "Replays use stable IDs and scalar command inputs, never … wall-clock timestamps"
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) — save metadata includes `createdAt`, `savedAt` (wall-clock)
- ❌ No consolidated policy listing every wall-clock reader and its degradation behavior

---

### Q: 217. What happens on tab backgrounding or device sleep?

**Status:** ⚠ Partial

**Answer:**
**Renderer cleanly stops; sim has no per-frame work to suspend; but
network and autosave behaviour is not specified.** Concretely:

- **Renderer:** the presentation-loop task explicitly requires
  "Stopping the loop (page hide, component unmount) does not leak the
  animation frame handle" — `visibilitychange` / `pagehide` is the
  natural cleanup signal, browsers also pause `requestAnimationFrame`
  when the tab is hidden.
- **Sim:** the deterministic reducer has no idle work — it only
  applies commands when one is dispatched. Backgrounding does not
  halt or corrupt state.
- **Multiplayer transport:** WebRTC DataChannels remain open while
  the tab is backgrounded; the heartbeat channel is unordered/no-retry,
  which means a backgrounded tab whose heartbeat coalesces could trip
  the 6 s host-migration threshold (Q133). This is **not** policy-pinned;
  whether a backgrounded but live tab should retain host status, and
  what happens when device sleep suspends WebRTC entirely (browser-
  dependent), is undefined.
- **Autosave:** Q160 already flagged that the autosave cadence is
  unspecified; whether tab backgrounding triggers a "save before
  suspend" is also undefined.

What is **not** pinned: a `Page Visibility API` policy — pause music?
mute audio? show "tab paused" overlay on resume? skip autosave during
hidden state? defer multiplayer heartbeats?

**Evidence:**
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md:36](../../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md#L36) — "Stopping the loop (page hide, component unmount) does not leak the animation frame handle"
- [tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md](../../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md) — 6 s heartbeat threshold (no backgrounding accommodation)
- [docs/archive/readiness-audit/08-persistence-save-system.md](08-persistence-save-system.md) — Q160 autosave cadence undefined
- ❌ No `visibilitychange` / `pagehide` policy across audio, autosave, multiplayer heartbeat
- ❌ No "resume after sleep" reconciliation flow

---

### Q: 218. What happens when storage quota is exceeded?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified. The audit has flagged this twice already (persistence
audit Risks bullet, AI integration "keep secrets and quotas outside
the client").** IndexedDB primary storage caps at ~50 MB on Safari and
"unbounded" with permission prompts on Chrome/Firefox; there is no
documented `QuotaExceededError` handler, no "manage saves" CTA, no
auto-prune of oldest autosaves, and no warning threshold. The MVP
persistence tasks declare three object stores (`saves`, `scenarios`,
`content`) and an export-to-JSON path, but none of them mentions:
- Detecting quota errors at write time.
- Recovery (retry on a smaller chunk, fall back to in-memory only,
  surface a non-modal toast).
- A budget per store (e.g., "AI-generated content cache may use up to
  N MB; older entries are LRU-evicted").
- User-facing UX for "you're nearly full — export some saves."
- Behavior in Safari's stricter eviction policy where backgrounded
  IndexedDB databases can be cleared after 7 days of disuse.

This is the highest-risk item in the edge-case section: a quota-full
write during an autosave or AI-asset cache write would currently
throw, and there is no documented contract for what happens next.

**Evidence:**
- [docs/archive/readiness-audit/08-persistence-save-system.md:320](08-persistence-save-system.md#L320) — "IndexedDB quota: Browsers cap IndexedDB at ~50 MB–unbounded depending on policy and platform. No quota-handling task exists."
- [docs/architecture/ai-integration.md:48](../../architecture/ai-integration.md#L48) — "keep secrets and quotas outside the client when needed" (refers to upstream API quotas, not browser storage)
- [tasks/mvp/08-persistence/01-indexeddb-wrapper.md](../../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md) — wrapper spec with no quota handling
- ❌ No `QuotaExceededError` policy, no per-store budget, no eviction policy, no UX flow

---

## 🔍 Summary

### Missing Logic
- **No top-level "current actor" gate** at dispatcher entry — ownership rules are scattered across per-command validators (Q205).
- **No `EntityNotFoundError` discriminant** or stale-reference UX (Q206).
- **No input-conflict policy** at the UI dispatch boundary (Q207, also flagged in Q59).
- **No `quantity ≥ 1` / `cost > 0` invariant** in command schemas — 0-resource transactions are not policy-pinned (Q209).
- **No declared `MAX_GOLD` / `MAX_STAT` constants**, no saturation/wrap policy on overflow (Q210).
- **No `resources[k] ≥ 0` state-shape invariant** (Q211).
- **No "save disabled during X" predicate**, no save-during-combat policy, no animation-timeline rehydration spec on load (Q212).
- **No combat-specific disconnect / pause-clock / AI-takeover policy** in multiplayer (Q213).
- **No in-flight tooltip retranslation policy** on locale swap; **no RTL layout-flip protocol** (Q214).
- **No retry / placeholder / user-notification rule** for runtime asset-fetch failure (Q215).
- **No consolidated wall-clock-reader inventory** and degradation behavior on system-clock change (Q216).
- **No `visibilitychange` / `pagehide` policy** across audio, autosave, multiplayer heartbeat, music, "resume" flow (Q217).
- **No `QuotaExceededError` policy**, no per-store budget, no eviction, no UX flow for storage exhaustion (Q218).

### Risks
- **Determinism leakage via per-command ownership checks:** if any future command author forgets to encode the player-ownership precondition, a non-current actor could mutate state and pass the lockstep gate. A single top-level `cmd.playerId === state.currentPlayerId` gate would cost nothing and prevent this whole class of bug (Q205).
- **Replay log bloat from no-op zero commands** if the UI allows `quantity=0` recruits, free-cast spells, or 0-gold market trades (Q209).
- **Silent overflow:** the determinism doc *requires* per-formula overflow bounds but no fuzz target verifies them; a max-stack creature multiplier could produce a wrap silently if `multiply-first` exceeds 2^53 (Q210).
- **Negative resource debt:** a curse / drain effect against a 0 balance has undefined behavior — could produce a negative gold display, or block the next turn end, depending on which clamp wins (Q211).
- **Combat save-during gating ambiguity:** if "Save" appears active mid-combat and triggers a save → load → replay flow that re-enters combat at a different sub-frame, expectations diverge between players (Q212).
- **Heartbeat false-positive on backgrounded host:** mobile / battery-throttled tabs may drop heartbeats below the 6 s threshold and trigger an unwanted host migration (Q217).
- **Storage exhaustion is the largest unaddressed failure mode:** an autosave or AI-asset cache write that fails with `QuotaExceededError` mid-game has no documented recovery path; players could lose progress, and there is no UX to manage the situation (Q218).
- **Asset-fetch failure cascades:** an AI-generated asset that can't load is documented to fall back, but a failed *gameplay* record would currently fail loud — there is no clear runtime policy for an AI pipeline asset that crosses the line between "presentation" and "data" (e.g., a creature animation manifest that also encodes attack frame timings).
- **Locale change UX gaps:** mid-modal locale swap could leave half-translated UI surfaces visible until next open; RTL switch could leave HUD misaligned without a documented re-layout pass (Q214).

### Improvements
1. **Add a top-level dispatcher gate**: `if (cmd.playerId !== state.currentPlayerId) → ValidationError("not your turn")`, applied before any per-command validator (Q205).
2. **Declare `EntityNotFoundError` discriminant** with `{ kind: "ENTITY_NOT_FOUND", entityKind: "hero" | "town" | "mine" | …, id: string }` so UI can localize "hero died" vs. "town captured" (Q206).
3. **Specify input-conflict policy**: dispatcher-side single-flight on `(playerId, kind)` for non-idempotent commands; UI-side debounce on `END_DAY` and `CAST_SPELL` (Q207).
4. **Pin schema invariants**: `quantity: { minimum: 1 }` on all transactional commands; `cost: { minimum: 0 }` only where free actions are intentional; document the rationale (Q209).
5. **Declare overflow policy**: `MAX_RESOURCE = 2_000_000_000` (or document a per-resource cap in the ruleset); `clamp` saturates instead of wraps; add a fuzz target near `MAX_INT - 1` (Q210).
6. **Add a state-shape invariant test**: every `resources[k]` and every `unit.count` ≥ 0 after every dispatch; the canonical serializer asserts this (Q211).
7. **Document save-gating predicate**: `canSaveNow(state)` returns false during multiplayer turn lock, during a battle subturn animation, during a modal-only screen (e.g., level-up choice). Add a corresponding "Save disabled — finish battle to save" UI state (Q212).
8. **Spec mid-combat disconnect handling**: combat clock pauses while a peer is reconnecting; AI does not take over remote player's stack; if `120 s` elapses, defender wins by forfeit and the match awards remaining player (Q213).
9. **Define locale-change policy**: emit a `LOCALE_CHANGED` UI-state event that triggers re-render of all subscribed selectors; close transient tooltips/popovers; toggle `dir="rtl"` on body for RTL locales; confirm action when locale changes affect a save's display text (Q214).
10. **Define asset-load failure policy**: try → 1× retry with exponential backoff → fall back to placeholder → toast "asset unavailable" once per session; never unmount the gameplay surface (Q215).
11. **Add a wall-clock readers inventory** in `determinism.md`: list every subsystem allowed to read wall-clock (save metadata, signaling room TTL, audio cue gating) and require each to handle backward jumps gracefully (Q216).
12. **Add a `visibilitychange` policy**: pause/mute audio when hidden; suppress autosave during hidden state but flush a "tab-resume save" on `visibilitychange:visible`; in multiplayer, send a `WILL_BACKGROUND` heartbeat-extension up to 30 s; restart renderer rAF only on `visible` (Q217).
13. **Quota-handling task** (highest priority): implement `QuotaExceededError` catching in the IndexedDB wrapper; non-modal toast "Storage full — manage saves"; auto-prune oldest `auto-N` slot if it would unblock the next save; LRU-evict AI-asset cache before save data; persist a per-store byte budget in `state.persistence.budgets` for diagnostics (Q218).

### AI-Readiness
Score: **3/10**

Reason: Edge cases are the area where planning docs are *least* prescriptive. The dispatcher and determinism contracts are firm enough that an AI implementer can correctly handle invalid payloads (Q204) and avoid concurrent-mutation hazards (Q207) without inventing rules. Beyond those two, almost every question hits a documented gap: ownership gating is left to per-command authors (Q205), 0-quantity / negative / overflow / quota / locale-mid-game / disconnect-in-combat / save-mid-battle / tab-backgrounding all have plausible architectural answers but no written policy. An AI agent attempting to implement these tomorrow would silently invent thirteen separate policies and leave them undocumented across thirteen different files. This is the second-weakest section of the audit (after the event system at 3/10) and will produce the most operational surprises in the field unless an `edge-cases-policy.md` is authored as a single cross-cutting reference.
