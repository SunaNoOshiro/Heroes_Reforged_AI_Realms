# Sound System — Event-Log-Driven

Status: planned

Module: [Polish (M7)](../04-polish.md)

Description:
Play sound effects in response to game events. The sound system is a **second independent consumer** of the per-dispatch `events: Event[]` log emitted by the dispatcher; it iterates the array in insertion order and triggers audio clips. There is no ordering guarantee relative to the animation-timeline consumer beyond per-consumer insertion order — audio onsets are keyed off the animation timeline's clip clock so cues line up with visible motion (per [`event-system.md` § 3](../../../docs/architecture/event-system.md#3-consumption-contract)). Uses Howler.js for cross-browser audio.

Events validate against [`event.schema.json`](../../../content-schema/schemas/event.schema.json); per-kind payload, emitter, and consumer mapping live in [`event-schema.md`](../../../docs/architecture/event-schema.md). A throwing audio handler is caught by the audio scheduler, logged, and the next event is processed; the dispatcher is never re-entered from a catch block.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/event-system.md`](../../../docs/architecture/event-system.md)
- [`docs/architecture/event-schema.md`](../../../docs/architecture/event-schema.md)

Inputs:
- Event log (`09-tactical-combat.md`, `05-adventure-map.md`)
- Sound clip assets (stub with placeholder beeps for MVP)

Outputs:
- `src/renderer/sound-system.ts`
- `SoundSystem.onEvent(event: GameEvent): void`
- Sound map (event type → clip name):
  - `UNIT_ATTACKED` → `sword_hit.ogg`
  - `UNIT_DIED` → `death_cry.ogg`
  - `SPELL_CAST` → `spell_cast_{school}.ogg`
  - `BUILDING_BUILT` → `construction.ogg`
  - `MINE_CAPTURED` → `mine_capture.ogg`
  - `HERO_LEVEL_UP` → `level_up.ogg`
  - `DAY_END` → `end_turn.ogg`
- Volume settings persisted in localStorage
- Sound plays synchronized with animation timeline (not raw event time)

Owned Paths:
- `src/renderer/sound-system.ts`

Dependencies:
- mvp.06-renderer.07-event-log-animation-timeline

Acceptance Criteria:
- Sound plays within 50ms of the corresponding animation moment (not the event)
- Mute button silences all sound
- Volume slider persists across page reloads
- No audio glitches when multiple sounds play simultaneously

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
