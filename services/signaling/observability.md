# services/signaling — Observability & Retention

What the signaling service may log, where, for how long, and what it
must scrub. Cross-link from the deploy step:
[`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md).

> Source plan:
> [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md).

## 1. Log floor

The service emits structured JSON to stdout. The deploy platform
(Fly.io / Railway / etc.) is responsible for short-TTL retention;
the rules below are mandatory regardless of the platform.

| Item | Logged? | Notes |
|---|---|---|
| Room create / destroy | yes | Counts only; never a peer id with a chat surface attached. |
| Rate-limit triggers | yes | `(routeId, sinceMs, count)`; never the offending IP. |
| `JOIN_ATTEMPT_REJECTED` counts | yes | Roll-up only; per [`signaling-rate-limits.md`](../../docs/architecture/signaling-rate-limits.md). |
| `ROOM_EXPIRED` reason | yes | One of `idle`, `max_lifetime`, `host_closed`. |
| `errorId` on any thrown error | yes | UUID v4; cross-references the crash log per [`docs/architecture/error-formatter.md`](../../docs/architecture/error-formatter.md). |
| Display names | **no** | Already banned by [`signaling-payload-policy.md`](../../docs/architecture/signaling-payload-policy.md); restated here. |
| Chat content | **no** | Routed over the chat data-channel between peers; never traverses signaling. |
| Raw IPs / `req.ip` / `X-Forwarded-For` | **no** | The structured logger scrubs both. |
| SDP / ICE bodies | **no** | Counts and event types only; blob bytes never. |
| `typ host` / `typ srflx` ICE candidates pre-consent | **no** | Filtered by the pre-consent policy; logging the candidate set bypasses that policy. |
| Pack hashes | **no** | Not in the signaling allow-list. |
| Save hashes | **no** | Not in the signaling allow-list. |
| `Error.stack` / `Error.cause` | **no** | The dev sink consumes [`formatDevError`](../../docs/architecture/error-formatter.md) in production; cause chains are dropped per [`production-build.md` rule 3](../../docs/architecture/production-build.md#3-formatusererror-is-the-only-ui-error-sink). |

## 2. Retention TTL

| Surface | TTL | Owner |
|---|---|---|
| Service stdout | as forwarded by the deploy platform | platform config |
| Platform-side access log | **≤ 24 h** | deploy step |
| In-memory state (room → peers) | cleared on room empty | already enforced by service code |
| Rate-limit buckets | cleared on bucket expiry | per [`signaling-rate-limits.md`](../../docs/architecture/signaling-rate-limits.md) |

The deploy step in
[`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
must:

1. configure the platform's access-log retention to ≤ 24 h;
2. disable any IP-logging plugin;
3. confirm the platform's log forwarder has TLS;
4. add the deploy as a row in [`processors.md`](../../docs/legal/processors.md).

## 3. Third-party processors

No third-party APM / log forwarder may receive signaling logs unless
it appears as a row in
[`docs/legal/processors.md`](../../docs/legal/processors.md). Adding
one requires the [DPA checklist](../../docs/legal/dpa-checklist.md).

## 4. Error vocabulary

Wire-visible errors collapse to the closed enum in
[`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json);
the mapping table lives in [`error-codes.md`](./error-codes.md).
Internal cause is preserved on the *server-side* dev sink for
debugging but never crosses the wire.

## 5. Cross-references

- [`services/signaling/error-codes.md`](./error-codes.md) — wire vocabulary.
- [`docs/architecture/signaling-payload-policy.md`](../../docs/architecture/signaling-payload-policy.md) — payload allow / deny list.
- [`docs/architecture/signaling-rate-limits.md`](../../docs/architecture/signaling-rate-limits.md) — bucket configuration.
- [`docs/architecture/signaling-audit-log.md`](../../docs/architecture/signaling-audit-log.md) — structured-log shape.
- [`docs/architecture/privacy.md`](../../docs/architecture/privacy.md) — retention TTL matrix.
- [`docs/legal/processors.md`](../../docs/legal/processors.md) — third-party processor list.
