# Turn Timer and Stall Detection

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Add the per-peer turn timer that closes the connected-but-idle
griefing gap. Three escalation states: `WAITING` from turn start,
`STALLED` at `WAITING_THRESHOLD_MS = 30_000`, `AUTO_END_DAY` at
`STALL_LIMIT_MS = 90_000`. The auto-`END_DAY` envelope is canonical
and rides the lockstep envelope pipeline like any other command,
so both peers apply it deterministically. Critical
Fix 4.

Read First:
- [`docs/architecture/turn-timer.md`](../../../docs/architecture/turn-timer.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/lockstep-envelope.md`](../../../docs/architecture/lockstep-envelope.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/wiki/screens/77-multiplayer-game/spec.md`](../../../docs/architecture/wiki/screens/77-multiplayer-game/spec.md)

Inputs:
- Lockstep envelope wrap pipeline from
  [Task 09](./09-lockstep-envelope-and-mac.md).
- `END_DAY` command shape with `source` discriminator from
  [`command-schema.md`](../../../docs/architecture/command-schema.md).
- Manifest field `multiplayer.turnTimerMs` from
  [`manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json).

Outputs:
- `src/net/lockstep/turn-timer.ts` — wall-clock-driven timer state
  machine; emits canonical `END_DAY { source: 'auto-timeout' }`
  envelope at `STALL_LIMIT_MS`.
- Manifest schema extension: `multiplayer.turnTimerMs` with
  bounds `waitingThreshold ≥ 5_000`,
  `stallLimit ≥ waitingThreshold + 5_000`, `stallLimit ≤ 600_000`.
- Telemetry event types `TURN_TIMER_WAITING`,
  `TURN_TIMER_STALLED`, `TURN_TIMER_AUTO_END_DAY` registered in
  [`telemetry-event.schema.json`](../../../content-schema/schemas/telemetry-event.schema.json).
- Screen 77 (`docs/architecture/wiki/screens/77-multiplayer-game/`)
  surfaces the three states via `OpponentTurnIndicator`.

Owned Paths:
- `src/net/lockstep/turn-timer.ts`
- `docs/architecture/turn-timer.md`

Dependencies:
- phase-3.01-multiplayer.09-lockstep-envelope-and-mac

Acceptance Criteria:
- Simulated wall-clock advance through `WAITING_THRESHOLD_MS`
  emits `TURN_TIMER_STALLED`.
- Simulated advance through `STALL_LIMIT_MS` emits a canonical
  `END_DAY { source: 'auto-timeout' }` envelope; the envelope
  passes the canonical intra-turn order rule from
  [Task 03](./03-input-only-lockstep-command-serialization-plus-sequencing.md).
- Manifest override `multiplayer.turnTimerMs` is honored and
  validated against the bounds above.
- Both peers independently emitting the auto-`END_DAY` results
  in exactly one canonical apply (the canonical intra-turn order
  decides which envelope goes first; the second is dropped as
  duplicate per task 03 sequence rules).
- `OpponentTurnIndicator` on screen 77 transitions
  `waiting → stalled → auto-ended` matching the timer state.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
