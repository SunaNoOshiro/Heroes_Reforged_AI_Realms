# Glossary

Domain vocabulary for the project. When a term appears in a task file or
schema, the canonical one-line definition lives here. Add entries before
introducing new jargon.

## Core Engine

- **Deterministic path** — any code that advances game state. Must use
  only seeded RNG, fixed-point math, and canonical ordering. Never wall
  clock, never `Math.random()`, never uncontrolled floats.
- **Fixed-point** — integers used to represent fractions. Ratios are
  stored as paired numerator/denominator integers; multiply first,
  divide last.
- **Canonical JSON** — the one serialization of game state (sorted keys,
  no whitespace, integers without exponent) used for hashing and
  replays.
- **Content hash** — hex digest of canonical-JSON over every record in a
  pack. Pinned by saves, replays, and multiplayer.
- **Command** — an atomic, serializable player or AI action. The engine
  is a reducer: `state = apply(state, command)`.
- **GameState** — the closed top-level value the reducer consumes.
  Normalized `byId` collections, frozen plain objects, structural
  sharing across reducer steps. Shape pinned in
  [`state-shape.md`](./state-shape.md) and
  [`game-state.schema.json`](../../content-schema/schemas/game-state.schema.json).
- **Replay** — the ordered list of commands plus the seed and ruleset
  ids. Replaying regenerates the state without storing it.
- **Named sub-stream** — one PCG32 generator forked from the root seed
  by name (`damage`, `morale`, `mage-guild`, ...). Each stream advances
  independently so adding a new system never shifts existing draw
  sequences. Catalogue:
  [`rng-streams.md`](./rng-streams.md).
