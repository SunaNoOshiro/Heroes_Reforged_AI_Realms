# Heroes Reforged: AI Realms

Browser-first turn-based strategy engine plus creator platform.
Save-import and pack-trust posture (browser-only at v1, desktop
wrapper deferred) is pinned in
[`docs/architecture/pack-trust.md` § Platform Posture](docs/architecture/pack-trust.md#9-platform-posture).

This project builds new strategy systems informed by turn-based
strategy genre baselines.

All visuals, assets, and UI are original internal work. This project is
independent and unaffiliated with external IP holders.

Core idea:

- deterministic engine
- rules and content as data
- packs for factions, worlds, units, heroes, buildings, spells,
  artifacts, map objects, animations, VFX, sounds, and scenarios
- future multiplayer, AI opponents, and AI-assisted content creation

## Current State

This repo is still design-first and schema-first.

What exists now:

- architecture docs
- planning docs
- implementation task files
- canonical JSON schemas
- canonical example content
- root validation scripts and CI for docs/task contracts
- machine-readable task registry generated from `tasks/`
- root folders for future runtime code and assets

What does not exist yet:

- working game runtime
- content loader runtime
- renderer
- editor
- gameplay implementation

## Repo Map

```text
content-schema/   canonical schemas + examples
docs/             architecture + planning
research/         reference baselines and source notes
resources/        future packs + assets
services/         optional backend adapters
src/              future implementation modules
tasks/            execution-sized work files
```

## Read First

1. [docs/architecture/overview.md](docs/architecture/overview.md)
2. [docs/architecture/content-platform.md](docs/architecture/content-platform.md)
3. [docs/architecture/pack-contract.md](docs/architecture/pack-contract.md)
4. [docs/architecture/schema-matrix.md](docs/architecture/schema-matrix.md)
5. [docs/planning/roadmap.md](docs/planning/roadmap.md)
6. [docs/planning/solo-build-lane.md](docs/planning/solo-build-lane.md)
7. [docs/planning/implementation-log.md](docs/planning/implementation-log.md)

Use these when needed:

- [docs/architecture/master-plan.md](docs/architecture/master-plan.md)
- [docs/architecture/ai-integration.md](docs/architecture/ai-integration.md)
- [content-schema/README.md](content-schema/README.md)
- [tasks/README.md](tasks/README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md) — cookbook for new schemas,
  effect kinds, tasks, and formulas.

## Non-Negotiables

- Engine is pure; rules are data.
- Simulation is deterministic and replayable.
- Gameplay and presentation stay separate.
- Packs are the extension boundary.
- Stable IDs are public API.
- Architecture must stay easy to extend and update.
