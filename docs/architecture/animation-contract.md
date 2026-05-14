# Animation Contract

Canonical source of truth for the animation system's runtime
contract: clock model, gameplay/visual boundary, conflict resolution,
mid-anim destruction, and degradation policy.

Companion docs:

- Schemas:
  [`animation.schema.json`](../../content-schema/schemas/animation.schema.json),
  [`vfx.schema.json`](../../content-schema/schemas/vfx.schema.json),
  [`easing.schema.json`](../../content-schema/schemas/easing.schema.json).
- Renderer: [`renderer-technology-choice.md`](./renderer-technology-choice.md).
- Determinism: [`determinism.md`](./determinism.md),
  [`state-flow.md`](./state-flow.md).

This file covers the **presentation seam** only. Rules that affect
deterministic gameplay live in `determinism.md` and `state-flow.md`.

---

## 1. Two-Clock Model

The simulation is event-driven and pure. The renderer is frame-driven
and read-only. Mixing the two clocks is the most common source of
replay / lockstep desync.

### `deltaTime`

- Source: browser monotonic clock (`performance.now()`).
- Unit: milliseconds.
- Per-frame value: `now − lastFrameNow`.
- Clamped to **≤ 100 ms** before being applied to any animation
  timeline. A clamp event holds the current frame instead of
  fast-forwarding, so a 30 s tab pause freezes timelines and resumes
  from the held frame — never a multi-second catch-up burst.

### Speed multipliers

```text
effectiveDelta = deltaTime
                 × config.ui.animationSpeed   // user preference, [0.25 .. 4.0]
                 × battleSpeed                // per-battle UI control, [0.5 .. 4.0]
```

- `effectiveDelta` advances **render-side timelines only** (sprite
  frame index, VFX particle age, easing `t`).
- The simulation command log is never scaled. Engine reducers do not
  see `deltaTime` at all.

### Replay anchor

- After load (save or replay), renderer animation playback time is
  reset to `0` at the consumer's last-applied event-log index.
- In-flight animations do not survive load; the renderer rebuilds
  presentation state from the event log.
- This anchor is what `state.dev.eventLogIndex` (the animation debug
  overlay, screen
  [`67-animation-debug-overlay`](./wiki/screens/67-animation-debug-overlay/))
  scrubs against.

### Reduced-motion

When `config.ui.reducedMotion === true`, the renderer collapses each
played sequence to its terminal state:

- Sequences with an `eventFrame` (or `events[].kind === "damage"`)
  jump directly to that frame, then hold.
- Sequences with no event frame snap to the last frame.
- VFX phases with non-zero duration play once at minimum intensity;
  particles capped at 25 %.

Reduced-motion never alters the engine command log.

---

## 2. DAMAGE_FRAME Ownership

> **Doctrine:** the engine schedules, the renderer displays.

The reducer applies damage at command-dispatch time, before any
animation begins. The renderer plays the matching sequence and
surfaces visual artifacts (numbers, hit flashes, status icons) at the
declared `eventFrame` (or `events[].frame`). Frame values are
zero-based indices into the played sequence's `frames[]` list, **not**
sprite-sheet frame numbers.

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

### Negative example (forbidden)

```text
Engine emits BATTLE_ATTACK_BEGIN { attacker, defender }
Renderer plays "ash-hound.attack"
Renderer reaches the damage frame, calls DamageCalc.calculateDamage()
Renderer mutates defender.hp
```

