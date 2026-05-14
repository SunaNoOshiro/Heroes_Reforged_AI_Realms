# Turn Timer & Stall Detection

Canonical doctrine for the per-peer turn timer that closes the
**connected-but-idle** griefing gap left open by the
disconnect-forfeit timer in
[`06-reconnection-log-range-request-plus-replay.md`](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md)
(which fires only when the DataChannel itself goes down).

Owning task:
[`tasks/phase-3/01-multiplayer/11-turn-timer-and-stall-detection.md`](../../tasks/phase-3/01-multiplayer/11-turn-timer-and-stall-detection.md).

Companion docs:
[`security-model.md`](./security-model.md),
[`lockstep-envelope.md`](./lockstep-envelope.md),
[`command-schema.md`](./command-schema.md),
[`replay-audit-pipeline.md`](./replay-audit-pipeline.md),
[`observability.md`](./observability.md).

Schema:
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
(`multiplayer.turnTimerMs` extension; see § 3 and ⚠ Issues).

---

## 1. Three escalation states

| State | Trigger | Surface |
| --- | --- | --- |
| `WAITING` | turn start (`t = 0`) | `OpponentTurnIndicator` (screen 77) shows neutral spinner. |
| `STALLED` | `WAITING_THRESHOLD_MS = 30_000` of inactivity | Indicator turns amber with copy "Opponent is taking longer than usual." |
| `AUTO_END_DAY` | `STALL_LIMIT_MS = 90_000` of inactivity | Both peers independently emit a canonical `END_DAY { source: 'auto-timeout' }` envelope; indicator shows "Day auto-ended." |

`WAITING_THRESHOLD_MS` and `STALL_LIMIT_MS` are configurable per
scenario via the manifest field `multiplayer.turnTimerMs` (§ 3).
Defaults are 30 s / 90 s for ranked play; friendly matches may
override within bounds.

The `OpponentTurnIndicator` component, its state-binding
`selectors.net.lockstep.opponentTurnState`, and the `waiting →
stalled → auto-ended` transition are owned by screen 77 — see
[`wiki/screens/77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md)
and
[`interactions.md`](./wiki/screens/77-multiplayer-game/interactions.md).

---

## 2. Why the auto-`END_DAY` is canonical

`src/net/lockstep/turn-timer.ts` reads `performance.now()` on the
**transport / UI** path, not on the deterministic engine path. The
wall-clock delta only decides *when* a peer emits the auto-`END_DAY`
envelope; the envelope itself is a normal canonical command. It
goes through the
[`lockstep-envelope.md`](./lockstep-envelope.md) wrap + MAC
pipeline, gets a `seq`, and applies through the canonical reducer
on both peers in the same intra-turn order pinned by
[`03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md).

Determinism holds because:

1. Both peers run the same `STALL_LIMIT_MS` rule against their own
   wall clocks. Skewed clocks may make one peer emit slightly
   earlier, but **either peer's auto-`END_DAY` is canonical** — the
   first one received satisfies the turn-end gate, and the reducer
   accepts it once.
2. If peer A emits `END_DAY { source: 'auto-timeout' }` and peer B
   emits `END_DAY { source: 'manual' }` at nearly the same instant,
   the canonical intra-turn order (`(turn, playerId, seq)`
   lexicographic) decides which one applies first. Both peers
   compute the same order; both reducers apply the same command
   first; the second is dropped per Task 03's sequence rules.

The `source` discriminator (`'manual' | 'auto-timeout'`) is
canonical gameplay metadata so the post-match summary and the
[`replay-audit-pipeline.md`](./replay-audit-pipeline.md) can
distinguish manual vs. auto turns. Its declaration belongs on the
`END_DAY` payload in
[`command-schema.md`](./command-schema.md) and
[`command.schema.json`](../../content-schema/schemas/command.schema.json);
see ⚠ Issues.

---

## 3. Pack-level override

Defaults live in
[`src/net/lockstep/turn-timer.ts`](../../src/net/lockstep/turn-timer.ts)
(`TURN_TIMER_DEFAULTS = { WAITING_THRESHOLD_MS: 30_000, STALL_LIMIT_MS: 90_000 }`).
A scenario pack may override them via the manifest field:

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

Bounds (enforced by
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)):

- `waitingThreshold ≥ 5_000`
- `stallLimit ≥ waitingThreshold + 5_000`
- `stallLimit ≤ 600_000`

Ranked play pins the defaults; friendly matches may use any value
in range. The `multiplayer.turnTimerMs` block is the schema
extension owned by Task 11; until that task lands, the schema does
not yet declare the field — see ⚠ Issues.

---

## 4. Interaction with disconnection forfeit

This timer fires only while peers are **connected-but-idle**. The
disconnection-forfeit timer (120 s by default per
[`06-reconnection-log-range-request-plus-replay.md`](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md))
runs independently and triggers only when the DataChannel enters
`disconnected` or `failed` state.

If both timers fire (peer is both disconnected and stalled), the
disconnection-forfeit path takes precedence — it requires no
in-band command exchange.

---

## 5. Telemetry

The timer emits three events through the
[`observability.md`](./observability.md) sink:

| Event | When |
| --- | --- |
| `TURN_TIMER_WAITING` | At turn start. |
| `TURN_TIMER_STALLED` | At `WAITING_THRESHOLD_MS` of inactivity. |
| `TURN_TIMER_AUTO_END_DAY` | At `STALL_LIMIT_MS`, immediately before emitting the canonical envelope. |

