# Architecture Overview

Heroes Reforged is a game engine plus content platform, not one fixed
game.

## Core Rules

1. Engine is pure; rules are data.
2. Simulation is deterministic and replayable.
3. Gameplay and presentation stay separate.
4. Packs are the extension boundary.
5. Stable IDs are public API.

## What The Engine Should Know

- schemas
- stable IDs
- commands
- content registries
- pack manifests

It should not know specific factions, creatures, towns, spells, or
asset file paths.

## Repo Shape

| Path | Role |
|---|---|
| `content-schema/` | Canonical JSON schemas and examples |
| `src/engine/` | Deterministic simulation |
| `src/rules/` | Formula and ruleset evaluation |
| `src/content-schema/` | Runtime validation and migrations |
| `src/content-runtime/` | Pack loading, dependency resolution, override handling |
| `src/renderer/` | Rendering and animation playback |
| `src/ui/` | App shell, gameplay UI, and creator tooling under `src/ui/editor/` |
| `src/ai/` | Bots, balancing, AI generation |
| `src/net/` | Lockstep multiplayer |
| `src/persistence/` | Saves, replays, scenarios |
| `resources/` | Authored packs and asset payloads |
| `services/` | Optional backend services |

## Determinism Stack

Required order:

1. seeded RNG
2. fixed-point math
3. command dispatcher
4. canonical serializer + state hash
5. replay API
6. fuzz harness

No `Math.random()`, wall-clock time, or uncontrolled floating-point math
in deterministic paths. Full rules and anti-patterns live in
[determinism.md](determinism.md).

## Content Model

Everything important is data-driven:

- factions and towns
- units and neutral stacks
- heroes and specialties
- buildings and adventure objects
- spells and artifacts
- worlds, scenarios, and terrain sets
- animations, VFX, sounds, and UI presentation

Gameplay records reference IDs. Asset files are resolved through
manifests or registries.

Canonical pack shape, manifest fields, and archive rules live in
[pack-contract.md](pack-contract.md).

## UI Boundary

UI screens are presentation contracts, not gameplay authority. Runtime UI
reads through selectors, keeps transient UI-only state outside
deterministic gameplay state, and emits commands instead of mutating the
engine directly.

Future UI redesigns are allowed when the relevant screen package is
updated first. The canonical policy lives in
[wiki/README.md](wiki/README.md#ui-evolution-policy).

## Build Order

1. engine foundation
2. schemas and validation
3. map and content loading
4. renderer and UI
5. tactical combat and AI
6. creator platform, multiplayer, AI generation

Use [content-platform.md](content-platform.md) for pack and extension
rules, [pack-contract.md](pack-contract.md) for pack contract details,
[ai-integration.md](ai-integration.md) for provider boundaries,
[schema-matrix.md](schema-matrix.md) for record types,
[effect-registry.md](effect-registry.md) for effect `kind` values,
[determinism.md](determinism.md) for deterministic-path rules,
[glossary.md](glossary.md) for domain terms, and
[../planning/roadmap.md](../planning/roadmap.md) for milestones.
