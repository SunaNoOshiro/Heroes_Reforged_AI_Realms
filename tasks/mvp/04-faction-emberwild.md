# Module: Faction — Emberwild (M1)

Author the first playable faction. Emberwild is the reference faction
and the canonical example pack: well-scoped stats, one signature
mechanic (Pack Hunt), good for baseline balance testing. Every content
authoring pattern established here becomes the template for all future
factions (including AI-generated ones).

**Milestone**: M1 — Strategic Vertical
**Total Estimate**: ~16 hours
**Exit Criteria**: Emberwild faction loads from a pack, validates
against every schema, and all 7 units appear correctly in combat.

---

## Self-Contained Brief

- **Purpose**: First playable faction; canonical reference pack.
  Every content authoring pattern proven here becomes the template
  for future factions (including AI-generated ones).
- **Public surface**: pack records consumed through
  [`src/contracts/pack-registry.ts`](../../src/contracts/pack-registry.ts);
  ruleset values consumed through
  [`02-content-schemas`](02-content-schemas.md) schemas.
- **Side effects**: this module ships content (no `src/<module>/`
  of its own); see
  [`docs/architecture/side-effect-matrix.md`](../../docs/architecture/side-effect-matrix.md)
  rows for `src/content-runtime/` (loader) and `src/content-schema/`
  (validators).
- **NFR**: balance-corridor compliance per
  [`docs/architecture/content-system-policy.md`](../../docs/architecture/content-system-policy.md)
  and the `BalanceReport` corridor in
  [`docs/architecture/non-functional-requirements.md`](../../docs/architecture/non-functional-requirements.md).
- **Exit criteria**: see header.

---

## Task Files

- [01-emberwild-units-7-units-plus-upgrades.md](04-faction-emberwild/01-emberwild-units-7-units-plus-upgrades.md)
  🤖 Task 1: Emberwild units (7 units + upgrades) (~4h)
- [02-emberwild-town-building-tree.md](04-faction-emberwild/02-emberwild-town-building-tree.md)
  🤖 Task 2: Emberwild town building tree (~3h)
- [03-emberwild-hero-roster.md](04-faction-emberwild/03-emberwild-hero-roster.md)
  🤖 Task 3: Emberwild hero roster (~2h)
- [04-baseline-ruleset.md](04-faction-emberwild/04-baseline-ruleset.md)
  🧠⚠️ Task 4: Baseline ruleset (formula AST) (~4h)
- [05-content-loader-validate-on-load.md](04-faction-emberwild/05-content-loader-validate-on-load.md)
  🤖 Task 5: Content loader — validate on load (~3h)
