# Signaling Message Schema

This file is the canonical contract for **every payload that
crosses the M5 signaling WebSocket**. The signaling-server message
router never inspects raw frames — every inbound and outbound
payload is validated against
[`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
at the boundary. Frames that fail validation never reach the
in-memory `room → peer` map.

The owning task is
[`tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md).
The full payload allowlist (which message kinds may travel at all)
remains the property of
[`signaling-payload-policy.md`](./signaling-payload-policy.md);
this doc adds the **wire-shape** layer beneath it.

---

## 1. Discriminator

`signaling-message.schema.json` is a closed discriminated union
keyed by `type`. The closed enum value list is:

```
JOIN_HANDSHAKE   JOIN_REJECTED   JOIN_ATTEMPT_REJECTED
CREATE_ROOM      CLOSE_ROOM      ROOM_EXPIRED      ROOM_CLOSED
JOIN_ROOM        OFFER           ANSWER            ICE_CANDIDATE
PEER_PENDING     APPROVE_PEER    REJECT_PEER       PEER_REJECTED
KICK_PEER        PEER_KICKED     PEER_CONNECTED    PEER_DISCONNECTED
RATE_LIMITED     ROOM_FULL       CHALLENGE         CHALLENGE_RESPONSE
HOST_CHANGED     TURN_CREDENTIALS REQUEST_TURN_REFRESH
ERROR
```

Adding a value is an enum-lifecycle bump per
[`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md). The
`signaling-payload-policy.md` allowlist must change in the same
commit; the CI gate
`npm run validate:signaling-payload-policy` (deferred to the owning
task) cross-checks the two lists.

The relationship to
[`signaling-envelope.schema.json`](../../content-schema/schemas/signaling-envelope.schema.json):
the **envelope** carries authentication (`signerId`, `sig`,
`nonce`, `iat`, `sessionTokenHash`) for every frame **after**
`JOIN_HANDSHAKE`; the **message** is the inner shape. A signaling
frame on the wire is therefore one of:

- `JOIN_HANDSHAKE` raw (no envelope; pre-handshake)
- envelope-wrapped `{ payloadType, payload }` where `payload` is
  one of the `signaling-message.schema.json` variants

The router validates the envelope first (shape + freshness — see
[`signaling-envelope.md`](./signaling-envelope.md)), then validates
`payload` against the message schema, then dispatches.

## 2. `additionalProperties: false`

Every variant in `signaling-message.schema.json` sets
`additionalProperties: false`. There is no per-variant escape
hatch for "extra debug fields". A naïve implementer adding a
`debug` key fails CI before the first test runs.

The rule exists because the in-memory `room → peer` map is keyed
on `roomId` and `peerId`; a free-form schema lets a crafted
`OFFER` carry a `roomId` field with a 1 MiB string and use it as a
map key, compounding the SDP / ICE injection risk in
[`signaling-payload-policy.md` § 3](./signaling-payload-policy.md#3-lint-enforcement).

## 3. Length Caps

| Field | Variant | Cap | Reason |
| --- | --- | --- | --- |
| `roomId` | every variant carrying it | `^[A-Z0-9]{8}$` | Crockford-Base32 per [`lobby-identifiers.md`](./lobby-identifiers.md). |
| `peerId` | every variant carrying it | UUID v4 (`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`) | Per `peer-identity.schema.json`. |
| `secret` | `JOIN_HANDSHAKE` | base64url, 22 chars | 16-byte room secret per `multiplayer-security.md`. |
| `sdp` | `OFFER` / `ANSWER` | max 16 KiB UTF-8 | RFC-typical SDP fits in ≤ 4 KiB; 16 KiB is a 4× headroom that still fits in the 64-KiB frame cap. |
| `candidate` | `ICE_CANDIDATE` | max 1 KiB UTF-8 | A single `a=candidate:` line is < 200 bytes; 1 KiB blocks an injection that hides extra lines after the first. |
| `iceCandidates[]` | `OFFER` / `ANSWER` | max 32 entries | Bounds the bundled-trickle ICE list. |
| `iceCandidates[]` cumulative | per session | max 64 | After the bundled count, additional `ICE_CANDIDATE` frames are throttled. |
| `reason` | every error variant | enum, max 32 chars | Prevents a malformed reason string from leaking through to log redactor. |
| `nonce` | `CHALLENGE` / `CHALLENGE_RESPONSE` | base64url, 22 chars | 16-byte CSPRNG. |
| `displayNameDraft` | never | — | Display names never traverse the signaling server per [`signaling-payload-policy.md` § 2](./signaling-payload-policy.md#2-denylist-never-traverses-signaling). |

A frame that exceeds the **whole-message** size cap of **64 KiB**
is dropped at the WebSocket layer (see § 5 below) before the
schema is invoked.

## 4. Rejection Behavior

When a frame fails validation:

1. The server replies with a single `RATE_LIMITED` /
   `JOIN_REJECTED` / `ERROR` envelope per the cause table below
   **without echoing the offending payload**.
2. The server increments the per-`(IP-prefix, action)` counter
   that drives
   [`signaling-edge-defense.md`](./signaling-edge-defense.md)'s
   blocklist auto-add.
3. The server closes the WebSocket with code `1008` (Policy
   Violation) and reason `"signaling-validation"`.
4. The audit log writes one
   `signaling.payload.rejected { ipPrefix, kind?: variant, reasonCode }`
   entry per
   [`signaling-audit-log.md`](./signaling-audit-log.md). The full
   payload is **never** logged.

Cause table (closed enum):

| `reasonCode` | Trigger |
| --- | --- |
| `unknown_type` | `type` discriminator not in the closed enum |
| `additional_property` | `additionalProperties: false` violation |
| `length_exceeded` | a `*` length-cap row above is exceeded |
| `bad_room_id` | `roomId` pattern mismatch |
| `bad_peer_id` | `peerId` pattern mismatch |
| `bad_signature_shape` | envelope-level shape failure (sig length / nonce length / iat range) |
| `binary_frame` | binary frame received on a text-only protocol |

## 5. Frame and Liveness Hardening

The schema gate is paired with WebSocket-layer pins committed in
the signaling server's `config.ts`:

| Constant | Value | Rationale |
| --- | --- | --- |
| `MAX_PAYLOAD_BYTES` | `64 * 1024` (64 KiB) | Single-frame cap; oversize → `close(1009, "Message Too Big")`. |
| `PING_INTERVAL_MS` | `25_000` | Application-level pings; missed pong ⇒ `terminate()`. |
| `PING_TIMEOUT_MS` | `30_000` | Idle-disconnect floor. |
| `UPGRADE_DEADLINE_MS` | `10_000` | Maximum time from TCP accept to completed WebSocket upgrade. |
| `FRAME_DEADLINE_MS` | `5_000` | Maximum time between first and final frame of a fragmented message. |
| `BINARY_FRAMES_REJECTED` | `true` | Text-only protocol; binary frames close with `1003`. |

These constants are part of the **stateless** signaling server
contract per
[`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md);
the per-frame timer state is in-memory and per-connection, never
persisted.

