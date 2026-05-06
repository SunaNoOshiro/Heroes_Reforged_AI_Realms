# services/shared

Spec-stub helpers shared by `services/signaling/`,
`services/ai-gateway/`, `services/turn/`, and any future backend
adapter. Owner doc:
[`docs/architecture/trust-boundaries.md`](../../docs/architecture/trust-boundaries.md)
+ [`docs/operations/services-runtime-rules.md`](../../docs/operations/services-runtime-rules.md).

| File | Purpose | Implementation owner |
|---|---|---|
| [`logger.ts`](./logger.ts) | pino instance with redact list; exports `appLog`, `accessLog`, `auditLog`, `securityLog`, `safeLog`. Validates every emission against [`log-record.schema.json`](../../content-schema/schemas/log-record.schema.json) before write. | `tasks/phase-3/05-observability/01-shared-logger-and-redaction.md` |
| [`redact.ts`](./redact.ts) | Recursive deny-list scrubber over nested objects. Default deny list: `authorization`, `apiKey`, `token`, `password`, `prompt`, `theme`, `playerName`, `chatText`. | `tasks/phase-3/05-observability/01-shared-logger-and-redaction.md` |
| [`log-channels.ts`](./log-channels.ts) | `LogChannel` enum (`app` / `access` / `audit` / `security`) re-exported from [`log-record.schema.json`](../../content-schema/schemas/log-record.schema.json). | `tasks/phase-3/05-observability/01-shared-logger-and-redaction.md` |

The `logger.ts` file is the only sanctioned import path for pino;
`scripts/check-repo-contracts.mjs` will refuse a direct `import "pino"`
from any other file under `services/`. Direct `console.error(`
calls in `services/` are likewise refused — every emission MUST
flow through `safeLog`.
