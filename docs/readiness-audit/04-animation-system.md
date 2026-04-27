# 4. ANIMATION SYSTEM

> Audit pass over the questions originally listed in this file. Each
> question is preserved verbatim and answered against the current repo
> state (planning + content schemas + sequence diagrams; the renderer
> code today is only an empty `src/renderer/README.md`).

---

### Q: 66. Are animations driven by simulation time, real time, or render time?

**Status:** ⚠ Partial

**Answer:**
**Two-clock model — sim-time for state events, render-time for
playback.** The engine is purely command-driven (no tick rate, no
clock); state changes are produced by the synchronous reducer
`state' = apply(state, command)`. The renderer "consumes an event log
and plays back animations bit-identically", and frame timing inside
the renderer is render-time driven (`Animator: tick(deltaTime)` in
22-building-loop). Building idle anims advance per-frame
`elapsed += deltaTime`. The renderer doc explicitly forbids
`requestAnimationFrame` for game-logic timing — so animations never
drive simulation, only the reverse.

What is **not** pinned: the explicit unit and source of `deltaTime`
(monotonic browser clock vs. throttled timestamp), how the
event-log → animation-timeline mapping anchors playback time after a
load/replay, and whether multi-frame animations advance their
timeline at battle speed × `deltaTime` or at a fixed FPS independent
of `config.ui.animationSpeed`.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:14-16](../architecture/renderer-technology-choice.md#L14-L16) — "Play frame-based animations tied to event log (deterministic playback)"
- [docs/architecture/renderer-technology-choice.md:35-36](../architecture/renderer-technology-choice.md#L35-L36) — "explicit animation timeline (not game-loop-coupled)"
- [docs/architecture/renderer-technology-choice.md:99-101](../architecture/renderer-technology-choice.md#L99-L101) — "DON'T use `requestAnimationFrame` for game-logic timing (use explicit `dt`)"
- [docs/architecture/diagrams/22-building-loop.md:17-25](../architecture/diagrams/22-building-loop.md#L17-L25) — `tick(deltaTime)` at 60 FPS
- [docs/architecture/state-flow.md:46-58](../architecture/state-flow.md#L46-L58) — engine has no clock; commands only
- ❌ No `deltaTime` source / clamp rule; no battle-speed scaling rule

---

### Q: 67. Are gameplay-affecting animations deterministic across machines?

**Status:** ⚠ Partial

**Answer:**
**Mandated yes — but the contract is informal.** Gameplay state lives
exclusively in the deterministic engine: `state' = apply(state,
command)` runs through fixed-point math, seeded RNG, and a canonical
state hash; nothing in the renderer is allowed to mutate state. The
renderer doc explicitly bans `Math.random()` in the renderer for
determinism, and `DamageCalc` is described as "Apply formula
(deterministic)" inside the attack-anim sequence. So whatever an
animation visually shows, the gameplay outcome it represents is
guaranteed bit-identical because the engine produces it before the
animation plays.

What is **not** pinned: the engine ↔ renderer call protocol around
the **DAMAGE_FRAME** callback (see Q78/Q79). The diagram has the
`AnimController` invoking `DamageCalc()` mid-frame, which conflicts
with "renderer is a pure snapshot consumer". If damage is in fact
applied by the engine (with the renderer only displaying the
floating "47" at the right frame), determinism holds; if any code
path lets the renderer feed numbers into state, determinism leaks.
This needs a written rule.

**Evidence:**
- [docs/architecture/determinism.md:1-6](../architecture/determinism.md#L1-L6) — bit-identical state required
- [docs/architecture/determinism.md:21-27](../architecture/determinism.md#L21-L27) — forbidden: `Math.random()`, `Date.now()`, `performance.now()` in deterministic paths
- [docs/architecture/renderer-technology-choice.md:97-99](../architecture/renderer-technology-choice.md#L97-L99) — "DON'T call `Math.random()` in renderer", "DON'T mutate game state from renderer"
- [docs/architecture/diagrams/11-attack-anim.md:21-32](../architecture/diagrams/11-attack-anim.md#L21-L32) — `Anim → DMG: calculateDamage()`; `Apply formula (deterministic)`
- ❌ No doc specifying which side owns the DAMAGE_FRAME → state mutation hand-off

---

### Q: 68. Are visual-only animations allowed to be non-deterministic?

**Status:** ✔ Defined

**Answer:**
**Yes. Cosmetic animation is explicitly outside deterministic
state.** Every screen `interactions.md` carries the same pinned
clause: "UI-only hover, focus, selected row, open tab, target cursor,
drag ghost, **and animation frame** stay outside deterministic
gameplay state." That carves out idle building loops, particle VFX
phases (`vfx.schema.json` allows screen shake, light flash, particle
systems with no determinism guarantee), `ash-hound.animation.json`
loop frames, and reduced-motion preferences as presentation-only.
Reduced motion (`config.ui.reducedMotion`) and animation speed
(`config.ui.animationSpeed`) are user-config knobs that don't enter
the command log.

**Evidence:**
- [docs/architecture/wiki/screens/08-kingdom-overview/interactions.md:27](../architecture/wiki/screens/08-kingdom-overview/interactions.md#L27) — "animation frame stay outside deterministic gameplay state"
- [docs/architecture/wiki/screens/56-options/data-contracts.md:23](../architecture/wiki/screens/56-options/data-contracts.md#L23) — `uiConfig` covers animation speed / reduced motion
- [docs/architecture/wiki/screens/56-options/data-contracts.md:35-36](../architecture/wiki/screens/56-options/data-contracts.md#L35-L36) — `config.ui.reducedMotion`, `config.ui.animationSpeed`
- [docs/architecture/wiki/screens/56-options/data-contracts.md:57](../architecture/wiki/screens/56-options/data-contracts.md#L57) — "Do not persist … animation frame, or transient visual effects"
- [content-schema/examples/records/vfx/ember-lance.vfx.json:1-18](../../content-schema/examples/records/vfx/ember-lance.vfx.json#L1-L18) — particle systems, screen shake, light flash

---

### Q: 69. Where is the boundary between gameplay and cosmetic animation drawn?

**Status:** ⚠ Partial

**Answer:**
**At the `engine ↔ renderer` package boundary.** The state-flow
boundary table is explicit: `src/engine/` = pure command dispatch;
`src/renderer/` = "Subscribes to state; never mutates"; `src/ui/` =
emits commands, never mutates state directly. Gameplay-affecting
events are commands and command-emitted simulation events
(`UNIT_ATTACKED`, `UNIT_DIED`, `UNIT_MOVED` in
`task-command-token-coverage.json` — "Combat event consumed by
animation/sound"). Cosmetic animation is everything else: idle loops,
hurt recovery, hit reactions, fade transitions, particle phases,
day/night tints, building idle, projectile bezier travel.

The boundary **wobbles** in two places:

1. **DAMAGE_FRAME** (11-attack-anim) puts an `AnimController` in the
   call path between command dispatch and damage application. If the
   damage event is queued from the engine and the renderer just
   plays a number-popup at the matching frame, the boundary holds;
   if the renderer triggers `DamageCalc` directly, it doesn't.
2. **Hero movement** (23-hero-movement) interpolates position
   visually while a `MOVE_HERO` command is logically atomic. Whether
   "hero on tile (3,2) at 47% of move" is a real state or only a
   render interpolation isn't pinned.

**Evidence:**
- [docs/architecture/state-flow.md:46-58](../architecture/state-flow.md#L46-L58) — boundary table
- [docs/architecture/renderer-technology-choice.md:46-50](../architecture/renderer-technology-choice.md#L46-L50) — "renderer does not depend on simulation code. Pure snapshot consumer."
- [docs/architecture/task-command-token-coverage.json:23-25](../architecture/task-command-token-coverage.json#L23-L25) — `UNIT_ATTACKED`/`UNIT_DIED`/`UNIT_MOVED` consumed by animation/sound
- [docs/architecture/diagrams/11-attack-anim.md:22-26](../architecture/diagrams/11-attack-anim.md#L22-L26) — DAMAGE_FRAME in animation
- [docs/architecture/diagrams/23-hero-movement.md:24-32](../architecture/diagrams/23-hero-movement.md#L24-L32) — interpolated movement
- ❌ No explicit "what is gameplay-state vs. visual-state" enumeration

---

### Q: 70. How are timelines defined — code, JSON, sprite sheets, skeletal data?

**Status:** ✔ Defined

**Answer:**
**Data-driven JSON over sprite sheets — no code, no skeletons.**
Animation timelines are JSON records validated by
`animation.schema.json`, where each timeline lives under
`sequences[name]` and lists explicit frame indices, FPS, loop flag,
and an optional `eventFrame`. The frames index a single sprite-sheet
PNG (`spriteSheetAssetId`). VFX adds a parallel JSON channel
(`vfx.schema.json` → `phases.{cast,projectile,impact}` with particle
system IDs, screen shake, and light flash). No skeletal/bone data is
defined anywhere; no code-driven timelines exist.

**Evidence:**
- [content-schema/schemas/animation.schema.json:1-23](../../content-schema/schemas/animation.schema.json#L1-L23) — JSON schema
- [content-schema/examples/records/animations/ash-hound.animation.json:1-22](../../content-schema/examples/records/animations/ash-hound.animation.json#L1-L22) — full example: idle/move/attack/hit/death sequences, frames, fps, loop, eventFrame
- [content-schema/schemas/vfx.schema.json:1-17](../../content-schema/schemas/vfx.schema.json#L1-L17) — VFX phases
- [content-schema/examples/records/vfx/ember-lance.vfx.json:1-18](../../content-schema/examples/records/vfx/ember-lance.vfx.json#L1-L18) — VFX phases example
- [docs/architecture/renderer-technology-choice.md:71-74](../architecture/renderer-technology-choice.md#L71-L74) — sprite-sheet atlas

---

### Q: 71. What format is used for sprite-sheet metadata?

**Status:** ⚠ Partial

**Answer:**
**Inline in the AnimationSet JSON — no separate atlas TexturePacker /
JSON-Hash file.** `animation.schema.json` carries:

| Field | Type | Role |
|---|---|---|
| `spriteSheetAssetId` | string (asset ID) | resolved through pack `asset-index` to a real PNG |
| `frameSize` | `{ width, height }` | uniform-grid frame dimensions |
| `anchor` | `{ x, y }` (0..1) | foot/origin anchor for placement |
| `sequences[name]` | `{ frames: int[], fps, loop, eventFrame? }` | per-clip timeline |

So the **atlas layout is implicit**: a uniform `frameSize` grid,
`frames: [0,1,2,…]` indexing left-to-right, top-to-bottom. There is
no support for non-uniform frames, padding/trim, multi-page atlases,
per-frame anchors, or rotated/flipped frames. There is also no
documented convention for the row/column count or column-major vs.
row-major frame ordering.

**Evidence:**
- [content-schema/schemas/animation.schema.json:6-22](../../content-schema/schemas/animation.schema.json#L6-L22) — required fields
- [content-schema/examples/records/animations/ash-hound.animation.json:7-21](../../content-schema/examples/records/animations/ash-hound.animation.json#L7-L21) — inline example: `frameSize { width:96, height:96 }`, `anchor { x:0.5, y:0.82 }`
- [content-schema/schemas/asset-index.schema.json:1-40](../../content-schema/schemas/asset-index.schema.json#L1-L40) — asset-id → path resolution
- ❌ No spec for non-uniform frames / trim / multi-page / per-frame anchors
- ❌ No statement on row-major vs. column-major frame indexing

---

### Q: 72. Is there an interpolation system, and what easing functions are supported?

**Status:** ❌ UNKNOWN

**Answer:**
**Mentioned, never specified.** Three interpolation needs surface in
the diagrams:

- **Hero movement** "interpolates position" along a path of tiles
  (23-hero-movement)
- **Day/Night** "phase transitions trigger music crossfade and
  lighting tween" (07-day-night)
- **Spell projectile** travels along a "Bezier path ~0.6 seconds"
  (12-spell-anim)
- **Camera follow** is "smooth follow" during hero movement
- **Town flyby / camera ease** in screen 35 (`townFlyby` "Camera
  eases across the skyline")

But there is no enumerated easing function set (linear / quadIn /
quadOut / cubicInOut / etc.), no schema field anywhere for
`easing: "easeOut"`, no library or implementation reference, and no
rule that says the same easing primitives must be used across map,
battle, and UI. Sprite-sheet sequence playback is integer-frame
stepping (no inter-frame interpolation).

**Evidence:**
- [docs/architecture/diagrams/23-hero-movement.md:8](../architecture/diagrams/23-hero-movement.md#L8) — "path interpolation"
- [docs/architecture/diagrams/23-hero-movement.md:24-32](../architecture/diagrams/23-hero-movement.md#L24-L32) — interpolate position; "smooth follow"
- [docs/architecture/diagrams/07-day-night.md:35](../architecture/diagrams/07-day-night.md#L35) — "music crossfade and lighting tween"
- [docs/architecture/diagrams/12-spell-anim.md:23](../architecture/diagrams/12-spell-anim.md#L23) — "Bezier path ~0.6 seconds"
- [docs/architecture/wiki/screens/35-town-flyby/interactions.md:16-18](../architecture/wiki/screens/35-town-flyby/interactions.md#L16-L18) — camera ease
- ❌ No easing-function enum; no schema field for easing
- ❌ No interpolation library / module choice

---

### Q: 73. How are concurrent animations on the same target resolved?

**Status:** ❌ UNKNOWN

**Answer:**
**Not addressed.** The creature animation state machine
(21-creature-states) is strictly mutually exclusive — a unit is
exactly one of `Idle / Walking / Attacking / Casting / Hurt / Dying /
Defending / Waiting / Dead`, with single arrows between states. So
the state-machine model implicitly resolves "concurrent" by
disallowing it: only one body animation at a time. But:

- **Body anim + status icons** (e.g. burn / poison overlay during
  any state) — no doc covers this layered case.
- **Body anim + VFX phase** (cast pose + projectile in flight + hit
  flash) — multiple actors animate simultaneously, but the schema
  has no track / channel system per target.
- **Hero on map (walk loop) + path-position interpolator** — these
  must run together; no doc names this two-track setup.
- **Building idle + active spawn + damaged tint** during a town
  attack overlap state.

**Evidence:**
- [docs/architecture/diagrams/21-creature-states.md:10-29](../architecture/diagrams/21-creature-states.md#L10-L29) — single-state machine
- [docs/architecture/diagrams/12-spell-anim.md:34-35](../architecture/diagrams/12-spell-anim.md#L34-L35) — status icons appear over affected units
- ❌ No multi-track / channel / layer model in `animation.schema.json`
- ❌ No "body vs status vs FX" channel rule

---

### Q: 74. What is the conflict resolution policy (queue, override, blend)?

**Status:** ❌ UNKNOWN

**Answer:**
**No policy.** With a single-track state machine and no documented
conflict handler, the implicit rule is "the most recent
state-transition wins" — but this is not written, and corner cases
are unaddressed:

- A unit is mid-`hurt` (0.3 s) when it dies — does `hurt` finish or
  `dying` interrupt?
- A unit is mid-`attacking` and takes retaliation — is `hurt`
  queued, blended, or skipped?
- The diagram shows retaliation triggering `defender → play(
  retaliate-attack) → attacker → play(hurt)`, sequencing them, but
  the rule for arbitrary other interruptions isn't defined.

There is no `queue` / `interrupt` / `blend` selector in any schema,
no default policy in any diagram, and no priority weighting between
animation kinds.

**Evidence:**
- [docs/architecture/diagrams/21-creature-states.md:18-22](../architecture/diagrams/21-creature-states.md#L18-L22) — `Hurt → Dying` allowed, but priority rule unstated
- [docs/architecture/diagrams/11-attack-anim.md:33-39](../architecture/diagrams/11-attack-anim.md#L33-L39) — sequenced retaliation only
- ❌ No `policy: "queue" | "override" | "blend"` field
- ❌ No animation priority table

---

### Q: 75. What happens to an animation when its target entity is destroyed?

**Status:** ⚠ Partial

**Answer:**
**For combat unit deaths the lifecycle is documented; for other
destructions it isn't.** When a stack's HP drops to zero
(13-death-victory): mark dead → play death animation (frames 0-3
fall, 4-5 fade) → remove from grid → check victory. The death anim
**runs to completion before removal**, so target-destroyed-mid-anim
is naturally avoided for the death-anim case.

Other destructions are **not** covered:

- A burn-status icon ticking on a stack that the same tick is
  killed.
- A projectile mid-flight when its origin caster dies (e.g. mage
  killed by retaliation while a spell is in projectile phase).
- A summoned creature whose timer expires mid-attack-animation.
- A building demolition — there's no demolition state in the
  building state machine (06-town-animations).
- Camera-follow target dying (no rule for camera detachment).

**Evidence:**
- [docs/architecture/diagrams/13-death-victory.md:11-22](../architecture/diagrams/13-death-victory.md#L11-L22) — death anim plays then remove
- [docs/architecture/diagrams/06-town-animations.md:11-24](../architecture/diagrams/06-town-animations.md#L11-L24) — no demolish state
- ❌ No mid-anim cancellation rule for non-death cases
- ❌ No projectile-orphan rule when caster dies mid-flight

---

### Q: 76. Can animations be paused, scrubbed, fast-forwarded?

**Status:** ⚠ Partial

**Answer:**
**Fast-forward yes (presentation only); pause/scrub no.** The
options screen exposes `config.ui.animationSpeed`, and the AI-turn
indicator screen exposes a `FAST_FORWARD_AI_TURN_PRESENTATION`
command described as "Skips nonessential animation only." The
`SKIP_TOWN_FLYBY` command "Completes presentation transition only…
without gameplay mutation." The world map is described as "paused"
during battle, but that is a *gameplay* pause (turn nesting), not an
animation pause.

**Not supported / not documented:**

- A user-facing "pause animation" or freeze-frame button.
- Scrubbing through the event log / replay timeline (the
  determinism stack provides the underlying replay primitive, and
  the audit's improvements list explicitly calls a "replay scrubber"
  out as missing).
- A frame-step debug control.

**Evidence:**
- [docs/architecture/wiki/screens/56-options/data-contracts.md:36](../architecture/wiki/screens/56-options/data-contracts.md#L36) — `config.ui.animationSpeed`
- [docs/architecture/wiki/screens/61-ai-turn-indicator/interactions.md:16-17](../architecture/wiki/screens/61-ai-turn-indicator/interactions.md#L16-L17) — `SET_AI_TURN_SPEED`, `FAST_FORWARD_AI_TURN_PRESENTATION`
- [docs/architecture/wiki/screens/35-town-flyby/data-contracts.md:31](../architecture/wiki/screens/35-town-flyby/data-contracts.md#L31) — `SKIP_TOWN_FLYBY`
- [docs/architecture/diagrams/16-enter-battle.md:8](../architecture/diagrams/16-enter-battle.md#L8) — "World map paused" (gameplay context)
- [docs/architecture/determinism.md:18](../architecture/determinism.md#L18) — "Replay API" exists
- ❌ No general pause/scrub/frame-step primitive

---

### Q: 77. Is "skip combat animation" supported, and does it preserve state outcomes?

**Status:** ✔ Defined

**Answer:**
**Yes, two distinct mechanisms, both state-preserving.**

1. **`AUTO_RESOLVE_BATTLE`** (preBattle.autoResolve) "Runs
   deterministic auto-resolve". State-flow doc pins the contract:
   "Auto-resolve and real combat share the same formulas… One
   ruleset edit, not two code paths." So the state outcome is
   bit-identical with what tactical combat would have produced.
2. **`FAST_FORWARD_AI_TURN_PRESENTATION`** (aiTurn.fastForward) is
   labeled "Skips nonessential animation only" — gameplay state is
   untouched, only presentation accelerates.

`SKIP_TOWN_FLYBY` is described identically: "Completes presentation
transition only… without gameplay mutation."

What is **not** specified: an in-tactical-combat per-encounter "skip
to result" toggle (different from auto-resolve, which is chosen
*before* combat starts). No interactions doc surfaces a "skip the
rest of this fight" route.

**Evidence:**
- [docs/architecture/wiki/screens/40-pre-battle-dialog/data-contracts.md:34](../architecture/wiki/screens/40-pre-battle-dialog/data-contracts.md#L34) — `AUTO_RESOLVE_BATTLE`
- [docs/architecture/state-flow.md:75-77](../architecture/state-flow.md#L75-L77) — auto-resolve and real combat share formulas
- [docs/architecture/wiki/screens/61-ai-turn-indicator/interactions.md:17](../architecture/wiki/screens/61-ai-turn-indicator/interactions.md#L17) — fast-forward skips nonessential animation only
- [docs/architecture/wiki/screens/35-town-flyby/interactions.md:16](../architecture/wiki/screens/35-town-flyby/interactions.md#L16) — skip without gameplay mutation
- ⚠ No mid-fight skip-to-result; only pre-fight auto-resolve

---

### Q: 78. How are animation events (e.g. "hit frame") wired to logic?

**Status:** ⚠ Partial

**Answer:**
**Schema field + named DAMAGE_FRAME mechanic — wiring side is
ambiguous.** Each animation sequence may declare a single
`eventFrame` integer (see `ash-hound.animation.json` —
`"attack": { "frames": [10,11,12,13], "fps": 12, "loop": false,
"eventFrame": 12 }`). The 11-attack-anim diagram describes a
"DAMAGE_FRAME mechanic": "Each animation declares which frame is the
'damage frame' — the moment when damage is actually applied. This
synchronizes the damage event with the visual impact (e.g. sword
strike)." Sound-set events use string keys
(`hero.map_move.start`, `hero.cast.combat`) — i.e. another set of
named hooks, mapped through `sound-set.schema.json`.

What is **not** pinned:

- Only **one** `eventFrame` per sequence — multi-event animations
  (e.g. double-hit attack with two damage moments) have no schema.
- The wiring direction (see Q79) — does the engine pre-schedule all
  events at command-dispatch time, or does the renderer fire them
  on frame match?
- How animation events that aren't `eventFrame` (foot-step ticks,
  per-frame VFX phases, sound triggers like `hero.cast.combat`)
  are declared; the schema only has a single eventFrame slot.

**Evidence:**
- [content-schema/examples/records/animations/ash-hound.animation.json:18](../../content-schema/examples/records/animations/ash-hound.animation.json#L18) — `eventFrame: 12`
- [docs/architecture/diagrams/11-attack-anim.md:43-45](../architecture/diagrams/11-attack-anim.md#L43-L45) — DAMAGE_FRAME mechanic
- [content-schema/schemas/sound-set.schema.json:1-19](../../content-schema/schemas/sound-set.schema.json#L1-L19) — string-keyed events
- [content-schema/examples/records/sounds/](../../content-schema/examples/records/sounds/) — example: `hero.map_move.start`, `hero.cast.combat`
- ❌ No multi-event-per-sequence schema
- ❌ No catalog of valid event names per kind

---

### Q: 79. Are animation events fired client-side or driven by simulation?

**Status:** ⚠ Partial

**Answer:**
**Doc set is internally inconsistent.** The two strongest contracts
say **simulation-driven**:

- `task-command-token-coverage.json`: `UNIT_ATTACKED`, `UNIT_DIED`,
  `UNIT_MOVED` are described as "Combat event consumed by
  animation/sound" — i.e. simulation emits, renderer consumes.
- `renderer-technology-choice.md`: "Renderer does not depend on
  simulation code. Pure snapshot consumer." and "DON'T mutate game
  state from renderer."
- `state-flow.md`: renderer "Subscribes to state; never mutates."

The 11-attack-anim diagram pulls in the opposite direction: it shows
`AnimController → DamageCalc.calculateDamage()` as if the renderer's
animation timeline triggers the damage call. This is most safely
read as **diagram shorthand**: the engine has already decided the
damage in the reducer when the command was dispatched; the
renderer's animation timeline merely *displays* the result at the
frame the engine flagged. But that disambiguation is not written.

What is **not** pinned: a doc that says "animation events are pure
display hooks — the simulation has already produced
`UNIT_ATTACKED { damage: 47 }` in the event log; the renderer plays
the matching sprite at the right moment and never affects state."

**Evidence:**
- [docs/architecture/task-command-token-coverage.json:23-25](../architecture/task-command-token-coverage.json#L23-L25) — events consumed by animation/sound
- [docs/architecture/state-flow.md:53-58](../architecture/state-flow.md#L53-L58) — renderer subscribes, never mutates
- [docs/architecture/renderer-technology-choice.md:46-50](../architecture/renderer-technology-choice.md#L46-L50) — pure snapshot consumer
- [docs/architecture/renderer-technology-choice.md:97-99](../architecture/renderer-technology-choice.md#L97-L99) — anti-pattern: "DON'T mutate game state from renderer"
- ⚠ [docs/architecture/diagrams/11-attack-anim.md:21-32](../architecture/diagrams/11-attack-anim.md#L21-L32) — appears to show renderer triggering damage
- ❌ No reconciling note resolving the diagram vs. the boundary contract

---

### Q: 80. How are sound effects synchronized with animations?

**Status:** ⚠ Partial

**Answer:**
**Event-keyed via `sound-set` records — frame-precise sync is
implicit.** Every entity (unit, hero, building, spell) can ship a
`SoundSet` whose `events` map carries string keys → audio asset IDs:
`"hero.map_move.start": "audio:hero_kaelis:hoof_start"`,
`"hero.cast.combat": "audio:hero_kaelis:cast"`. There is also a
`fallbacks` table (`"hero.*": "audio:shared:hero_generic"`) that
covers missing keys with a wildcard. Diagram-level evidence shows
foot-steps tied per-tile to terrain (23-hero-movement) and battle
sounds preloaded with creature animations (16-enter-battle).

What is **not** pinned:

- A canonical **event-name registry** (which keys must exist? what
  triggers each one?). The closest thing is the per-screen event
  list in `task-command-token-coverage.json`, but that's combat-side
  only and doesn't enumerate sound keys.
- Per-frame sync: an attack sword-clang at frame 12 needs the
  `eventFrame` mechanism, but `animation.schema.json` only has one
  `eventFrame` and no slot binding it to a sound key.
- Audio mixing rules between layers (UI / hero / combat /
  ambient) — `mixGroup` exists in the schema but no doc enumerates
  groups or ducking rules.
- Latency tolerance / lookahead policy for buffered audio playback.

**Evidence:**
- [content-schema/schemas/sound-set.schema.json:1-19](../../content-schema/schemas/sound-set.schema.json#L1-L19) — `events`, `fallbacks`, `mixGroup`
- [content-schema/examples/records/sounds/](../../content-schema/examples/records/sounds/) — example sound-set
- [docs/architecture/diagrams/23-hero-movement.md:30-32](../architecture/diagrams/23-hero-movement.md#L30-L32) — footstep per terrain
- [docs/architecture/diagrams/16-enter-battle.md:18-21](../architecture/diagrams/16-enter-battle.md#L18-L21) — sounds pre-loaded with anims
- ❌ No frame-to-sound binding in animation schema
- ❌ No mix-group enum / ducking policy

---

### Q: 81. What is the frame budget per animation, and how is it enforced?

**Status:** ⚠ Partial

**Answer:**
**Global render budget yes; per-animation budget no.** The renderer
doc pins:

- 60 FPS on map (no stutter during pan/zoom)
- 60 FPS during battle ("animating 7 stacks × 5 frames per sprite")
- 0.1 ms GPU time per frame (leaving headroom for UI)

Performance hygiene rules: batch hex renders by frustum culling,
memoize tile positions, decouple presentation from sim step rate,
"off-screen buildings skip animation update" (22-building-loop), and
all creature assets pre-loaded before combat starts (16-enter-battle).
WebGL2 context-loss recovery is required.

**Not pinned:**

- No per-animation CPU/GPU budget (e.g. "no creature anim may
  exceed 0.05 ms"), no draw-call cap per scene, no atlas-size cap,
  no max-frames-per-sequence cap.
- No enforcement mechanism — no automated perf-budget test, no
  CI-level frame-time assertion, no Lighthouse-style budget file.
- No degradation policy when the budget is exceeded (drop VFX
  particles? skip idle building updates? collapse to lower-FPS
  mode?).

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:81-86](../architecture/renderer-technology-choice.md#L81-L86) — 60 FPS, 0.1 ms GPU/frame
- [docs/architecture/renderer-technology-choice.md:91-95](../architecture/renderer-technology-choice.md#L91-L95) — DO list (batching, memoization, decouple)
- [docs/architecture/diagrams/22-building-loop.md:34-39](../architecture/diagrams/22-building-loop.md#L34-L39) — off-screen skip
- [docs/architecture/diagrams/16-enter-battle.md:33-39](../architecture/diagrams/16-enter-battle.md#L33-L39) — pre-load to avoid mid-battle stutter
- ❌ No per-animation budget; no automated enforcement; no degradation rule

---

### Q: 82. Is there a fallback for missing animation assets?

**Status:** ⚠ Partial

**Answer:**
**Partial — coverage is patchy.** Three fallback rules exist,
addressing different layers:

1. **Optional creature animations** fall back to required ones:
   "OPTIONAL: defending (defaults to idle if missing); special
   (creature-specific)" (21-creature-states). Required set is
   `idle / walking / attacking / hurt / dying` per creature.
2. **Sound-set events** ship a `fallbacks` map with wildcard keys
   (`"hero.*": "audio:shared:hero_generic"`).
3. **Pack hash mismatch** "fails loud at load time; never silent"
   — so a missing referenced asset id should be caught when the
   pack is loaded, not at play time.

What is **not** pinned:

- A required-animation **missing** at load (e.g. a unit declares
  no `idle`) — load-time error or runtime placeholder?
- A `spriteSheetAssetId` that resolves but the PNG is corrupt /
  network failure mid-game.
- VFX phase missing — no fallback specified in `vfx.schema.json`.
- A status icon for an unknown status — no fallback.
- A "dev mode" placeholder sprite (the missing-asset checkerboard
  pattern) is not documented.

**Evidence:**
- [docs/architecture/diagrams/21-creature-states.md:31-43](../architecture/diagrams/21-creature-states.md#L31-L43) — required vs optional, defending → idle
- [content-schema/schemas/sound-set.schema.json:16](../../content-schema/schemas/sound-set.schema.json#L16) — `fallbacks` map
- [docs/architecture/determinism.md:55-59](../architecture/determinism.md#L55-L59) — `contentHash` mismatch fails loud
- [docs/architecture/renderer-technology-choice.md:101-102](../architecture/renderer-technology-choice.md#L101-L102) — "use pack manifests + asset index"
- ❌ No required-animation missing rule
- ❌ No VFX / status-icon fallback
- ❌ No documented placeholder-sprite policy

---

### Q: 83. How is animation tested in headless mode?

**Status:** ❌ UNKNOWN

**Answer:**
**Not addressed.** The test infrastructure that exists is
**simulation-side**, not animation-side:

- Determinism: PCG32 RNG, fixed-point math, command log replay,
  fuzz harness "N random commands replayed bit-identically"
  (`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`).
- Headless auto-resolve: `tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md`
  runs combats without rendering for balance evaluation — but this
  bypasses the animation system entirely (auto-resolve "shares the
  same formulas" with tactical combat, but does **not** play the
  per-frame animations).
- Per-screen-package contracts (mockup, spec, interactions,
  data-contracts) define visual contracts but are not test
  artifacts.

What is **not** documented:

- A snapshot-test framework for animation timelines (does the
  ash-hound `attack` sequence still hit `eventFrame: 12`? does it
  still total 4 frames at 12 fps?).
- A test for the eventFrame-fires-at-the-right-time invariant
  without a real WebGL context.
- A schema-validation suite for `animation.schema.json` /
  `vfx.schema.json` examples (the determinism path validates
  ruleset JSON; animation/vfx examples are not enumerated as part
  of `npm test`).
- A mock renderer / null renderer for animation-event integration
  testing (e.g. confirming `UNIT_ATTACKED` events fire and are
  consumed in expected order).

**Evidence:**
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md:21](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md#L21) — engine fuzz harness "headless in Node (no browser APIs)"
- [tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md](../../tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md) — auto-resolve headless eval
- [docs/architecture/glossary.md:117](../architecture/glossary.md#L117) — "Auto-balancer — the headless-battle runner"
- ❌ No animation-snapshot test plan
- ❌ No mock renderer / null renderer in `src/renderer/`
- ❌ No CI step that loads/validates the animation/vfx example records

---

## 🔍 Summary

### Missing Logic

- **Two-clock anchor (Q66):** explicit unit and source of
  `deltaTime`, replay-time anchoring for animation playback, and
  battle-speed × `animationSpeed` scaling rule.
- **DAMAGE_FRAME ownership (Q67, Q78, Q79):** the call sequence in
  `11-attack-anim.md` shows `AnimController → DamageCalc()`, which
  conflicts with the "renderer is a pure snapshot consumer" rule.
  Needs a one-paragraph reconciling note.
- **Multi-track / multi-event animation (Q73, Q78, Q80):** the
  schema has one body track per target and one `eventFrame` per
  sequence — status icons, multi-hit attacks, and per-frame sound
  cues have no representation.
- **Conflict resolution policy (Q73, Q74, Q75):** no `queue /
  override / blend` rule; no priority table; no "killed mid-hurt",
  "orphaned projectile", "demolished mid-anim" rules.
- **Easing / interpolation library (Q72):** Bezier projectile, hero
  path interpolation, lighting tween, camera ease, and town flyby
  are all named without a documented function set or shared
  primitive.
- **Sprite-sheet metadata gaps (Q71):** no spec for non-uniform
  frames, padding/trim, multi-page atlases, per-frame anchors, or
  frame ordering.
- **Per-animation perf budget (Q81):** global 60 FPS / 0.1 ms GPU
  is set; per-animation, per-stack, and per-VFX budgets are not.
  No automated enforcement, no degradation policy.
- **Asset-fallback coverage (Q82):** required-animation missing
  case, mid-game asset corruption, VFX phase missing, status-icon
  missing, and dev-mode placeholder sprite are all undefined.
- **Headless animation tests (Q83):** no animation-snapshot
  framework, no null/mock renderer, no schema-validation step for
  animation/vfx example records.

### Risks

- **Determinism leak via DAMAGE_FRAME (Q67, Q79).** If anyone
  implements the diagram literally — having the renderer's animation
  timeline drive `DamageCalc()` — replays and lockstep multiplayer
  desync the moment a frame is dropped or a clock skews. The
  ambiguity is in the canonical sequence diagram, so it will be read
  literally by an AI agent.
- **Animation event combinatorial explosion (Q73, Q78, Q80).** With
  one `eventFrame` per sequence and no multi-track support, the
  first two-hit attack, the first burning unit during retaliation,
  and the first frame-precise sound cue will each force a schema
  change — multiplied across packs, this is a churn risk.
- **Mid-anim destruction (Q75).** Projectile mid-flight when caster
  dies, summon timer expiry mid-attack, and demolished building
  mid-loop have no rule. AI generators producing user-mod content
  will hit these edge cases first.
- **Perf cliff under content load (Q81).** Without a per-animation
  budget or a degradation strategy, the first user-modded faction
  with a 64-frame creature attack at 24 fps will silently break the
  60 FPS target on tablets.
- **Test coverage hole (Q83).** Engine determinism is exhaustively
  tested; the animation system has no equivalent. Schema drift in
  `animation.schema.json` or `vfx.schema.json` will go unnoticed
  until a player loads a pack.

### Improvements

- Add `docs/architecture/animation-contract.md` codifying:
  (1) the two-clock model (sim-time event log, render-time
  playback) and the explicit `deltaTime` source/clamp;
  (2) DAMAGE_FRAME ownership ("engine schedules, renderer
  displays — renderer never calls back into rules");
  (3) the conflict-resolution policy (queue/override/blend) per
  channel.
- Extend `animation.schema.json` to support multi-track timelines
  (`tracks: { body: { sequences… }, status: …, fx: … }`) and
  multi-event sequences (`events: [{ frame, kind, ref }]`) before
  pack content depends on the single-eventFrame model.
- Define a closed easing-function enum and reference it from any
  schema field that requests interpolation (camera ease, lighting
  tween, projectile travel).
- Add a `placeholders` section to `pack-contract.md` describing
  the dev-mode missing-sprite tile, the missing-required-animation
  failure, the missing-VFX-phase fallback, and a wildcard rule for
  status icons (mirroring the sound-set `fallbacks` pattern).
- Stand up a per-animation perf budget table in
  `renderer-technology-choice.md` (sprite-render budget,
  draw-call cap per stack, max VFX particles per phase) and a
  CI-runnable benchmark harness.
- Add a null-renderer test mode that consumes the event log and
  verifies (a) all animation events fire in expected order,
  (b) `eventFrame` lookups succeed for every used sequence,
  (c) sound-set keys resolve. Wire it into `npm test`.
- Promote `vfx.schema.json` from `additionalProperties: true` to a
  closed schema that lists allowed phases and their fields, so AI
  pack generators can't invent silent vfx phases.
- Document a debug-overlay package (Q42 from
  [02-ui-rendering-system.md](./02-ui-rendering-system.md)) that
  includes an animation-timeline scrubber and a per-stack anim
  state inspector.

### AI-Readiness

Score: **4 / 10**

Reason: The animation **schema layer** is real and minimal —
`animation.schema.json` plus `vfx.schema.json`, with one full
worked example each (ash-hound, ember-lance), is enough that an AI
agent can author a new creature's animation set today. The
**boundary doctrine** (engine pure, renderer read-only,
config.ui.* outside deterministic state) is also strong and
consistent across screen packages. Diagrams cover the major
animation lifecycles (creature state machine, attack, spell, death,
hero movement, building loop, day/night, town flyby) at a
sequence-level. Skip / auto-resolve / fast-forward have explicit
commands and the right semantics around state preservation.

But four gaps will break an AI implementer: (1) the
DAMAGE_FRAME diagram contradicts the renderer-purity rule and
nothing reconciles them — an agent will pick one and create a
determinism bug; (2) only one `eventFrame` and one body track per
sequence makes status icons, multi-hit attacks, and per-frame
sound cues unrepresentable in the current schema; (3) no easing /
interpolation primitives are enumerated despite four named uses
(Bezier, ease, tween, smooth follow); (4) no headless animation
test path exists, so all four of the above will surface only at
visual integration time, not in CI. Closing the boundary doc plus
extending the animation schema lifts this to 7+.
