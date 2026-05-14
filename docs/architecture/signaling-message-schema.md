# Signaling Message Schema

Canonical contract for **every payload that crosses the M5 signaling
WebSocket**. The signaling-server message router never inspects raw
frames — every inbound and outbound payload is validated against
[`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
at the boundary. Frames that fail validation never reach the
in-memory `room → peer` map.

Companion docs:

- [`signaling-payload-policy.md`](./signaling-payload-policy.md) —
  allow / deny list of which kinds may travel at all (this doc adds
  the wire-shape layer beneath it).
- [`signaling-envelope.md`](./signaling-envelope.md) — Ed25519-signed
  envelope wrapping every frame after `JOIN_HANDSHAKE`.
- [`signaling-rate-limits.md`](./signaling-rate-limits.md) — token
  buckets and `RATE_LIMITED` reply shape.
- [`signaling-edge-defense.md`](./signaling-edge-defense.md) —
  per-prefix caps, blocklist, and `ERROR { code: "captcha_required" }`.
- [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md)
  — what the signaling server is allowed to remember.
- [`signaling-audit-log.md`](./signaling-audit-log.md) —
  `signaling.payload.rejected` redaction shape.
- [`lobby-identifiers.md`](./lobby-identifiers.md) — `RoomId`
  alphabet and length.
- [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) —
  procedure for adding a `type` value.

Schemas:
[`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json),
[`signaling-envelope.schema.json`](../../content-schema/schemas/signaling-envelope.schema.json).

