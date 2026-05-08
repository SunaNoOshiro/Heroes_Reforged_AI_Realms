# Signaling Observability and Error Vocabulary

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Author [`services/signaling/observability.md`](../../../services/signaling/observability.md)
and [`services/signaling/error-codes.md`](../../../services/signaling/error-codes.md)
plus the cross-service index doc
[`docs/architecture/error-codes.md`](../../../docs/architecture/error-codes.md).
The wire-visible signaling enum collapses to `JOIN_FAILED`,
`RATE_LIMITED`, and `SERVER_ERROR`; richer reasons surface only via
`OWNER_NOTICE` on the room owner's authenticated channel. The
deploy step disables platform access-log persistence beyond 24 h.

Plan 22 § 2 — Closed signaling error vocabulary (uniform JOIN_FAILED).

Read First:
- [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md)
- [`docs/architecture/signaling-payload-policy.md`](../../../docs/architecture/signaling-payload-policy.md)
- [`docs/architecture/signaling-rate-limits.md`](../../../docs/architecture/signaling-rate-limits.md)
- [`content-schema/schemas/signaling-error.schema.json`](../../../content-schema/schemas/signaling-error.schema.json)

Inputs:
- The closed three-value wire enum.
- The closed seven-value `OwnerNotice` reason enum.
- Plan 18's room-code rate limit (consumed, not redesigned).

Outputs:
- `services/signaling/observability.md`
- `services/signaling/error-codes.md`
- `docs/architecture/error-codes.md`
- Acceptance criterion appended to
  [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](./01-signaling-server-node-js-websocket-lobby.md):
  "join failures return uniform `JOIN_FAILED`; reasons surfaced only
  via `OWNER_NOTICE`. Deploy step disables platform access-log
  persistence beyond 24 h."

Owned Paths:
- `services/signaling/observability.md`
- `services/signaling/error-codes.md`
- `docs/architecture/error-codes.md`

Owned Paths (shared):
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`
  is the **primary owner** of the signaling service; this task adds
  the uniform-error acceptance criterion **additively** and does
  not rewrite the existing wire-message list.

Dependencies:
- mvp.00-core-architecture.22-01-error-formatter-contract
- mvp.02-content-schemas.40-privacy-and-legal-docs
- mvp.02-content-schemas.41-error-and-audit-schemas

Acceptance Criteria:
- The two service docs declare the per-row "do not log" / "log as
  hash" / "TTL" rules.
- `docs/architecture/error-codes.md` cross-references both service
  tables and pins the UI-grade key mapping.
- The deploy step's platform access-log retention is named ≤ 24 h.

Owned Paths (shared) acceptance:
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`
  is **owned by** the signaling task family (the primary owner of
  the signaling service). This task is **additive**: one new
  acceptance criterion is appended naming the uniform-error
  vocabulary and the deploy-side log retention; the existing
  wire-message list (`CREATE_ROOM`, `JOIN_ROOM`, `OFFER`, etc.),
  the rate-limit table, the room-cool-down rules, and the
  TLS-handshake gate must not rewrite anything else.

Verify:
- npm run validate

Estimated Time:
- 4 hours
