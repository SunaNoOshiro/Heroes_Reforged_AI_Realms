# Lobby Identifiers

> § 2 (Issue: Room-code generation contract is undefined; Issue: No
> room TTL or maximum lifetime).

This file is the single canonical contract for the room-code identifier
that the [signaling server](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
mints, that the invite-link surface
([screen 62](./wiki/screens/62-multiplayer-setup/spec.md)) carries,
and that the [network lobby](./wiki/screens/64-network-lobby/spec.md)
displays.

The room **secret** (16-byte URL-fragment token) is owned by
[`multiplayer-security.md` § Room Secret + Handshake](./multiplayer-security.md#room-secret--handshake);
this doc owns only the room **code** that is shown to humans and
matched on `JOIN_ROOM`.

---

## 1. Alphabet

Crockford Base32 minus the ambiguous characters `0`, `1`, `I`, `L`,
`O`, `U` — yielding **30 symbols**:

```
23456789ABCDEFGHJKMNPQRSTVWXYZ
```

`U` is dropped to avoid accidental obscenities; `0/O` and `1/I/L`
are dropped to avoid OCR / handwriting confusion.

## 2. Length

**8 characters.** Effective entropy:

```
log2(30 ** 8) ≈ 39.24 bits
keyspace      = 30 ** 8 = 656 100 000 000
```

This is comfortably above the ≤100-active-rooms cap multiplied by
the rate-limit budget defined in
[`signaling-rate-limits.md`](./signaling-rate-limits.md), so a
brute-force scan against the active subset is no longer trivial.

## 3. Case rule

- Codes are generated **upper-case**.
- Inbound `JOIN_ROOM` codes are **NFC-normalized**, then
  upper-cased, before lookup. Lower-case input from a user-typed
  field MUST still match.
- The canonical-on-disk form (logs, telemetry, audit trail) is the
  upper-case form.

## 4. RNG mandate

**CSPRNG only.** Server-side: `crypto.randomBytes(...)` (Node).
Client-side echoes the server's code; clients never mint codes.

The deterministic engine RNG (PCG32) is **forbidden** in
`services/signaling/`. The carve-out is pinned in
[`determinism.md` § Forbidden In Deterministic Paths`](./determinism.md#forbidden-in-deterministic-paths).
A linter rule under `services/signaling/` rejects imports of
`src/engine/rng/*` and any seeded PRNG.

The 8-character code is drawn rejection-sampled from
`crypto.randomBytes(...)`: read 5 bytes (≥ 40 bits), peel off
8 base-30 digits using rejection of indices ≥ `30 * floor(256 / 30)`
to keep the output uniform.

## 5. Collision policy

- On `CREATE_ROOM`, the server generates a candidate code and checks
  the in-memory active-room table.
- On collision, regenerate. Maximum **5 retries**.
- After 5 retries the server replies with the structured error code
  `room.code.allocation_exhausted` (`HTTP 503`) and emits a
  `signaling.room.allocation_exhausted` log line per
  [`signaling-audit-log.md`](./signaling-audit-log.md).

## 6. Reuse policy (cool-down)

A code that becomes free (last peer left, or `CLOSE_ROOM` was issued
by the host) enters a **10-minute cool-down** before it is eligible
for reuse. The cool-down table is in-memory and indexed by the
canonical upper-case code form.

The cool-down closes both the **stale-rebind** risk (an old
invite link reaches a fresh room with the same code) and the
**reuse** risk (the next host inherits the previous host's
attackers).

Host-initiated `CLOSE_ROOM` MAY use a 0 s cool-down at the host's
discretion to support the "I picked the wrong room" UX path.

## 7. TTL bounds

| TTL | Trigger | Action |
|---|---|---|
| **Idle TTL** | 30 minutes since the last protocol message in the room | Server emits `ROOM_EXPIRED { reason: "idle" }` to all peers and drops the room. |
| **Max lifetime** | 4 hours wall-clock since `CREATE_ROOM` | Server emits `ROOM_EXPIRED { reason: "max_lifetime" }` and drops the room. |
| **Host-initiated** | `CLOSE_ROOM` by the host peer | Server emits `ROOM_CLOSED { reason: "host_closed" }`, drops the room, and (per § 6) MAY skip the cool-down. |

The TTL sweep loop runs every **60 s** and is wall-clock-driven.
Wall-clock reads on the signaling server are documented in
[`determinism.md` § Wall-clock readers`](./determinism.md#wall-clock-readers).

## 8. Worked example

```
crypto.randomBytes(5) = 0x91 0x3c 0x77 0x2a 0xb8
                       = bits 100100010011110001110111001010101011000

step base-30 indices = 7, 12, 24, 18, 25, 5, 11, 28
mapped via § 1     = 9, F, T, P, V, 7, E, Y
canonical code     = "9FTPV7EY"
```

A regenerated code re-runs § 4 from a fresh `randomBytes` draw; no
deterministic seeding.

## 9. Linked rules

- [`signaling-rate-limits.md`](./signaling-rate-limits.md) — per-code,
  per-IP, and global rate buckets that consume the canonical code form.
- [`signaling-payload-policy.md`](./signaling-payload-policy.md) — the
  signaling server's allow/deny list for protocol payloads.
- [`peer-identity.md`](./peer-identity.md) — Ed25519 keypair that
  authenticates `JOIN_ROOM` against the room code.
- [`ice-disclosure-policy.md`](./ice-disclosure-policy.md) —
  pre-consent vs. post-consent ICE candidate matrix.
- [`signaling-audit-log.md`](./signaling-audit-log.md) — what gets
  logged when codes are minted, allocated, or expired.
