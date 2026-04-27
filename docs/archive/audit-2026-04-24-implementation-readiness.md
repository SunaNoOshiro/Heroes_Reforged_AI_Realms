# Implementation-Readiness Pass — 2026-04-24

Follow-up to [audit-2026-04-22-full-repo.md](./audit-2026-04-22-full-repo.md).
This note records the fixes landed today against the four critical
findings that were blocking first-line runtime work. It is not an
independent audit; it is the green-light checklist for starting
[`src/`](../../src/) implementation.

## Critical Findings: Status

| 2026-04-22 ID | Finding | Status | Evidence |
|---|---|---|---|
| C1 | Combat-math constants drift across 4 sources | **Resolved** | `docs/architecture/determinism.md:47-52` no longer references the obsolete percent cap; `scripts/__tests__/constant-drift.test.mjs` now gates every prose mention against [`baseline.ruleset.json`](../../content-schema/examples/records/rulesets/baseline.ruleset.json). |
| C2 | Shared-pack model missing | **Resolved** | [`shared-abilities/`](../../content-schema/examples/packs/shared-abilities/) now exposes 5 abilities; [`shared-skills/`](../../content-schema/examples/packs/shared-skills/) now exposes 4 skills; [`packs/README.md`](../../content-schema/examples/packs/README.md) documents the dependency model. |
| C3 | No runtime validator chosen | **Resolved** | [`src/content-schema/README.md`](../../src/content-schema/README.md) locks in Zod with a three-reason ADR; task 02-content-schemas/10 adds discriminated-union acceptance and a JSON-Schema↔Zod round-trip requirement. |
| C6 | Hero specialty schema was an open bag | **Resolved** | [`hero.schema.json`](../../content-schema/schemas/hero.schema.json) now uses a `oneOf` discriminated union over 5 specialty kinds; cross-kind fields fail validation. Task 02-content-schemas/07 acceptance criteria updated. |

## Remaining (non-blocking) Findings

Carried forward from the 2026-04-22 audit; none are load-bearing for
starting implementation:

- **C4** (`src/` is 100 % stubs) — intentional until the engine task
  runs. Re-audit once the deterministic foundation lands.
- **C5** (`tasks/task-registry.json` tracked in git) — cosmetic CI
  footgun. Safe to defer; the implementation log from 2026-04-21
  already noted it should leave version control, but the current
  `.gitignore` does not yet exclude it.
- Task splits for [`09-tactical-combat/`](../../tasks/mvp/09-tactical-combat/)
  where individual tasks describe 3+ sub-systems — worth splitting,
  not blocking.

## Gate Criteria For Starting `src/engine/`

All four of these must be green:

1. `npm run validate` passes. ✅
2. `npm test` passes (all sanity + drift tests). ✅
3. [`baseline.ruleset.json`](../../content-schema/examples/records/rulesets/baseline.ruleset.json)
   constants match every live prose mention outside
   `docs/planning/audits/`. ✅ (enforced by constant-drift.test.mjs)
4. Every `oneOf` union in the schemas (Effect, Hero specialty) has a
   corresponding discriminator-aware acceptance criterion in the
   validator task. ✅

## Next Up

Follow [`solo-build-lane.md`](../planning/solo-build-lane.md). The engine-core
task 01-engine-core/01 is now unblocked.