This pattern desyncs the moment a frame drops, a clock skews, or
replay re-anchors. Pinned in
[`renderer-technology-choice.md` § DON'T](./renderer-technology-choice.md#dont).

### Cosmetic-only at `eventFrame`

These derive from `eventFrame` without engine involvement:

- floating damage number;
- hit flash on the defender sprite;
- one-shot impact VFX phase;
- one-shot sound cue;
- screen shake / camera punch.

By the time the renderer reaches `eventFrame` the engine has already
authored the gameplay outcome. The renderer's job is presentation
fidelity, not authority.

---

## 3. Gameplay vs. Visual State

Anything in the **gameplay** column is replicated, hashed, persisted,
and replayed. Anything in the **visual** column is local, optional,
and never serialized into the command log.

| Phenomenon | Gameplay state | Visual state |
|---|---|---|
| Hero tile position (e.g. `(3,2)`) | ✅ `state.world.heroes[].pos` | — |
| Hero sub-tile travel offset (e.g. 47 % from prev → next) | — | ✅ derived from event-log index + path interpolator + easing |
| Unit HP | ✅ `state.battle.stacks[].hp` | — |
| Unit status effects (burn, poison, slow, blessed) | ✅ `state.battle.stacks[].statuses[]` | — |
| Status-icon overlay sprite | — | ✅ derived from `statuses[]` + status registry |
| Damaged-tint level on a building | — | ✅ derived from `building.hp / building.hpMax` |
| Damage number "47" | — | ✅ rendered at `eventFrame` from `UNIT_ATTACKED.damage` |
| VFX phase index (cast / projectile / impact) | — | ✅ derived from event log |
| Camera position | — | ✅ never persisted; derived from focus target |
| Camera-follow target | — | ✅ presentation only; if target removed, camera holds |
| Particle positions inside a phase | — | ✅ deterministic but not serialized |
| Animation playback time | — | ✅ reset to 0 at last applied event-log index on load |

The boundary is enforced by code organization: `src/engine/` may
write gameplay state; `src/renderer/` may not. See
[`state-flow.md` § Boundary Responsibilities](./state-flow.md#boundary-responsibilities).

---

## 4. Conflict Resolution

Animations resolve along three independent channels — **body**,
**status**, **fx**. Channels do not interrupt each other. Within a
channel, conflicts resolve by the per-channel policy.

### Per-channel policy

| Channel | Policy | Notes |
|---|---|---|
| `body` | `override` | Higher-priority sequence interrupts the running one (priority table below). |
| `status` | `queue` | Multiple status icons render concurrently as overlays; each runs an independent timeline. |
| `fx` | `queue` | Each VFX phase spawns its own short-lived timeline; orphaned timelines self-complete. |

### Body-channel priority

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

### Override semantics

- When a higher-priority sequence interrupts a lower-priority one, the
  interrupted sequence's `events[]` (damage / sound / vfx / status)
  that have not yet fired are **dropped silently** for the interrupted
  timeline. The engine has already applied the gameplay outcome;
  visual cleanup is the renderer's prerogative.
- The new sequence starts at frame 0.
- One body track per entity. A unit cannot be `attacking` and `hurt`
  at the same time on the body channel.

### Worked examples

- **Killed mid-`hurt`.** Unit takes a hit and plays `hurt`. Before
  it completes, a second hit drops HP to 0; the engine emits
  `UNIT_DIED`. Body channel resolves: `dying` (9) overrides `hurt`
  (7); `dying` plays from frame 0; the remaining `hurt` frames are
  dropped. (Status and fx tracks attached to the dead unit detach
  per § 5.)
- **Mid-`attacking` taking retaliation.** Unit A plays `attacking`.
  At `eventFrame` the engine emits `UNIT_ATTACKED { target: B,
  damage: 47 }`. The reducer also resolves retaliation: it emits
  `UNIT_ATTACKED { target: A, damage: 22 }` from B in the same
  step. A's body channel resolves: A is `attacking` (6); incoming
  `hurt` (7) overrides; A's recovery frames are dropped; A plays
  `hurt` from frame 0.
- **Status overlay during attack.** A unit is `attacking` (body) and
  has `burn` status (status). Both render concurrently; the status
  overlay never interrupts the body sequence.

---

## 5. Mid-Anim Destruction

Entities can be removed from the simulation while their renderer-side
animations are still in flight.

### Body track of a dead unit

- The `dying` sequence plays to its last frame.
- After the last frame, the entity is removed from the grid and the
  body-channel timeline is destroyed.
- Status and fx tracks attached to the dead unit are detached at the
  same instant.
- Matches the flow in
  [`diagrams/13-death-victory.md`](./diagrams/13-death-victory.md).

### Status icons attached to a dead unit

- Detached when the entity is removed from the grid (one frame after
  `dying` completes).
- Status icons that would have ticked while detached are dropped
  silently.
- The engine does not see this; status removal on death is part of
  the reducer (`UNIT_DIED` clears the unit's `statuses[]`).

### Projectile orphan rule

- A projectile timeline is parameterized at spawn time by caster id,
  target hex, and payload. It does **not** hold a back-reference to
  the caster.
- If the caster is removed mid-flight, the projectile timeline still
  completes through `impact`.
- The engine has already authored damage at projectile-spawn time
  (the damage event's `eventFrame` matches the `impact` phase). The
  renderer's job is to display, not to recompute.

### Building demolition mid-loop

- Buildings have a `demolishing` state on the body channel (see
  [`diagrams/06-town-animations.md`](./diagrams/06-town-animations.md)).
- `demolishing` plays once; on completion the building enters
  `NotBuilt`.
- Concurrent active-spawn (status / fx) timelines detach when the
  building enters `NotBuilt`.

### Camera-follow on a dead target

- Camera-follow detaches when its target is removed from the grid.
- Camera holds last position; the user retains pan / zoom control.
- Presentation-only; no command is emitted.

### Summoned creature timer expiry mid-attack

- Engine emits `UNIT_DESPAWNED` when the summon timer expires.
- Body channel: `dying` (9) overrides whatever was running, identical
  to "Killed mid-`hurt`".

---

## 6. Easing

Easing functions are pure and deterministic in input → output.
Inputs are normalized `t` in `[0, 1]`; outputs are `[0, 1]` (or
`[−overshoot, 1+overshoot]` for `bezier` with control points outside
the unit square).

The closed enum lives in
[`easing.schema.json`](../../content-schema/schemas/easing.schema.json).
Schema fields that request interpolation reference it (status fade-in,
projectile travel, town flyby camera path, …).

Easing is used **only** in cosmetic interpolation; never to derive
gameplay state.

---

## 7. Degradation

When the renderer enters a worse frame-time tier (per
[`renderer-technology-choice.md` § Frame-Time Budget & Degradation`](./renderer-technology-choice.md#frame-time-budget--degradation)),
the animation system collapses along the additive tiers below.
Entering a worse tier applies all previous tiers' rules plus its own.

| Tier | Action |
|---|---|
| 1 | Skip off-screen building idle anims (already implied by [`diagrams/22-building-loop.md`](./diagrams/22-building-loop.md)). |
| 2 | Drop VFX particle counts to 50 % of declared values. |
| 3 | Collapse status overlays to a single shared track per entity. |
| 4 | Hold the current animation frame; render only the current declared state (effectively per-frame reduced-motion). |

Tier transitions are reported to:

- the dev debug overlay
  ([`wiki/screens/66-debug-overlay`](./wiki/screens/66-debug-overlay/));
- the per-animation perf overlay
  ([`wiki/screens/67-animation-debug-overlay`](./wiki/screens/67-animation-debug-overlay/)).

Degradation is presentation-only and does not change the event log.

Schema-time enforcement of per-animation budgets lives in
[`scripts/validate-animation-budgets.mjs`](../../scripts/validate-animation-budgets.mjs)
and runs as part of `npm run validate`.

---

## 8. Asset Fallback

The placeholders table in
[`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders)
is canonical. Animation-specific notes:

- A required creature anim (`idle`, `walking`, `attacking`, `hurt`,
  `dying`) missing at load is a **fail-loud** validation error —
  packs do not load.
- An optional creature anim (`defending`, `casting`, `special`)
  missing at load falls back to the documented substitute
  (`defending → idle`, `casting → idle`, `special → attacking`).
- A sprite-sheet PNG that fails to decode mid-game is replaced with
  the dev-mode magenta-checker placeholder when
  `config.dev.placeholderSprites === true`; in production the
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
- [`event-schema.md`](./event-schema.md)
  — closed event vocabulary, payloads, emitters, consumers
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

---

## 🔍 Sync Check

- **UI: ✔** — Reduced-motion, animation-speed, and battle-speed bindings line up with `config.ui.animationSpeed` / `config.ui.reducedMotion` references across screen `data-contracts.md` files. Debug-overlay anchors match `wiki/screens/66-debug-overlay/spec.md` and `wiki/screens/67-animation-debug-overlay/spec.md` (`state.dev.eventLogIndex`, degradation tier).
- **Schema: ✔** — `animation.schema.json` (channels `body | status | fx`, `events[].kind ∈ damage|sound|vfx|status`, `eventFrame` zero-based into `frames[]`), `vfx.schema.json` (closed phase set `cast | projectile | impact`, missing-phase no-op), and `easing.schema.json` (closed enum + bezier object) all match. Schema-matrix rows for `AnimationSet` / `VfxSet` / `Easing` confirm the rendering-only role and reference this doc.
- **Tasks: ⚠** — Owning runtime task is implied to be `mvp.06-renderer.07-event-log-animation-timeline` (per `event-schema.md`); `tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md` and `tasks/phase-3/02-ai-generation/05b-asset-normalization.md` already cite this doc in *Read First*. No `Read First` from the renderer event-log timeline task currently lists `animation-contract.md` — minor cross-link gap, see Issues.

## ⚠ Issues

- **`UNIT_ATTACKED` payload drift between this doc and the canonical event schema.** § 2 (Positive example) shows `UNIT_ATTACKED { damage, eventFrame, animId, attackerId, defenderId }`, and § 3 + the body-channel table reference the same shape. The canonical payload in [`event.schema.json`](../../content-schema/schemas/event.schema.json) (`unitAttacked` def) and [`event-schema.md` § UNIT_ATTACKED](./event-schema.md#unit_attacked) is `{ attackerStackId, defenderStackId, damage }` with `additionalProperties: false` — there is no `eventFrame` and no `animId`, and the names are `*StackId`, not `*Id`. The same shape ships into [`diagrams/11-attack-anim.md`](./diagrams/11-attack-anim.md) and [`diagrams/12-spell-anim.md`](./diagrams/12-spell-anim.md), so this is a multi-doc drift. Per CLAUDE.md root contract (schemas are canonical), the closing fix is one of: (a) extend `event.schema.json` `unitAttacked` to add optional `eventFrame: integer ≥ 0` and `animId: stringId`, then update `event-schema.md` and bump the schema-version note; or (b) move the `eventFrame` / `animId` carriage off `UNIT_ATTACKED` into a separate presentation-event kind. Owning task: [`mvp/06-renderer/07-event-log-animation-timeline`](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md) (renderer side) jointly with the engine task that emits `UNIT_ATTACKED`. Skill did not silently rewrite the example because the discrepancy points to a structural invariant (event-schema canonical shape) — anti-cheat rule D.
- **Body-channel priority table cites event kinds outside the closed event vocabulary.** § 4 maps the kinds `defeated`, `defending`, `waiting`, plus `UNIT_DESPAWNED` in § 5, to engine events `BATTLE_RESOLVED`, `UNIT_DEFENDED`, `UNIT_WAIT`, `UNIT_DESPAWNED` respectively. The closed 13-kind vocabulary in [`event-schema.md` § Summary](./event-schema.md#summary) and `event.schema.json` does not include any of those. [`diagrams/13-death-victory.md`](./diagrams/13-death-victory.md) and [`diagrams/21-creature-states.md`](./diagrams/21-creature-states.md) reference the same kinds, so the gap is system-wide. Per `event-schema.md` ("Adding a new kind requires extending `event.schema.json`, this doc, and `screen-event-coverage.json` in the same change"), the engine-side fix is to add the missing kinds (or alias them onto existing ones — e.g. `defeated` could derive from per-player `BATTLE_RESOLVED`-equivalent, `waiting` / `defending` from new `UNIT_INTENT` events). Owning task: [`mvp/06-renderer/07-event-log-animation-timeline`](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md) jointly with the tactical-battle reducer task that owns combat events. Suggested values: extend the `oneOf` in `event.schema.json` with `unitDefended`, `unitWaited`, `unitDespawned`, `battleResolved`; mirror the rows in `event-schema.md`. Skill preserved the table verbatim because event-vocabulary registration is structural (anti-cheat rule D).
- **`mvp.06-renderer.07-event-log-animation-timeline` does not cite `animation-contract.md` in its Read First.** The renderer animation timeline is the runtime owner of every rule in this doc (two-clock model, DAMAGE_FRAME ownership, conflict resolution, mid-anim destruction, degradation), yet a Grep across `tasks/` shows the doc is referenced from `tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md` and `tasks/phase-3/02-ai-generation/05b-asset-normalization.md` only. Per `.agents/rules/tasks.md` (*Read First* surface), the owning timeline task should list this doc explicitly so an implementer pulling the spec also gets the contract. Suggested fix: add a *Read First* entry for `docs/architecture/animation-contract.md` (relative path `../../../docs/architecture/animation-contract.md` from that task) to `tasks/mvp/06-renderer/07-event-log-animation-timeline.md`. Skill did not edit the task file (anti-cheat rule D).
