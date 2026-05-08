# Named RNG sub-stream catalogue

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Pin the canonical list of PCG32 sub-stream names every reducer call
site is allowed to fork. Without this, the first new system that
calls `rng.next()` silently shifts every other system's draw sequence
and breaks every existing replay.

This task delivers the catalogue document and the cross-links from
[`determinism.md`](../../../docs/architecture/determinism.md),
[`glossary.md`](../../../docs/architecture/glossary.md), and the
top-level state shape so engine implementers cannot miss it. No
runtime engine code is shipped here.

Source audit:
[`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
(Q10, Issue 3.D-1).

Read First:
- [`docs/implementation-plans/01-core-architecture-plan.md`](../../../docs/implementation-plans/01-core-architecture-plan.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Audit Q10 in
  [`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)

Outputs:
- `docs/architecture/rng-streams.md` — canonical catalogue
- Cross-links from `determinism.md`, `glossary.md`, and
  `state-shape.md`

Owned Paths:
- `docs/architecture/rng-streams.md`

Dependencies:
- None

Acceptance Criteria:
- Catalogue lists at least the ten initial sub-streams from the source
  plan (`damage`, `morale`, `luck`, `mage-guild`, `hero-traits`,
  `creature-growth`, `treasure`, `combat-init`, `rmg`, `ai-decision`).
- Add-a-stream rule explicitly forbids renaming or retiring an entry
  once shipped.
- `glossary.md` has a "named sub-stream" entry pointing here.
- `determinism.md` step 1 references this catalogue by path.

Verify:
- npm run validate

Estimated Time:
- 2 hours
