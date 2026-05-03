# Network-Chaos Test Matrix

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Consolidated chaos test plan that exercises the full M5 lockstep,
hash-exchange, snapshot-resync, reconnection, and host-migration
paths against realistic network conditions and failure injections.
Per-task acceptance criteria already cover happy paths; this matrix
turns "we think it works" into a regression net wired into CI as a
nightly job (not per-PR — the matrix is too slow).

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md)
- [`services/multiplayer/turn-config.md`](../../../services/multiplayer/turn-config.md)

Inputs:
- Determinism fuzz harness (`01-engine-core.md` Task 9)
- TURN fallback (Task 10)
- Snapshot-resync (Task 9)
- Lockstep + hash exchange + reconnection + host migration
  (Tasks 3, 4, 6, 7)

Outputs:
- `tests/multiplayer/chaos/` — driver, fixture match, chaos shim,
  per-cell harness scripts.
- `tests/multiplayer/chaos/fixtures/200-turn.replay.json` — recorded
  200-turn match used as the deterministic fixture.
- Nightly GitHub Actions job tagged `multiplayer-chaos`.

Owned Paths:
- `tests/multiplayer/chaos/`

Dependencies:
- phase-3.01-multiplayer.04-per-turn-hash-exchange-plus-desync-detection
- phase-3.01-multiplayer.06-reconnection-log-range-request-plus-replay
- phase-3.01-multiplayer.07-host-migration-heartbeat-election
- phase-3.01-multiplayer.09-snapshot-resync-fallback
- phase-3.01-multiplayer.10-turn-fallback-and-credentials

Acceptance Criteria:

The matrix is the cross-product of the four condition axes plus the
failure-injection axis. Every cell asserts (a) bit-identical final
state on both peers and (b) at most one TURN fallback per match.

| Axis | Values |
| --- | --- |
| Packet loss | 0%, 1%, 5% |
| RTT | 0 ms, 50 ms, 200 ms |
| Jitter | 0 ms, 50 ms |
| NAT type | full-cone, symmetric |
| Failure injection | none, signaling restart mid-match, TURN timeout, simultaneous disconnect, determinism injection (forces snapshot-resync) |

Driver:
- Replays the 200-turn fixture match through the chaos shim against
  two headless browsers (Playwright Chromium).
- Records `dup_command_dropped_total`, `turn_fallback_used`, and
  `desync_recovery_count` per match.
- Pass/fail: bit-identical final state hash; ≤ 1 TURN fallback;
  determinism-injection cells additionally assert snapshot-resync
  recovery (no fall-through to bisect).

Schedule:
- Nightly GitHub Actions job tagged `multiplayer-chaos` (separate
  workflow file from `validate.yml`).
- A path-filtered subset (no NAT axis, no signaling restart) runs on
  PRs touching `src/net/webrtc/**`, `src/engine/**`, `src/rules/**`,
  or `resources/**/pack.*` per the multiplayer-determinism CI gate
  ([`docs/architecture/determinism.md` § Clock Policy](../../../docs/architecture/determinism.md#clock-policy)).

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
