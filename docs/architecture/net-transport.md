# Net Transport Contract

The `NetTransport` interface is the single shape both the production
WebRTC datachannel transport and the deterministic test transport
(`NetSim`) must satisfy. Pinning it here means the multiplayer stack
can be exercised against adversarial network conditions without
spinning up real peers, and the production transport can swap in
without rewriting any caller.

NetSim itself is owned by
[`tasks/phase-3/01-multiplayer/12-network-chaos-harness.md`](../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md).
Real WebRTC ownership stays with
[`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md).

## Interface

```typescript
interface NetTransport {
  send(message: NetMessage): void;
  onMessage(handler: (message: NetMessage) => void): Unsubscribe;
  onState(handler: (state: NetTransportState) => void): Unsubscribe;
  close(reason: NetCloseReason): void;
  readonly state: NetTransportState;
  readonly peerId: PeerId;
}

type NetTransportState =
  | "connecting"
  | "open"
  | "partitioned"
  | "closed";

type NetCloseReason =
  | "local"
  | "remote"
  | "timeout"
  | "fatal";
```

`NetMessage` is the lockstep payload union pinned in
[`tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md).
The transport does **not** interpret the payload; it ships bytes.

## Hard Rules

- **No buffering of state inside the transport.** The transport is a
  pipe. State (sequence numbers, dedupe sets, lockstep gating) lives
  in `src/net/webrtc/lockstep.ts`.
- **`send()` is fire-and-forget.** No promise return; success is
  observed by the receiver via `onMessage` on the other peer. The
  caller treats `send()` as best-effort; reliability comes from the
  reconnect + log-range protocol, not from the transport.
- **`onMessage` callbacks run on the receiver's task queue.** They
  are not synchronous with `send` on the other side. NetSim simulates
  the same asynchrony deterministically by buffering messages and
  draining them through a seeded scheduler.
- **`close(reason)` is terminal.** A closed transport never reopens.
  Reconnection creates a new transport; the lockstep layer rebinds.
- **State transitions are monotonic.** `connecting → open → closed`
  is the happy path. `open → partitioned → open` is allowed for
  transient network blips; `partitioned → closed` is allowed for
  permanent failures. No other transition is legal.

## Why NetSim

Real WebRTC datachannels surface non-determinism at every layer
(NAT traversal, ICE candidate selection, OS scheduling, browser
versioning). For the chaos test matrix to be meaningful, the
adversarial conditions must be reproducible by `(seed, scenario)`.
NetSim is a PCG32-seeded in-memory transport that satisfies the
same `NetTransport` shape but injects loss / latency / jitter /
reorder / partition behaviors deterministically. Two consecutive
chaos runs with the same seed produce the same trace.

NetSim is **only** consumed by tests. Production code never imports
it; the architecture validation rule ensures `src/net/webrtc/**`
imports never resolve to `src/net/__tests__/**`.

## Chaos Test Coverage

The four adversarial scenarios required by the chaos task:

| Scenario | What it exercises | Owner task |
|---|---|---|
| Lockstep under loss + jitter | command sequencing, dedupe set | [Task 3](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) |
| Bisect under reorder | hash mismatch detection + bisect search | [Task 5](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md) |
| Reconnect under transient partition | log-range request + replay catch-up | [Task 6](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md) |
| Host migration under permanent partition | heartbeat election + new-host log broadcast | [Task 7](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md) |

The chaos task adds the harness (NetSim + four scenario tests). The
four consumer tasks above add a single acceptance line each that
requires passing their scenario; they consume NetSim, they do not own
it.

## Relationship To Task 11 (Chaos Test Matrix)

The existing
[`tasks/phase-3/01-multiplayer/11-network-chaos-test-matrix.md`](../../tasks/phase-3/01-multiplayer/11-network-chaos-test-matrix.md)
runs an integration-level chaos plan against two real headless
browsers under Playwright with a Node-side chaos shim. It is a
**nightly** job; it tests the full stack including TURN fallback and
signaling restart.

The NetSim layer pinned here is **per-PR**: it's a unit-level harness
that runs against the lockstep / bisect / reconnect / host-migration
modules in isolation, in milliseconds, with no browser or signaling
server. The two layers are complementary — Task 11 catches stack-
level regressions, NetSim catches module-level regressions.

Both layers exercise the same four behavioral concerns; they
disagree on cost and granularity.
