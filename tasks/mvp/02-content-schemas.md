# Module: Content Schemas (M0/M1)

Define the data contracts for all game content. Every faction, unit,
spell, artifact, building, hero, map object, adventure building, and
presentation set is validated against these schemas at load time.
Schemas are the source of truth — if the engine references a field that
isn't in the schema, it's a bug.

Reference:
- See [schema-matrix.md](../../docs/architecture/schema-matrix.md) for the concrete record shapes and example JSON.
- Use [`content-schema/schemas/`](../../content-schema/schemas/) as the canonical machine-readable contract folder.
- Use [`content-schema/examples/`](../../content-schema/examples/) for canonical reference packs.

Execution note:
- The numbered task files are historical.
- Actual dependency order inside this module is:
  Tasks 1–6, Task 12, Task 13, Tasks 7–9, Tasks 14–20, Task 10,
  Task 11.
- Follow each task file's `Dependencies:` section when there is any
  conflict with the list order.

**Milestone**: M0/M1  
**Total Estimate**: ~60 hours  
**Exit Criteria**: All core gameplay and presentation schemas validate;
content loader rejects malformed JSON with clear error messages.

---

## Task Files

- [01-unit-schema.md](02-content-schemas/01-unit-schema.md)
  🤖 Task 1: Unit schema (~3h)
- [02-faction-schema.md](02-content-schemas/02-faction-schema.md)
  🤖 Task 2: Faction schema (~2h)
- [03-spell-schema.md](02-content-schemas/03-spell-schema.md)
  🤖 Task 3: Spell schema (~3h)
- [04-artifact-schema.md](02-content-schemas/04-artifact-schema.md)
  🤖 Task 4: Artifact schema (~2h)
- [05-building-schema.md](02-content-schemas/05-building-schema.md)
  🤖 Task 5: Building schema (~2h)
- [06-ruleset-schema.md](02-content-schemas/06-ruleset-schema.md)
  🤖 Task 6: Ruleset schema (~3h)
- [07-hero-schema.md](02-content-schemas/07-hero-schema.md)
  🤖 Task 7: Hero schema (~3h)
- [08-adventure-building-plus-map-object-schemas.md](02-content-schemas/08-adventure-building-plus-map-object-schemas.md)
  🤖 Task 8: Adventure building + map object schemas (~4h)
- [09-animation-vfx-sound-townpresentation-schemas.md](02-content-schemas/09-animation-vfx-sound-townpresentation-schemas.md)
  🤖 Task 9: Animation/VFX/Sound/TownPresentation schemas (~5h)
- [10-zod-validators-for-all-schemas.md](02-content-schemas/10-zod-validators-for-all-schemas.md)
  🤖 Task 10: Zod validators for all schemas (~3h)
- [11-schema-version-field-plus-migration-stub.md](02-content-schemas/11-schema-version-field-plus-migration-stub.md)
  🤖 Task 11: Schema version field + migration stub (~2h)
- [12-formula-dsl.md](02-content-schemas/12-formula-dsl.md)
  🧠⚠️ Task 12: Formula AST DSL (schema + evaluator) (~4h)
- [13-effect-registry.md](02-content-schemas/13-effect-registry.md)
  🧠⚠️ Task 13: Effect registry (schema + handler dispatch) (~4h)
- [14-localization-schema.md](02-content-schemas/14-localization-schema.md)
  🤖 Task 14: Localization schema (~2h)
- [15-world-schema.md](02-content-schemas/15-world-schema.md)
  🤖 Task 15: World schema (~2h)
- [16-quest-schema.md](02-content-schemas/16-quest-schema.md)
  🤖 Task 16: Quest schema (~3h)
- [17-campaign-schema.md](02-content-schemas/17-campaign-schema.md)
  🤖 Task 17: Campaign schema (~3h)
- [18-random-map-template-schema.md](02-content-schemas/18-random-map-template-schema.md)
  🧠 Task 18: Random map template schema (~4h)
- [19-tavern-and-marketplace-tables.md](02-content-schemas/19-tavern-and-marketplace-tables.md)
  🤖 Task 19: Tavern and marketplace tables (~3h)
- [20-university-skill-table.md](02-content-schemas/20-university-skill-table.md)
  🤖 Task 20: University skill table (~3h)
- [21-error-state-schema.md](02-content-schemas/21-error-state-schema.md)
  🤖 Task 21: ErrorState schema (canonical UI error record) (~3h)
- [22-validation-error-contract.md](02-content-schemas/22-validation-error-contract.md)
  🤖 Task 22: ValidationError contract (~3h)
- [23-schema-migration-policy-and-example.md](02-content-schemas/23-schema-migration-policy-and-example.md)
  🤖 Task 23: Schema migration policy and worked example (~4h)
- [24-enum-lifecycle-and-snapshot-gate.md](02-content-schemas/24-enum-lifecycle-and-snapshot-gate.md)
  🤖 Task 24: Enum lifecycle and snapshot gate (~4h)
- [25-default-declarations-and-zod-parity.md](02-content-schemas/25-default-declarations-and-zod-parity.md)
  🤖 Task 25: Default declarations and Zod parity (~4h)
- [26-m2-engine-hash-backfill.md](02-content-schemas/26-m2-engine-hash-backfill.md)
  🤖 Task 26: M2 engine-hash backfill (dormant until M2 ship) (~4h)
- [27-reserve-ai-profile-schema.md](02-content-schemas/27-reserve-ai-profile-schema.md)
  🤖 Task 27: Reserve `ai-profile.schema.json` slot (~2h)
