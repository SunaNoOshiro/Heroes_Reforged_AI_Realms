# Master Plan

The shortest single-file summary of the repo. Kept intentionally
compact; deeper navigation is in [`INDEX.md`](INDEX.md).

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
7. Every byte from a peer browser, DataChannel, WebSocket frame,
   pack archive, save file, AI prompt, AI completion, or worker
   `postMessage` is adversarial input until validated by a named
   gate. See [`trust-boundaries.md`](./trust-boundaries.md).

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

- `engine` — deterministic state and commands.
- `rules` — formulas and ruleset evaluation.
- `content-schema` — runtime validation and migrations.
- `content-runtime` — pack loading and override resolution.
- `renderer` — map, battle, animation playback.
- `ui` — shell and gameplay UI (includes `ui/editor/` for content
  authoring screens).
- `editor` — reserved for non-UI editor logic split out from
  `ui/editor/` if it grows.
- `ai` — bots, balancing, generation. Shared headless tournament
  harness and metrics shape:
  [`testing/ai-tournament-harness.md`](testing/ai-tournament-harness.md).
- `net` — multiplayer. Deterministic test transport contract:
  [`net-transport.md`](net-transport.md).
- `persistence` — saves, replays, scenarios.

Cross-cutting testing contracts:

- Per-module unit-test contract (DI seams, canonical fakes, rubric):
  [`testing/unit-test-contract.md`](testing/unit-test-contract.md).
- Coverage thresholds:
  [`testing/coverage-policy.md`](testing/coverage-policy.md).
- Engine throughput SLO:
  [`testing/engine-throughput-slo.md`](testing/engine-throughput-slo.md).
- Per-screen smoke contract:
  [`testing/ui-smoke-contract.md`](testing/ui-smoke-contract.md).

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

- `M0–M2` — playable deterministic game slice.
- `M3–M4` — depth plus creator-platform foundation.
- `M5–M7` — multiplayer, AI generation, polish.

Per-milestone goals and exit criteria:
[`../planning/roadmap.md`](../planning/roadmap.md).

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

---

## 🔍 Sync Check

- **UI: ✔** — No UI specs are referenced; nothing to drift.
- **Schema: ✔** — All schema references resolve through downstream
  docs ([`schema-matrix.md`](schema-matrix.md),
  [`command-schema.md`](command-schema.md),
  [`event-schema.md`](event-schema.md)); this file makes no enum /
  field claims of its own.
- **Tasks: ✔** — All `src/` module names match the on-disk layout
  (`engine`, `rules`, `content-schema`, `content-runtime`,
  `renderer`, `ui`, `editor`, `ai`, `net`, `persistence`); all
  testing- and planning-doc links resolve. The
  [`mechanics-coverage.md`](mechanics-coverage.md) callout aligns
  with that file's role as the scope SSOT.

## ⚠ Issues

- **Non-Negotiable #7 paraphrase aligned with CLAUDE.md.** The prior
  wording listed the adversarial-input sources as "peer, browser,
  …, AI prompt, or worker message", which split CLAUDE.md's "peer
  browser" into two items and dropped "AI completion". Aligned the
  rewrite to match CLAUDE.md verbatim ("peer browser, …, AI prompt,
  AI completion, or worker `postMessage`"); CLAUDE.md is the root
  contract for hard constraints, so the master-plan summary should
  not narrow it. No code change implied.
- **`master-plan.md` is unindexed in [`INDEX.md`](INDEX.md).** It is
  listed in [`README.md`](README.md) (entry under "Files" and #9 in
  its Suggested Reading Order) but does not appear in any of
  `INDEX.md`'s clusters. Probably deliberate — `INDEX.md` curates
  the per-area docs and the master-plan is a flat summary — but
  surfacing for the index owner. The audit did not edit `INDEX.md`
  (Hard Prohibition D — never edit cross-checked files).
- **Two parallel reading orders exist for architecture entry.**
  This file's "Canonical Reading Order" (10 entries: overview →
  content-platform → pack-contract → schema-matrix →
  command-schema → event-schema/event-system → ai-integration →
  roadmap → implementation-log → tasks/README) differs from
  [`README.md`](README.md)'s "Suggested Reading Order" (9 entries,
  starting with overview → determinism → … → master-plan). Each
  serves a different audience (implementer ramp vs doc-folder
  guide), so this is not a defect — surfaced so a future
  consolidation pass can decide whether one order should reference
  the other.
