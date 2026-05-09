# Required emissions catalogue + telemetry-event schema validation

Module: [Observability (Phase 2)](../11-observability.md)

Description:
Lock the per-subsystem required-emissions catalogue declared in
[`docs/architecture/observability.md`](../../../docs/architecture/observability.md)
§ 4 and back it with a CI gate. Validate the canonical examples
under [`content-schema/examples/telemetry/`](../../../content-schema/examples/telemetry/)
against
[`content-schema/schemas/telemetry-event.schema.json`](../../../content-schema/schemas/telemetry-event.schema.json),
and ensure each owning module's task acceptance criteria cite the
emissions it owes the catalogue.

Read First:
- [`docs/architecture/observability.md`](../../../docs/architecture/observability.md)
- [`content-schema/schemas/telemetry-event.schema.json`](../../../content-schema/schemas/telemetry-event.schema.json)

Inputs:
- Required emissions table in
  [`observability.md`](../../../docs/architecture/observability.md) § 4
- Existing module task lists under `tasks/mvp/` and `tasks/phase-2/`

Outputs:
- Acceptance-criteria patches in each owning module's tasks (see
  table) that add a "MUST emit `<event>` per
  observability.md § 4 row M" line.
- Two canonical telemetry examples under
  [`content-schema/examples/telemetry/`](../../../content-schema/examples/telemetry/)
  that pass the schema gate.
- Cross-link from
  [`error-taxonomy.md`](../../../docs/architecture/error-taxonomy.md)
  to the `error.shown` row of the catalogue.

Owned Paths:
- `content-schema/examples/telemetry/`

Owned Paths (shared):
- `docs/architecture/observability.md`
- `content-schema/schemas/telemetry-event.schema.json`

Dependencies:
- phase-2.11-observability.01-logger-and-metrics-sink-interfaces

Acceptance Criteria:
- Schema gate (`npm run validate:contracts`) passes for the canonical
  examples in `content-schema/examples/telemetry/`.
- Every row of the § 4 table cites a stable event name and at least
  one owning subsystem.
- Privacy redaction rules from § 5 are referenced from the privacy-
  retention plan ;
  do not duplicate the rules.
- Shared-path work is additive only: extending § 4 must not rewrite
  the rest of `observability.md`. The primary owner of
  [`observability.md`](../../../docs/architecture/observability.md)
  remains the doc itself; this task adds rows without changing the
  declared interfaces, and must not rewrite §§ 1–3 or § 5–7.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
