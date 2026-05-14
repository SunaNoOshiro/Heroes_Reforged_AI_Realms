# Net Transport Contract

`NetTransport` is the single interface satisfied by both the
production WebRTC datachannel transport and the deterministic test
transport `NetSim`. Pinning the shape here lets the multiplayer
stack be exercised against adversarial conditions without spinning
up real peers, and lets the production transport swap in without
rewriting any caller.

Ownership:

- Interface + NetSim:
  [`tasks/phase-3/01-multiplayer/12-network-chaos-harness.md`](../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md).
- Real WebRTC implementation:
  [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md).

## 1. Interface

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
The transport ships bytes; it does not interpret the payload.

## 2. Hard Rules

- **The transport carries no state.** Sequence numbers, dedupe
  sets, and lockstep gating live in `src/net/webrtc/lockstep.ts`,
  not inside any `NetTransport` implementation.
- **`send()` is fire-and-forget.** No promise return; success is
  observed by the receiver via `onMessage` on the other peer.
  Reliability comes from the reconnect + log-range protocol
  ([Task 6](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md)),
  not from this layer.
- **`onMessage` callbacks are asynchronous.** They run on the
  receiver's task queue, not synchronously with the remote `send`.
  NetSim reproduces the same asynchrony by buffering messages and
  draining them through a seeded scheduler.
- **`close(reason)` is terminal.** A closed transport never
  reopens. Reconnection creates a new transport; the lockstep
  layer rebinds.
- **State transitions are monotonic.** Legal edges only:
  - `connecting → open → closed` — happy path.
  - `open → partitioned → open` — transient network blip.
  - `partitioned → closed` — permanent failure.

  Any other transition is illegal.

## 3. Why NetSim

Real WebRTC datachannels are non-deterministic at every layer (NAT
traversal, ICE candidate selection, OS scheduling, browser
versioning). For the chaos test matrix to be meaningful, adversarial
conditions must be reproducible by `(seed, scenario)` alone.

