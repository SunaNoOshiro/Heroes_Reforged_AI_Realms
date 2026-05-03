# Animation Contract

This file is the canonical source of truth for the animation system's
runtime contract: clock model, gameplay/visual boundary, conflict
resolution, mid-anim destruction, and degradation policy.

It complements the existing schemas
([`animation.schema.json`](../../content-schema/schemas/animation.schema.json),
[`vfx.schema.json`](../../content-schema/schemas/vfx.schema.json),
[`easing.schema.json`](../../content-schema/schemas/easing.schema.json))
and the renderer technology decision
([`renderer-technology-choice.md`](./renderer-technology-choice.md)).
Rules that affect deterministic gameplay live in
[`determinism.md`](./determinism.md) and
[`state-flow.md`](./state-flow.md); this doc only covers the
presentation seam.

---

## Two-Clock Model

The simulation and the renderer run on different clocks. The
simulation is event-driven and pure. The renderer is frame-driven and
reads-only. Mixing them is the most common source of replay/lockstep
desync.

### `deltaTime` source

- `deltaTime` is sourced from the browser monotonic clock
  (`performance.now()`).
- Unit: milliseconds (`ms`).
- The renderer tracks `deltaTime` per-frame as
  `now - lastFrameNow`.

### Per-frame clamp

- `deltaTime` is clamped to ≤ 100 ms before being applied to the
  animation timeline.
- A clamp event holds the current animation frame instead of
  fast-forwarding. Result: a 30-second tab pause causes timelines to
  appear to "freeze" then resume from the held frame, never to play a
  multi-second catch-up sequence in one render frame.

### Battle-speed × `config.ui.animationSpeed`

```text
effectiveDelta = deltaTime
                 × config.ui.animationSpeed   // user preference, [0.25 .. 4.0]
                 × battleSpeed                // per-battle UI control, [0.5 .. 4.0]
```

- `effectiveDelta` is applied **only** to render-side timeline
  advancement (sprite frame index, VFX particle age, easing `t`).
- The simulation command log is **never** scaled. Engine reducers do
  not see `deltaTime` at all.

### Replay anchor

- After load (save or replay), the renderer's animation playback time
  is reset to `0` at the consumer's last-applied event-log index.
- In-flight animations do not survive load. The renderer rebuilds its
  presentation state from the event log.
- This anchor is what `state.dev.eventLogIndex` (debug overlay)
  scrubs against.

### Reduced-motion

- When `config.ui.reducedMotion === true`, the renderer collapses each
  played sequence to its terminal state:
  - body sequences with an `eventFrame` or `events[].kind === "damage"`
    skip directly to that frame, then hold.
  - sequences without an event frame snap to the last frame.
  - VFX phases with a non-zero duration play once at minimum
    intensity; particles capped at 25%.
- Reduced-motion never alters the engine command log.

---

## DAMAGE_FRAME Ownership

> **Doctrine:** the engine schedules, the renderer displays.

The reducer applies the damage at command-dispatch time, before any
animation begins. The renderer plays the matching sequence and
surfaces visual artifacts (numbers, hit flashes, status icons) at the
declared `eventFrame` (or `events[].frame`) for cosmetic effect.
Frame values are zero-based indices into the played sequence's
`frames[]` list, not sprite-sheet frame numbers.

### Positive example

```text
Engine receives BATTLE_ATTACK { attacker, defender, swing: 0 }
Engine resolves: damage = 47, defender.hp -= 47
Engine emits UNIT_ATTACKED {
  damage: 47,
  eventFrame: 2,
  animId: "ash-hound.attack",
  attackerId, defenderId
} into the event log

Renderer reads UNIT_ATTACKED, schedules:
  - playSequence("ash-hound.attack")
  - displayDamageNumber(47, atFrame=2)
  - playSequence("hurt", target=defenderId, atFrame=2)
```

### Negative example (do not do this)

```text
Engine emits BATTLE_ATTACK_BEGIN { attacker, defender }
Renderer plays "ash-hound.attack"
Renderer reaches the damage frame, calls DamageCalc.calculateDamage()
Renderer mutates defender.hp
```

