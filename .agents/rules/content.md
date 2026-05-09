---
paths:
  - "content-schema/**"
  - "src/content-schema/**"
  - "src/content-runtime/**"
  - "resources/**"
---

# Content schemas, content-runtime, resources

This is the extension boundary. Packs are how new factions, worlds,
spells, artifacts, map objects, and animations enter the game —
**not** engine branches.

## Schema evolution

- **Additive-first.** Add optional fields before breaking existing
  shapes.
- **Alias before remove.** Use enum aliases or migrations for renamed
  IDs. Removed values must be listed in
  [`content-schema/enums.removed.json`](../../content-schema/enums.removed.json).
- The full lifecycle is in
  [`docs/architecture/enum-lifecycle-policy.md`](../../docs/architecture/enum-lifecycle-policy.md).

After editing any `enum: [...]` array or `const:` value:

```
npm run generate:enum-snapshot
```

Commit the resulting `content-schema/enums.snapshot.json` diff in the
same change. The snapshot is the public contract for save / replay /
multiplayer. CI refuses removed values without an alias entry, but
**additions silently drift** the snapshot until you regenerate.

Never run `generate:enum-snapshot` to "fix" a failing
`validate:enums` without first checking whether the failing removal
was intentional.

## Pack contract

- Packs are namespaced (`<vendor>/<name>`).
- Override precedence, dependency resolution, asset integrity, locale
  merge, and balance corridor are all owned by
  [`docs/architecture/content-system-policy.md`](../../docs/architecture/content-system-policy.md).
- Stable IDs are public API. Renaming an ID requires a migration.
- Asset integrity is hash-pinned; see
  [`docs/architecture/pack-contract.md`](../../docs/architecture/pack-contract.md).

## Mutation gate

Module class **content-schema / content-runtime**: floor **80 %**,
line coverage 90 %, branch coverage 80 %.

## Common after-edit commands

```
npm run generate:enum-snapshot   # after any enum/const change
npm run generate:contracts       # if a schema has a TS counterpart
npm run validate:enums
npm run validate:balance
```
