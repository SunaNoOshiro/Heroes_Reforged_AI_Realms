# Release Prison Hero Command

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement prison rescue/ransom behavior for imprisoned heroes. The
command validates the visiting hero, rescue cost, and prison state, then
moves the imprisoned hero into the rescuer's roster.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/23-hero-prison/interactions.md`

Inputs:
- Strategic game state from Task 1
- Map object state from Task 9
- Hero records from content registry

Outputs:
- `src/engine/commands/prison-commands.ts`
- `RELEASE_PRISON_HERO` reducer and validator

Owned Paths:
- `src/engine/commands/prison-commands.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.09-map-object-dialogs

Acceptance Criteria:
- Release fails if the visiting hero is not at the prison object
- Gold/resource ransom is deducted exactly once
- Released hero state changes from imprisoned to active or recruitable
- Prison object cannot release the same hero twice

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
