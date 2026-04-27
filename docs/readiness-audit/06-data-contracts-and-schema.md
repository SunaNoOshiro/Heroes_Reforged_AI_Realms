# 6. DATA CONTRACTS & SCHEMA

> Audit pass over the questions originally listed in this file. Each
> question is preserved verbatim and answered against the current repo
> state. The data-contract layer is the most mature subsystem in the
> repo: 33 JSON Schemas under `content-schema/schemas/`, a closed
> command schema, canonical-JSON + xxh64 spec, and a `validate:contracts`
> CI gate. Runtime code (`src/content-schema/`) is still a stub.

---

### Q: 111. Is every UI screen backed by a typed schema?

**Status:** ⚠ Partial

**Answer:**
Every numbered screen package under
[`docs/architecture/wiki/screens/`](../architecture/wiki/screens/) ships
a `data-contracts.md` that enumerates the **content schemas + runtime
state selectors + commands** it consumes — e.g. `asset-index.schema.json`,
`localization.schema.json`, `ruleset.schema.json`, plus
screen-specific selectors such as `state.shell.availableCommands`. So
each screen is **mapped to** typed schemas it reads from.

What is **not** present is a per-screen "view-model schema" — there is
no `*.screen.schema.json` describing the props/DTO that the screen
component itself receives. The contract is "screen reads from these
content registries + these state selectors", not "this typed
view-model is the input to the screen renderer". Selectors are
listed by name only; their value-shape is not formally typed.

**Evidence:**
- [docs/architecture/wiki/screens/01-main-menu/data-contracts.md](../architecture/wiki/screens/01-main-menu/data-contracts.md) — pattern for every screen
- [docs/architecture/wiki/screens/](../architecture/wiki/screens/) — 60+ screen packages, each with `data-contracts.md`
- ❌ No `screen-view-model.schema.json` family — selectors are referenced but not schema-typed

---

### Q: 112. Are all commands typed with input/output schemas?

**Status:** ⚠ Partial

**Answer:**
**Inputs: yes.** Every command kind is defined in
[`content-schema/schemas/command.schema.json`](../../content-schema/schemas/command.schema.json)
as a closed object (`additionalProperties: false`) with required
fields and per-field types — `MOVE_HERO`, `END_HERO_TURN`, `END_DAY`,
`RECRUIT_UNITS`, … `VISIT_MAP_OBJECT` (~50 kinds). The top-level
schema is a `oneOf` discriminated by the `kind` const.

**Outputs: not separately schema-typed.** The command-dispatcher
contract is the pure reducer `state' = apply(state, command)` — the
"output" is the new `GameState`, not a per-command return shape.
There is no `command-result.schema.json`. Commands that emit derived
events (e.g. `BATTLE_RESOLVED`) are themselves modelled as commands,
so the closure is "commands in → state mutation + zero or more
follow-up commands". This is consistent with the deterministic
reducer model but means **a per-command output contract does not
exist** — callers introspect state instead.

