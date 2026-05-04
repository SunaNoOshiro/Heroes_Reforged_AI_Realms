# Content-Report Intake And Local Queue

Status: planned

Module: [Mod System (Phase 2)](../05-mod-system.md)

Description:
Wire screen
[`75-content-report`](../../../docs/architecture/wiki/screens/75-content-report/)
to the outbound queue from
[`tasks/mvp/08-persistence/15-content-report-queue.md`](../../mvp/08-persistence/15-content-report-queue.md).
Validates each submission against
[`content-report.schema.json`](../../../content-schema/schemas/content-report.schema.json),
sanitizes notes via `safeUserText(1000)`, and persists to
`hr-profile.reports`.

Read First:
- [`docs/architecture/wiki/screens/75-content-report/`](../../../docs/architecture/wiki/screens/75-content-report/)
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)

Inputs:
- `content-report.schema.json` envelope.
- Trigger affordances on hero / unit / faction info-cards,
  pack-manager rows, and the AI-provenance detail screen.

Outputs:
- `src/content-runtime/content-report-intake.ts`
- `src/content-runtime/__tests__/content-report-intake.test.ts`
- `src/ui/screens/content-report-screen.tsx`

Owned Paths:
- `src/content-runtime/content-report-intake.ts`
- `src/content-runtime/__tests__/content-report-intake.test.ts`
- `src/ui/screens/content-report-screen.tsx`

Dependencies:
- mvp.02-content-schemas.34-content-report-schema
- mvp.02-content-schemas.32-safe-user-text-helper-and-jsx-lint
- mvp.08-persistence.15-content-report-queue

Acceptance Criteria:
- `OPEN_CONTENT_REPORT` mounts
  `docs/architecture/wiki/screens/75-content-report/` with target
  metadata pre-filled.
- `SUBMIT_CONTENT_REPORT` validates, sanitizes notes, and pushes
  onto the queue.
- Schema validation failure surfaces a modal error and preserves
  the form draft.
- The trigger affordance is wired into the hero, unit, faction,
  and AI-provenance info-cards.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
