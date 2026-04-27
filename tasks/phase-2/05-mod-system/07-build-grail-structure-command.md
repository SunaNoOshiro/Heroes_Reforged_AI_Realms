# Build Grail Structure Command

Status: planned

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Implement the grail-style ultimate structure flow as a pack-defined
artifact/building interaction. The command consumes the required
artifact, validates town eligibility, and builds the configured
structure without hard-coded faction checks.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/31-grail-building/interactions.md`

Inputs:
- Artifact and building schemas
- First-party reference pack structure
- Town ownership and building state

Outputs:
- `src/engine/commands/grail-structure-commands.ts`
- `BUILD_GRAIL_STRUCTURE` reducer and validator
- Reference pack records demonstrating one grail structure

Owned Paths:
- `src/engine/commands/grail-structure-commands.ts`
- `resources/packs/shared-artifacts/grail/`

Dependencies:
- phase-2.05-mod-system.05a-baseline-ruleset-and-shared-library-packs
- phase-2.01-spells-artifacts.05-artifact-paper-doll-system

Acceptance Criteria:
- Command validates artifact ownership, town ownership, prerequisites,
  and one-per-town structure uniqueness
- Building effect is declared in content and applied through existing
  building/effect systems
- Artifact is consumed or marked according to the pack contract
- Screen 31 can show disabled reasons from validator output

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
