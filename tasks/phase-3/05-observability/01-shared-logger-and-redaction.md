# Shared Logger and Redaction Pipeline

Status: planned

Module: [Observability & Trust Boundaries](../05-observability.md)

Description:
Land the single sanctioned emission path for every backend
service. Pin **pino** as the logger; expose `appLog`,
`accessLog`, `auditLog`, `securityLog`, `safeLog` from
[`services/shared/logger.ts`](../../../services/shared/logger.ts).
Validate every emitted record against
[`content-schema/schemas/log-record.schema.json`](../../../content-schema/schemas/log-record.schema.json)
and every security event against
[`content-schema/schemas/security-event.schema.json`](../../../content-schema/schemas/security-event.schema.json).
Direct `console.*` and direct `pino()` imports outside this file
are refused by the lint rule named in
[`docs/architecture/fail-loud.md`](../../../docs/architecture/fail-loud.md) § 5.

Read First:
- [`docs/architecture/trust-boundaries.md`](../../../docs/architecture/trust-boundaries.md)
- [`docs/architecture/fail-loud.md`](../../../docs/architecture/fail-loud.md)
- [`docs/operations/services-runtime-rules.md`](../../../docs/operations/services-runtime-rules.md)

Inputs:
- [`content-schema/schemas/log-record.schema.json`](../../../content-schema/schemas/log-record.schema.json)
- [`content-schema/schemas/security-event.schema.json`](../../../content-schema/schemas/security-event.schema.json)
- [`services/shared/logger.ts`](../../../services/shared/logger.ts) public-surface stub.
- [`services/shared/redact.ts`](../../../services/shared/redact.ts) deny-list helper.
- [`services/shared/log-channels.ts`](../../../services/shared/log-channels.ts) closed channel enum.

Outputs:
- `services/shared/logger.ts` — pino instance with `redact: ['req.headers.authorization', 'req.body.prompt', 'req.body.theme', 'metadata.playerName', '*.apiKey', '*.token']`; `formatters.level` returns the closed severity enum; `base.service` set per service.
- `services/shared/__tests__/logger.test.ts` — fixture-driven tests asserting:
  - every emission validates against `log-record.schema.json`,
  - the deny list scrubs the listed fields,
  - `securityLog()` validates against `security-event.schema.json` before emission,
  - direct `console.error` from a `services/**/*.ts` file fails the lint pass.
- Lint extension in `scripts/check-repo-contracts.mjs`:
  - refuses `import "pino"` outside `services/shared/logger.ts`,
  - refuses `console.{log,info,warn,error,debug}(` under `services/**/*.ts` (except `services/shared/logger.ts` itself),
  - refuses `dangerouslySetInnerHTML` under `src/`.

Owned Paths:
- `services/shared/logger.ts`
- `services/shared/redact.ts`
- `services/shared/log-channels.ts`
- `services/shared/__tests__/logger.test.ts`
- `content-schema/schemas/log-record.schema.json`
- `content-schema/schemas/security-event.schema.json`
- `content-schema/examples/log-record/`
- `content-schema/examples/security-event/`
- `docs/operations/services-runtime-rules.md`

Dependencies:
- None

Acceptance Criteria:
- Every backend emission flows through one of `appLog`,
  `accessLog`, `auditLog`, `securityLog`, `safeLog`.
- Every emitted `LogRecord` validates against
  [`log-record.schema.json`](../../../content-schema/schemas/log-record.schema.json).
- Every emitted `SecurityEvent` validates against
  [`security-event.schema.json`](../../../content-schema/schemas/security-event.schema.json)
  before reaching the transport.
- The redactor strips every field in the deny list:
  `authorization`, `apiKey`, `token`, `password`, `prompt`,
  `theme`, `playerName`, `chatText`, `ip`, `cookie`,
  `set-cookie`.
- Lint refuses direct `pino()` import outside
  `services/shared/logger.ts`.
- Lint refuses any `console.*` call under `services/**` other
  than `services/shared/logger.ts` itself.
- Lint refuses `dangerouslySetInnerHTML` under `src/`.
- Channel set is closed to `app` / `access` / `audit` /
  `security` per [`log-channels.ts`](../../../services/shared/log-channels.ts).

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
