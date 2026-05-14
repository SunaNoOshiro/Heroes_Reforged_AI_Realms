# Lobby Identifiers

Canonical contract for the **room code** that the
[signaling server](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
mints, the invite-link surface
([screen 62](./wiki/screens/62-multiplayer-setup/spec.md)) carries,
and the [network lobby](./wiki/screens/64-network-lobby/spec.md)
displays. Owns alphabet, length, RNG mandate, collision policy,
reuse cool-down, and TTL bounds.

Companion docs:
- [`multiplayer-security.md` § Room Secret + Handshake](./multiplayer-security.md#room-secret--handshake)
  — owns the 16-byte URL-fragment **secret**; this doc owns only the
  human-visible code.
- [`signaling-rate-limits.md`](./signaling-rate-limits.md) — per-IP /
  per-code / global token buckets keyed on the canonical code form.
- [`signaling-payload-policy.md`](./signaling-payload-policy.md) —
  signaling-server allow / deny list for protocol payloads.
- [`signaling-message-schema.md`](./signaling-message-schema.md) —
  wire-level `RoomId` regex (mirrors this doc's alphabet).
- [`signaling-audit-log.md`](./signaling-audit-log.md) — log lines
  emitted on mint / allocate / expire.
- [`peer-identity.md`](./peer-identity.md) — Ed25519 keypair that
  authenticates `JOIN_ROOM` against the room code.
- [`ice-disclosure-policy.md`](./ice-disclosure-policy.md) —
  pre-consent vs. post-consent ICE candidate matrix.

Schemas:
[`room-code.schema.json`](../../content-schema/schemas/room-code.schema.json),
[`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
(`RoomId` `$def`).

---

## 1. Alphabet

Crockford Base32 minus `0`, `1`, `I`, `L`, `O`, `U` — **30 symbols**:

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

Comfortably above the ≤ 100-active-rooms cap multiplied by the
rate-limit budget in
[`signaling-rate-limits.md`](./signaling-rate-limits.md), so a
brute-force scan against the active subset is non-trivial.

## 3. Case rule

- Codes are generated **upper-case**.
- Inbound `JOIN_ROOM` codes are NFC-normalized, then upper-cased,
  before lookup. Lower-case input from a user-typed field MUST still
  match.
- The canonical on-disk form (logs, telemetry, audit trail) is the
  upper-case form.

## 4. RNG mandate

**CSPRNG only.** Server-side: `crypto.randomBytes(...)` (Node).
Clients echo the server's code; clients never mint codes.

The deterministic engine RNG (PCG32) is **forbidden** in
`services/signaling/`. The carve-out is pinned in
[`determinism.md` § Forbidden In Deterministic Paths](./determinism.md#forbidden-in-deterministic-paths)
(see also
[§ Signaling and lobby identifiers — CSPRNG mandate](./determinism.md#signaling-and-lobby-identifiers--csprng-mandate)).
A linter rule under `services/signaling/` rejects imports of
`src/engine/rng/*` and any seeded PRNG.

The 8-character code is drawn rejection-sampled from
`crypto.randomBytes(...)`: read 5 bytes (≥ 40 bits), peel off
8 base-30 digits using rejection of indices ≥
`30 * floor(256 / 30)` to keep the output uniform.

## 5. Collision policy

- On `CREATE_ROOM`, the server generates a candidate code and checks
  the in-memory active-room table.
- On collision, regenerate. **Maximum 5 retries.**
- After 5 retries the server replies with the structured error code
  `room.code.allocation_exhausted` (`HTTP 503`) and emits a
  `signaling.room.allocation_exhausted` log line per
  [`signaling-audit-log.md`](./signaling-audit-log.md).

## 6. Reuse policy (cool-down)

A code that becomes free (last peer left, or the host issued
`CLOSE_ROOM`) enters a **10-minute cool-down** before reuse. The
cool-down table is in-memory and indexed by the canonical
upper-case code form.

The cool-down closes two risks:
- **Stale-rebind** — an old invite link reaches a fresh room with
  the same code.
- **Reuse** — the next host inherits the previous host's attackers.

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
[`determinism.md` § Wall-clock readers](./determinism.md#wall-clock-readers).

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

---

## 🔍 Sync Check

- **UI: ✔** — Invite-URL shape on
  [`screens/62-multiplayer-setup/spec.md`](./wiki/screens/62-multiplayer-setup/spec.md)
  and the `Close room` row on
  [`screens/64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md)
  match this doc's code form, cool-down, and `ROOM_CLOSED` reason.
- **Schema: ⚠** — [`room-code.schema.json`](../../content-schema/schemas/room-code.schema.json)
  and the `RoomId` `$def` in
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  both pin `^[A-Z0-9]{8}$`. That regex is **wider** than this doc's
  30-symbol alphabet (it admits `0`, `1`, `I`, `L`, `O`, `U`). Wire
  validation accepts; lookup against the in-memory table will miss.
  See `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`phase-3.01-multiplayer.01-signaling-server-…`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  reads this doc First and restates the alphabet / length / collision
  / cool-down / TTL contract verbatim in its Acceptance Criteria.
  `screen-command-coverage.json` and `task-command-token-coverage.json`
  attribute `CLOSE_ROOM` / `ROOM_EXPIRED` / `ROOM_CLOSED` to that
  task and reference this doc § 7.

## ⚠ Issues

- **Stale code description in `multiplayer-security.md`.**
  [`multiplayer-security.md` § Room Secret + Handshake](./multiplayer-security.md#room-secret--handshake)
  introduces room codes as `6-character alphanumeric, ~2 billion
  keyspace`. The contract here is 8-character Crockford-Base32 over
  30 symbols (≈ 39.24 bits, 6.56 × 10¹¹ keyspace). The sibling-doc
  prose is purely descriptive, not load-bearing on any other rule,
  but it disagrees with this canonical doc and with the schemas.
  Per CLAUDE.md "no duplicated logic", the next edit to that doc
  should demote that paragraph to a one-line reference back to
  this file. Skill did not edit a sibling file (Hard Prohibition D).
- **`RoomId` regex broader than the alphabet.**
  [`room-code.schema.json`](../../content-schema/schemas/room-code.schema.json)
  and the `RoomId` `$def` in
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  use `^[A-Z0-9]{8}$`, which admits `0`, `1`, `I`, `L`, `O`, `U` —
  symbols this doc explicitly excludes. A crafted `JOIN_ROOM` with
  e.g. `00000000` passes wire validation, then fails active-room
  lookup. Not CI-blocking (lookup catches it; per-code rate-limit
  buckets bound abuse), but the schema row should narrow to
  `^[2-9A-HJ-NP-TV-Z]{8}$` to make the alphabet authoritative end
  to end. Suggested owner: the schema-owning task
  [`phase-3.01-multiplayer.31-signaling-message-schema-and-validation`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md)
  for `signaling-message.schema.json`; `room-code.schema.json` is
  unowned by a current task and would need a follow-up entry.
  Skill did not edit either schema (Hard Prohibition D).
