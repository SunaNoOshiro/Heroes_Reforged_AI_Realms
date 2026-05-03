# Version Mismatch Policy

This file is the **single source of truth** for what the loader does when
a save, replay, or content pack disagrees with the engine, the local
content set, or the original recording context.

The decision matrix below covers six mismatch kinds across three
contexts. All other docs that touched this topic now point here instead
of repeating the rules. If you find prose elsewhere that conflicts with
this matrix, this file wins — fix the prose.

## Why one matrix

Six mismatch kinds × three contexts × three actions is 18 cells. Before
this doc those cells were spread across `state-flow.md`, `pack-contract.md`,
`content-platform.md`, and one persistence task file. Engineers had to
grep four sources to answer "what does the loader do if `engineHash` is
missing in MP?". UI copy could not be specified consistently because the
underlying policy was fragmented.

This file replaces that. UI strings, loader log messages, and CI gates
should all read from here.

## Definitions

**Mismatch kinds**

- `schemaVersion older` — record's `schemaVersion` is below what the
  current engine expects. A migration *may* exist.
- `schemaVersion newer` — record's `schemaVersion` is above what the
  current engine understands. No migration can recover this without an
  engine upgrade.
- `contentHash` — the manifest's recorded `contentHash` does not match
  the canonical-JSON hash of the resolved pack contents.
- `contentPackHashes` — the saved/replayed run pinned a list of
  pack-content hashes; one or more of those packs is missing or hashes
  to a different value now.
- `engineHash` — the saved/replayed run pinned a specific engine build
  hash; the current engine binary hashes to a different value (or, for
  pre-M2 saves, the field is absent).
- `validation error` — record fails its JSON Schema or Zod validation
  for any reason not covered above.

**Contexts**

- `offline-singleplayer` — local game, no peers, save owned by the
  local user.
- `multiplayer` — at least one remote peer; lockstep determinism
  required across all participants.
- `trusted-replay` — replay marked as canonical (e.g. shared for review,
  used for desync investigation, or attached to a tournament report).
  Trust here means *byte-identical reproduction is required*.

**Actions**

- `refuse loud` — load fails with a structured `ValidationError` (see
  [`validation-error contract`](../../content-schema/schemas/validation-error.schema.json)
  once authored). UI surfaces the localized error and offers no "load
  anyway" affordance.
- `migrate` — run the registered migration entry from
  [`schema-migration-policy.md`](./schema-migration-policy.md), then
  re-validate. If migration is missing, fall through to `refuse loud`.
- `degrade` — load with a visible warning toast. Save remains usable;
  some presentation may fall back per
  [`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders).
  Multiplayer never degrades — divergence breaks lockstep.

## Decision Matrix

| Mismatch | offline-singleplayer | multiplayer | trusted-replay |
|---|---|---|---|
| `schemaVersion older` | migrate; on missing migration → refuse loud (`error.schemaVersion.unmigrateable`) | migrate; on missing migration → refuse loud (`error.schemaVersion.unmigrateable`) — all peers must agree on resulting schemaVersion before lockstep starts | migrate; on missing migration → refuse loud. Trusted replay records the post-migration hash chain. |
| `schemaVersion newer` | refuse loud (`error.schemaVersion.engineUpgradeRequired`) | refuse loud — same code, also surfaces the lobby's required engine build | refuse loud |
| `contentHash` | refuse loud (`error.content.hashMismatch`) — pack on disk does not match manifest claim | refuse loud — peer cannot trust content of unknown provenance | refuse loud |
| `contentPackHashes` | degrade (`warn.content.packChangedSinceSave`) — replay may diverge; save still loads. UI shows a "Content changed since save" toast. | refuse loud (`error.content.packChangedSinceSave`) — lockstep cannot tolerate content drift between peers | refuse loud — trusted replay loses meaning if pinned content shifted |
| `engineHash` (post-M2) | degrade (`warn.engine.hashChangedSinceSave`) — replay may diverge; save still loads | refuse loud (`error.engine.hashChangedSinceSave`) | refuse loud |
| `engineHash` (pre-M2 absence) | accept silently — field is intentionally optional pre-M2 | refuse loud — multiplayer requires every peer to have a non-empty `engineHash` from M2 onward | refuse loud — trusted replay requires engine pinning |
| `validation error` | refuse loud (`error.validation.<rule>`) — record returned by Zod or JSON Schema validator | refuse loud | refuse loud |

### Rationale notes

1. **Why offline `degrade` for `contentPackHashes` / `engineHash`** —
   The local user accepted the risk of changing their own content; the
   alternative is locking saves the moment the player updates a pack.
   The toast preserves user agency while making divergence visible.
2. **Why multiplayer never degrades** — Lockstep determinism is
   contractual. A single peer choosing `degrade` while others `refuse`
   is the canonical desync recipe.
3. **Why trusted-replay never degrades** — The point of a trusted
   replay is byte-identical reproduction; "load with warnings" defeats
   its purpose.
4. **Why pre-M2 `engineHash` absence is offline-tolerable** — The
   engine does not exist yet. The field is documented optional in
   [`pack-contract.md`](./pack-contract.md). After M2 the
   [engine-hash backfill task](../../tasks/mvp/02-content-schemas/26-m2-engine-hash-backfill.md)
   makes the field non-empty everywhere; this row stops mattering
   shortly thereafter.
5. **Migration-then-revalidate sequencing** — Migrations may resolve a
   `schemaVersion older` mismatch, but the migrated record must still
   satisfy the current schema; failing that, fall through to
   `validation error`'s `refuse loud` with the field path the migration
   could not produce.

## UI Copy Mapping

UI strings live in localization tables; this section pins which
`messageKey` each cell of the matrix should resolve to. The
`code` strings in the matrix above are the canonical
`ErrorState.code` values.

- `error.schemaVersion.unmigrateable` → "Save was made with an older
  schema we no longer support. Update content packs or open the save
  in an older client."
- `error.schemaVersion.engineUpgradeRequired` → "Save needs a newer
  engine build than this client. Upgrade to load."
- `error.content.hashMismatch` → "Content pack on disk does not match
  what the manifest claims. The pack may be corrupt or modified."
- `warn.content.packChangedSinceSave` → "Content packs changed since
  this save. Load anyway?" (singleplayer only)
- `error.content.packChangedSinceSave` → "Content packs changed since
  this match started. All players must use the same packs to continue."
- `warn.engine.hashChangedSinceSave` → "Engine build changed since this
  save. Load anyway?"
- `error.engine.hashChangedSinceSave` → "Engine build changed since
  this match started. All players must use the same engine build."
- `error.validation.<rule>` → see
  [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json);
  one entry per `rule` value.

## Related Docs

- [`state-flow.md`](./state-flow.md) — overall turn loop; references
  this matrix at the `pack hashes match save?` decision.
- [`pack-contract.md`](./pack-contract.md) — manifest fields including
  `engineHash` and `contentHash`; references this matrix for mismatch
  behavior.
- [`content-platform.md`](./content-platform.md) — Update Safety
  section links to this matrix.
- [`schema-migration-policy.md`](./schema-migration-policy.md) —
  defines what "migration entry" means in the table above.
- [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — save record carries the hash fields the matrix tests.
