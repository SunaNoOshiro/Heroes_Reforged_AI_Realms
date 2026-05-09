# Implementation Report: 31 — Trust Boundaries & Logging / Monitoring

> Companion to
> [`docs/archive/implementation-plans/31-trust-boundaries-and-logging-monitoring-plan.md`](./31-trust-boundaries-and-logging-monitoring-plan.md).
> Records what was applied to the repository on 2026-05-06.

---

## Summary

Landed the doctrine + schemas + spec stubs for the trust-boundary
track. The runtime — pino instance, AJV gate inside
`securityLog()`, `/metrics` endpoint, spike detector — is
deferred to the owning observability tasks under
[`tasks/phase-3/05-observability/`](../../../tasks/phase-3/05-observability/);
landing the runtime now would precede the signaling + AI-gateway
services it instruments.

The plan called for a richer operations stack (eight separate
docs plus an `oncall.md`, `access-control.md`, and a
tamper-evident audit-log chain). For a solo, pre-runtime
maintainer that volume is speculative; the operations rules are
folded into a single
[`docs/operations/services-runtime-rules.md`](../../operations/services-runtime-rules.md).
The tamper-evident audit-log machinery is dropped: the
maintainer signs their own packs and the audit is git history.

Both `npm run all` and `npm test` are green.

---

## What landed

### Architecture doctrine (new docs)

- [`docs/architecture/trust-boundaries.md`](../../architecture/trust-boundaries.md)
  *(new)* — single trust contract with the "client is fully
  untrusted" axiom, the trusted-core declaration, the per-component
  matrix (15 cross-zone arrows), the worker boundary detail, the
  player-report correlation rule, and the identity gap.
- [`docs/architecture/diagrams/trust-zones.md`](../../architecture/diagrams/trust-zones.md)
  *(new)* — Mermaid zone diagram referenced from the matrix.
- [`docs/architecture/authority.md`](../../architecture/authority.md)
  *(new)* — consolidated decision-authority table; identity row
  marked **GAP** with cross-ref to plan 24.
- [`docs/architecture/untrusted-strings.md`](../../architecture/untrusted-strings.md)
  *(new)* — per-string contract for every peer-supplied string
  (display name, chat, room code, case id, AI theme, pack id,
  localization value, peer SDP / ICE).
- [`docs/architecture/fail-loud.md`](../../architecture/fail-loud.md)
  *(new)* — the four lint rules (empty catch, default-coalesce on
  schema-required field, `as any` in trusted code, direct
  `console.*` in `services/`) and the `assert()` /
  `TrustViolationError` helper.
- [`docs/architecture/desktop-sandboxing.md`](../../architecture/desktop-sandboxing.md)
  *(new)* — pre-emptive Tauri / Electron rules so a future desktop
  wrapper does not gain unscoped filesystem access.

### Operations doc (single, collapsed)

- [`docs/operations/services-runtime-rules.md`](../../operations/services-runtime-rules.md)
  *(new, ~150 lines)* — collapses logger pipeline, LogRecord
  shape, redaction deny-list, channel + retention table,
  per-`SecurityEvent.kind` spike thresholds, SLO targets, five
  containment runbooks (signing-key compromise,
  signature-failure spike, AI cost runaway, leaked secret,
  mass-PII leak), opt-in crash-report payload rules, and the
  metrics-endpoint contract into one rules doc.

**Intentionally not added:**
- `oncall.md` (rotation + escalation), `access-control.md` (IAM
  role matrix) — solo maintainer; team-shaped concerns.
- `observability.md`, `log-retention.md`, `integrity-monitoring.md`,
  `alerting.md`, `slo.yaml`, `crash-reports.md`, `incident-response.md`,
  `dashboards/README.md` — folded into the single rules doc above.
- `audit-log.md` + the tamper-evident hash chain (schema +
  writer + verifier + daily-root export) — solo maintainer
  signs their own packs; the audit is git history.

### Schemas (new)

- [`content-schema/schemas/log-record.schema.json`](../../../content-schema/schemas/log-record.schema.json)
  — closed `LogRecord` shape (ts, severity, channel, service,
  correlationId, event, fields).
- [`content-schema/schemas/security-event.schema.json`](../../../content-schema/schemas/security-event.schema.json)
  — closed `SecurityEvent` registry of 13 named kinds with
  per-kind required-field branches.
- [`content-schema/schemas/worker-message.schema.json`](../../../content-schema/schemas/worker-message.schema.json)
  — closed envelope for the AI-bot worker (`COMPUTE_MOVE` /
  `MOVE_RESULT` / `ABORT` / `PING` / `PONG`).
- [`content-schema/schemas/case-id.schema.json`](../../../content-schema/schemas/case-id.schema.json)
  — 256-bit-random hex player-report id with no PII.
- [`content-schema/schemas/display-name.schema.json`](../../../content-schema/schemas/display-name.schema.json)
  — NFC + 24-char + character-class allow-list.
- [`content-schema/schemas/room-code.schema.json`](../../../content-schema/schemas/room-code.schema.json)
  — 8-char Crockford-Base32 (mirrors signaling envelope `RoomId`).

