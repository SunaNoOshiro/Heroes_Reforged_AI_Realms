# Build Boat Command And Shipyard

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Implement shipyard/boat construction as content-driven map mutation.
The command validates town ownership, shipyard availability, spawn tile,
cost, and water adjacency, then creates a boat map object with stable ID.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/33-shipyard/interactions.md`

Inputs:
- Pack-loaded building and map-object records
- Layered map support from `mvp.03-map-system.10-underground-layer-support`
- Strategic resource state

Outputs:
- `src/engine/commands/shipyard-commands.ts`
- `BUILD_BOAT` reducer and validator
- Shipyard content examples in first-party reference packs

Owned Paths:
- `src/engine/commands/shipyard-commands.ts`
- `resources/packs/shared-map-objects/boats/`

Dependencies:
- mvp.03-map-system.10-underground-layer-support
- phase-2.05-mod-system.05a-baseline-ruleset-and-shared-library-packs

Acceptance Criteria:
- Boat construction validates passable water spawn tiles
- Resource cost comes from content/ruleset tables
- Created boat object has stable ID and serializes deterministically
- Screen 33 dispatches `BUILD_BOAT` through the command hook

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