This pattern desyncs the moment a frame drops, a clock skews, or
replay re-anchors. It is forbidden by
[`renderer-technology-choice.md` § DON'T](./renderer-technology-choice.md#dont).

### Cosmetic visuals derived at `eventFrame`

The following are visual-only and may be derived from `eventFrame`
without engine involvement:

- floating damage number
- hit flash on the defender sprite
- one-shot impact VFX phase
- one-shot sound cue
- screen shake / camera punch

The engine has already authored the gameplay outcome by the time the
renderer reaches `eventFrame`. The renderer's job is presentation
fidelity, not authority.

---

## Gameplay Vs. Visual State

Where each observable "phenomenon" lives. Anything in the **gameplay**
column is replicated, hashed, persisted, and replayed. Anything in the
**visual** column is local, optional, and never serialized into the
command log.

| Phenomenon | Gameplay state | Visual state |
|---|---|---|
| Hero tile position (e.g. `(3,2)`) | ✅ `state.world.heroes[].pos` | — |
| Hero sub-tile travel offset (e.g. 47% from prev → next tile) | — | ✅ derived from event-log index + path interpolator + easing |
| Unit HP | ✅ `state.battle.stacks[].hp` | — |
| Unit status effects (burn, poison, slow, blessed) | ✅ `state.battle.stacks[].statuses[]` | — |
| Status icon overlay sprite | — | ✅ derived from `statuses[]` + status registry |
| Damaged-tint level on a building | — | ✅ derived from `building.hp / building.hpMax` |
| Damage number "47" | — | ✅ rendered at `eventFrame` from `UNIT_ATTACKED.damage` |
| VFX phase index (cast / projectile / impact) | — | ✅ derived from event log |
| Camera position | — | ✅ never persisted; derived from focus target |
| Camera-follow target | — | ✅ presentation only; if target removed, camera holds |
| Particle positions inside a phase | — | ✅ deterministic but not serialized |
| Animation playback time | — | ✅ reset to 0 at last applied event-log index on load |

The boundary is enforced by code organization: anything in
`src/engine/` may write to gameplay state; anything in `src/renderer/`
may not write to gameplay state at all.

---

## Conflict Resolution

Animations resolve along three independent channels:
**body**, **status**, and **fx**. Channels do not interrupt each other.
Within a single channel, conflicts resolve by the per-channel policy
below.

### Per-channel policy

| Channel | Policy | Notes |
|---|---|---|
| `body` | `override` | Higher-priority sequence interrupts the running one (see priority table below). |
| `status` | `queue` | Multiple status icons render concurrently as overlays; each runs an independent timeline. |
| `fx` | `queue` | Each VFX phase spawns its own short-lived timeline; orphaned timelines self-complete. |

### Body-channel priority table

Higher rows interrupt lower rows. Equal rows are FIFO by event-log
order.

| Priority | Animation kind | Source event |
|---|---|---|
| 9 | `dying` | engine emits `UNIT_DIED` (HP ≤ 0) |
| 8 | `defeated` | engine emits `BATTLE_RESOLVED` against the player |
| 7 | `hurt` | engine emits `UNIT_ATTACKED` against this unit |
| 6 | `attacking` | engine emits `UNIT_ATTACKED` from this unit |
| 5 | `casting` | engine emits `SPELL_CAST` from this unit |
| 4 | `defending` | engine emits `UNIT_DEFENDED` |
| 3 | `waiting` | engine emits `UNIT_WAIT` |
| 2 | `walking` | engine emits `UNIT_MOVED` |
| 1 | `idle` | default state |

Override semantics:

- when a higher-priority sequence interrupts a lower-priority one, the
  interrupted sequence's `events[]` (damage / sound / vfx / status)
  that have not yet fired are **dropped silently** for the
  interrupted timeline. The engine has already applied the gameplay
  outcome; visual cleanup is the renderer's prerogative.
- the new sequence starts at frame 0.
- one body track per entity. A unit cannot be `attacking` and `hurt`
  at the same time on the body channel.

### Examples

- **Killed mid-`hurt`.** Unit takes a hit, plays `hurt`. Before
  `hurt` completes, a second hit reduces HP to 0. The engine emits
  `UNIT_DIED`. Body channel resolves: `dying` (priority 9) overrides
  `hurt` (priority 7). The `dying` clip plays from frame 0; the
  remaining `hurt` frames are dropped. (Status and fx tracks attached
  to the dead unit are detached when the entity is removed from grid;
  see "Mid-Anim Destruction" below.)
- **Mid-`attacking` taking retaliation.** Unit A plays `attacking`.
  At `eventFrame`, the engine emits `UNIT_ATTACKED { target: B,
  damage: 47 }`. The reducer also resolves retaliation: the engine
  emits `UNIT_ATTACKED { target: A, damage: 22 }` from B in the same
  step. A's body channel resolves: A is currently `attacking`
  (priority 6); incoming `hurt` (priority 7) overrides. A's
  `attacking` recovery frames are dropped; A plays `hurt` from frame
  0.
- **Status icon overlay during attack.** Unit is `attacking` (body
  channel) and also has `burn` status (status channel). Both render
  concurrently. The status overlay does not interrupt the body
  sequence.

---

## Mid-Anim Destruction

Entities can be removed from the simulation while their renderer-side
animations are still in flight. The rules below cover every documented
case.

### Body track of dead unit

- The `dying` sequence plays to its last frame.
- After the last frame, the entity is removed from the grid and the
  body-channel timeline is destroyed.
- Status and fx tracks attached to the dead unit are detached at the
  same instant.
- Matches the existing flow in
  [`docs/architecture/diagrams/13-death-victory.md`](./diagrams/13-death-victory.md).

### Status icons attached to a dead unit

- Detached when the entity is removed from grid (i.e. one frame after
  `dying` completes).
- Status icons that would have ticked while detached are dropped
  silently.
- The engine does not see this; status removal on death is part of the
  reducer (`UNIT_DIED` clears the unit's `statuses[]`).

### Projectile orphan rule

- A projectile timeline is parameterized by caster id, target hex, and
  payload at spawn time. It does **not** hold a back-reference to the
  caster.
- If the caster is removed mid-flight, the projectile timeline still
  completes through `impact`.
- The engine has already authored damage at projectile-spawn time
  (the damage event is emitted with `eventFrame` matching the
  `impact` phase). The renderer's job is to display, not to recompute.

### Building demolition mid-loop

- Buildings have a `demolishing` state on the body channel (see
  [`docs/architecture/diagrams/06-town-animations.md`](./diagrams/06-town-animations.md)).
- `demolishing` plays once; on completion the building enters
  `NotBuilt`.
- Concurrent active-spawn (status / fx) timelines are detached when
  the building enters `NotBuilt`.

### Camera-follow on a dead target

- Camera-follow detaches when its target is removed from grid.
- Camera holds last position. The user retains pan / zoom control.
- This is a presentation-only concern; no command is emitted.

### Summoned creature timer expiry mid-attack

- The engine emits `UNIT_DESPAWNED` when the summon timer expires.
- Body channel: `dying` (priority 9) overrides whatever was running.
- Identical to "Killed mid-`hurt`" above; the priority table covers
  it.

---

## Easing

All easing functions are pure and deterministic in input → output.
Inputs are normalized `t` in `[0, 1]`; outputs are `[0, 1]` (or
`[-overshoot, 1+overshoot]` for `bezier` with control points outside
the unit square).

The closed enum lives in
[`content-schema/schemas/easing.schema.json`](../../content-schema/schemas/easing.schema.json).
Schema fields that request interpolation reference it (e.g. status
fade-in, projectile travel, town flyby camera path).

Easing is used **only** in cosmetic interpolation. It must never be
used to derive gameplay state.

---

## Degradation

When the renderer enters a worse frame-time tier (see
[`renderer-technology-choice.md` § Frame-Time Budget & Degradation`](./renderer-technology-choice.md#frame-time-budget--degradation)),
the animation system collapses along the tiers below. Each tier is
additive — entering a worse tier applies the previous tiers' rules
plus its own.

| Tier | Action |
|---|---|
| 1 | Skip off-screen building idle anims (already implied by [`22-building-loop.md`](./diagrams/22-building-loop.md)) |
| 2 | Drop VFX particle counts to 50% of declared values |
| 3 | Collapse status overlays to a single shared track per entity |
| 4 | Hold animation frame; render only the current declared state (effectively per-frame reduced-motion) |

Tier transitions are reported to the debug overlay
([`docs/architecture/wiki/screens/66-debug-overlay/`](./wiki/screens/66-debug-overlay/))
and to the per-animation perf overlay
([`docs/architecture/wiki/screens/67-animation-debug-overlay/`](./wiki/screens/67-animation-debug-overlay/)).
Degradation is presentation-only and does not change the event log.

Schema-time enforcement of per-animation budgets lives in
[`scripts/validate-animation-budgets.mjs`](../../scripts/validate-animation-budgets.mjs)
and runs as part of `npm run validate`.

---

## Asset Fallback

The placeholders table in
[`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders)
is canonical. Animation-specific notes:

- A required creature anim (`idle`, `walking`, `attacking`, `hurt`,
  `dying`) missing at load is a **fail-loud** validation error — packs
  do not load.
- An optional creature anim (`defending`, `casting`, `special`)
  missing at load falls back to the documented substitute
  (`defending → idle`, `casting → idle`, `special → attacking`).
- A sprite-sheet PNG that fails to decode mid-game is replaced with
  the dev-mode magenta-checker placeholder when
  `config.dev.placeholderSprites === true`; in production, the
  renderer logs a warning and continues with the last decoded frame.

---

## Related Files

- [`renderer-technology-choice.md`](./renderer-technology-choice.md)
  — renderer technology, perf budget tiers
- [`state-flow.md`](./state-flow.md)
  — engine / renderer / UI subscription cadence
- [`determinism.md`](./determinism.md)
  — replay invariants
- [`pack-contract.md`](./pack-contract.md)
  — asset fallback table
- [`diagrams/11-attack-anim.md`](./diagrams/11-attack-anim.md)
- [`diagrams/12-spell-anim.md`](./diagrams/12-spell-anim.md)
- [`diagrams/13-death-victory.md`](./diagrams/13-death-victory.md)
- [`diagrams/06-town-animations.md`](./diagrams/06-town-animations.md)
- [`diagrams/21-creature-states.md`](./diagrams/21-creature-states.md)
- [`diagrams/22-building-loop.md`](./diagrams/22-building-loop.md)
- [`diagrams/23-hero-movement.md`](./diagrams/23-hero-movement.md)
- [`../../content-schema/schemas/animation.schema.json`](../../content-schema/schemas/animation.schema.json)
- [`../../content-schema/schemas/vfx.schema.json`](../../content-schema/schemas/vfx.schema.json)
- [`../../content-schema/schemas/easing.schema.json`](../../content-schema/schemas/easing.schema.json)
- [`../../scripts/validate-animation-budgets.mjs`](../../scripts/validate-animation-budgets.mjs)