**Evidence:**
- [content-schema/schemas/command.schema.json](../../content-schema/schemas/command.schema.json) — input schemas, all closed
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — prose contract per command
- [docs/architecture/state-flow.md:50](../architecture/state-flow.md#L50) — "Pure reducer; no I/O, no timing"
- ❌ No `command-result.schema.json` — outputs are state mutations, not typed return values

---

### Q: 113. Are schemas authored once and reused across UI, engine, network, and persistence?

**Status:** ✔ Defined

**Answer:**
**Yes — one canonical home, four consumers.** All schemas live under
[`content-schema/schemas/`](../../content-schema/schemas/). The
[`schema-matrix.md`](../architecture/schema-matrix.md) is the single
discovery index. Consumers:

- **Content runtime** (`src/content-runtime/`) — manifest/record load + validation
- **Engine** (`src/engine/`) — pre-dispatch command validation against `command.schema.json`
- **Persistence** (`src/persistence/`) — `SaveRecord` references `Command[]` from the same schema; `contentPackHashes` pinned
- **Network/multiplayer** — same command log + `contentHashes` pinned in `SCENARIO_LOAD`
- **UI** — each screen's `data-contracts.md` references the same `*.schema.json` files
- **AI generation** — `generation-request` / `generated-faction` schemas cross the AI-provider boundary, then the produced pack is validated by the same loaders

The repo enforces this with the canonicality rule in
[`content-schema/README.md`](../../content-schema/README.md):
"Do not create a second 'template' copy of the same contract elsewhere."

**Evidence:**
- [content-schema/README.md:69-77](../../content-schema/README.md#L69-L77) — canonicality rule
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — one index, all consumers
- [docs/architecture/pack-contract.md:28-30](../architecture/pack-contract.md#L28-L30) — "schema is the single source of truth"

---

### Q: 114. What schema language is used (JSON Schema, Zod, Protobuf, custom)?

**Status:** ✔ Defined

**Answer:**
**Two layers, kept in sync.**

1. **JSON Schema (Draft 2020-12)** is the **canonical authoring
   language** — every file under `content-schema/schemas/` declares
   `"$schema": "https://json-schema.org/draft/2020-12/schema"` and a
   namespaced `$id` (`heroes-reforged/<name>.schema.json`). Closed
   discriminated unions use `oneOf` over `kind` consts.
2. **Zod validators** are planned at
   [`src/content-schema/validate.ts`](../../src/content-schema/) and
   used by the runtime loader. A round-trip test
   ([Task 10](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md))
   asserts every example validates under **both** the JSON Schema and
   the Zod validator; disagreement fails the build.

No Protobuf, no custom DSL. Formula values are JSON-encoded ASTs
(`formula.schema.json`), not strings, to avoid a second parser.

**Evidence:**
- [content-schema/schemas/manifest.schema.json:1-3](../../content-schema/schemas/manifest.schema.json#L1-L3) — `$schema` + `$id` pattern
- [tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md:56-59](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md#L56-L59) — JSON Schema ↔ Zod round-trip CI gate
- [docs/architecture/determinism.md:29-37](../architecture/determinism.md#L29-L37) — "Formulas are data" (AST not string)

---

### Q: 115. Are schemas versioned, and is the version embedded in payloads?

**Status:** ✔ Defined

**Answer:**
**Yes — every record carries `schemaVersion: integer ≥ 1` as a
required field.** Confirmed across all 33 record schemas (verified by
grep) and present in every example record. Save files carry
`saveVersion: 1`. Pack manifests carry `schemaVersion` plus a per-pack
semantic `version` and a `contentHash`.

**Evidence:**
- [docs/architecture/schema-matrix.md:10](../architecture/schema-matrix.md#L10) — "Every record has `schemaVersion` and a stable namespaced `id`"
- [content-schema/schemas/unit.schema.json:8-20](../../content-schema/schemas/unit.schema.json#L8-L20) — `schemaVersion` required
- [content-schema/examples/packs/emberwild-faction/units/ash-hound.unit.json:3](../../content-schema/examples/packs/emberwild-faction/units/ash-hound.unit.json#L3) — `"schemaVersion": 1` present
- [docs/architecture/diagrams/24-save-flow.md:31](../architecture/diagrams/24-save-flow.md#L31) — `"saveVersion": 1`
- [docs/architecture/master-plan.md:20](../architecture/master-plan.md#L20) — "Schema evolution is additive-first and migration-backed"

---

### Q: 116. What is the migration policy when schema changes between versions?

**Status:** ⚠ Partial

**Answer:**
**Policy stated, mechanism stubbed.** The stated policy
([`content-platform.md`](../architecture/content-platform.md):"Update
Safety"):

- Treat IDs as public API.
- Add aliases or migrations when renaming.
- Keep deprecated fields readable for **one migration cycle**.
- Make conflicts visible in tooling.
- Reject missing gameplay requirements loudly.
- "New schema evolution should be **additive-first**."

The runtime mechanism is
[`src/content-schema/migrate.ts`](../../src/content-schema/) (Task 11)
which exposes
`migrate(data, fromVersion, toVersion): unknown` with an **empty
migration table** (no migrations needed for v1). The migration runner
exists as a stub; concrete migration entries will be added when the
first breaking change lands.

**Gaps:** no `migrations/` registry directory, no convention for
naming migrations, no deprecation-window length defined beyond "one
migration cycle", no documented procedure for forking a schema's
`schemaVersion` from N → N+1.

**Evidence:**
- [docs/architecture/content-platform.md:78-87](../architecture/content-platform.md#L78-L87) — Update Safety rules
- [tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md](../../tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md) — migration runner stub
- [docs/architecture/master-plan.md:20](../architecture/master-plan.md#L20) — additive-first principle
- ❌ No `docs/architecture/schema-migration-policy.md`
- ❌ No example migration; runner table is empty by design

---

### Q: 117. How is a version mismatch detected at load and at runtime?

**Status:** ⚠ Partial

**Answer:**
**At load** — three checks, all gated:

1. **`schemaVersion` per record** — content loader compares the
   record's `schemaVersion` to the engine's expected version
   ([Task 11](../../tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md)).
2. **`contentHash` per pack** — manifest hash is recomputed at load and
   compared against the save's `contentPackHashes` and (for trusted
   replays/MP) against the manifest's stored `contentHash`. State-flow
   step `C → C1` is "fail loud: contentHash mismatch".
3. **`engineHash`** — pinned in manifests (post-M2 only); pre-M2 it is
   accepted as absent because the engine doesn't exist yet.

**At runtime** — the dispatcher is pure, so version drift cannot
happen mid-game. Desync is detected via xxh64 state-hash exchange
between peers after each turn (`R: recompute xxh64 state hash` in
state-flow). A diverging hash is the runtime equivalent of a "version
mismatch".

**Evidence:**
- [docs/architecture/state-flow.md:13-15](../architecture/state-flow.md#L13-L15) — load-time `contentHash` gate
- [docs/architecture/state-flow.md:33](../architecture/state-flow.md#L33) — runtime xxh64 state hash
- [docs/architecture/pack-contract.md:32-42](../architecture/pack-contract.md#L32-L42) — `contentHash`/`engineHash` semantics
- [tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md:39-42](../../tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md#L39-L42) — load-time version checks
- ⚠ No formal "runtime version-mismatch" event; relies on hash-divergence as proxy

---

### Q: 118. What happens on mismatch — refuse, migrate, degrade?

**Status:** ⚠ Partial

**Answer:**
**Mixed, by mismatch kind** — the policy is consistent in intent but
spread across three docs:

| Mismatch kind | Policy | Behaviour |
|---|---|---|
| `schemaVersion` is **older** than engine | **migrate** | Run migration table; currently no-op + console warning |
| `schemaVersion` is **newer** than engine | **refuse** | Error: "Content version 99 requires engine upgrade" |
| `contentHash` mismatch on multiplayer / trusted replay | **refuse loud** | State-flow `C → C1` |
| `contentPackHashes` mismatch on save load (offline) | **degrade with warning** | "Content pack changed since save"; loads anyway |
| `engineHash` mismatch (post-M2) | **refuse** | Fails at load |
| Schema validation failure (unknown field, bad enum, etc.) | **refuse loud** | `validateAll` → `Err` with field path |

The pattern: trusted contexts (MP, ranked replay) **refuse**; offline
single-player **degrades with warning**; past versions **migrate**;
future versions **refuse**.

**Gap:** no single table consolidates this. The above is reconstructed
from separate task acceptance criteria + state-flow + content-platform
+ pack-contract.

**Evidence:**
- [tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md:39-42](../../tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md#L39-L42) — version policy
- [tasks/mvp/08-persistence/02-log-only-save-format.md:50](../../tasks/mvp/08-persistence/02-log-only-save-format.md#L50) — pack-hash warning behaviour
- [docs/architecture/state-flow.md:13-15](../architecture/state-flow.md#L13-L15) — refuse-loud at load
- ❌ No consolidated mismatch decision matrix

---

### Q: 119. Are enum values stable across versions?

**Status:** ⚠ Partial

**Answer:**
**By policy, yes; by mechanism, only partly.** The repo treats closed
enums as part of the public contract:

- `command.schema.json` `kind` consts are closed — adding a kind is
  additive; removing one is a breaking change.
- `manifest.capabilities` is "a closed enum in the schema. New
  capability strings require a schema change and a runtime policy
  update" ([pack-contract.md:62-66](../architecture/pack-contract.md#L62-L66)).
- `resource-id.schema.json`, `stat-id`, `status-id`, effect kinds, and
  spell schools are closed enums shared across schemas.
- IDs are explicitly "treat IDs as public API" with renaming requiring
  aliases or migrations ([content-platform.md:82-83](../architecture/content-platform.md#L82-L83)).

**What's missing:** no formal "enum value lifecycle" document. There
is no convention for **deprecating** an enum value (mark deprecated?
keep accepting in input but never emit?), no aliasing scheme like
`{ "old_name": "new_name" }` for renamed enum values, and no CI gate
that flags removal of an enum value as breaking.

**Evidence:**
- [docs/architecture/pack-contract.md:62-66](../architecture/pack-contract.md#L62-L66) — closed `capabilities` enum policy
- [docs/architecture/content-platform.md:82-87](../architecture/content-platform.md#L82-L87) — IDs as public API, aliases/migrations
- [content-schema/schemas/resource-id.schema.json](../../content-schema/schemas/resource-id.schema.json) — closed resource enum
- ❌ No enum-deprecation policy; no enum-rename alias mechanism in `migrate.ts`

---

### Q: 120. Are optional fields explicitly marked, with defined defaults?

**Status:** ⚠ Partial

**Answer:**
**Optional vs required: explicit. Defaults: rarely declared in schema.**
Every record schema lists a `required: [...]` array; anything outside
that array is optional. `additionalProperties: false` is mandated by
the schema-authoring rules
([schemas/README.md:24](../../content-schema/schemas/README.md#L24)),
so unknown fields fail validation rather than silently defaulting.

What is **not** systematic is `default` declarations on optional
fields. Spot-check of `unit.schema.json`, `manifest.schema.json`, and
`command.schema.json`: no `default` keywords. Defaults are documented
in **prose** (e.g. "if `growth.weekly` absent, derive from
`baseWeekly`") rather than declared as `default` in JSON Schema, so
they're enforced only by runtime convention, not by the schema.

This means a Zod validator and the JSON Schema validator could each
fill in different defaults, or skip filling at all, without a CI gate
catching the divergence.

**Evidence:**
- [content-schema/schemas/README.md:24](../../content-schema/schemas/README.md#L24) — `additionalProperties: false` mandate
- [content-schema/schemas/unit.schema.json:6-19](../../content-schema/schemas/unit.schema.json#L6-L19) — `required` list pattern
- ⚠ Spot-checked schemas contain no `"default":` keywords
- ❌ No "default-policy" doc; no Zod-default ↔ JSON-Schema-default round-trip

---

### Q: 121. Is serialization deterministic (key order, number formatting)?

**Status:** ✔ Defined

**Answer:**
**Yes — fully specified.** Two complementary serializers, both
canonical:

- **State serializer** ([Task 7](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md))
  — keys sorted alphabetically, no `undefined`, no `NaN`/`Infinity`,
  arrays stable-sorted where order doesn't matter.
- **Canonical JSON for content** ([Task 7b](../../tasks/mvp/01-engine-core/07b-canonical-json.md))
  — sorted object keys (UTF-8 codepoint order), no whitespace, no
  trailing newline, every number an integer (strings for non-integer
  numerics), no `undefined`/`NaN`/`Infinity`, `\uXXXX` escapes for
  control characters only. Bytes are deterministic across OS, locale,
  Node version, and browser runtime.

`determinism.md` reinforces: "All state numbers serialize as integer
JSON literals. No exponents, no `Infinity`, no `NaN`. String order is
Unicode-codepoint ascending. Map iteration uses explicit sorted keys
where it affects state."

**Evidence:**
- [tasks/mvp/01-engine-core/07b-canonical-json.md:17-22](../../tasks/mvp/01-engine-core/07b-canonical-json.md#L17-L22) — canonical bytes spec
- [tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md:8](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md#L8) — state canonical serializer
- [docs/architecture/determinism.md:62-67](../architecture/determinism.md#L62-L67) — cross-platform portability rules

---

### Q: 122. Are floats banned in serialized state?

**Status:** ✔ Defined

**Answer:**
**Yes — banned across the deterministic stack.** Multiple enforcement
layers:

- `determinism.md`: "JavaScript floats in gameplay math" is in the
  "Forbidden in deterministic paths" list.
- Canonical JSON: "every number an integer (strings for non-integer
  numerics)".
- ESLint rule
  ([Task 5](../../tasks/mvp/01-engine-core/05-eslint-rule-ban-math-random-and-floats-in-src-engine.md))
  bans floats in `src/engine`.
- Ruleset constants stored as **integer numerator/denominator pairs**
  (e.g. `atkBonusPerPointNum=1, atkBonusPerPointDen=20`).
- Movement costs stored as **integer ×100** units (per pathfinder
  acceptance criterion in `04-a-pathfinder-with-terrain-cost-plus-zoc.md`).
- Schema-level: `unit.stats.hp/attack/defense/speed/...` and resources
  are `"type": "integer"` — float would fail JSON Schema.

The one acknowledged inconsistency is the prose-level decimal terrain
table in `diagrams/23-hero-movement.md` (flagged in audit 05); the
canonical integer ×100 table is authoritative.

**Evidence:**
- [docs/architecture/determinism.md:21-27](../architecture/determinism.md#L21-L27) — forbidden list
- [docs/architecture/determinism.md:39-52](../architecture/determinism.md#L39-L52) — fixed-point conventions
- [tasks/mvp/01-engine-core/05-eslint-rule-ban-math-random-and-floats-in-src-engine.md](../../tasks/mvp/01-engine-core/05-eslint-rule-ban-math-random-and-floats-in-src-engine.md) — lint gate
- [content-schema/schemas/unit.schema.json:41-47](../../content-schema/schemas/unit.schema.json#L41-L47) — integer-only stats

---

### Q: 123. Is there a canonical hash of the state for desync detection?

**Status:** ✔ Defined

**Answer:**
**Yes — xxh64 over canonical-JSON bytes.** The engine exposes
`hashState(state: GameState): bigint`
([Task 7](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md)).
Used by:

- **Save format** — `stateHash` field in the save record
  ([24-save-flow.md](../architecture/diagrams/24-save-flow.md)).
- **Multiplayer desync detection** — peers exchange the hash after
  every turn; mismatch flags desync immediately
  ([26-multiplayer-sync.md](../architecture/diagrams/26-multiplayer-sync.md)).
- **Replay verification** — load returns a state with identical hash
  to save time
  ([Task 02 of persistence](../../tasks/mvp/08-persistence/02-log-only-save-format.md):49).
- **Fuzz harness** — N random commands produce bit-identical hashes
  across runs
  ([Task 9](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)).

Acceptance criterion: "Hash is identical on Node 20, Chrome 120,
Firefox 121, Safari 17 for the same state."

**Evidence:**
- [tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md:18-33](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md#L18-L33)
- [docs/architecture/state-flow.md:33](../architecture/state-flow.md#L33) — `recompute xxh64 state hash`
- [docs/architecture/diagrams/26-multiplayer-sync.md:24-26](../architecture/diagrams/26-multiplayer-sync.md#L24-L26) — desync exchange
- [docs/architecture/determinism.md:7-18](../architecture/determinism.md#L7-L18) — non-negotiable stack

---

### Q: 124. Are schema validation errors logged with full path context?

**Status:** ⚠ Partial

**Answer:**
**Specified but not yet uniformly enforced.** The validator contract
([Task 10](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md))
includes:

- "`validateAll` on a pack with one malformed unit returns `Err` with
  the **unit ID and field path** in the error."
- Discriminated unions emit specific messages like "unknown effect
  kind X" — not a generic union-miss.
- Hero specialty validation: "cross-kind fields fail with a
  field-path error."
- "Errors are human-readable (not raw Zod internals)."

What's **not** present:

- No central error-logging contract (no `logValidationError(path,
  schemaId, value)` helper specified).
- No structured-log shape (e.g. `{ packId, recordId, jsonPointer,
  rule, expected, actual }`) defined for downstream tooling.
- The `check-repo-contracts.mjs` CI script validates against schemas
  but the prose doesn't pin its error format.

So the **acceptance criterion** for Zod validators requires path
context, but the broader cross-cutting concern of "all validation
failures everywhere ship full path context" is not codified.

**Evidence:**
- [tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md:47-55](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md#L47-L55)
- [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs) — repo-wide schema validator (CI)
- ❌ No "validation-error logging contract" doc

---

### Q: 125. Is round-trip serialization tested in CI?

**Status:** ✔ Defined

**Answer:**
**Yes — multiple round-trip tests are gated in CI.** Catalogue:

- **Canonical JSON fuzz**: 10 000 random JSON-compatible values,
  re-serialize → re-parse → re-serialize returns identical bytes
  ([Task 7b:38-39](../../tasks/mvp/01-engine-core/07b-canonical-json.md#L38-L39)).
- **State serializer round-trip**: `deserialize(serialize(state))`
  produces a state with identical hash
  ([Task 7:32](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md#L32)).
- **JSON Schema ↔ Zod**: every JSON example under
  `content-schema/examples/**/*.json` validates under both
  validators; disagreement fails the build
  ([Task 10:56-59](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md#L56-L59)).
- **AI generation fixture**: `emberwild-roundtrip.json` (request +
  expected draft output) round-trips both Zod validators
  ([Phase-3 generation-io](../../tasks/phase-3/02-ai-generation/00-generation-io-schemas.md):52,64).
- **Persistence**: IndexedDB `set` + `get` round-trip preserves exact
  object
  ([Task 1:33](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md#L33)).
- **Save replay**: load replays commands and returns state with
  identical hash to save time
  ([Task 2:49](../../tasks/mvp/08-persistence/02-log-only-save-format.md#L49)).
- **Hex coords**: `axialToScreen ↔ screenToAxial`, `axialToPixel ↔
  pixelToAxial` round-trip tests.
- **Hash-pack CI gate**: `scripts/hash-pack.mjs --check` fails CI if
  any manifest's `contentHash` disagrees with its content.

CI entry-points: `npm run validate:contracts`,
`npm run validate:cross-refs`, `npm test`, all wired into
`npm run validate`.

**Evidence:**
- [package.json:10-15](../../package.json#L10-L15) — `validate` script chain
- [tasks/mvp/01-engine-core/07b-canonical-json.md:38-39](../../tasks/mvp/01-engine-core/07b-canonical-json.md#L38-L39) — canonical-JSON fuzz
- [tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md:56-59](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md#L56-L59) — schema↔Zod round-trip
- [tasks/mvp/08-persistence/02-log-only-save-format.md:49](../../tasks/mvp/08-persistence/02-log-only-save-format.md#L49) — save-replay hash equality

---

## 🔍 Summary

### Missing Logic
- **No per-screen view-model schema family.** Each screen lists which
  content schemas + selectors it consumes, but the props/DTO that the
  screen renderer receives is not itself schema-typed.
- **No per-command output schema.** Outputs are state mutations; this
  is intentional under the reducer model but means no machine-readable
  "what changes after `MOVE_HERO`" contract exists.
- **No consolidated version-mismatch decision matrix.** Behaviour
  (refuse / migrate / degrade) is correct in spirit but reconstructed
  from four separate docs (`state-flow`, `pack-contract`,
  `content-platform`, persistence task 02). One canonical table is
  missing.
- **No enum-value lifecycle policy.** Closed enums are everywhere;
  what is missing is a documented procedure for deprecating, renaming,
  or aliasing an enum value, plus a CI gate that flags enum removal as
  breaking.
- **`default` keyword absent from schemas.** Optional fields are
  marked, but defaults are prose-only — Zod and JSON Schema validators
  could fill differently with no CI to catch.
- **`migrate.ts` is stubbed.** No `migrations/` registry, no naming
  convention, no example migration. First breaking change will need to
  define this on the fly.
- **No structured "validation error log" contract.** Path-in-error is
  required for Zod validators only; no project-wide log shape.

### Risks
- **First breaking schema change will hit an empty migration runner**
  with no precedent for how to write or test a migration → high risk
  of an ad-hoc solution that becomes the load-bearing pattern.
- **Enum removal is technically silent** — closing an enum is a hard
  break for any saved game/replay containing the removed value, and
  there is no CI gate that detects "value present in commit N-1, gone
  in commit N".
- **`engineHash` is optional pre-M2.** Once M2 ships, every existing
  pack manifest needs a one-time engine-hash backfill; the migration
  for that transition is not scheduled as a task.
- **Save-on-mismatch is "warn and load" offline but "refuse" online.**
  The same save loaded in two contexts can succeed or fail — useful
  but surprising; needs to be made obvious in UI copy.
- **Float-ban depends on ESLint scope.** Lint covers `src/engine` only;
  formula evaluators or content-runtime helpers outside that path
  could reintroduce floats.

### Improvements
- Author `docs/architecture/schema-migration-policy.md` with: how to
  bump `schemaVersion`, deprecation window length, naming convention
  for migration entries (`v1-to-v2-rename-foo.ts`), and one fully
  worked example.
- Add a "version-mismatch decision matrix" table to either
  `state-flow.md` or a new `version-policy.md`. One table, all
  contexts.
- Add CI gate: enumerate all `enum` values in every schema, snapshot
  the list, fail PR if a value disappears without an aliasing
  migration entry.
- Add `default` declarations to JSON Schemas where prose currently
  states a default; have Zod validators consume the same defaults.
- Define a single `ValidationError` shape (`packId`, `recordId`,
  `jsonPointer`, `rule`, `expected`, `actual`) and route both
  `check-repo-contracts.mjs` and the runtime validator through it.
- Schedule a one-shot task for the engine-hash backfill at M2.
- Extend the float-ban ESLint rule to `src/rules/`,
  `src/content-runtime/`, and `src/content-schema/`.
- Consider a per-screen `screen-view-model.schema.json` (or at least
  TypeScript types generated from `data-contracts.md`) so the
  renderer's input is contract-checked.

### AI-Readiness
**Score: 8 / 10**

**Reason:**
The data-contract layer is the most mature, well-documented, and
AI-friendly part of the repo. An AI implementer is handed:

- 33 closed JSON Schemas with canonical examples (one example per
  record kind).
- A single discovery index (`schema-matrix.md`).
- A canonical-JSON spec, an xxh64 hashing spec, and a CI script
  (`hash-pack.mjs`) that enforces both.
- A closed command vocabulary with `additionalProperties: false`.
- Round-trip tests as acceptance criteria, so "did I implement
  serialization correctly?" is mechanically answerable.

The 2 points off are for: (a) the migration runner exists only as a
stub with no example, so the first non-trivial schema evolution has no
precedent; (b) the gaps above (enum lifecycle, default declarations,
view-model schemas, validation-error log shape) leave room for
inconsistent implementations across agents working in parallel. Fix
those and this section is a 10.
