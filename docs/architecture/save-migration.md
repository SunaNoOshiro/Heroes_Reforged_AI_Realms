# Save Migration Policy

This document is the canonical policy for evolving the save format.
It pins the migrator authoring contract, composition rules, support
window, testing rules, and the explicit boundary between save-schema
migration and content-pack-version migration.

The runtime registry that consumes this contract is owned by
[`tasks/mvp/08-persistence/08-migration-registry.md`](../../tasks/mvp/08-persistence/08-migration-registry.md).
The on-disk shape it migrates is owned by
[`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md).

## Why This Document Exists

Each save carries an integer `saveVersion` (currently `1`). The first
breaking schema change is inevitable. Without a written policy:

- Every implementer reinvents one.
- The Save/Load compatibility seal renders "migration available?"
  with no actual code path behind it.
- Players lose long campaigns the moment the schema shifts.

The contract below removes those failure modes.

## Migrator Signature

```typescript
type Migrator<From, To> = {
  fromVersion: number,           // saveVersion this migrator consumes
  toVersion: number,             // == fromVersion + 1
  migrate: (prev: From) => To,   // pure, synchronous, no I/O
};
```

- **Pure / synchronous / no I/O.** No `fetch`, no `Date.now()`, no
  `Math.random()`, no module-level mutable state. A migrator that
  consults the network or the wall clock will diverge between
  machines and break determinism.
- **Single step.** Each migrator handles exactly one version step.
  A v3 → v5 migration is two migrators (v3 → v4, v4 → v5), not a
  diagonal jump.
- **Throw on incompatible input.** A migrator MAY throw if the prev
  record fails its precondition (e.g. a required field is absent).
  The loader catches and surfaces the canonical "incompatible save
  migration needed" error.

## Composition

The loader composes registered migrators in order from the on-disk
`saveVersion` to the current schema version:

```typescript
function migrate(record: AnySaveRecord): SaveRecord_current {
  const chain = registry.chainFrom(record.saveVersion);
  if (!chain) throw incompatibleSaveError(record.saveVersion);
  return chain.reduce((r, m) => m.migrate(r), record);
}
```

- `chainFrom(v)` returns the ordered list of migrators
  `(v → v+1 → v+2 → … → current)` or `null` if the on-disk version
  is older than the support window.
- A throw at any step bubbles to the canonical incompatible-save
  error. The Save/Load screen renders the matching missing-state.

## Support Window

The **last 4** save versions are migrated in-app. Older saves are
not loadable in-place. The user-facing message is:

> This save is from an older version of the game. Keep the file —
> a future update may restore loading.

Bridging migrators for older saves are not promised; they remain
out of scope unless the project explicitly commits to longer
backward compatibility.

## Authoring Rule

Each new migrator ships with **two** companion artifacts:

1. A fixture: `saves/migrations/v{N}/sample.json` — a valid
   `SaveRecord_v{N}` that exercises the fields the migrator touches.
2. A round-trip test: load → migrate → replay → assert post-replay
   `stateHash` is non-zero AND matches the fixture's recorded
   `stateHash` after the migrator's structural changes are accounted
   for. The test asserts the migrator produces a record the replay
   API can consume, not just a record that type-checks.

A migrator without a fixture and round-trip test is not allowed in
the registry; this is enforced by lint over
`src/persistence/migrations/`.

## Authoring Template

A new migrator copies `src/persistence/migrations/template.ts`,
which carries:

- Type imports for `SaveRecord_vN` and `SaveRecord_vN+1`.
- The migrator skeleton with `fromVersion`, `toVersion`, and
  `migrate`.
- A reminder of the pure / sync / no-I/O rule.
- A reminder to register the migrator in `index.ts`.
- A reminder to add the fixture and round-trip test.

## Pack-Version Boundary (Out Of Scope For Migrators)

Save migrators handle **schema** evolution only. Content-pack hash
mismatches are a different problem with different ergonomics and a
different failure surface:

- A schema migration is **internal** to the engine: the shape of
  `SaveRecord` changed, the underlying gameplay record IDs did not.
- A pack-version drift is **external**: the player's loaded packs
  produce different gameplay outcomes from the packs that were
  loaded when the save was written.

Pack drift is handled by the load gate's warn-or-abort policy in
[`docs/architecture/version-policy.md`](./version-policy.md):
`degrade` offline (toast and continue), `refuse loud` in
multiplayer / trusted-replay contexts. Do not write "migrators" for
pack drift; that conflates two distinct compatibility surfaces.

## Tamper Detection vs. Forgery (Cross-Reference)

`canonicalContentHash` is non-keyed xxh64 — sufficient to detect
accidental corruption and replay drift, **not** adversarial
forgery. Ranked / leaderboard / tournament features must layer an
HMAC keyed by a server-issued match secret. See
[`docs/architecture/determinism.md`](./determinism.md) §
"Tamper detection vs. forgery".

## Authoring Checklist

When you ship a new `saveVersion`:

- [ ] Add the new `SaveRecord_v{N+1}` type to
      `src/persistence/save-format.ts`.
- [ ] Add the migrator under
      `src/persistence/migrations/v{N}-to-v{N+1}.ts` from the
      template.
- [ ] Register it in `src/persistence/migrations/index.ts`.
- [ ] Add the fixture under `saves/migrations/v{N}/sample.json`.
- [ ] Add the round-trip test that loads → migrates → replays.
- [ ] If the new version drops a field, retire the matching fixture
      from older versions only after the support window rolls past.
- [ ] Re-run `npm run validate`; the migration lint will check the
      template-fixture-test invariants.