Owning task:
[`tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md).

---

## 1. Discriminator

`signaling-message.schema.json` is a closed discriminated union
keyed by `type`. Closed enum values:

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
allowlist in
[`signaling-payload-policy.md` § 1](./signaling-payload-policy.md#1-allowlist-signaling-server-payloads)
must change in the same commit; the CI gate
`npm run validate:signaling-payload-policy` (deferred to the owning
task) cross-checks the two lists.

A frame on the wire is one of:

- `JOIN_HANDSHAKE` — raw, **no envelope** (pre-handshake; the peer
  has not yet established its session token).
- envelope-wrapped `{ payloadType, payload }` where `payload` is one
  of the schema variants. The envelope shape is owned by
  [`signaling-envelope.md`](./signaling-envelope.md) and pins
  `signerId`, `sig`, `nonce`, `iat`, `sessionTokenHash`.

The router validates the envelope first (shape + freshness, see
[`signaling-envelope.md` § 5](./signaling-envelope.md#5-verification-order)),
then validates `payload` against the message schema, then
dispatches.

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

## 3. Length caps

Schema-enforced ceilings on every variable-length field:

| Field | Variant | Cap | Reason |
| --- | --- | --- | --- |
| `roomId` | every variant carrying it | `^[A-Z0-9]{8}$` | Crockford-Base32 per [`lobby-identifiers.md`](./lobby-identifiers.md). |
| `peerId` | every variant carrying it | UUID v4 (`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`) | Per `peer-identity.schema.json`. |
| `peerPubKey` | `JOIN_HANDSHAKE` | base64url, 43 chars | Ed25519 public key, 32 raw bytes. |
| `secret` | `JOIN_HANDSHAKE` | base64url, 22 chars | 16-byte room secret per [`multiplayer-security.md`](./multiplayer-security.md#room-secret--handshake). |
| `sdp` | `OFFER` / `ANSWER` | max 16 KiB UTF-8 | RFC-typical SDP fits in ≤ 4 KiB; 16 KiB is a 4× headroom that still fits in the 64-KiB frame cap. |
| `candidate` | `ICE_CANDIDATE` | max 1 KiB UTF-8 | A single `a=candidate:` line is < 200 bytes; 1 KiB blocks an injection that hides extra lines after the first. |
| `iceCandidates[]` | `OFFER` / `ANSWER` | max 32 entries | Bounds the bundled-trickle ICE list. |
| `iceCandidates[]` cumulative | per session | max 64 | After the bundled count, additional `ICE_CANDIDATE` frames are throttled (runtime-enforced; not schema-level). |
| `reason` | every variant carrying it | enum or `^[a-z0-9_]+$`, max 32 chars | Prevents a malformed reason string from leaking through to the log redactor. |
| `nonce` | `CHALLENGE` / `CHALLENGE_RESPONSE` | base64url, 22 chars | 16-byte CSPRNG. |
| `sig` | `CHALLENGE_RESPONSE` | base64url, 86 chars | Ed25519 signature (64 raw bytes) over the challenge nonce. |
| `displayNameDraft` | `JOIN_ROOM` (schema-reserved) — **never on the wire** (policy) | max 24 chars (schema) | Display names never traverse the signaling server per [`signaling-payload-policy.md` § 2](./signaling-payload-policy.md#2-denylist-never-traverses-signaling); the schema field is reserved for a future direction. See `## ⚠ Issues`. |

A frame that exceeds the **whole-message** size cap of **64 KiB**
is dropped at the WebSocket layer (see § 5) before the schema is
invoked.

## 4. Rejection behavior

When a frame fails validation:

1. The server replies with a single `RATE_LIMITED` /
   `JOIN_REJECTED` / `ERROR` envelope per the cause table below
   **without echoing the offending payload**. The `RATE_LIMITED`
   shape is defined in
   [`signaling-rate-limits.md` § 3](./signaling-rate-limits.md#3-rate_limited-reply);
   the `ERROR` variant carries a closed `code` plus optional
   `action`, `retryAfterMs`, and `captchaToken` per the schema.
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
| `length_exceeded` | a § 3 length-cap row is exceeded |
| `bad_room_id` | `roomId` pattern mismatch |
| `bad_peer_id` | `peerId` pattern mismatch |
| `bad_signature_shape` | envelope-level shape failure (sig length / nonce length / iat range) |
| `binary_frame` | binary frame received on a text-only protocol |

## 5. Frame and liveness hardening

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

These constants are part of the **stateless** signaling-server
contract per
[`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md);
the per-frame timer state is in-memory and per-connection, never
persisted.

## 6. Validator wiring

The compiled validator lives at
`services/signaling/src/validation/ajv.ts` (owned by the schema +
validation task). Properties:

- AJV `strict: true`, `allErrors: false` — one-shot rejection;
  fewer cycles per malformed frame.
- All variants preloaded at startup; no dynamic schema fetch.
- Exported entry point is **the only path** from raw string to
  message router:
  `validateSignalingMessage(raw): { ok: true; msg: SignalingMessage } | { ok: false; reason: ReasonCode }`.
- The router's static-analysis CI gate (deferred to the owning
  task) greps every public message handler for the call site and
  fails on any handler that consumes `raw` directly.

## 7. Examples

Canonical fixtures live under
[`content-schema/examples/signaling-message/`](../../content-schema/examples/signaling-message/).
At least one example exists per `type` so the validator's
discriminator path is exercised by `npm run validate:contracts`.

## 8. Cross-references

- Allow / deny list of which kinds may travel: [`signaling-payload-policy.md`](./signaling-payload-policy.md).
- Wire-envelope authentication: [`signaling-envelope.md`](./signaling-envelope.md).
- Throttle thresholds and exhaustion replies: [`signaling-rate-limits.md`](./signaling-rate-limits.md).
- Edge-tier prefix caps and blocklist: [`signaling-edge-defense.md`](./signaling-edge-defense.md).
- Stateless-by-design audit clause: [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md).
- Audit-log redaction: [`signaling-audit-log.md`](./signaling-audit-log.md).

---

## 🔍 Sync Check

- **UI: ✔** — The `ERROR { code: "captcha_required", action, captchaToken }` shape consumed by the lobby's `OnCaptchaRequired` handler in
  [`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md)
  matches the `Error` `$def` in
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json);
  the `RATE_LIMITED { tier, retryAfterMs, reason }` envelope
  consumed by `OnRateLimited` matches the schema's `RateLimited`
  `$def`.
- **Schema: ⚠** — Every § 1 enum value, every § 3 cap, and every § 5 constant matches
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  and the schema-matrix row [`SignalingMessage`](./schema-matrix.md).
  Two enum-drift gaps surface against the rate-limits and envelope
  siblings, plus the `displayNameDraft` schema/policy contradiction
  — see `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`31-signaling-message-schema-and-validation`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md)
  reads this doc First, pins § 3 caps and § 5 constants in its
  Acceptance Criteria, and lists every Owned Path the doc
  references. Companion tasks
  [`01-signaling-server`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  (router shape, audit-log signal source) and
  [`13-signaling-rate-limiting`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md)
  (rate-limit reply shape) reference the schema via
  `task-registry.json`.

## ⚠ Issues

- **`displayNameDraft` reserved on the schema vs denylisted by policy.**
  The `JoinRoom` `$def` in
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  declares `displayNameDraft` as a reserved field (`maxLength: 24`,
  description: "relayed to the host"), but
  [`signaling-payload-policy.md` § 2](./signaling-payload-policy.md#2-denylist-never-traverses-signaling)
  forbids any display-name field from traversing the signaling
  server, and § 3 of the same policy enforces a lint gate that
  rejects `"displayName"` keys in outgoing payloads. The two
  reconcile only by reading the schema's field as
  "reserved-but-not-yet-emitted"; the wire is currently denylisted.
  Per the schema-matrix entry naming this doc as canonical, either
  the schema should drop the field (Option A) or the payload-policy
  table should add a "reserved fields" note explaining the gap
  (Option B). Suggested owner: the schema-owning task
  [`31-signaling-message-schema-and-validation`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md)
  to align with the payload-policy gate. Skill did not edit either
  file (Hard Prohibition D).
- **`RATE_LIMITED.reason` enum drift between schema and rate-limits doc.**
  The schema's `RateLimited.reason` enum carries six values
  (`join_flood`, `create_flood`, `wrong_code`, `global`,
  `per_connection_burst`, `prefix_socket_cap`);
  [`signaling-rate-limits.md` § 3](./signaling-rate-limits.md#3-rate_limited-reply)
  defines a four-value closed enum
  (`join_flood`, `create_flood`, `wrong_code`, `global`).
  [`signaling-envelope.md` § 4](./signaling-envelope.md#4-replay-window)
  also names a seventh value (`envelope_replay`) that is in
  neither. Per CLAUDE.md "schema evolution is additive-first" and
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md), the
  rate-limits doc and the envelope doc must reconcile against the
  schema (or the schema must drop the extras). Suggested owners:
  [`13-signaling-rate-limiting`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md)
  for the rate-limits row;
  [`26-signed-signaling-envelope`](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md)
  for `envelope_replay`. Skill did not edit either sibling
  (Hard Prohibition D).
- **`RATE_LIMITED.tier` enum drift between schema and rate-limits doc.**
  Same shape as the previous row: schema declares five tiers
  (`per_ip`, `per_code`, `per_connection`, `per_prefix`, `global`);
  [`signaling-rate-limits.md` § 3](./signaling-rate-limits.md#3-rate_limited-reply)
  declares three (`per_ip`, `per_code`, `global`). Per the same
  lifecycle policy, owner
  [`13-signaling-rate-limiting`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md)
  must extend § 3 of that doc to cover `per_connection` and
  `per_prefix` (which the edge-defense doc relies on) or the
  schema must drop them. Skill did not edit it
  (Hard Prohibition D).
- **`RoomId` regex broader than the lobby alphabet.** Already
  flagged in
  [`lobby-identifiers.md` § ⚠ Issues](./lobby-identifiers.md):
  the schema's `RoomId` `$def` is `^[A-Z0-9]{8}$`, which admits
  symbols the canonical alphabet excludes (`0`, `1`, `I`, `L`,
  `O`, `U`). Lookup against the active-room table catches the
  mismatch, so this is non-blocking; the schema row should narrow
  to `^[2-9A-HJ-NP-TV-Z]{8}$` to make the alphabet authoritative
  end-to-end. Suggested owner: this doc's owning task,
  [`31-signaling-message-schema-and-validation`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md).
  FYI cross-link only; skill did not duplicate the fix here
  (Hard Prohibition D).