- **Command nonce** — the per-actor, per-turn dedup key
  `<actorId>:<turn>:<sequence>` carried in every command's metadata.
  The dispatcher rejects repeats; the format also supplies the
  `(actorId, turn, sequence)` ordering tuple. See
  [`command-schema.md` § Deduplication](./command-schema.md#deduplication).
- **Dispatcher queue** — the single bounded FIFO per engine instance.
  Capacity 1024, hard-reject overflow, single-threaded drain. See
  [`command-schema.md` § Dispatcher Queue](./command-schema.md#dispatcher-queue).
- **Cross-actor ordering** — the canonical tie-break rule when more
  than one actor (hotseat, AI co-actor, multiplayer peer) emits
  commands in the same window. See
  [`command-schema.md` § Cross-Actor Ordering](./command-schema.md#cross-actor-ordering).
- **Seed source** — the precedence list that resolves
  `SCENARIO_LOAD.seed` for a fresh session: explicit user input >
  scenario field > `ROLL_RMG_SEED` > CSPRNG fallback. See
  [`command-schema.md` § Seed Source Precedence](./command-schema.md#seed-source-precedence).
- **Multi-engine harness** — the test fixture that runs two
  `createEngine()` instances side by side and compares their state
  hashes after each command to catch determinism leaks. See
  [`multi-engine-harness.md`](./multi-engine-harness.md).
- **Frame-time tier** — the renderer's degradation bucket
  (Green / Amber / Orange / Red) selected from the rolling-average
  frame time. Each tier prescribes which presentation features stay
  on. See
  [`renderer-technology-choice.md` § Frame-Time Budget &amp; Degradation](./renderer-technology-choice.md#frame-time-budget--degradation).

## Content Model

- **Pack** — one folder under `resources/packs/` with one `manifest.json`.
  The extension boundary for the engine.
- **Record** — one gameplay-or-presentation JSON file (unit, hero,
  spell, artifact, etc.) with a stable namespaced id.
- **Stable ID** — a `<packId>:<kind>:<local>` string that is public API
  for authored content. Never reused, aliased on rename. Mid-game
  entities (recruited stacks, captured mines, summons, RMG objects) use
  the runtime form `<kind>:<turn>:<actorId>:<perTurnCounter>` minted by
  the deterministic allocator in
  [`id-allocator.md`](./id-allocator.md); both forms share the
  "stable, never-reused" contract.
- **Registry** — in-memory map from id to resolved record used at
  runtime. Assembled by `src/content-runtime/` once per game start.
- **Ruleset** — balance constants and formulas. Structured fixed-point
  AST, not strings; see
  [`content-schema/schemas/formula.schema.json`](../../content-schema/schemas/formula.schema.json).
- **Effect** — one item in the effect registry; discriminated by `kind`.
  Consumed by spells, abilities, artifacts, skills, and buildings.

## Adventure Map

- **Adventure map** — the strategic-layer hex map. One tile = one hex.
- **Stack** — a group of identical units that fight as one entity.
- **Neutral stack** — a wandering NPC stack not owned by any player.
- **Dwelling** — a building that produces a unit on a weekly cadence.
- **Mine** — an adventure building that yields resources per day while
  owned.
- **Fog of war** — per-player mask over map visibility, recomputed from
  hero/town line-of-sight each turn.
- **Town** — a player-owned capital. Builds structures, recruits, casts
  adventure spells.

## Tactical Combat

- **Battlefield** — the tactical hex grid that a battle runs on.
- **Initiative queue** — speed-ordered list of which stack acts next.
- **Retaliation** — automatic counterattack once per round, nullifiable
  by specific abilities.
- **Morale / luck** — probability-of-bonus-turn and probability-of-double-
  damage rolls. Expressed in the ruleset as integer numerators.

## Heroes

- **Hero** — a mobile commander. Has an army, primary stats, secondary
  skills, artifacts, specialty.
- **Paper doll** — the inventory layout that equips artifacts into slots.
- **Primary stats** — attack, defense, power, knowledge. Contribute
  directly to combat formulas.
- **Secondary skill** — passive hero trait with up to three mastery
  tiers (basic, advanced, expert).
- **Specialty** — a hero-specific bonus (unit, spell, skill, or
  resource).
- **Mastery tier** — a spell or skill's scaling bucket; the same spell
  has three sets of effects keyed by tier.

## H3 Alias Anchors

Heroes-III community vocabulary that maps onto our canonical terms.
Use these aliases when reading external H3 references; the canonical
term on the right is the only one that should appear in code, schemas,
and task acceptance criteria.

- **Wandering monster** → **neutral stack** (see
  [`content-schema/schemas/neutral-stack-template.schema.json`](../../content-schema/schemas/neutral-stack-template.schema.json)).
- **Wandering monster template** → **neutral stack template** (the
  schema-backed spawn template for neutral map armies; see
  [`content-schema/schemas/neutral-stack-template.schema.json`](../../content-schema/schemas/neutral-stack-template.schema.json)).
- **Creature** → **unit** (stored in
  [`content-schema/schemas/unit.schema.json`](../../content-schema/schemas/unit.schema.json)).
- **Adventure object** → **map object** (stored in
  [`content-schema/schemas/map-object.schema.json`](../../content-schema/schemas/map-object.schema.json)).
- **External dwelling / creature dwelling** → **dwelling** (an
  adventure building or town building that produces units on a weekly
  cadence).
- **Primary skill** → **primary stat** (`attack`, `defense`, `power`,
  `knowledge`; stored on `hero.schema.json`).
- **Secondary skill tree** → **secondary skill catalog** (stored in
  [`content-schema/schemas/skill.schema.json`](../../content-schema/schemas/skill.schema.json)).
- **Specialist hero** → **hero specialty** (a `Specialty` record on the
  hero; see the `Specialty` entry in `## Heroes`).
- **Hero biography / scenario log** → **status history** (the planned
  `status-history-store` in `phase-2.08-meta-systems`).
- **Town portrait fly-in** → **town flyby** (screen `35-town-flyby`).

When introducing a new H3 alias, add the entry here before referencing
it from a task body or schema description.

## AI and Generation

- **Provider-neutral** — code that depends on
  `GenerationProvider`/`ModerationProvider` interfaces, not a vendor SDK.
- **Generation request** — the structured input to
  `GenerationProvider.generateStructured`.
- **Generated faction** — the raw provider output. Becomes a loadable
  pack only after schema validation, coherence check, and auto-balance.
- **Auto-balancer** — the headless-battle runner that estimates win-rate
  vs a reference faction and feeds a stat optimizer.
- **Sandbox pack** — a pack with `sandboxed: true`. Excluded from ranked
  and trusted flows; restricted by runtime policy.

## Milestones

- **M0** deterministic skeleton — replay fuzz passes.
- **M1** strategic vertical — solo adventure loop playable.
- **M2** tactical combat — two factions can fight in real battles.
- **M3** depth — spells, artifacts, skills, stronger AI.
- **M4** platform authoring — packs and editor workflows usable.
- **M5** multiplayer — two-machine lockstep match works.
- **M6** AI generation — generate and play new content.
- **M7** polish — advanced AI, rendering, tournament quality.
