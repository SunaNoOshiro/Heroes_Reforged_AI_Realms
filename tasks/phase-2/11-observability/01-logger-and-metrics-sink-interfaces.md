# Logger + MetricsSink interfaces

Status: planned

Module: [Observability (Phase 2)](../11-observability.md)

Description:
Implement the pure `Logger` and `MetricsSink` interfaces declared in
[`docs/architecture/observability.md`](../../../docs/architecture/observability.md)
§§ 1–2, plus the dev console backend and the capture-and-assert test
fake referenced from
[`docs/architecture/testing-conventions.md`](../../../docs/architecture/testing-conventions.md).
Both interfaces are environment-agnostic and dependency-injected; no
module-level singleton.

Read First:
- [`docs/architecture/observability.md`](../../../docs/architecture/observability.md)
- [`docs/architecture/testing-conventions.md`](../../../docs/architecture/testing-conventions.md)
- [`docs/architecture/side-effect-matrix.md`](../../../docs/architecture/side-effect-matrix.md)

Inputs:
- Type definitions from `src/contracts/`

Outputs:
- `src/observability/logger.ts` — `Logger` interface plus the dev
  console backend
- `src/observability/metrics.ts` — `MetricsSink` interface plus the
  dev in-memory backend
- `src/contracts/fakes/observability.ts` — capture-and-assert fake
  used by every module's tests when proving required emissions

Owned Paths:
- `src/observability/logger.ts`
- `src/observability/metrics.ts`
- `src/contracts/fakes/observability.ts`

Dependencies:
- None

Acceptance Criteria:
- The `Logger` interface matches the declaration in
  [`docs/architecture/observability.md`](../../../docs/architecture/observability.md)
  § 1 exactly: `info`, `warn`, `error` taking `(event: string,
  fields?: LogFields)`.
- The `MetricsSink` interface matches § 2: `counter`, `histogram`,
  `gauge`.
- Console backend serializes each call as a single one-line JSON
  object so log aggregators can parse without splitting lines.
- Capture-and-assert fake exposes `events`, `metrics`,
  `expectEvent(kind, fields?)`, and `expectMetric(name, op,
  predicate?)` helpers; redaction rules from § 5 are enforced inside
  the fake (PII fields throw at capture time so violators fail tests
  loudly).
- No module-level state inside `src/observability/` (verified by
  `npm run validate:arch`).

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
