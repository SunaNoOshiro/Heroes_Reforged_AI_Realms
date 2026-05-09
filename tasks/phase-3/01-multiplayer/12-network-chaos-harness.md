# Network-Chaos Harness — NetSim Transport

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Add `src/net/__tests__/netsim.ts` — a deterministic, seedable in-
memory transport that satisfies the same `NetTransport` interface as
the real WebRTC datachannel. Configurable: `lossRate` (per-message
Bernoulli drop), `latencyMs` (constant + jitter via PCG32),
`reorderWindow` (deliver out-of-order within N messages),
`partitionAt(seq)` (drop everything from seq N onward until
`heal()`). Author chaos tests under
`src/net/__tests__/chaos.test.ts` that bind two engine instances
through NetSim and assert lockstep, auto-bisect, reconnection, and
host-migration each survive their respective adversarial scenarios.
Failures are reproducible by `(seed, scenario)`.

This task is the **per-PR** module-level chaos harness. It is
distinct from the existing
[`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md),
which is a **nightly** integration-level matrix that runs against
real headless browsers and the signaling server. The two layers are
complementary; both ship.

Read First:
- [`docs/architecture/net-transport.md`](../../../docs/architecture/net-transport.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- PCG32 implementation
  (`mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams`)
- The lockstep, hash-exchange, bisect, reconnection, and host-
  migration interfaces (Tasks 3, 4, 5, 6, 7); this task exercises
  them but does not author them.

Outputs:
- `docs/architecture/net-transport.md` — defines the `NetTransport`
  interface contract that both real WebRTC and NetSim satisfy.
- `src/net/__tests__/netsim.ts` — deterministic test transport.
- `src/net/__tests__/chaos.test.ts` — four scenarios: lockstep
  under loss + jitter, bisect under reorder, reconnect under
  transient partition, host migration under permanent partition.
- One-line cross-reference under
  `docs/architecture/determinism.md` noting that NetSim is PCG32-
  seeded and reproducible by `(seed, scenario)`.
- "Chaos test contract" section in
  [`tasks/phase-3/01-multiplayer.md`](../01-multiplayer.md)
  listing the four adversarial scenarios required.

Owned Paths:
- `docs/architecture/net-transport.md`
- `src/net/__tests__/netsim.ts`
- `src/net/__tests__/chaos.test.ts`

Owned Paths (shared):
- `docs/architecture/determinism.md` (primary owner:
  `mvp.00-core-architecture`; this task contributes the single-
  sentence NetSim cross-reference only).
- `tasks/phase-3/01-multiplayer.md` (primary owner: the multiplayer
  module; this task contributes the additive "Chaos test contract"
  section only).

Dependencies:
- mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams
- phase-3.01-multiplayer.03-input-only-lockstep-command-serialization-plus-sequencing
- phase-3.01-multiplayer.05-auto-bisect-on-hash-mismatch
- phase-3.01-multiplayer.06-reconnection-log-range-request-plus-replay
- phase-3.01-multiplayer.07-host-migration-heartbeat-election

Acceptance Criteria:
- `NetSim` satisfies the `NetTransport` interface; production code
  must compile against either implementation interchangeably.
- All four chaos scenarios run in < 1 s each; `npm test` invokes
  the chaos test file as part of the standard test pipeline.
- Two consecutive chaos runs with the same seed produce byte-
  identical message traces (the simulation must be deterministic;
  only network timing values vary).
- `partitionAt(seq) → heal()` correctly drops every message from
  the named seq onward until `heal()` is called, and resumes from
  the next seq after.
- Production code (`src/net/webrtc/**`) must not import
  `src/net/__tests__/**`; the architecture validation rule pinned
  in `docs/architecture/module-graph.md` enforces this.
- Shared paths (`docs/architecture/determinism.md`,
  `tasks/phase-3/01-multiplayer.md`) are extended with additive
  scope only. This task must not rewrite existing determinism
  sections or the multiplayer module's task-list; the primary
  owner of each shared path remains as named in Owned Paths
  (shared) above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
