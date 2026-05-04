# Replay Regression Corpus

Checked-in replay corpus consumed by the runner under
`src/engine/__tests__/replays.test.ts`. Owned by
[`tasks/mvp/01-engine-core/13-replay-regression-suite.md`](../../tasks/mvp/01-engine-core/13-replay-regression-suite.md).

## Naming Convention

`bug-<issue-id>-<short-name>.replay.json`. Each replay carries the
`(seed, commandLog, expectedFinalStateHash)` triple plus a one-line
human description in `notes`. The replay format itself is owned by
[`tasks/mvp/01-engine-core/08-replay-api.md`](../../tasks/mvp/01-engine-core/08-replay-api.md);
`expectedFinalStateHash` is the additive field this corpus consumes.

## Policy

- Every PR that fixes a mechanics bug must add a replay that fails
  before the fix and passes after. Reviewers refuse the PR if the
  replay is missing or trivially passes against unfixed code.
- A replay never disappears. If a fixed bug becomes obsolete, the
  replay stays as a regression sentinel; only schema migrations may
  rewrite the bytes inside.
- A replay's `expectedFinalStateHash` is updated only when the
  underlying mechanics change is intentional and reviewed; the
  update is the same force-of-will action as a `golden:bless`.

## Initial Corpus

The initial corpus is empty; entries land alongside their fixing PRs.
