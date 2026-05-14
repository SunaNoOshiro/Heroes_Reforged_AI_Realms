# Architecture Overview

Heroes Reforged is a game engine plus content platform, not one fixed
game.

## Core Rules

1. Engine is pure; rules are data.
2. Simulation is deterministic and replayable.
3. Gameplay and presentation stay separate.
4. Packs are the extension boundary.
5. Stable IDs are public API.
6. Every byte from a peer, browser, DataChannel, WebSocket frame,
   pack archive, save file, AI prompt, or worker message is
   adversarial input until validated by a named gate. See
   [`trust-boundaries.md`](./trust-boundaries.md).

## What The Engine Should Know

The engine knows: schemas, stable IDs, commands, content registries,
pack manifests.

The engine must not know: specific factions, creatures, towns, spells,
or asset file paths.

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
3. command dispatcher (also returns the per-dispatch event log; see
   [event-system.md](event-system.md))
4. canonical serializer + state hash
5. replay API
6. fuzz harness

No `Math.random()`, wall-clock time, or uncontrolled floating-point
math in deterministic paths. Full rules and anti-patterns live in
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

UI screens are presentation contracts, not gameplay authority. Runtime
UI reads through selectors, keeps transient UI-only state outside
deterministic gameplay state, and emits commands instead of mutating
the engine directly.

DOM-side foundations:

- [ui-technology-choice.md](ui-technology-choice.md) — framework,
  state binding, z-stack, localization, fonts, build flags
- [ui-renderer-seam.md](ui-renderer-seam.md) — DOM ↔ canvas seam,
  input routing, hit-tests, resize protocol
- [screen-scaling.md](screen-scaling.md) — resolution, aspect, hi-DPI
- [ui-component-resolver.md](ui-component-resolver.md) —
  `data-component` runtime resolver
- [ui-frame-lag-contract.md](ui-frame-lag-contract.md) — UI lag
  bounds (single-player, optimistic UI, M5 lockstep, context loss,
  replay)

Cross-screen UI rules:

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

## References

| Doc | Use For |
|---|---|
| [content-platform.md](content-platform.md) | Pack and extension rules |
| [pack-contract.md](pack-contract.md) | Pack contract details |
| [ai-integration.md](ai-integration.md) | AI provider boundaries |
| [schema-matrix.md](schema-matrix.md) | Record types |
| [effect-registry.md](effect-registry.md) | Effect `kind` values |
| [command-schema.md](command-schema.md) | Closed command vocabulary |
| [event-schema.md](event-schema.md) | Closed event vocabulary |
| [event-system.md](event-system.md) | Event-log runtime contract |
| [determinism.md](determinism.md) | Deterministic-path rules |
| [runtime-requirements.md](runtime-requirements.md) | Load-bearing runtime preconditions (UI shell, WebGL floor, Web Workers, gzip pin, browser engine floor, cross-environment serializer parity) |
| [observability.md](observability.md) | Logger / metrics-sink interfaces and the per-match anonymous-stats schema |
| [error-ux.md](error-ux.md) | Player-facing error surface matrix |
| [glossary.md](glossary.md) | Domain terms |
| [../planning/roadmap.md](../planning/roadmap.md) | Milestones |
| [../operations/rollback-playbook.md](../operations/rollback-playbook.md) | Operations runbooks |
| [../planning/decision-log.md](../planning/decision-log.md) | Append-only register of locked decisions |
| [../planning/deferred.md](../planning/deferred.md) | Deferred / out-of-scope items |

---

## 🔍 Sync Check

- **UI: ✔** — Every UI doc and cross-screen rule referenced in `## UI Boundary` resolves; the `wiki/README.md#ui-evolution-policy` anchor matches the `## UI Evolution Policy` heading in [`wiki/README.md`](wiki/README.md).
- **Schema: ✔** — Overview only references registry-level schema docs ([`schema-matrix.md`](schema-matrix.md), [`command-schema.md`](command-schema.md), [`event-schema.md`](event-schema.md), [`effect-registry.md`](effect-registry.md)); no per-schema enum claims to verify.
- **Tasks: ✔** — Overview is registered as entry 2 in [`INDEX.md`](INDEX.md) and is a navigation root, not owned by any single task; no orphan references.

## ⚠ Issues

_None._