Canonical example fixtures land for the three object schemas
under `content-schema/examples/log-record/`,
`content-schema/examples/security-event/`,
`content-schema/examples/worker-message/`.

### Spec stubs (new code)

- [`services/shared/logger.ts`](../../../services/shared/logger.ts) —
  pino-backed logger public surface (`appLog`, `accessLog`,
  `auditLog`, `securityLog`, `safeLog`).
- [`services/shared/redact.ts`](../../../services/shared/redact.ts) —
  recursive deny-list scrubber over nested objects.
- [`services/shared/log-channels.ts`](../../../services/shared/log-channels.ts)
  — closed `LogChannel` enum mirrored from the schema.
- [`services/shared/README.md`](../../../services/shared/README.md) —
  contract pointer.
- [`src/shared/assert.ts`](../../../src/shared/assert.ts) — typed
  `TrustViolationError` and `assert()` helper.
- [`src/ui/sanitize.ts`](../../../src/ui/sanitize.ts) — NFC
  normalization helper; documents the React-default-escape
  boundary.

### Top-level disclosure surface

- [`SECURITY.md`](../../../SECURITY.md) — extended with the GDPR
  72-hour breach trigger and a cross-reference index. Severity
  matrix and supported-versions table were intentionally not
  added: they imply ack timelines a solo maintainer cannot
  promise.

### Owning tasks (five new)

[`tasks/phase-3/05-observability/`](../../../tasks/phase-3/05-observability/):

- `01-shared-logger-and-redaction.md` — pino + redact +
  `LogRecord` / `SecurityEvent` schemas + lint rules.
- `02-worker-message-validation.md` — closed envelope +
  `event.source` check + `worker_message_invalid` emit path.
- `03-untrusted-string-schemas.md` — display-name / room-code /
  case-id validators wired to multiplayer-setup, network-lobby,
  and content-report screens.

Plus the module file
[`tasks/phase-3/05-observability.md`](../../../tasks/phase-3/05-observability.md).

### Cross-links (existing files extended)

- [`CLAUDE.md`](../../../CLAUDE.md) — "Read first" list extended
  with `trust-boundaries.md` and `SECURITY.md`; "Protect These
  Rules" extended with the "client is untrusted" axiom.
- [`README.md`](../../../README.md) — "Read First" surfaces
  `trust-boundaries.md`; new "Security:" pointer to
  [`SECURITY.md`](../../../SECURITY.md).
- [`docs/architecture/overview.md`](../../architecture/overview.md)
  — Core Rules extended with rule 6 (every byte adversarial).
- [`docs/architecture/master-plan.md`](../../architecture/master-plan.md)
  — Non-Negotiables extended with rule 7.
- [`docs/planning/implementation-log.md`](../../planning/implementation-log.md)
  — new "Trust Boundaries and Logging / Monitoring" section.

### Validation

- [`scripts/check-repo-contracts.mjs`](../../../scripts/check-repo-contracts.mjs)
  — example-record suffix mappings extended with `.log-record.json`,
  `.security-event.json`, `.worker-message.json`.
- `npm run all` — green (validate, generate:wiki,
  generate:task-system-report).
- `npm test` — green (32/32).

---

## Deferred

Per the plan, these are intentionally not implemented yet:

- **Pino runtime, `securityLog()` AJV gate, redactor unit tests**
  — owned by `tasks/phase-3/05-observability/01`. The signaling
  + AI-gateway services don't run yet, so the runtime would
  instrument nothing.
- **Worker boundary runtime** — `worker-message.schema.json`
  shape lands with canonical fixtures; the parser
  (`src/ai/worker/envelope.ts`) is owned by
  `tasks/phase-3/05-observability/02`.
- **Display-name / room-code / case-id ingest validators** —
  schemas land with examples; runtime helpers
  (`src/ui/profile/validate-display-name.ts` etc.) ship with
  `tasks/phase-3/05-observability/03`.
- **Metrics endpoint, dashboard JSON, spike detector, opt-in
  crash-report endpoint** — design rules land in
  [`services-runtime-rules.md`](../../operations/services-runtime-rules.md);
  the runtime ships with the first signaling / AI-gateway
  production deploy.
- **AST lint rules from `fail-loud.md` § 6** — ban list lands as
  doctrine; AST passes in
  `scripts/check-repo-contracts.mjs` ship with task 01 once
  there is `services/**` runtime code to lint against.

---

## Verification

```sh
npm run all
npm test
```

Both succeed. `validate:links`, `validate:contracts`,
`validate:tasks`, `validate:cross-refs`, and `validate:enums` are
all green.

---

## Assumptions

- Solo, pre-runtime maintainer. The operations stack is
  intentionally collapsed into one rules doc, and the
  tamper-evident audit-log machinery is dropped; both decisions
  are explicit in the Summary above.
- The owning observability tasks reuse the screen packages
  `62-multiplayer-setup`, `64-network-lobby`, and
  `75-content-report` for the display-name / room-code / case-id
  validators rather than minting a new screen package; the plan
  named a new `<NN>-report-case` package, but `75-content-report`
  already covers the player-report submit flow per audit 19.

---

## Blockers

None.
