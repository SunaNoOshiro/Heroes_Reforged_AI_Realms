# Map Editor Commands

Status: planned

Module: [Content Editor (M4)](../04-content-editor.md)

Description:
Promote map-editor mutations into deterministic schema-backed commands
so the editor screen can dispatch through the same command log as
gameplay. The editor never mutates map state directly: every brush
stroke, placement, and condition change is a command.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`

Inputs:
- `MapStorage` from `mvp.03-map-system.03-layered-tile-storage`
- Tile type registry from `mvp.03-map-system.02-tile-type-registry`
- Map object schema (`content-schema/schemas/map-object.schema.json`)
- World schema (`content-schema/schemas/world.schema.json`)
- Underground layer support from
  `mvp.03-map-system.10-underground-layer-support`

Outputs:
- `src/engine/commands/map-editor-commands.ts`
- New entries added to `content-schema/schemas/command.schema.json`:
  - `EDITOR_SET_TILE` (terrain brush, single hex)
  - `EDITOR_PLACE_HERO`
  - `EDITOR_PLACE_TOWN`
  - `EDITOR_PLACE_MINE`
  - `EDITOR_PLACE_MAP_OBJECT`
  - `EDITOR_REMOVE_OBJECT`
  - `EDITOR_TOGGLE_UNDERGROUND_LAYER`
  - `EDITOR_SET_VICTORY_CONDITION`
  - `EDITOR_SET_DEFEAT_CONDITION`
- Each reducer validates: target hex in bounds, layer legal, content
  references resolve through the active pack registry, and required
  prerequisites are met (e.g. cannot place a town on water)

Owned Paths:
- `src/engine/commands/map-editor-commands.ts`
- `content-schema/schemas/command.schema.json` (shared)

Owned Paths (shared):
- `content-schema/schemas/command.schema.json`

Dependencies:
- mvp.01-engine-core.06-command-dispatcher
- mvp.01-engine-core.06b-extend-command-schema-coverage-checklist
- mvp.03-map-system.03-layered-tile-storage
- mvp.03-map-system.10-underground-layer-support
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- mvp.02-content-schemas.15-world-schema

Acceptance Criteria:
- All nine commands have entries in `command.schema.json` and pass
  `npm run validate:commands`
- Each reducer is deterministic, integer-only, and replay-safe
- `EDITOR_SET_TILE` rejects out-of-bounds and unknown tile-type IDs
- `EDITOR_PLACE_*` commands reject placements that violate terrain
  prerequisites declared on the placed entity
- Round-trip: a sequence of editor commands to serialized state to
  reload produces an identical hash
- `screen-command-coverage.json` no longer needs to mark the
  corresponding tokens as out-of-scope
- Shared path work is additive only: add editor command variants without
  rewriting the primary command schema contract owned by
  `docs/architecture/command-schema.md` and
  `mvp.01-engine-core.06-command-dispatcher`

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