NetSim is a PCG32-seeded in-memory transport that satisfies the same
`NetTransport` shape but injects loss, latency, jitter, reorder, and
partition behaviors deterministically. Two consecutive chaos runs
with the same seed produce the same message trace — the property
that
[`determinism.md` § Golden-State Regression](./determinism.md#golden-state-regression)
relies on.

NetSim is **test-only**. Production code never imports it; the
boundary rule is `src/net/webrtc/**` MUST NOT resolve to
`src/net/__tests__/**`.

## 4. Chaos Test Coverage

[Task 12](../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md)
ships NetSim plus the four adversarial scenarios below. Each
consumer task carries a single acceptance line requiring its
scenario to pass; those tasks consume NetSim, they do not own it.

| Scenario | What it exercises | Owner task |
|---|---|---|
| Lockstep under loss + jitter | command sequencing, dedupe set | [Task 3](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) |
| Bisect under reorder | hash mismatch detection + bisect search | [Task 5](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md) |
| Reconnect under transient partition | log-range request + replay catch-up | [Task 6](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md) |
| Host migration under permanent partition | heartbeat election + new-host log broadcast | [Task 7](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md) |

## 5. Relationship to Task 11 (Chaos Test Matrix)

Two chaos layers run in parallel; both ship and both exercise the
same four behavioral concerns. They disagree on cost and
granularity.

| Layer | Owner | Scope | Cadence |
|---|---|---|---|
| Module-level | This file's NetSim, driven by [Task 12](../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md) | lockstep, bisect, reconnect, host-migration in isolation; no browser, no signaling server | per-PR, milliseconds |
| Stack-level | [Task 11](../../tasks/phase-3/01-multiplayer/11-network-chaos-test-matrix.md) | full stack including TURN fallback and signaling restart; two real headless browsers under Playwright with a Node-side chaos shim | nightly job |

NetSim catches module-level regressions; Task 11 catches stack-level
regressions.

---

## 🔍 Sync Check

- **UI: ✔** — File pins no UI surface; nothing to compare against.
- **Schema: ❌** — [`src/contracts/net-transport.ts`](../../src/contracts/net-transport.ts) diverges from the canonical interface in § 1 (different method signatures, missing `NetTransportState` / `NetCloseReason` / `Unsubscribe` / `PeerId` types, concrete `NetMessage` shape rather than the lockstep payload union). The TS file's own header marks the doc as canonical; the TS contract is therefore stale. CI-blocking before Task 12 ships. See Issues.
- **Tasks: ⚠** — Doc is owned by [Task 12](../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md); referenced by Tasks [3](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md), [5](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md), [6](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md), [7](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md), [11](../../tasks/phase-3/01-multiplayer/11-network-chaos-test-matrix.md), and [`side-effect-matrix.md`](./side-effect-matrix.md) `src/net/` row. [Task 2](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md), the production-transport owner, does **not** list this doc in its Read First (see Issues).

## ⚠ Issues

- **`src/contracts/net-transport.ts` is out of sync with this doc.** The TS contract exposes `connect(peers): Promise<void>`, positional `send(step, nonce, payload)`, `disconnect(): Promise<void>`, and a concrete `NetMessage = { fromPeerId, step, nonce, payload }`. This doc pins `send(message): void` (single envelope), `close(reason)`, `state` getter, `onState` subscriber, and an opaque `NetMessage` union sourced from Task 3 — none of which exist in the TS file. Per CLAUDE.md (`src/contracts/` is generated or hand-authored interface contracts) and the TS file's own header (`Pinned by docs/architecture/net-transport.md`), the doc is canonical and the TS file must be updated. Owner: [Task 12](../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md). Suggested fix: rewrite `src/contracts/net-transport.ts` to mirror § 1 verbatim, declaring `Unsubscribe = () => void`, `PeerId = string` (or the contracts-wide alias if one lands first), `NetTransportState`, `NetCloseReason`, and re-exporting `NetMessage` from the lockstep envelope module. Skill did not edit `src/contracts/` (Hard Prohibition D).
- **`src/net/webrtc/** ⇏ src/net/__tests__/**` is not enforced.** § 3 claims an architecture-validation rule prevents production code from importing the test transport. [`scripts/check-module-graph.mjs`](../../scripts/check-module-graph.mjs) has no entry for the `__tests__` boundary, and [`module-graph.md`](./module-graph.md) Forbidden Edges does not list it. The rule is aspirational until it lands. Owner: the same owner as `module-graph.md` (`mvp.00-core-architecture.arch-module-graph`) plus [Task 12](../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md). Suggested fix: add the denylist entry `src/net/webrtc/** ⇏ src/net/__tests__/**` (or, more generally, `src/<module>/** ⇏ src/<module>/__tests__/**` outside of test files themselves) to both the script and the Forbidden Edges table before Task 12 ships. Skill did not edit either file (Hard Prohibition D).
- **Task 2 missing this doc in Read First.** This doc names [Task 2](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) as the owner of the real WebRTC implementation that must satisfy `NetTransport`, but Task 2's Read First block lists `determinism.md`, `ice-disclosure-policy.md`, `dtls-fingerprint-pinning.md`, `command-stream-integrity.md`, `signaling-envelope.md`, `match-handshake.md`, and `lockstep-envelope.md` — not `net-transport.md`. Implementers of the production transport may miss the contract they have to satisfy. Owner: Task 2 maintainer. Suggested fix: add a Read First entry for `docs/architecture/net-transport.md` (relative path `../../../docs/architecture/net-transport.md` from Task 2) to Task 2's Read First. Skill did not edit Task 2 (Hard Prohibition D).
- **`csp.md` cites this doc for an origin-collapse rule that lives nowhere.** [`csp.md`](./csp.md) twice claims that `connect-src 'self' wss://signaling.* https://ai-gateway.*` "collapses to concrete origins at build time per `net-transport.md`", but this doc pins no signaling-origin set or build-time collapse rule. Either `csp.md` is pointing to the wrong file or this doc is missing a Signaling Origins section. Non-blocking but creates a documentation loop. Owner: `csp.md` maintainer or M5 multiplayer module. Suggested fix: either add a § 6 Signaling Origins block here that names the two `wss://signaling.*` concrete origins (and the build-time substitution mechanism), or repoint `csp.md` to whichever doc actually owns that information. Skill did not edit `csp.md` (Hard Prohibition D).