The same three labels are listed by screen 77 in
[`data-contracts.md`](./wiki/screens/77-multiplayer-game/data-contracts.md)
under
[`telemetry-event.schema.json`](../../content-schema/schemas/telemetry-event.schema.json).
Privacy redaction is governed by
[`observability.md` § 5](./observability.md#5-privacy--redaction):
no IP addresses, no WebRTC peer IDs, no display names, no
free-form text; the redactor runs before any payload reaches the
wire.

---

## 🔍 Sync Check

- **UI: ✔** — `OpponentTurnIndicator`, the three state transitions (`waiting → stalled → auto-ended`), and the copy strings ("Opponent is taking longer than usual.", "Day auto-ended.") match [`wiki/screens/77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md) and [`interactions.md`](./wiki/screens/77-multiplayer-game/interactions.md). Threshold bindings (`waitingThresholdMs`, `stallLimitMs`) match.
- **Schema: ❌** — Two structural gaps that this doc names but the registered schemas do not yet carry: (i) [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json) has no `multiplayer` property, so `multiplayer.turnTimerMs` and its bounds are not enforced anywhere; (ii) [`command.schema.json`](../../content-schema/schemas/command.schema.json) defines `END_DAY` with `kind` + `metadata` only, no `source` discriminator, and [`command-schema.md` § END_DAY](./command-schema.md#end_day) likewise omits it. Detail in ⚠ Issues. The owning task lists both extensions as Outputs, so the gap is planned, not abandoned.
- **Tasks: ✔** — Owning task [`phase-3.01-multiplayer.11-turn-timer-and-stall-detection`](../../tasks/phase-3/01-multiplayer/11-turn-timer-and-stall-detection.md) Read-First's this doc; its Acceptance Criteria cover all three escalation states, the canonical envelope path, the manifest override, and the screen-77 indicator transition. [`security-model.md` § 1](./security-model.md) lists this doc as the mitigation for the "Stalling / connected-but-idle peer" threat. The stub at `src/net/lockstep/turn-timer.ts` exports `TURN_TIMER_DEFAULTS` and `TurnTimerState` matching the values pinned here.

## ⚠ Issues

- **`manifest.schema.json` does not declare `multiplayer.turnTimerMs`.** § 3 of this doc names the field, the bounds (`waitingThreshold ≥ 5_000`, `stallLimit ≥ waitingThreshold + 5_000`, `stallLimit ≤ 600_000`), and asserts the manifest schema enforces them. The schema currently has no `multiplayer` property at all (`additionalProperties: false` on the root would in fact reject the shape on the wire). Per CLAUDE.md root contract ("Schema evolution is additive-first"), the owning task `phase-3.01-multiplayer.11-turn-timer-and-stall-detection` (which already lists "Manifest schema extension: `multiplayer.turnTimerMs`" under Outputs) must add the property, regenerate `enums.snapshot.json` and `src/contracts/`, and add a row to [`schema-matrix.md`](./schema-matrix.md) if the new sub-shape warrants one. Skill did not edit the schema (Hard Prohibition D — never edit cross-checked files).
- **`END_DAY` `source` discriminator is not declared in the canonical sources.** §§ 1–2 of this doc treat `source: 'manual' | 'auto-timeout'` as canonical gameplay metadata distinguishing player-driven from auto-timeout day ends. [`command-schema.md` § END_DAY](./command-schema.md#end_day) and [`command.schema.json#/$defs/endDay`](../../content-schema/schemas/command.schema.json) both define `END_DAY` with only `{ kind, metadata }`. Owner: same task (Task 11), or a paired schema task; the field must land in `command.schema.json`, the doc section in `command-schema.md`, and the `enums.snapshot.json` regen before any reducer can branch on it. Suggested values: `source: { type: "string", enum: ["manual", "auto-timeout"] }`, required on the payload. Skill did not edit `command-schema.md` or `command.schema.json` (Hard Prohibition D).
- **Telemetry `kind` strings drift from the dotted-domain pattern.** [`telemetry-event.schema.json`](../../content-schema/schemas/telemetry-event.schema.json) constrains `kind` to `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$` (e.g. `desync.detected`, `pack.load.failed`), but this doc and [`screen 77 data-contracts.md`](./wiki/screens/77-multiplayer-game/data-contracts.md) list `TURN_TIMER_WAITING`, `TURN_TIMER_STALLED`, `TURN_TIMER_AUTO_END_DAY` (uppercase + underscores). The same shared drift covers `LOCKSTEP_*`, `BISECT_*`, and `BUILD_ATTESTATION_*` labels in sibling docs, so unilaterally rewriting only this file would split the canonical list. Owner: [`phase-2.11-observability.02-required-emissions-catalogue`](../../tasks/phase-2/11-observability/02-required-emissions-catalogue.md) (the catalogue authority) should pin a translation pass for all M5 telemetry labels. Suggested values: `multiplayer.turn_timer.waiting`, `multiplayer.turn_timer.stalled`, `multiplayer.turn_timer.auto_end_day`. Skill kept the labels as-is to match sibling docs (Hard Prohibition A — never change meaning unilaterally).
- **Privacy claim corrected (Option A fix).** Prior text asserted that the timer's telemetry hashes `peerId` to the same `/24` IPv4 / `/64` IPv6 bucket as TLS observability per [`tls-observability.md`](./tls-observability.md). That reference was incorrect on two counts: (a) `tls-observability.md` § 4 says `peerId` is **not known at the TLS layer** and "MUST NOT appear even if a handshake leaks them"; (b) the `/24` / `/64` bucketing applies to **IP addresses** at the TLS layer, not to peer IDs. The actual privacy contract for telemetry (no peer IDs, no IPs, no display names) lives in [`observability.md` § 5](./observability.md#5-privacy--redaction); this doc now points there. The substantive rule ("no raw peer identity is logged") survives unchanged.