## 6. Validator Wiring

The compiled validator lives at
`services/signaling/src/validation/ajv.ts` (owned by the schema +
validation task). Properties:

- AJV `strict: true`, `allErrors: false` (one-shot rejection;
  fewer cycles per malformed frame).
- All variants preloaded at startup; no dynamic schema fetch.
- Exported entry point is **the only path** from raw string to
  message router:
  `validateSignalingMessage(raw): { ok: true; msg: SignalingMessage } | { ok: false; reason: ReasonCode }`.
- The router's static analysis CI gate (deferred to the owning
  task) greps every public message handler for the call site and
  fails on any handler that consumes `raw` directly.

## 7. Examples

Canonical fixtures live under
[`content-schema/examples/signaling-message/`](../../content-schema/examples/signaling-message/).
At least one example exists per `type` so the validator's
discriminator path is exercised by `npm run validate:contracts`.

## 8. Cross-References

- Allow / deny list of which kinds may travel: [`signaling-payload-policy.md`](./signaling-payload-policy.md).
- Wire-envelope authentication: [`signaling-envelope.md`](./signaling-envelope.md).
- Throttle thresholds and exhaustion replies: [`signaling-rate-limits.md`](./signaling-rate-limits.md).
- Edge-tier prefix caps and blocklist: [`signaling-edge-defense.md`](./signaling-edge-defense.md).
- Stateless-by-design audit clause: [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md).
- Audit-log redaction: [`signaling-audit-log.md`](./signaling-audit-log.md).
