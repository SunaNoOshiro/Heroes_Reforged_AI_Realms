# Implementation Plan: 04 — Animation System

> Source audit: [docs/archive/readiness-audit/04-animation-system.md](../readiness-audit/04-animation-system.md)
>
> This plan converts the audit's ❌ UNKNOWN, ⚠ Partial, Missing Logic,
> and Risk items into concrete documentation, schema, content, and task
> work. Nothing here invents gameplay or visual design. Every change
> formalizes a contract that is already implied by
> [`renderer-technology-choice.md`](../../architecture/renderer-technology-choice.md),
> the `11-attack-anim` / `21-creature-states` / `22-building-loop` /
> `23-hero-movement` diagrams, and the existing
> [`animation.schema.json`](../../../content-schema/schemas/animation.schema.json)
> + [`vfx.schema.json`](../../../content-schema/schemas/vfx.schema.json)
> records, but is not yet pinned at any one canonical location.

---

## 1. Overview

**Scope.** Close the eleven gaps the animation-system audit flagged
as blocking deterministic replay/lockstep, AI-pack authorability,
performance under content load, and headless CI coverage:

1. Two-clock model — `deltaTime` source/clamp + battle-speed scaling
   rule (Q66)
2. DAMAGE_FRAME ownership — engine-owned vs. renderer-owned hand-off
   (Q67, Q79)
3. Gameplay-vs-cosmetic boundary enumeration — DAMAGE_FRAME, hero
   path interpolation (Q69)
4. Multi-track + multi-event animation schema — body / status / fx
   channels, multi-hit + per-frame sound cues (Q73, Q78, Q80)
5. Conflict-resolution policy — queue / override / blend, priority
   table, killed-mid-hurt + orphaned-projectile + demolished-mid-loop
   rules (Q73, Q74, Q75)
6. Easing-function enum — Bezier, lighting tween, camera ease, town
   flyby (Q72)
7. Sprite-sheet metadata extension — non-uniform frames, padding/trim,
   multi-page atlases, per-frame anchors, frame ordering (Q71)
8. Per-animation perf budget + degradation policy (Q81)
9. Asset-fallback coverage — required-anim missing, mid-game asset
   corruption, VFX phase missing, status-icon missing, dev-mode
   placeholder sprite (Q82)
10. Headless animation test harness — null/mock renderer, snapshot
    tests, schema validation in `npm test` (Q83)
11. Pause / scrub / frame-step debug overlay package (Q76 + audit
    "Improvements" → debug-overlay scrubber)

**Readiness state today.** AI-Readiness scored **4 / 10**. The
schema layer is real and minimal — `animation.schema.json` plus
`vfx.schema.json`, with one full worked example each (`ash-hound`,
`ember-lance`) — and the boundary doctrine (engine pure, renderer
read-only, `config.ui.*` outside deterministic state) is consistently
written across screen packages. But four gaps will break an AI
implementer: DAMAGE_FRAME ambiguity vs. renderer-purity, the
single-track / single-eventFrame schema, missing easing primitives,
and the absent headless animation test path.

Closing the gaps in this plan should push the readiness score to
**8 / 10** without writing renderer runtime code. Every item below
produces docs, schemas, content fixtures, or task records that pull
the work into the existing `npm run tasks:next` queue. Renderer
implementation (sprite-sheet loader, event-log timeline, presentation
loop) remains owned by [`tasks/mvp/06-renderer/`](../../../tasks/mvp/06-renderer/).

**Out of scope.** Authoring renderer runtime code, picking visual
styling, designing per-creature animation timings, building the WebGPU
path, or implementing the M5 lockstep transport. The DAMAGE_FRAME
boundary contract is documented here; its enforcement in code lives in
[`tasks/mvp/06-renderer/07-event-log-animation-timeline.md`](../../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md)
and is not duplicated.

---

## 2. Critical Fixes (Must Do First)

These must land before any renderer / animation implementation task
starts. They are ordered by blast radius — each one, if left open,
will either leak non-determinism into replay/lockstep, force a schema
break the first time pack content needs it, or hide a perf cliff
until visual integration time.

1. **DAMAGE_FRAME ownership reconciling note (Issue 3.A-2)** — the
   `11-attack-anim` diagram literally shows
   `AnimController → DamageCalc()`, which contradicts the
   "renderer is a pure snapshot consumer" rule in
   [`renderer-technology-choice.md`](../../architecture/renderer-technology-choice.md).
   An AI agent will pick one and create a determinism bug. Resolve by
   one paragraph in a new `animation-contract.md`.
2. **Multi-track + multi-event animation schema (Issue 3.B-1)** —
   `animation.schema.json` today supports one body track per target
   and one `eventFrame` per sequence. The first burning unit during
   retaliation, the first two-hit attack, and the first frame-precise
   sound cue will each force a schema break. Land the additive
   extension before pack content depends on the single-track model.
3. **Two-clock contract (Issue 3.A-1)** — pin the explicit
   `deltaTime` source (browser monotonic clock), the per-frame clamp
   (e.g. ≤ 100 ms to avoid tab-resume catch-up), and the
   battle-speed × `config.ui.animationSpeed` scaling rule. Without it
   replay anchoring after load and lockstep frame agreement are both
   underspecified.
4. **Conflict-resolution policy (Issue 3.A-3)** — without a documented
   `queue / override / blend` selector and a priority table,
   killed-mid-hurt and retaliation-mid-attack edge cases will be
   resolved differently across screens, packs, and AI-generated
   factions. The rule is doc-only; no engine work blocks on it.
5. **`vfx.schema.json` closed shape (Issue 3.B-3)** — promote from
   `additionalProperties: true` to a closed schema listing allowed
   `phases.{cast,projectile,impact}` and their fields, so AI pack
   generators cannot invent silent vfx phases.

---

## 3. System Improvements

### Architecture

#### Issue 3.A-1: Two-clock model + `deltaTime` contract

