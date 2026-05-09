# Fresh-session seed-source precedence

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Loaded games and replays inherit their seed from the saved triple.
For a brand-new session, the source was undocumented (scenario field?
random-map roll? UI input?). Two implementers would pick
differently. This task pins the precedence so tournament games,
fixed-seed scenarios, and random-map games can all be reproduced.

Precedence (first match wins):
1. Explicit user input (tournament codes, daily challenges, replay
   import).
2. Scenario `seed` field if present.
3. `ROLL_RMG_SEED` command result for random-map games.
4. CSPRNG fallback at session start, pinned into the log immediately.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Existing `SCENARIO_LOAD` command in `command-schema.md`

Outputs:
- "Seed Source Precedence" subsection under `SCENARIO_LOAD` in
  [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- Cross-link from
  [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- "Seed source" entry in
  [`docs/architecture/glossary.md`](../../../docs/architecture/glossary.md)

Owned Paths:
- (none — additive subsection in the existing command-schema doc; primary owner is mvp.01-engine-core.06b-extend-command-schema-coverage-checklist)

Dependencies:
- None

Acceptance Criteria:
- `command-schema.md` `SCENARIO_LOAD` block lists the four-step
  precedence, names each UI surface that supplies an explicit seed,
  and references `ROLL_RMG_SEED` for random-map games.
- `determinism.md` step-5 (Replay API) cites the seed-source
  precedence section by anchor.
- `glossary.md` has a "seed source" entry pointing to the new section.

Verify:
- npm run validate

Estimated Time:
- 2 hours
