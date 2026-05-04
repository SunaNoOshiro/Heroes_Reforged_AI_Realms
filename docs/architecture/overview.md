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
| `src/persistence/` | Saves, replays, scenarios. Edge-case scenario fixtures consumed by the golden-state suite live under `tests/__fixtures__/edge-cases/`. |
| `resources/` | Authored packs and asset payloads |
| `services/` | Optional backend services |

## Determinism Stack

Required order:

1. seeded RNG
2. fixed-point math
3. command dispatcher (also returns the per-dispatch event log; see [event-system.md](event-system.md))
4. canonical serializer + state hash
5. replay API
6. fuzz harness

No `Math.random()`, wall-clock time, or uncontrolled floating-point math
in deterministic paths. Full rules and anti-patterns live in
[determinism.md](determinism.md).

The reducer's input shape is pinned in
[state-shape.md](state-shape.md); module-graph boundaries that protect
this shape are in [module-graph.md](module-graph.md) and enforced by
`npm run validate:arch`.

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

The DOM-side framework, state-binding model, z-stack, localization
runtime, fonts, and build flags are pinned in
[ui-technology-choice.md](ui-technology-choice.md). The DOM ↔ canvas
seam (input routing, hit-tests, resize protocol) is in
[ui-renderer-seam.md](ui-renderer-seam.md). Resolution, aspect, and
hi-DPI rules live in [screen-scaling.md](screen-scaling.md). The
`data-component` runtime resolver is in
[ui-component-resolver.md](ui-component-resolver.md). UI lag bounds
(single-player, optimistic UI, M5 lockstep, context loss, replay) are
in [ui-frame-lag-contract.md](ui-frame-lag-contract.md).

Cross-screen UI rules (component-state matrix, selector purity, modal
stack, gesture taxonomy, hotkey registry, input arbitration, modality
bridging) live in:

- [ui-state-contract.md](ui-state-contract.md) — component states,
  selector purity, tooltip lifecycle, command lifecycle, undo/redo
- [ui-routing.md](ui-routing.md) — screen-router FSM, transition
  graph, modal stack, dismissal policy
- [ui-input-arbitration.md](ui-input-arbitration.md) — single-emit,
  Esc precedence ladder, animation gates
- [ui-gestures.md](ui-gestures.md) — gesture taxonomy and drag
  contract
- [ui-hotkeys.md](ui-hotkeys.md) — hotkey registry, focus order,
  tab-trap, focus restoration
- [ui-input-modalities.md](ui-input-modalities.md) — mouse / touch /
  keyboard / gamepad bridging

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
[command-schema.md](command-schema.md) for the closed command
vocabulary, [event-schema.md](event-schema.md) for the closed event
vocabulary, [event-system.md](event-system.md) for the event-log
runtime contract,
[determinism.md](determinism.md) for deterministic-path rules,
[runtime-requirements.md](runtime-requirements.md) for load-bearing
runtime preconditions (UI shell, WebGL floor, Web Workers, gzip
pin, browser engine floor, cross-environment serializer parity),
[observability.md](observability.md) for the logger / metrics-sink
interfaces and the per-match anonymous-stats schema,
[error-ux.md](error-ux.md) for the player-facing error surface
matrix,
[glossary.md](glossary.md) for domain terms, and
[../planning/roadmap.md](../planning/roadmap.md) for milestones.

For operations-side runbooks see
[../operations/rollback-playbook.md](../operations/rollback-playbook.md);
for the append-only register of locked decisions, see
[../planning/decision-log.md](../planning/decision-log.md); for the
deferred / out-of-scope items register, see
[../planning/deferred.md](../planning/deferred.md).