**Source:** Q66 (⚠ Partial), Missing Logic bullet 1

**Problem:**
The renderer doc forbids `requestAnimationFrame` for game-logic
timing and the engine has no clock at all
([`docs/architecture/state-flow.md:46-58`](../../architecture/state-flow.md#L46-L58)).
The renderer is described as `tick(deltaTime)` at 60 FPS
([`docs/architecture/diagrams/22-building-loop.md:17-25`](../../architecture/diagrams/22-building-loop.md#L17-L25)),
but the source of `deltaTime`, its unit, its clamp under tab-resume,
and how `config.ui.animationSpeed` × battle-speed scale into it are
all unwritten.

**Impact:**
- A 30-second tab pause will cause animation timelines to "catch up"
  in one frame on resume — visually jarring and risks a presentation
  step that exceeds CPU budget.
- Replay anchoring after load is undefined: when the event log
  resumes, animation playback time has no documented zero point.
- Two implementers will pick different scaling: one applies
  `animationSpeed` in the timeline, the other in `deltaTime`,
  producing visible drift between battle speed-up modes.

**Solution:**
A single section in the new `docs/architecture/animation-contract.md`
codifying:
- `deltaTime` source = browser monotonic clock
  (`performance.now()`), unit = milliseconds.
- Per-frame clamp ≤ 100 ms; longer gaps cause animation to hold the
  current frame, never fast-forward.
- `effectiveDelta = deltaTime × config.ui.animationSpeed × battleSpeed`,
  applied to render-side timeline advancement only. The simulation
  command log is never scaled.
- Replay anchor: animation playback time is reset to 0 at the
  consumer's last applied event-log index after a load; in-flight
  animations do not survive load.
- Reduced motion (`config.ui.reducedMotion`): animations either
  collapse to a single end-frame or skip to `eventFrame` immediately,
  per the rule documented under Issue 3.B-1.

**Files to Update:**
- [docs/architecture/renderer-technology-choice.md](../../architecture/renderer-technology-choice.md)
  — add a "Two-clock model" link to the new contract doc

**New Files:**
- `docs/architecture/animation-contract.md` (also receives Issues
  3.A-2 and 3.A-3)

**Implementation Steps:**
1. Create `docs/architecture/animation-contract.md` with sections
   "Two-clock model", "DAMAGE_FRAME ownership", "Conflict resolution",
   "Mid-anim destruction".
2. Cross-link from [`renderer-technology-choice.md`](../../architecture/renderer-technology-choice.md)
   and [`state-flow.md`](../../architecture/state-flow.md).
3. Add the doc to the `docs/architecture/wiki/` index if architecture
   docs are linked from the wiki sidebar.
4. Run `npm run validate` to verify links.

**Dependencies:**
- None — pure doc work.

**Complexity:** S

---

#### Issue 3.A-2: DAMAGE_FRAME ownership reconciling note

**Source:** Q67 (⚠ Partial), Q78 (⚠ Partial), Q79 (⚠ Partial),
Risk #1, Missing Logic bullet 2

**Problem:**
[`docs/architecture/diagrams/11-attack-anim.md:21-32`](../../architecture/diagrams/11-attack-anim.md#L21-L32)
shows `AnimController → DamageCalc.calculateDamage()` mid-frame, which
contradicts:
- [`docs/architecture/renderer-technology-choice.md:46-50`](../../architecture/renderer-technology-choice.md#L46-L50)
  — "renderer does not depend on simulation code. Pure snapshot consumer."
- [`docs/architecture/state-flow.md:53-58`](../../architecture/state-flow.md#L53-L58)
  — renderer "Subscribes to state; never mutates."
- [`docs/architecture/renderer-technology-choice.md:97-99`](../../architecture/renderer-technology-choice.md#L97-L99)
  — "DON'T mutate game state from renderer"

An AI agent reading the diagram literally will wire damage from the
renderer's animation timeline into the rules engine, which desyncs
the moment a frame drops, a clock skews, or replay re-anchors.

**Impact:**
- Replay determinism leak — same command log produces different state
  hashes after a frame drop.
- Lockstep multiplayer (M5) desync at the first DAMAGE_FRAME on any
  client running at a different effective `deltaTime`.
- Auto-resolve `↔` tactical-combat parity break (one path goes through
  the renderer, the other does not).

**Solution:**
Pin the doctrine: **engine schedules, renderer displays**. The reducer
emits `UNIT_ATTACKED { damage: 47, eventFrame: 12, animId: "ash-hound.attack" }`
synchronously when the attack command is applied; the renderer plays
the matching sequence and surfaces the floating "47" at frame 12. The
renderer never calls back into rules.

Update `11-attack-anim.md` so the sequence reads
`Engine → Engine: calculateDamage() → emit UNIT_ATTACKED` followed by
`Renderer → Renderer: playSequence + show damage popup at eventFrame`.

**Files to Update:**
- [docs/architecture/diagrams/11-attack-anim.md](../../architecture/diagrams/11-attack-anim.md)
  — rewrite the DAMAGE_FRAME hand-off; renderer no longer calls rules
- [docs/architecture/diagrams/12-spell-anim.md](../../architecture/diagrams/12-spell-anim.md)
  — same fix for spell impact (verify diagram)
- [docs/architecture/diagrams/13-death-victory.md](../../architecture/diagrams/13-death-victory.md)
  — verify death is engine-emitted, not renderer-triggered
- `docs/architecture/animation-contract.md` (new — see 3.A-1) §
  "DAMAGE_FRAME ownership"

**New Files:** none beyond 3.A-1's contract doc

**Implementation Steps:**
1. Add the "DAMAGE_FRAME ownership" section to `animation-contract.md`
   stating the rule and one positive + one negative example.
2. Edit `11-attack-anim.md` mermaid sequence so the rules call sits
   inside the engine before any animation begins; the renderer's role
   is `playSequence(animId)` + `displayDamage(value, atFrame)`.
3. Audit `12-spell-anim.md` and `13-death-victory.md` for the same
   anti-pattern; fix in place.
4. Add an explicit "anti-pattern" bullet to
   [`renderer-technology-choice.md`](../../architecture/renderer-technology-choice.md):
   "DON'T let an animation timeline call back into deterministic
   rules; the engine has already scheduled the result."

**Dependencies:**
- 3.A-1 (creates the contract doc this section lives in)

**Complexity:** S

---

#### Issue 3.A-3: Conflict-resolution policy + priority table

**Source:** Q73 (❌), Q74 (❌), Q75 (⚠ Partial), Risk #3,
Missing Logic bullet 4

**Problem:**
The creature-state machine in
[`docs/architecture/diagrams/21-creature-states.md:10-29`](../../architecture/diagrams/21-creature-states.md#L10-L29)
is mutually exclusive but does not say which side wins for:
- killed mid-`hurt` (does `dying` interrupt or wait?)
- mid-`attacking` taking retaliation (does `hurt` queue, blend, skip?)
- body anim + status icon overlay
- body anim + VFX phase (cast pose + projectile + impact)
- hero walk loop + path-position interpolator (two tracks needed)
- building idle + active-spawn + damaged-tint overlap
- projectile mid-flight when caster dies
- summoned creature whose timer expires mid-attack
- camera-follow target dying

There is no `policy: "queue" | "override" | "blend"` field anywhere
and no priority table.

**Impact:**
- AI-generated faction packs will hit each edge case first; pack
  testers will report inconsistent behavior across creatures.
- The single-track schema (Issue 3.B-1) compounds the problem —
  status icons cannot be modeled without multi-track support.
- Demolition / orphaned-projectile rules drift to whatever the first
  implementer happens to write.

**Solution:**
Two parts, both doc-only:
1. **Priority table** in `animation-contract.md` ranking animation
   kinds: `dying > defeated > hurt > attacking > casting > defending
   > waiting > walking > idle`. Higher priority interrupts lower
   on the body channel. Status and FX channels are independent
   (overlay, never interrupt).
2. **Per-channel policy**:
   - body channel = `override` (highest priority wins)
   - status channel = `queue` (multiple status icons render
     concurrently as overlays; each independent timeline)
   - fx channel = `queue` (each VFX phase spawns its own short-lived
     timeline; orphaned timelines self-complete)
3. **Mid-anim destruction rules**:
   - body track of dead unit clamps to last frame of `dying`, then
     entity is removed from grid (matches existing
     [`docs/architecture/diagrams/13-death-victory.md:11-22`](../../architecture/diagrams/13-death-victory.md#L11-L22))
   - status icons attached to a dead unit are detached when the
     entity is removed from grid
   - projectile-orphan rule: projectile timelines complete to
     `impact`, even if caster is removed mid-flight (caster id is a
     timeline parameter, not a back-reference)
   - building demolition: add a `demolishing` state to
     [`docs/architecture/diagrams/06-town-animations.md`](../../architecture/diagrams/06-town-animations.md)
     parallel to `idle`/`active`/`damaged`
   - camera-follow detaches when its target is removed from grid;
     camera holds last position

**Files to Update:**
- `docs/architecture/animation-contract.md` (new) — § "Conflict
  resolution" and § "Mid-anim destruction"
- [docs/architecture/diagrams/21-creature-states.md](../../architecture/diagrams/21-creature-states.md)
  — add a footnote linking to the priority table
- [docs/architecture/diagrams/06-town-animations.md](../../architecture/diagrams/06-town-animations.md)
  — add `demolishing` state

**New Files:** none beyond 3.A-1's contract doc

**Implementation Steps:**
1. Write the priority table and per-channel policy in
   `animation-contract.md`.
2. Document the four mid-anim destruction rules with one example
   each.
3. Update `21-creature-states.md` with a footnote.
4. Add the `demolishing` state to `06-town-animations.md`.
5. Run `npm run validate` to confirm links.

**Dependencies:**
- 3.A-1 (creates the contract doc)
- Coordinates with 3.B-1 (multi-track schema gives the contract a
  concrete representation)

**Complexity:** M

---

#### Issue 3.A-4: Gameplay-vs-cosmetic enumeration

**Source:** Q69 (⚠ Partial), Missing Logic bullet 2

**Problem:**
The boundary table in
[`docs/architecture/state-flow.md:46-58`](../../architecture/state-flow.md#L46-L58)
is correct at the package level (`src/engine/`, `src/renderer/`,
`src/ui/`) but does not enumerate which observable phenomena are
gameplay-state vs. visual-only. The "wobble" cases:
- DAMAGE_FRAME (resolved by 3.A-2)
- hero on tile `(3,2) at 47% of move` (interpolation only? or a
  real `subPosition`?)
- building damaged tint (state vs. cosmetic?)

**Impact:**
- AI implementers will guess; some will store interpolation in state,
  breaking save-file size and replay determinism.

**Solution:**
A small "gameplay state vs. visual state" table in the new
`animation-contract.md`. Examples:
- hero tile position → gameplay state
- hero sub-tile travel offset → visual state
- unit HP / status effects → gameplay state
- damaged-tint level → visual state, derived from HP%
- VFX phase index → visual state, derived from event log
- camera position → visual state, never persisted

**Files to Update:**
- `docs/architecture/animation-contract.md` (new) — § "Gameplay vs.
  visual state"

**Implementation Steps:**
1. Author a 10-row table.
2. Cross-link from `state-flow.md`.

**Dependencies:**
- 3.A-1

**Complexity:** S

---

### Schemas

#### Issue 3.B-1: Multi-track + multi-event animation schema

**Source:** Q73 (❌), Q78 (⚠ Partial), Q80 (⚠ Partial),
Risk #2, Missing Logic bullet 3, Improvements bullet 2

**Problem:**
[`content-schema/schemas/animation.schema.json`](../../../content-schema/schemas/animation.schema.json)
today is:

```jsonc
{
  "sequences": { "additionalProperties": true } // single body track
}
```

with each sequence carrying one optional `eventFrame: int`. This
cannot express:
- a two-hit attack (two damage moments)
- a status-icon overlay running on top of a body anim
- per-frame VFX phases scheduled inside a sequence
- per-frame sound cues bound to the same timeline

**Impact:**
- The first creature pack with a multi-hit attack forces a schema
  break; existing fixtures must migrate.
- Status icons (burn, poison, slow, blessed) have no schema home —
  every screen will invent its own.
- Frame-precise sound (sword clang at frame 12) is unrepresentable;
  fallback is to fire all sounds at sequence start.

**Solution:**
Additive schema extension — keep the existing single-track shape as
the implicit `body` track for backward compatibility, and add new
optional fields:

```jsonc
{
  "sequences": {
    "<sequenceName>": {
      "frames": [int],
      "fps": int,
      "loop": bool,

      // existing single-event field stays valid
      "eventFrame": int,

      // NEW: multi-event timeline
      "events": [
        { "frame": int, "kind": "damage" | "sound" | "vfx" | "status", "ref": string }
      ],

      // NEW: optional channel override (defaults to "body")
      "channel": "body" | "status" | "fx"
    }
  },

  // NEW: optional sibling tracks
  "tracks": {
    "status": { "sequences": { ... } },
    "fx":     { "sequences": { ... } }
  }
}
```

Validation rules to encode:
- if `events[]` is present, `eventFrame` is forbidden (one or the
  other).
- `events[].kind === "damage"` is allowed only on the body channel.
- `events[].kind === "sound"` references a `sound-set.events.<key>`.
- `events[].kind === "vfx"` references a `vfx.id`.
- `events[].kind === "status"` references a `status.id`.
- `events[].frame` must be within the sequence's `frames[]` index
  range.

**Files to Update:**
- [content-schema/schemas/animation.schema.json](../../../content-schema/schemas/animation.schema.json)
  — close the schema (set `additionalProperties: false` at the top
  level), pin `sequences[*]` shape, add `events[]` and `tracks`
- [content-schema/examples/records/animations/ash-hound.animation.json](../../../content-schema/examples/records/animations/ash-hound.animation.json)
  — keep as the single-event reference; add a new fixture below
  that uses `events[]`

**New Files:**
- `content-schema/examples/records/animations/dual-strike.animation.json`
  — fixture demonstrating a two-hit attack with `events[]` carrying
  two `kind: "damage"` entries
- `content-schema/examples/records/animations/burning-status.animation.json`
  — fixture demonstrating a `status` channel sequence with a
  `loop: true` overlay

**Implementation Steps:**
1. Update `animation.schema.json` with the additive fields and
   validation rules above.
2. Add the two new fixtures.
3. Update [`docs/architecture/schema-matrix.md`](../../architecture/schema-matrix.md)
   to mention multi-track + multi-event.
4. Update [`docs/architecture/effect-registry.md`](../../architecture/effect-registry.md)
   if status overlays bind to effect IDs.
5. Run `npm run validate` (must pass against all existing fixtures —
   validates additive change).

**Dependencies:**
- None for the schema edit itself; conflict-resolution policy
  (3.A-3) and DAMAGE_FRAME ownership (3.A-2) provide the contract
  this schema implements.

**Complexity:** L

---

#### Issue 3.B-2: Easing-function enum

**Source:** Q72 (❌), Missing Logic bullet 5,
Improvements bullet 3

**Problem:**
Four named uses of interpolation appear in the diagrams but no enum,
schema field, or library reference:
- [`docs/architecture/diagrams/23-hero-movement.md:8`](../../architecture/diagrams/23-hero-movement.md#L8)
  — "path interpolation"
- [`docs/architecture/diagrams/07-day-night.md:35`](../../architecture/diagrams/07-day-night.md#L35)
  — "music crossfade and lighting tween"
- [`docs/architecture/diagrams/12-spell-anim.md:23`](../../architecture/diagrams/12-spell-anim.md#L23)
  — "Bezier path ~0.6 seconds"
- [`docs/architecture/wiki/screens/35-town-flyby/interactions.md:16-18`](../../architecture/wiki/screens/35-town-flyby/interactions.md#L16-L18)
  — camera ease

**Impact:**
- Each implementer picks their own easing; visible inconsistency
  between map / battle / UI.
- AI-pack content has no schema slot to request specific easing;
  cannot extend without modifying engine code.

**Solution:**
A closed enum in `content-schema/schemas/easing.schema.json`:

```jsonc
{
  "$id": "heroes-reforged/easing.schema.json",
  "type": "string",
  "enum": [
    "linear",
    "easeInQuad", "easeOutQuad", "easeInOutQuad",
    "easeInCubic", "easeOutCubic", "easeInOutCubic",
    "easeInOutSine",
    "bezier"
  ]
}
```

Reference it from any schema field that requests interpolation
(camera ease, lighting tween, projectile travel, status fade-in).
For Bezier specifically, the field shape is
`{ kind: "bezier", control: [{x,y}, {x,y}] }` — two control points,
domain `[0,1]`.

**Files to Update:**
- [content-schema/schemas/animation.schema.json](../../../content-schema/schemas/animation.schema.json)
  — reference easing for any interpolated property (e.g. status
  fade-in/out)
- [content-schema/schemas/vfx.schema.json](../../../content-schema/schemas/vfx.schema.json)
  — reference easing for projectile travel
- [content-schema/schemas/town-presentation.schema.json](../../../content-schema/schemas/town-presentation.schema.json)
  — reference easing for town flyby camera path
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md)
  — add `easing` row

**New Files:**
- `content-schema/schemas/easing.schema.json`

**Implementation Steps:**
1. Add `easing.schema.json` with the enum + Bezier shape.
2. Reference it from the four schemas above.
3. Update `schema-matrix.md`.
4. Add a one-paragraph note to `animation-contract.md` describing
   the contract that all easing functions are pure and deterministic
   in input → output (so they may be used in cosmetic interpolation
   without affecting state).
5. Run `npm run validate`.

**Dependencies:**
- 3.A-1 (the contract doc references this enum)

**Complexity:** S

---

#### Issue 3.B-3: Closed `vfx.schema.json`

**Source:** Q82 (⚠ Partial), Improvements bullet 6

**Problem:**
[`content-schema/schemas/vfx.schema.json`](../../../content-schema/schemas/vfx.schema.json)
is open: `additionalProperties: true` and `phases.additionalProperties: true`.
AI pack generators can invent phase names that the renderer silently
ignores, producing invisible bugs at pack-load time.

**Impact:**
- Silent VFX no-ops in AI-generated factions.
- Cannot validate `events[].kind === "vfx"` references at schema time.

**Solution:**
Close the schema:

```jsonc
{
  "phases": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "cast":       { "$ref": "#/definitions/phase" },
      "projectile": { "$ref": "#/definitions/phase" },
      "impact":     { "$ref": "#/definitions/phase" }
    }
  }
}
```

Each phase shape: `{ particleSystemId?, screenShake?, lightFlash?,
duration, easing? }` — `easing` resolved via 3.B-2.

**Files to Update:**
- [content-schema/schemas/vfx.schema.json](../../../content-schema/schemas/vfx.schema.json)
- [content-schema/examples/records/vfx/ember-lance.vfx.json](../../../content-schema/examples/records/vfx/ember-lance.vfx.json)
  — re-validate; fix any field not in the closed shape

**Implementation Steps:**
1. Author the closed schema with `definitions/phase`.
2. Run `npm run validate` — fix the existing example if it falls out
   of the closed shape.
3. Document the three allowed phases in
   [`docs/architecture/schema-matrix.md`](../../architecture/schema-matrix.md).

**Dependencies:**
- 3.B-2 (easing referenced in phase shape)

**Complexity:** S

---

#### Issue 3.B-4: Sprite-sheet metadata extension

**Source:** Q71 (⚠ Partial), Missing Logic bullet 6

**Problem:**
`animation.schema.json` carries `frameSize` (uniform grid) and
`anchor` (single anchor for the whole set). It cannot express:
- non-uniform frames
- padding / trim (TexturePacker-style)
- multi-page atlases (frames spread across more than one PNG)
- per-frame anchors (anchor shifts during a windup → strike → recover
  attack)
- rotated / flipped frames
- explicit row/column count or row-major vs. column-major ordering

**Impact:**
- The first creature whose attack changes anchor between frames
  forces a schema break.
- Multi-page atlases (large packs, many creatures) cannot be loaded.
- AI-generated faction packs that use TexturePacker output cannot
  be ingested without inline rewrite.

**Solution:**
Additive extension to `animation.schema.json`:

```jsonc
{
  "spriteSheetAssetId": "string",            // existing — single page
  "spriteSheetAssetIds": ["string"],         // NEW — multi-page atlas

  "frameSize": { "width": int, "height": int }, // existing — uniform
  "frames": [                                   // NEW — when non-uniform
    {
      "page": int,        // index into spriteSheetAssetIds
      "x": int, "y": int, "w": int, "h": int,
      "anchor": { "x": float, "y": float },     // optional per-frame override
      "trim": { "x": int, "y": int, "w": int, "h": int }
    }
  ],

  "frameOrder": "row-major" | "column-major"    // NEW — explicit; default "row-major"
}
```

Either `frameSize` (uniform grid) **or** `frames[]` (explicit
metadata) — not both.

**Files to Update:**
- [content-schema/schemas/animation.schema.json](../../../content-schema/schemas/animation.schema.json)
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md)

**New Files:**
- `content-schema/examples/records/animations/multi-page-attack.animation.json`
  — fixture demonstrating multi-page atlas + per-frame anchor

**Implementation Steps:**
1. Extend `animation.schema.json` with the additive fields and the
   either/or constraint.
2. Add the new fixture.
3. Update `schema-matrix.md`.
4. Update [`docs/architecture/pack-contract.md`](../../architecture/pack-contract.md)
   — multi-page atlases must list all pages in the pack manifest.
5. Run `npm run validate`.

**Dependencies:**
- None (additive)

**Complexity:** M

---

### Data Contracts (Pack & Asset)

#### Issue 3.C-1: Asset-fallback coverage + dev-mode placeholders

**Source:** Q82 (⚠ Partial), Missing Logic bullet 8,
Improvements bullet 4

**Problem:**
Three fallback rules exist but coverage is patchy:
- Optional creature anims fall back (`defending → idle`)
- Sound-set events have a `fallbacks` map
- Pack hash mismatch fails loud

Not specified:
- Required-anim missing at load (e.g. unit declares no `idle`) — load
  error or runtime placeholder?
- `spriteSheetAssetId` resolves but the PNG is corrupt / lost mid-game
- VFX phase missing (no fallback in `vfx.schema.json`)
- Status icon for an unknown status — no fallback
- Dev-mode missing-sprite checkerboard tile not documented

**Impact:**
- AI-generated packs ship with a missing required anim; runtime
  behavior undefined.
- Mid-game asset failure silently breaks the renderer.
- No way to author against an incomplete pack during development.

**Solution:**
A `placeholders` section in
[`docs/architecture/pack-contract.md`](../../architecture/pack-contract.md)
codifying:

| Asset class | Missing-at-load | Missing-at-runtime |
|---|---|---|
| Required creature anim (idle/walking/attacking/hurt/dying) | fail loud | n/a |
| Optional creature anim (defending/special) | fall back to required (`defending → idle`, `special → attacking`) | same |
| Sprite-sheet PNG | fail loud | render dev-mode magenta-checker placeholder; log warning |
| VFX phase (cast/projectile/impact) | fall back to no-op (silent skip) | same |
| Status icon | fall back to a generic `status:unknown` icon | same |
| Sound-set event | use the existing `fallbacks[]` wildcard rule | same |
| Easing function | fall back to `linear` | same |

Add a `config.dev.placeholderSprites: bool` flag in the options
schema so pack authors can toggle the magenta checker on; default
`false` (production = fail loud, dev = visible placeholder).

**Files to Update:**
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
  — add the placeholders table
- [docs/architecture/wiki/screens/56-options/data-contracts.md](../../architecture/wiki/screens/56-options/data-contracts.md)
  — add `config.dev.placeholderSprites`
- [content-schema/schemas/vfx.schema.json](../../../content-schema/schemas/vfx.schema.json)
  — schema-level `optional: true` annotation on phases (3.B-3 makes
  phases optional already; this just pins fallback behavior)

**New Files:**
- `resources/dev-assets/placeholder-sprite.png` — magenta checker,
  64×64
- `resources/dev-assets/status-unknown.png` — generic status icon

**Implementation Steps:**
1. Author the placeholders table in `pack-contract.md`.
2. Add `config.dev.placeholderSprites` to the options screen
   data-contract.
3. Drop placeholder PNGs into `resources/dev-assets/`.
4. Reference both placeholders from `pack-contract.md`.
5. Run `npm run validate`.

**Dependencies:**
- 3.B-3 (closed VFX schema lets us mark phases as fallback-eligible)

**Complexity:** M

---

### Performance

#### Issue 3.D-1: Per-animation perf budget + degradation policy

**Source:** Q81 (⚠ Partial), Missing Logic bullet 7,
Risk #4, Improvements bullet 5

**Problem:**
[`docs/architecture/renderer-technology-choice.md:81-86`](../../architecture/renderer-technology-choice.md#L81-L86)
sets the global budget (60 FPS, 0.1 ms GPU/frame) but no per-animation
budget, no draw-call cap, no atlas-size cap, no max-frames-per-sequence
cap, and no degradation policy. The first 64-frame attack at 24 fps
on tablet hardware will silently break the global target.

**Impact:**
- AI-generated packs ship with budget-busting timelines that pass
  schema validation.
- No CI gate catches this; surfaces only at visual integration.
- No documented behavior when the budget is exceeded (drop VFX
  particles? collapse to fixed FPS? skip idle building updates?).

**Solution:**
Two parts:

1. **Budget table** added to
   [`renderer-technology-choice.md`](../../architecture/renderer-technology-choice.md):

   | Class | Cap |
   |---|---|
   | sprite frames per sequence | ≤ 32 |
   | concurrent VFX particles per phase | ≤ 200 |
   | concurrent VFX phases per battle | ≤ 16 |
   | atlas page size | ≤ 4096 × 4096 px |
   | sprite draw calls per stack per frame | ≤ 4 |
   | sprite draw calls per battle frame total | ≤ 200 |

2. **Degradation policy** in `animation-contract.md` § "Degradation":
   - tier 1: skip off-screen building idle anims (already implied by
     [`22-building-loop.md:34-39`](../../architecture/diagrams/22-building-loop.md#L34-L39))
   - tier 2: drop VFX particles to 50%
   - tier 3: collapse status overlays to a single shared track
   - tier 4: hold animation frame, rendering only the current state
     (effectively reduced-motion mode for that frame)

3. **Schema-time budget enforcement**: a CI script
   `scripts/validate-animation-budgets.js` walks every animation /
   vfx fixture and rejects records that exceed the caps. Hooked
   into `npm run validate`.

**Files to Update:**
- [docs/architecture/renderer-technology-choice.md](../../architecture/renderer-technology-choice.md)
  — add the budget table
- `docs/architecture/animation-contract.md` (new) — add
  § "Degradation"
- `package.json` — wire the new validator into `npm run validate`

**New Files:**
- `scripts/validate-animation-budgets.js`

**Implementation Steps:**
1. Write the budget table.
2. Document the degradation tiers.
3. Implement the validator (Node, no browser deps; reads the schema
   examples and any pack fixtures under `resources/`).
4. Hook into `npm run validate`.
5. Add a fixture under
   `content-schema/examples/records/animations/budget-buster.animation.json`
   that intentionally exceeds caps + a unit test that confirms the
   validator rejects it.

**Dependencies:**
- 3.B-1 (multi-track schema affects "concurrent" cap counting)

**Complexity:** M

---

### Tasks (CI / Tooling / Test Harness)

#### Issue 3.E-1: Headless animation test harness — null renderer +
snapshot tests

**Source:** Q83 (❌), Missing Logic bullet 9,
Improvements bullet 6, Risk #5

**Problem:**
Determinism, fuzz, and auto-resolve test paths exist
([`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md),
[`tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md`](../../../tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md))
but the animation system has none:
- No snapshot framework for animation timelines
- No mock / null renderer for animation-event integration testing
- No schema-validation step for `animation.schema.json` /
  `vfx.schema.json` example records in `npm test`
- No CI gate on the `eventFrame` invariant

**Impact:**
- Schema drift in `animation.schema.json` or `vfx.schema.json` goes
  unnoticed until a player loads a pack.
- AI-pack regressions surface only at visual integration time.
- DAMAGE_FRAME ownership rule (3.A-2) cannot be tested.

**Solution:**
Three new test harnesses:

1. **Schema-validation step** — add `animation.schema.json` and
   `vfx.schema.json` to whatever the existing schema-validation step
   walks. Verify all example records under
   `content-schema/examples/records/animations/` and
   `content-schema/examples/records/vfx/`.

2. **Null renderer** in `src/renderer/null/null-renderer.ts` — a
   non-WebGL renderer that consumes the event log and exposes the
   timeline as in-memory data. Verifies:
   - all animation events fire in expected event-log order
   - `eventFrame` lookups succeed for every used sequence
   - `events[].ref` resolves against the relevant registry (sound /
     vfx / status)
   - DAMAGE_FRAME never fires from the renderer side (rule 3.A-2)
   - sound-set keys resolve

3. **Snapshot tests** — for each example record in
   `content-schema/examples/records/animations/`, snapshot:
   - frame count per sequence
   - fps × frames = duration
   - `eventFrame` (or `events[].frame`) per sequence
   - track count

   Failures = a content authoring change without a snapshot update;
   forces the author to acknowledge.

**Files to Update:**
- `package.json` — add `npm run test:animation` and wire into
  `npm test`

**New Files:**
- `src/renderer/null/null-renderer.ts`
- `src/renderer/null/event-log-consumer.ts`
- `tests/animation/schema-validation.test.ts`
- `tests/animation/snapshot-fixtures.test.ts`
- `tests/animation/event-frame-ordering.test.ts`
- `tests/animation/__snapshots__/` (jest snapshot output dir)

**Implementation Steps:**
1. Land Issues 3.A-2 and 3.B-1 first (define the contract the tests
   verify).
2. Implement the null renderer as a pure function:
   `consumeEventLog(events: EventLogEntry[]) → AnimationTrace`.
3. Author the three test files; bind them into the existing test
   runner.
4. Add `test:animation` to `package.json`.
5. Run `npm test` — confirm all three tests pass against the existing
   `ash-hound` and `ember-lance` fixtures.

**Dependencies:**
- 3.A-2 (DAMAGE_FRAME contract — what the test verifies)
- 3.B-1 (multi-track schema — gives the snapshot a stable shape)
- 3.B-3 (closed VFX schema — schema-validation step needs the closed
  shape to fail correctly)

**Complexity:** L

---

### UI / Screens

#### Issue 3.F-1: Animation debug-overlay package

**Source:** Q76 (⚠ Partial), Improvements bullet 7,
[`02-ui-rendering-system.md`](../readiness-audit/02-ui-rendering-system.md)
Q42 (debug overlay)

**Problem:**
Fast-forward exists (`config.ui.animationSpeed`,
`FAST_FORWARD_AI_TURN_PRESENTATION`, `SKIP_TOWN_FLYBY`) but no
user-facing pause, scrub, or frame-step. The audit "Improvements"
list explicitly calls a "replay scrubber" out as missing.

**Impact:**
- Animation bugs cannot be reproduced or root-caused without
  re-running the entire battle.
- AI-pack authors have no inspection tool for their timelines.
- DAMAGE_FRAME / `eventFrame` regressions are hard to verify outside
  CI.

**Solution:**
A new wiki screen package
`docs/architecture/wiki/screens/<NN>-animation-debug-overlay/` with
the standard five files:
- `mockup.html` — pause / step-back / step-forward / scrub bar /
  per-stack anim state inspector / event-log viewer
- `spec.md` — components, state bindings (`state.dev.animPaused`,
  `state.dev.eventLogIndex`)
- `interactions.md` — `PAUSE_PRESENTATION`,
  `STEP_PRESENTATION_FORWARD`, `STEP_PRESENTATION_BACK`,
  `SCRUB_PRESENTATION_TO_INDEX` commands; each "Skips presentation
  only — no gameplay mutation"
- `data-contracts.md` — `state.dev.*` slots; gated by
  `config.dev.enableDebugOverlay: bool`
- `architecture.md` — diagram of presentation-loop interaction with
  the event log

The overlay is presentation-only; all four commands are
state-preserving by construction (they reseek the renderer's
event-log cursor, never rewind the engine).

**Files to Update:**
- [docs/architecture/wiki/screens/index.json](../../architecture/wiki/screens/index.json)
  — register the new package in the appropriate UI group (likely
  "debug / dev")
- [docs/architecture/wiki/screens/56-options/data-contracts.md](../../architecture/wiki/screens/56-options/data-contracts.md)
  — add `config.dev.enableDebugOverlay`

**New Files:**
- `docs/architecture/wiki/screens/<NN>-animation-debug-overlay/`
  (5 files)

**Implementation Steps:**
1. Pick the package number (next available in the dev/debug group).
2. Author the five files following the existing screen-package
   convention.
3. Register in `index.json`.
4. Add the dev-flag to the options data-contract.
5. Run `npm run generate:wiki` and `npm run validate`.

**Dependencies:**
- 3.A-1 (replay anchor rule — what the scrubber jumps to)
- 3.E-1 (null renderer reuses the event-log-consumer logic)

**Complexity:** M

---

## 4. Suggested Task Breakdown

Each item below should become a markdown task file in
`tasks/mvp/` or `tasks/phase-2/` and be picked up via
`npm run tasks:next`. Owner paths follow each title.

- [ ] **Author `docs/architecture/animation-contract.md`** (covers
  3.A-1, 3.A-2, 3.A-3, 3.A-4, plus § "Degradation" from 3.D-1) —
  owns `docs/architecture/animation-contract.md`
- [ ] **Reconcile DAMAGE_FRAME diagrams** — owns
  `docs/architecture/diagrams/11-attack-anim.md`,
  `12-spell-anim.md`, `13-death-victory.md`
- [ ] **Add `demolishing` state to building animations** — owns
  `docs/architecture/diagrams/06-town-animations.md`
- [ ] **Extend `animation.schema.json` for multi-track + multi-event**
  (3.B-1) — owns
  `content-schema/schemas/animation.schema.json` plus two new
  fixtures under `content-schema/examples/records/animations/`
- [ ] **Author `easing.schema.json`** (3.B-2) — owns
  `content-schema/schemas/easing.schema.json` and edits
  `animation.schema.json`, `vfx.schema.json`,
  `town-presentation.schema.json` to reference it
- [ ] **Close `vfx.schema.json`** (3.B-3) — owns
  `content-schema/schemas/vfx.schema.json`
- [ ] **Extend sprite-sheet metadata** (3.B-4) — owns
  `content-schema/schemas/animation.schema.json` (additive) plus
  `content-schema/examples/records/animations/multi-page-attack.animation.json`
- [ ] **Add asset-fallback + placeholder section to
  `pack-contract.md`** (3.C-1) — owns
  `docs/architecture/pack-contract.md` plus
  `resources/dev-assets/placeholder-sprite.png` and
  `resources/dev-assets/status-unknown.png`
- [ ] **Author per-animation perf budget + degradation policy**
  (3.D-1) — owns
  `docs/architecture/renderer-technology-choice.md` (budget table)
  and `scripts/validate-animation-budgets.js`
- [ ] **Stand up null renderer + headless animation tests** (3.E-1)
  — owns `src/renderer/null/` plus `tests/animation/`
- [ ] **Author animation-debug-overlay screen package** (3.F-1) —
  owns
  `docs/architecture/wiki/screens/<NN>-animation-debug-overlay/`
- [ ] **Update `schema-matrix.md` for new schemas** — owns
  `docs/architecture/schema-matrix.md`
- [ ] **Wire animation schemas into existing schema-validation
  step** — owns the existing validator script (find via
  `npm run validate:tasks` task ownership)

---

## 5. Execution Order

Strict ordering — each step unblocks the next:

1. **`docs/architecture/animation-contract.md`** (3.A-1, 3.A-2,
   3.A-3, 3.A-4). Pure doc. Unblocks every later step.
2. **Reconcile DAMAGE_FRAME diagrams** (3.A-2 Step 2). Pure doc.
3. **`easing.schema.json`** (3.B-2). Required by `vfx.schema.json`
   and the multi-track schema.
4. **Close `vfx.schema.json`** (3.B-3). Required by 3.E-1's schema-
   validation step.
5. **Extend `animation.schema.json` for multi-track + multi-event**
   (3.B-1). The largest schema change; all other schema work feeds
   in.
6. **Sprite-sheet metadata extension** (3.B-4). Independent additive
   change; can ship in parallel with step 5.
7. **`pack-contract.md` placeholders + dev-asset PNGs** (3.C-1).
8. **Per-animation perf budget + degradation + validator script**
   (3.D-1).
9. **Null renderer + headless animation tests** (3.E-1). Validates
   steps 1-8.
10. **Animation debug-overlay screen package** (3.F-1). Reuses
    null-renderer event-log consumer.
11. **`schema-matrix.md` rollup + final `npm run validate`**.

Steps 1, 2, and 6 may run in parallel with each other. Step 5 is the
largest single change and should land before steps 8 and 9.

---

## 6. Risks if Not Implemented

- **Determinism leak via DAMAGE_FRAME (Issue 3.A-2 unaddressed).**
  Replays and lockstep multiplayer desync the moment a frame drops
  or a clock skews. The ambiguity sits in the canonical sequence
  diagram, so an AI agent will read it literally and ship the bug.
- **Schema-break churn (Issue 3.B-1 unaddressed).** First two-hit
  attack, first burning unit during retaliation, and first
  frame-precise sound cue each force a schema change after pack
  content already depends on the single-eventFrame model — every
  user-mod and AI-generated faction must migrate.
- **Mid-anim destruction undefined (Issue 3.A-3 unaddressed).**
  Projectile mid-flight when caster dies, summon timer expiry
  mid-attack, demolished building mid-loop, camera-follow on a dead
  target — AI generators will hit each first.
- **Perf cliff under content load (Issue 3.D-1 unaddressed).** The
  first user-modded faction with a 64-frame creature attack at 24
  fps silently breaks the 60 FPS target on tablets, with no CI
  signal.
- **Test coverage hole (Issue 3.E-1 unaddressed).** Engine
  determinism is exhaustively tested; the animation system has no
  equivalent. Schema drift in `animation.schema.json` /
  `vfx.schema.json` goes unnoticed until a player loads a pack.
- **Easing fragmentation (Issue 3.B-2 unaddressed).** Each
  implementer picks their own; visible inconsistency between map,
  battle, and UI ease curves. AI packs cannot request specific
  easing.
- **Asset fallback gaps (Issue 3.C-1 unaddressed).** A required
  anim missing at load — undefined runtime; mid-game asset
  corruption — silent break; no dev-mode placeholder to author
  against incomplete packs.

---

## 7. AI Implementation Readiness

**Score:** 4 / 10 today → **8 / 10** after this plan lands.

**What lifts the score:**
- The DAMAGE_FRAME doctrine becomes unambiguous (3.A-2): an AI
  agent reading the contract cannot wire damage from the renderer
  back into rules.
- The animation schema has multi-track and multi-event slots
  (3.B-1), so status icons, multi-hit attacks, and per-frame sound
  cues are first-class.
- Easing primitives are enumerated and shared (3.B-2); ambient ease
  curves match across map, battle, and UI without coordination.
- VFX phases are closed (3.B-3); silent invented-phase no-ops
  become validation errors.
- Sprite-sheet metadata covers TexturePacker output and per-frame
  anchors (3.B-4).
- Asset fallback rules cover the matrix of missing-at-load vs.
  missing-at-runtime cases (3.C-1).
- Per-animation perf budget + CI validator (3.D-1) catches budget
  busters at pack-validation time, not at visual integration.
- Headless animation tests (3.E-1) give the animation system an
  equivalent of the engine fuzz harness — schema drift, event-frame
  invariants, and DAMAGE_FRAME ownership all gain CI gates.
- Debug-overlay screen package (3.F-1) gives both human and AI
  authors a way to inspect timelines without re-running battles.

**What still keeps it below 10:**
- Real renderer code in `src/renderer/` is still
  not written — runtime correctness vs. the contract is
  unverifiable until [`tasks/mvp/06-renderer/`](../../../tasks/mvp/06-renderer/)
  lands.
- The exact animation snapshot format and the CI threshold for
  "intentional content change vs. regression" require iteration
  once real packs exist.
- Multiplayer (M5) lockstep alignment of presentation-time has
  knock-on requirements (e.g. shared `effectiveDelta`) that this
  plan touches but does not finalize, because lockstep transport
  is out of scope.
