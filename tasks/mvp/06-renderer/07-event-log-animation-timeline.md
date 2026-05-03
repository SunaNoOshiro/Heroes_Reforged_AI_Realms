# Event Log → Animation Timeline

Status: planned

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
Consume the event log emitted by the sim and build an animation timeline: each event becomes an animation clip (move path, attack swing, projectile, death). Clips are sequenced and played back in the presentation loop.

Read First:
- [`docs/architecture/ui-renderer-seam.md`](../../../docs/architecture/ui-renderer-seam.md)
- [`docs/architecture/screen-scaling.md`](../../../docs/architecture/screen-scaling.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- Event log from sim (array of typed `Event` objects)
- `Animator` (Task 6)

Outputs:
- `src/renderer/animation-timeline.ts`
- `buildTimeline(events: Event[]): AnimationClip[]`
- `AnimationClip`: `{ startTime, duration, type, unitId, fromHex?, toHex?, targetHex? }`
- `TimelinePlayer`: `{ update(dt): void, isFinished(): boolean }`

Owned Paths:
- `src/renderer/animation-timeline.ts`

Events to handle:
- `UNIT_MOVED`: walk animation along path
- `UNIT_ATTACKED`: attack swing + hit/miss effect
- `UNIT_DIED`: death animation → unit removed from field
- `PROJECTILE_FIRED`: arrow/magic bolt arc from attacker to defender
- `SPELL_CAST`: spell VFX at target hex (simple sprite flash for MVP)

Dependencies:
- mvp.06-renderer.05-1115-tactical-battlefield-renderer
- mvp.06-renderer.06-sprite-sheet-loader-plus-frame-animation

Acceptance Criteria:
- Move event animates unit along full path (not teleport)
- Attack animation shows before damage number
- Timeline correctly sequences concurrent events (multiple units dying at once)
- `isFinished()` signals when UI can accept next input

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
