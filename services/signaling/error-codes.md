# services/signaling — Error Codes

Canonical mapping from internal cause to wire-visible code. The wire
vocabulary is exactly three values per
[`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json);
richer reasons are surfaced only via `OWNER_NOTICE` on the room
owner's authenticated channel.

> Source plan:
> [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md).

## 1. Wire-visible codes (joiner)

| Code | When |
|---|---|
| `JOIN_FAILED` | Wrong room code, room full, room expired, peer banned, peer denied, malformed `JOIN_HANDSHAKE`, `not_host` on host-only commands. **Every distinguishable rejection collapses to this single value.** |
| `RATE_LIMITED` | Throttled by token-bucket; carries `retryAfterMs`. Distinct only because the response carries a timing hint. |
| `SERVER_ERROR` | Generic 500. Never carries a `cause`, never carries a stack, never carries `keyId`. |

## 2. Owner-only authenticated channel (`OWNER_NOTICE`)

The room owner receives a richer payload over the authenticated
owner channel only:

```json
{
  "schemaVersion": 1,
  "kind": "ownerNotice",
  "ownerReason": "ROOM_FULL",
  "ownerCount": 3,
  "errorId": "..."
}
```

The `ownerReason` enum closes at:

- `WRONG_CODE`
- `ROOM_FULL`
- `ROOM_EXPIRED`
- `PEER_BANNED`
- `RATE_LIMIT_TRIGGERED`
- `PROTOCOL_VIOLATION`
- `INTERNAL_ERROR`

The joiner never sees this enum. The owner channel is opened by the
host on `CREATE_ROOM` and closed on `CLOSE_ROOM`; only the host's
authenticated peerId may receive `OWNER_NOTICE` events.

## 3. Internal cause → wire mapping

| Internal cause | Joiner wire | Owner notice |
|---|---|---|
| code does not exist | `JOIN_FAILED` | `WRONG_CODE` |
| code exists but full | `JOIN_FAILED` | `ROOM_FULL` |
| code expired (TTL or max lifetime) | `JOIN_FAILED` | `ROOM_EXPIRED` |
| peer banned by host | `JOIN_FAILED` | `PEER_BANNED` |
| peer rate-limited per-IP | `RATE_LIMITED` (with `retryAfterMs`) | `RATE_LIMIT_TRIGGERED` |
| handshake mismatch | `JOIN_FAILED` | `PROTOCOL_VIOLATION` |
| host-only command from non-host | `JOIN_FAILED` | `PROTOCOL_VIOLATION` |
| any unhandled exception | `SERVER_ERROR` | `INTERNAL_ERROR` |

The joiner mapping is **fixed**: a future change that distinguishes
two of the rows above on the wire is a regression. The owner
mapping is allowed to grow additively — the closed enum is
versioned per [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json).

## 4. Forbidden patterns

The implementation MUST NOT:

- carry an `Error.cause` chain on the wire response;
- include a `keyId`, `peerPubKey`, `roomId`, or any attempted secret
  in the wire payload;
- emit different wire codes for "code not found" vs. "code exists
  but forbidden" — both collapse to `JOIN_FAILED`;
- log raw IPs in the structured log (per
  [`observability.md`](./observability.md));
- log the joiner's `peerId` together with chat surface (`peerId` is
  ephemeral; combining it with chat would extend its sensitivity).

## 5. Cross-references

- [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json) — closed wire enum.
- [`services/signaling/observability.md`](./observability.md) — log retention rules.
- [`docs/architecture/error-codes.md`](../../docs/architecture/error-codes.md) — cross-service index.
- [`docs/architecture/signaling-payload-policy.md`](../../docs/architecture/signaling-payload-policy.md) — payload allow / deny list.
- [`docs/architecture/error-formatter.md`](../../docs/architecture/error-formatter.md) — UI-grade key resolution.
