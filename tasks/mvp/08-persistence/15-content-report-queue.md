# Outbound Content-Report Queue

Status: planned

Module: [Persistence](../08-persistence.md)

Description:
Persist outbound content reports under IndexedDB
`hr-profile.reports` with a retry stub. Validates each report
against [`content-report.schema.json`](../../../content-schema/schemas/content-report.schema.json)
before enqueue. No network call at v1; the queue is shaped so
Plan 30's moderation backend can dequeue once it lands.

Read First:
- [`docs/architecture/persistence.md`](../../../docs/architecture/persistence.md)
- [`docs/architecture/wiki/screens/75-content-report/data-contracts.md`](../../../docs/architecture/wiki/screens/75-content-report/data-contracts.md)

Inputs:
- `content-report.schema.json` envelope.
- Local salt for `reportId` derivation.

Outputs:
- `src/persistence/content-report-queue.ts`
- `src/persistence/__tests__/content-report-queue.test.ts`

Owned Paths:
- `src/persistence/content-report-queue.ts`
- `src/persistence/__tests__/content-report-queue.test.ts`

Dependencies:
- mvp.02-content-schemas.34-content-report-schema
- mvp.08-persistence.01-indexeddb-wrapper

Acceptance Criteria:
- `enqueue(report)` validates the envelope and persists it.
- `peek()` returns the oldest queued report.
- `dequeue(reportId)` removes a report; the queue is durable
  across reload.
- `WIPE_LOCAL_DATA scope=profile|all` clears the queue.
- Tests cover validation failure (rejected, not enqueued) and
  durability across simulated reload.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
