# Obelisk Visits And Grail State

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Track per-player obelisk visits and reveal grail puzzle fragments
deterministically from scenario seed. Powers the puzzle-map screen and
the grail-region hint without leaking puzzle data into UI state. The
engine recognizes obelisks via a new `category: "obelisk"` map-object
kind, the scenario carries a `grail` section, and four pure selectors
expose the reveal state.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- `docs/architecture/wiki/screens/10-puzzle-map/spec.md`
- `docs/architecture/wiki/screens/10-puzzle-map/data-contracts.md`
- `docs/architecture/wiki/screens/31-grail-building/data-contracts.md`

Inputs:
- `AdventureState.players[]` from
  `mvp.05-adventure-map.01-strategic-game-state-model`
- `VISIT_MAP_OBJECT` reducer from
  `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`
- `map-object.schema.json` (extend `category` enum with `"obelisk"`)
- `scenario.schema.json` (extend with optional `grail` section)
- PCG32 sub-stream from
  `mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams`

Outputs:
- `src/engine/grail/obelisk-state.ts`
- `src/engine/grail/selectors.ts` exporting:
  - `selectors.grail.revealedPuzzleFragments(state, playerId): FragmentMask`
  - `selectors.grail.visibleRegionHint(state, playerId): RegionHint | null`
  - `selectors.grail.selectedFragmentMapFocus(state, playerId, fragmentId): HexCoord | null`
- New `obelisksVisited: ObjectId[]` field on each player in
  `AdventureState`
- New optional scenario block:
  ```json
  "grail": {
    "coordinate": { "x": <int>, "y": <int>, "layer": "surface"|"underground" },
    "fragmentCount": <int 4..16>
  }
  ```
- `VISIT_MAP_OBJECT` reducer branch: when target object has
  `category: "obelisk"`, append `obelisksVisited` (deduplicated)

Owned Paths:
- `src/engine/grail/obelisk-state.ts`
- `src/engine/grail/selectors.ts`

Owned Paths (shared):
- `content-schema/schemas/map-object.schema.json`
- `content-schema/schemas/scenario.schema.json`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Visiting the same obelisk twice does not duplicate the entry in
  `obelisksVisited`
- `revealedPuzzleFragments` is a deterministic function of
  `(scenario.grail.fragmentCount, scenario.grail.coordinate, obelisksVisited.length)`
  — same inputs, same mask, every replay
- `visibleRegionHint` returns `null` until at least one obelisk is
  visited; precision (text length / region radius) increases as
  fragments accumulate
- `selectedFragmentMapFocus` returns `null` for unrevealed fragments
  and the masked region hex for revealed fragments
- Replay of a 7-day session containing obelisk visits produces an
  identical state hash before and after this task lands (when the
  scenario contains no obelisks) and a stable hash with obelisks
  present
- `npm run validate:cross-refs` recognizes the four new selectors via
  the `selectors.grail.*` namespace
- Schema additions are additive only: existing scenario and map-object
  records continue to validate without a `grail` section or `obelisk`
  category
- Shared path work is additive only: extend `category` enum and add the
  optional `grail` block without rewriting the primary map-object
  schema contract owned by
  `mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas`
  or the scenario schema fields consumed by
  `mvp.08-persistence.04-scenario-loader` and
  `mvp.02-content-schemas.17-campaign-schema`
- No `Math.random`, `Date.now`, or float arithmetic anywhere in the
  selectors or reducer
- Scope verified against the Deferred Mechanic Inventory in `tasks/README.md`: any baseline-corridor mechanic listed there as folded into a different parent must NOT be implemented as part of this task; if a folded mechanic is reached during implementation, stop and surface a scope question.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
