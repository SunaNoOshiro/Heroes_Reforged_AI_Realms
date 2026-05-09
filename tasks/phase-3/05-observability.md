# Module: Observability & Trust Boundaries

Operations-side machinery for the trust-boundary contract.
Lands the shared logger and the SecurityEvent registry that
back every rule in
[`docs/operations/services-runtime-rules.md`](../../docs/operations/services-runtime-rules.md).
Required before `services/signaling/` or `services/ai-gateway/`
takes real traffic.

**Milestone**: M6 — Operational Readiness
**Prerequisite**: signaling server (M5 Task 1), AI gateway
scaffolding ([`services/ai-gateway/`](../../services/ai-gateway/)).
**Total Estimate**: ~14 hours
**Exit Criteria**:
- `services/shared/logger.ts` is the single sanctioned emit path
  for every backend service; `console.*` and direct `pino` are
  refused under `services/`.
- Every `SecurityEvent.kind` listed in
  [`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json)
  is emitted by at least one named code path.
- `npm run validate:contracts` enforces the four lint rules from
  [`docs/architecture/fail-loud.md`](../../docs/architecture/fail-loud.md).
