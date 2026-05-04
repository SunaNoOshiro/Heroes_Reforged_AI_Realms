# Golden-State Fixtures

Checked-in `(scenarioId, seed) → expectedStateHash` corpus consumed
by the runner under `src/engine/__tests__/golden.test.ts`. Owned by
[`tasks/mvp/01-engine-core/12-golden-state-suite.md`](../../../tasks/mvp/01-engine-core/12-golden-state-suite.md).

## Naming Convention

`<scenarioId>-<seed-hex>.golden-fixture.json`. The schema for each
file is
[`content-schema/schemas/golden-fixture.schema.json`](../../../content-schema/schemas/golden-fixture.schema.json).
Two fixtures with the same `(scenarioId, seed)` are forbidden;
`npm run test:golden` rejects collisions before replaying.

## Blessing Policy

Expected hashes are emitted by `npm run golden:bless -- <fixture>`.
The script refuses to run in CI (checks `process.env.CI`) so a
hash drift cannot be silently accepted by an automated pipeline. A
human committer reviews the diff and only blesses after confirming
the change is intentional.

A PR that updates an `expectedStateHash` without a paired ruleset /
formula / handler change is rejected by code review: the golden
suite's whole purpose is to catch unintended drift, and an
unexplained re-bless is the failure mode it exists to prevent.

## Initial Corpus

The initial corpus is empty. The edge-case scenarios pinned by
[`tasks/mvp/02-tooling/05-edge-case-fixtures.md`](../../../tasks/mvp/02-tooling/05-edge-case-fixtures.md)
are the first six entries; each scenario gets one fixture pinning
its initial-state hash and one fixture per representative command
log.
