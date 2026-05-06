# Master Plan

This file is intentionally compact. It is the shortest single-file
summary of the repo.

> **Mechanic scope register:** the SSOT for what's in / out of scope per
> milestone is [`mechanics-coverage.md`](mechanics-coverage.md). Read
> that before adding "out of scope" lines to any task.

## Project

Heroes Reforged is a deterministic turn-based strategy engine plus a
creator platform. Players should eventually be able to create factions,
units, worlds, heroes, buildings, spells, artifacts, map objects, and
presentation packs without changing engine code.

## Non-Negotiables

1. Engine is pure; rules are data.
2. Simulation is deterministic and replayable.
3. Gameplay and presentation stay separate.
4. Packs are the extension boundary.
5. Stable IDs are public API.
6. Schema evolution is additive-first and migration-backed.
7. Every byte from a peer, browser, DataChannel, WebSocket frame,
   pack archive, save file, AI prompt, or worker message is
   adversarial input until validated by a named gate. See
   [`trust-boundaries.md`](./trust-boundaries.md).

## Repo Shape

```text
content-schema/   canonical schemas + examples
src/              runtime implementation modules
resources/        packs + assets
docs/             architecture + planning
tasks/            detailed execution files
services/         optional backend services
```

Important `src/` modules:

- `engine` deterministic state and commands
- `rules` formulas and ruleset evaluation
- `content-schema` runtime validation and migrations
- `content-runtime` pack loading and override resolution
- `renderer` map, battle, animation playback
- `ui` shell and gameplay UI (includes `ui/editor/` for content authoring screens)
- `editor` reserved for non-UI editor logic split out from `ui/editor/` if it grows
- `ai` bots, balancing, generation. The shared headless tournament
  harness and metrics shape live in
  [testing/ai-tournament-harness.md](testing/ai-tournament-harness.md).
- `net` multiplayer. The deterministic test transport contract is
  pinned in [net-transport.md](net-transport.md).
- `persistence` saves, replays, scenarios

Per-module unit-test contract (DI seams, canonical fakes, rubric)
lives in
[testing/unit-test-contract.md](testing/unit-test-contract.md);
coverage thresholds in
[testing/coverage-policy.md](testing/coverage-policy.md);
engine throughput SLO in
[testing/engine-throughput-slo.md](testing/engine-throughput-slo.md);
per-screen smoke contract in
[testing/ui-smoke-contract.md](testing/ui-smoke-contract.md).

## Determinism Stack

Required order:

1. seeded RNG
2. fixed-point math
3. command dispatcher
4. canonical serializer + state hash
5. replay API
6. fuzz harness

Deterministic paths must not use wall-clock time, uncontrolled floats,
or `Math.random()`.

## Content Model

Everything major should be pack-driven:

- factions, units, heroes, towns, buildings
- spells, artifacts, skills, specialties
- map objects, neutral stacks, adventure buildings
- worlds, scenarios, terrain, generators
- portraits, icons, animations, VFX, sounds, UI presentation

Gameplay records reference stable IDs. Asset files are resolved through
asset indexes and pack manifests, not embedded paths.

## Pack Rules

- Packs declare version, dependencies, capabilities, and provided IDs.
- Packs follow one canonical folder layout and one manifest schema.
- Overrides are explicit and predictable.
- Missing visuals may fall back.
- Missing gameplay requirements must fail loudly.
- Saves, replays, and multiplayer pin content versions and hashes.

## Milestones

- `M0–M2`
  Playable deterministic game slice.
- `M3–M4`
  Depth plus creator-platform foundation.
- `M5–M7`
  Multiplayer, AI generation, polish.

## Canonical Reading Order

1. [overview.md](overview.md)
2. [content-platform.md](content-platform.md)
3. [pack-contract.md](pack-contract.md)
4. [schema-matrix.md](schema-matrix.md)
5. [command-schema.md](command-schema.md)
6. [event-schema.md](event-schema.md) and [event-system.md](event-system.md)
7. [ai-integration.md](ai-integration.md)
8. [../planning/roadmap.md](../planning/roadmap.md)
9. [../planning/implementation-log.md](../planning/implementation-log.md)
10. [../../tasks/README.md](../../tasks/README.md)

Use the task files for detailed implementation scope. This file should
stay short and stable.
