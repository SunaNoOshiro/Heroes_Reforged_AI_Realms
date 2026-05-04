# Event Log → Animation Timeline

Status: planned

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
Consume the event log emitted by the sim and build an animation timeline: each event becomes an animation clip (move path, attack swing, projectile, death). Clips are sequenced and played back in the presentation loop.

The timeline iterates the per-dispatch `events: Event[]` array in **insertion order** on `requestAnimationFrame` cadence. There is no callback-on-emit and no subscriber list — the timeline is one of two independent log consumers (see [`event-system.md`](../../../docs/architecture/event-system.md)). The timeline's queue is presentation-side only; it is NOT the source of truth and is NEVER serialized into a save record. Inbound engine events validate against [`event.schema.json`](../../../content-schema/schemas/event.schema.json); the renderer's own outbound events to the UI shell (selection / camera / animation lifecycle / damage numbers / fog reveal / context loss) validate against [`renderer-event.schema.json`](../../../content-schema/schemas/renderer-event.schema.json). Per-kind payload, emitter, and consumer mapping live in [`event-schema.md`](../../../docs/architecture/event-schema.md).

Read First:
- [`docs/architecture/ui-renderer-seam.md`](../../../docs/architecture/ui-renderer-seam.md)
- [`docs/architecture/screen-scaling.md`](../../../docs/architecture/screen-scaling.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/event-system.md`](../../../docs/architecture/event-system.md)
- [`docs/architecture/event-schema.md`](../../../docs/architecture/event-schema.md)

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
