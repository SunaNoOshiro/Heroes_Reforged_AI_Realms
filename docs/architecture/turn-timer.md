# Turn Timer & Stall Detection (Plan 26 — Critical Fix 4)

> Source plan:
> [`docs/implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md`](../implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md)
> § Critical Fix 4.

Canonical doctrine for the per-peer turn timer that closes the
"connected-but-idle" griefing gap that the disconnect-forfeit timer
in
[`06-reconnection-log-range-request-plus-replay.md`](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md)
does not cover.

Owning task:
[`tasks/phase-3/01-multiplayer/11-turn-timer-and-stall-detection.md`](../../tasks/phase-3/01-multiplayer/11-turn-timer-and-stall-detection.md).

Companion docs:
[`security-model.md`](./security-model.md),
[`lockstep-envelope.md`](./lockstep-envelope.md),
[`command-schema.md`](./command-schema.md).

---

## 1. Three escalation states

| State | Threshold | Surfaced where |
| --- | --- | --- |
| `WAITING` | from turn start | `OpponentTurnIndicator` shows neutral spinner. |
| `STALLED` | `WAITING_THRESHOLD_MS = 30_000` | Indicator turns yellow with copy "Opponent is taking longer than usual." |
| `AUTO_END_DAY` | `STALL_LIMIT_MS = 90_000` | Both peers independently emit a canonical `END_DAY { source: 'auto-timeout' }` envelope; the indicator shows "Day auto-ended." |

Both `WAITING_THRESHOLD_MS` and `STALL_LIMIT_MS` are configurable
per scenario via the pack manifest field
`multiplayer.turnTimerMs`. Defaults are 30 s / 90 s for ranked
play; friendly matches may override.

---

## 2. Why the auto-`END_DAY` is canonical

`src/net/lockstep/turn-timer.ts` reads `performance.now()` on the
**transport / UI** path, not on the deterministic engine path. The
wall-clock delta determines *when* a peer emits the auto-`END_DAY`
envelope, but the envelope itself is a normal canonical command:
it goes through the
[`lockstep-envelope.md`](./lockstep-envelope.md) wrap + MAC
pipeline, gets a `seq`, and applies through the canonical reducer
on both peers in the same intra-turn order
([`03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)).

Determinism is preserved because:

1. Both peers run the same `STALL_LIMIT_MS` rule against their own
   wall clocks. Skewed clocks may make one peer emit slightly
   earlier, but **either peer's auto-`END_DAY` is canonical** —
   the first one received satisfies the turn-end gate, and the
   reducer accepts it once.
2. If peer A emits `END_DAY { source: 'auto-timeout' }` and peer
   B emits `END_DAY { source: 'manual' }` at nearly the same
   time, the canonical intra-turn order
   (`(turn, playerId, seq)` lexicographic) decides which one
   takes precedence. Both peers compute the same order; both
   reducers apply the same command first.

The `source` discriminator (`'manual' | 'auto-timeout'`) lives on
the `END_DAY` command shape in
[`command-schema.md`](./command-schema.md). It is canonical
gameplay metadata so the post-match summary and the
[`replay-audit-pipeline.md`](./replay-audit-pipeline.md) can
distinguish manual vs. auto turns.

---

## 3. Pack-level override

The default thresholds live in
[`src/net/lockstep/turn-timer.ts`](../../src/net/lockstep/turn-timer.ts).
They may be overridden per scenario via the manifest field:

```jsonc
{
  "multiplayer": {
    "turnTimerMs": {
      "waitingThreshold": 30000,
      "stallLimit": 90000
    }
  }
}
```

Bounds enforced by
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json):
`waitingThreshold` ≥ 5 000, `stallLimit` ≥ `waitingThreshold + 5 000`,
`stallLimit` ≤ 600 000. Ranked play pins to the defaults; friendly
matches may use any value in range.

---

## 4. Interaction with disconnection forfeit

This timer is for **connected-but-idle** peers. The disconnection
forfeit timer (120 s by default per
[`06-reconnection-log-range-request-plus-replay.md`](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md))
runs independently and triggers only when the DataChannel goes
into `disconnected` or `failed` state.

If both timers fire (disconnected and stalled), the
disconnection-forfeit path takes precedence because it requires no
in-band command exchange.

---

## 5. Telemetry

| Event | When |
| --- | --- |
| `TURN_TIMER_WAITING` | Turn start. |
| `TURN_TIMER_STALLED` | At `WAITING_THRESHOLD_MS` of inactivity. |
| `TURN_TIMER_AUTO_END_DAY` | At `STALL_LIMIT_MS`; immediately before emitting the canonical envelope. |

All three events are subject to the privacy redaction rules in
[`observability.md`](./observability.md). No raw peer identity is
logged; the `peerId` is hashed to the same `/24` IPv4 / `/64` IPv6
bucket as TLS observability per
[`tls-observability.md`](./tls-observability.md).
