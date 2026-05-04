# services/ai-gateway

Optional backend boundary for provider-backed AI generation and
moderation.

Use this when:

- provider secrets should stay off the client
- rate limiting or policy enforcement is centralized
- multiple model providers need one stable app-facing interface

Client and orchestration code should depend on the request/response
contract, not on one provider SDK.

## Operational contracts

- [`error-codes.md`](./error-codes.md) — closed HTTP-wire vocabulary
  (`401` / `404` collapse, `429` with `Retry-After`, `500` without
  `cause`).
- [`retention.md`](./retention.md) — `promptHash` rule, ≤ 24 h
  response cache TTL, failure-path logger contract.
