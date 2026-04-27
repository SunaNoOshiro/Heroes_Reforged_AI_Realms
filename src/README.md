# src

This folder is reserved for runtime implementation code.

Rule of thumb:

- `content-schema/` stores canonical JSON declarations and example data
- `src/` stores TypeScript or runtime code that loads, validates,
  renders, simulates, or edits that data

Planned module split:

- `engine/`
  Deterministic game state, commands, replay, battle, and adventure
  simulation.
- `rules/`
  Formula evaluation, constants, and ruleset interpretation.
- `content-schema/`
  Runtime validators, migrations, and schema-loading helpers built on
  top of the JSON contracts.
- `content-runtime/`
  Pack loading, dependency resolution, asset indirection, and override
  precedence.
- `renderer/`
  Map, battle, animation, VFX, and asset-loading runtime code.
- `ui/`
  Menus, HUD, town screens, editors, and content-facing UI.
- `ai/`
  Heuristic bots, MCTS, and AI-assisted generation flows.
- `net/`
  Lockstep sync, transport, reconnection, and desync tooling.
- `persistence/`
  Save/load, replay storage, scenario import/export.
- `editor/`
  Authoring workflows and inspector tools if kept separate from UI.

When implementation starts, prefer adding code here rather than mixing
runtime logic into `content-schema/`.
