# Save Migration Registry

Status: planned

Module: [Persistence (M1)](../08-persistence.md)

Description:
Implement the save-format migration registry. Each migrator handles
exactly one version step `(prev: SaveRecord_vN) => SaveRecord_vN+1`.
The loader composes migrators in order from the on-disk
`saveVersion` to the current schema version before handing the record
to replay. Authoring contract, support window, and pack-version
boundary are canonical in
[`docs/architecture/save-migration.md`](../../../docs/architecture/save-migration.md).

Read First:
- [`docs/architecture/save-migration.md`](../../../docs/architecture/save-migration.md)
- [`tasks/mvp/08-persistence/02-log-only-save-format.md`](./02-log-only-save-format.md)

Inputs:
- `SaveRecord` shape from `02-log-only-save-format.md`
- The Save/Load compatibility selector in
  `docs/architecture/wiki/screens/55-save-load/data-contracts.md`

Outputs:
- `src/persistence/migrations/` — module folder
- `src/persistence/migrations/index.ts` — registry + `migrate(record)`
- `src/persistence/migrations/template.ts` — authoring template a new
  migrator copies; documents the `(prev, ctx) => next` signature, the
  fixture-and-round-trip-test rule, and the version bump.
- `src/persistence/migrations/v1.ts` — first registry entry
  (no-op for `saveVersion: 1`); exists so the wiring is exercised.

Owned Paths:
- `src/persistence/migrations/`
- `src/persistence/migrations/index.ts`
- `src/persistence/migrations/template.ts`

## Migrator Contract

```typescript
type Migrator<From, To> = {
  fromVersion: number,           // saveVersion this migrator consumes
  toVersion: number,             // == fromVersion + 1
  migrate: (prev: From) => To,   // pure, synchronous, no I/O
};
```

- **Pure / synchronous / no I/O.** Network, file, or clock reads are
  forbidden. Migrators run inside the load gate and must not block.
- **Single step.** Each migrator handles exactly one version step.
  The registry composes them in order.
- **Throws on incompatible input.** A migrator MAY throw if the prev
  record fails its precondition; the loader catches and surfaces the
  canonical "incompatible save migration needed" error.

## Composition

```typescript
function migrate(record: AnySaveRecord): SaveRecord_current {
  const chain = registry.chainFrom(record.saveVersion);
  if (!chain) throw incompatibleSaveError(record.saveVersion);
  return chain.reduce((r, m) => m.migrate(r), record);
}
```

`chainFrom(v)` returns `null` if the on-disk version is older than
the support window (last 4 versions, see migration policy doc).

## Support Window

Last **4** save versions are migrated in-app. Older saves are not
loadable; the user is told to keep the file and reimport after a
bridging migrator ships (out of scope for MVP). The compatibility
selector
`selectors.persistence.selectedSaveCompatibility` consults the
registry, **not** a stubbed boolean.

## Pack-Version Boundary

Save migrators handle **schema** evolution only. Content-pack hash
mismatches continue to be handled by the load gate's warn-or-abort
policy (`docs/architecture/version-policy.md`). Do not write
"migrators" for pack version drift; that is a different problem with
different ergonomics.

Dependencies:
- mvp.08-persistence.02-log-only-save-format

Acceptance Criteria:
- `migrate(record)` composes registered migrators in order from
  `record.saveVersion` to `current` and returns a
  `SaveRecord_current`.
- An unknown / out-of-window `saveVersion` throws the canonical
  "incompatible save migration needed" error; the Save/Load screen
  renders the matching missing-state.
- The `v1` no-op migrator exists in the registry so the wiring is
  exercised end-to-end.
- A round-trip test loads `saves/migrations/v1/sample.json`,
  migrates, replays, and asserts the post-replay `stateHash` matches
  the fixture's `stateHash`.
- Adding a new migrator requires adding a corresponding fixture and
  round-trip test (enforced by lint over
  `src/persistence/migrations/`).
- `selectors.persistence.selectedSaveCompatibility` is computed
  against the registry's chain, not a stubbed boolean.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
