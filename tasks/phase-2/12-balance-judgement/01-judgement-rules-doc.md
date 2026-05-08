# Balance-corridor judgement-rules doc

Module: [Balance Judgement (Phase 2)](../12-balance-judgement.md)

Description:
Author `docs/balance/judgement-rules.md` extracting the balance-
corridor judgement-call methodology that today lives only in
[`research/deep-research-report.md`](../../../research/deep-research-report.md)
and (per the audit) in the head of one contributor (Q294 #2). The
rules cover: which Wilson 95 % CI band counts as inside the corridor,
how to treat outliers, when a "compensating ability exists" exempts
a stat from the corridor, and how to log the judgement call against
the affected record.

Read First:
- [`research/deep-research-report.md`](../../../research/deep-research-report.md)
- [`content-schema/schemas/balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json)
- [`content-schema/schemas/balance-report.schema.json`](../../../content-schema/schemas/balance-report.schema.json)
- [`docs/architecture/content-system-policy.md`](../../../docs/architecture/content-system-policy.md)

Inputs:
- Methodology section of `research/deep-research-report.md`
- Existing balance-constraints schema
- Existing balance-report schema

Outputs:
- `docs/balance/judgement-rules.md` containing:
  - Wilson 95 % CI rule statement (verbatim from research report)
  - Outlier rule
  - "Compensating ability exists" rule
  - Decision-log requirement: every judgement call MUST land an entry
    in [`docs/planning/decision-log.md`](../../../docs/planning/decision-log.md)
    or as a `findings[].context.judgement` field on the corresponding
    `balance-report`
- Cross-link added to `research/deep-research-report.md` pointing at
  the new doc

Owned Paths:
- `docs/balance/judgement-rules.md`

Dependencies:
- None

Acceptance Criteria:
- Doc exists and is referenced from
  [`research/deep-research-report.md`](../../../research/deep-research-report.md).
- A worked example walks through one borderline stat and shows which
  rule applied and where the judgement was logged.
- `npm run validate:links` resolves every link.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
