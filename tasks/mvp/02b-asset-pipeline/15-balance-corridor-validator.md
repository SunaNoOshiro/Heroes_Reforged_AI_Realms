# Balance Corridor Validator

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Encode the per-tier numeric corridor from
[`research/deep-research-report.md`](../../../research/deep-research-report.md)
§ 1 into a JSON spec and ship a validator with two gates:

- **Per-unit corridor.** Walk every unit in a pack; each numeric stat
  must fall inside the tier's `lo`/`hi` band widened by per-stat
  `tolerance` factors. Out-of-band → `pack.error.balance.outOfCorridor`.
- **Per-pack faction budget.** Compute each unit's normalized skew
  across every numeric stat (-1 = at tier `lo`, 0 = tier mid, +1 = at
  tier `hi`); the pack's average unit skew must fall within
  `factionBudget.skewThreshold`. Without this gate a pack where every
  unit sits at the top of its band would pass per-unit but be
  objectively stronger than other factions. Out of band →
  `pack.error.balance.factionImbalance`. Packs with fewer than
  `factionBudget.minUnits` units are skipped (no balance to enforce).

First-party (non-sandbox) packs are fatal on either failure;
sandboxed packs warn with a `BALANCE-WARN` badge but still load. The
validator is wired into `npm run validate` for first-party packs and
runs as a publish gate for community imports.

Read First:
- [`docs/architecture/content-system-policy.md`](../../../docs/architecture/content-system-policy.md)
- [`docs/architecture/pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)
- [`research/deep-research-report.md`](../../../research/deep-research-report.md)

Inputs:
- `content-schema/balance/corridor.json`
- `content-schema/balance/corridor.schema.json`
- Unit records under `content-schema/examples/packs/` and
  `resources/packs/`

Outputs:
- `content-schema/balance/corridor.json` with per-tier `lo`/`hi`
  values plus a `tolerance` block of per-stat multipliers.
- `content-schema/balance/corridor.schema.json` describing the
  spec.
- `scripts/validate-balance.mjs` exporting
  `collectBalanceViolations()` and a CLI runner.
- `npm run validate:balance` script entry, wired into `npm run validate`.

Owned Paths:
- `content-schema/balance/corridor.json`
- `content-schema/balance/corridor.schema.json`
- `scripts/validate-balance.mjs`

Owned Paths (shared):
- `package.json`

Dependencies:
- mvp.02b-asset-pipeline.16-pack-error-code-catalog
- mvp.02b-asset-pipeline.11-content-system-policy-doc

Acceptance Criteria:
- The canonical emberwild pack passes the validator with zero
  violations.
- A unit with HP=50000 at any tier fails with
  `pack.error.balance.outOfCorridor`.
- A unit with ATK=1 at tier 7 fails with
  `pack.error.balance.outOfCorridor`.
- A 3-unit pack where every unit sits at the top of its tier band
  (every per-unit check still passes) fails with
  `pack.error.balance.factionImbalance` because the pack-wide
  average skew exceeds `factionBudget.skewThreshold`.
- A 3-unit pack where one unit is high, one low, one mid passes
  the faction-budget gate.
- A sandboxed pack with either kind of out-of-band content warns
  instead of failing.
- A pack with fewer than `factionBudget.minUnits` units skips the
  pack-skew gate (no balance to enforce).
- `npm run validate:balance` exits 0 against the current repo and
  reports any violation by code, severity, file, and stat.
- Shared-path edits to `package.json` are additive only — one new
  `validate:balance` script entry; must not rewrite existing script
  entries; primary owner of `package.json` remains the workspace
  setup task.

Verify:
- npm run validate:balance
- npm run validate

Estimated Time:
- 4 hours
