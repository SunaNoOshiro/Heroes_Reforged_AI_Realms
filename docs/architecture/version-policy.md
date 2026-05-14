# Version Mismatch Policy

Single source of truth for what the loader does when a save, replay,
or content pack disagrees with the engine, the local content set, or
the original recording context. **Six mismatch kinds × three contexts
= 18 cells** — pinned once here so UI copy, loader logs, and CI
gates can all read the same matrix.

If prose anywhere else in the repo contradicts this matrix, this
file wins — fix the prose, not the matrix.

> Companion docs:
> [`schema-migration-policy.md`](./schema-migration-policy.md)
> (defines what a "migration entry" is) ·
> [`pack-contract.md`](./pack-contract.md) (manifest fields
> `contentHash` and `engineHash`) ·
> [`state-flow.md`](./state-flow.md) (consults this matrix at the
> `pack hashes match save?` branch) ·
> [`content-platform.md`](./content-platform.md) § Update Safety ·
> [`determinism.md`](./determinism.md).

## 1. Definitions

### Mismatch kinds

- `schemaVersion older` — record's `schemaVersion` is below what the
  engine expects. A migration *may* exist.
- `schemaVersion newer` — record's `schemaVersion` is above what the
  engine understands. Only an engine upgrade can recover this.
- `contentHash` — manifest's recorded `contentHash` does not match
  the canonical-JSON hash of the resolved pack contents.
- `contentPackHashes` — the saved/replayed run pinned a list of
  pack-content hashes; one or more of those packs is missing or
  hashes to a different value now.
- `engineHash` — the saved/replayed run pinned a specific engine
  build hash; the current engine binary hashes differently (or, for
  pre-M2 saves, the field is absent).
- `validation error` — record fails JSON Schema or Zod validation
  for any reason not covered above.

### Contexts

- `offline-singleplayer` — local game, no peers, save owned by the
  local user.
- `multiplayer` — at least one remote peer; lockstep determinism
  required across all participants.
- `trusted-replay` — replay marked canonical (shared for review,
  desync investigation, or tournament report). Byte-identical
  reproduction is required.

### Actions

- `refuse loud` — load fails with a structured `ValidationError`
  ([`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json)).
  UI surfaces the localized error; no "load anyway" affordance.
- `migrate` — run the registered migration entry from
  [`schema-migration-policy.md`](./schema-migration-policy.md),
  then re-validate. If no migration is registered, fall through to
  `refuse loud`.
- `degrade` — load with a visible warning toast. Save remains
  usable; presentation may fall back per
  [`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders).
  **Multiplayer never degrades** — divergence breaks lockstep.

## 2. Decision Matrix

| Mismatch | offline-singleplayer | multiplayer | trusted-replay |
|---|---|---|---|
| `schemaVersion older` | migrate; missing migration → refuse loud (`error.schemaVersion.unmigrateable`) | migrate; missing migration → refuse loud (`error.schemaVersion.unmigrateable`). All peers must agree on the resulting `schemaVersion` before lockstep starts. | migrate; missing migration → refuse loud. Trusted replay records the post-migration hash chain. |
| `schemaVersion newer` | refuse loud (`error.schemaVersion.engineUpgradeRequired`) | refuse loud — same code, also surfaces the lobby's required engine build | refuse loud |
| `contentHash` | refuse loud (`error.content.hashMismatch`) — pack on disk does not match the manifest claim | refuse loud — peer cannot trust content of unknown provenance | refuse loud |
| `contentPackHashes` | degrade (`warn.content.packChangedSinceSave`) — replay may diverge; save still loads. UI toast: "Content changed since save". | refuse loud (`error.content.packChangedSinceSave`) — lockstep cannot tolerate content drift between peers | refuse loud — trusted replay loses meaning if pinned content shifted |
| `engineHash` (post-M2) | degrade (`warn.engine.hashChangedSinceSave`) — replay may diverge; save still loads | refuse loud (`error.engine.hashChangedSinceSave`) | refuse loud |
| `engineHash` (pre-M2 absence) | accept silently — field is intentionally optional pre-M2 | refuse loud — multiplayer requires every peer to carry a non-empty `engineHash` from M2 onward | refuse loud — trusted replay requires engine pinning |
| `validation error` | refuse loud (`error.validation.<rule>`) — record returned by Zod or JSON Schema validator | refuse loud | refuse loud |

The `code` strings above are the canonical `ErrorState.code` values
the runtime emits; localized strings are pinned in § 4.

## 3. Rationale

1. **Offline `degrade` for `contentPackHashes` / `engineHash`.** The
   local user accepted the risk of updating their own content; the
   alternative is locking the save the moment they update a pack.
   The toast preserves user agency while keeping divergence visible.
2. **Multiplayer never degrades.** Lockstep is contractual. One peer
   choosing `degrade` while others `refuse` is the canonical desync
   recipe.
3. **Trusted-replay never degrades.** The point of a trusted replay
   is byte-identical reproduction; "load with warnings" defeats it.
4. **Pre-M2 `engineHash` absence is offline-tolerable.** No engine
   exists yet; the field is documented optional in
   [`pack-contract.md`](./pack-contract.md). After M2, the
   [engine-hash backfill task](../../tasks/mvp/02-content-schemas/26-m2-engine-hash-backfill.md)
   makes the field non-empty everywhere and this row stops mattering.
5. **Migrate-then-revalidate sequencing.** A migration may resolve
   `schemaVersion older`, but the migrated record must still satisfy
   the current schema. On failure, fall through to the
   `validation error` row's `refuse loud` and report the field path
   the migration could not produce.

## 4. UI Copy Mapping

UI strings live in localization tables; this section pins which
`messageKey` each matrix cell resolves to.

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
- `error.validation.<rule>` → one entry per `rule` value in
  [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json).

## 5. Related Docs

- [`state-flow.md`](./state-flow.md) — overall turn loop; references
  this matrix at the `pack hashes match save?` decision.
- [`pack-contract.md`](./pack-contract.md) — manifest fields
  (`engineHash`, `contentHash`) referencing this matrix for mismatch
  behavior.
- [`content-platform.md`](./content-platform.md) — Update Safety
  section links to this matrix.
- [`schema-migration-policy.md`](./schema-migration-policy.md) —
  defines "migration entry" as used in the matrix above.
- [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — save record carries the hash fields the matrix tests.

---

## 🔍 Sync Check

- **UI: ⚠** — The `messageKey` strings in § 4 (`error.schemaVersion.unmigrateable`, `warn.content.packChangedSinceSave`, `error.engine.hashChangedSinceSave`, etc.) do not appear in any wiki screen package — the save/load screen ([`wiki/screens/55-save-load/data-contracts.md`](./wiki/screens/55-save-load/data-contracts.md):80) refers to this matrix indirectly as a "warn-or-abort policy" rather than naming the localization keys. Not CI-blocking: the strings are localization-table content, not screen-spec content. The screen's looser phrasing is flagged below.
- **Schema: ✔** — `ValidationError` shape and the `rule` enum used by `error.validation.<rule>` match [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json); `engineHash` / `contentHash` field patterns and the `engineHash` "optional pre-M2 / required post-M2 for trusted runtimes" semantics match [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json). No `data-inventory.md` row is asserted by this doc.
- **Tasks: ✔** — Inbound `Read First` references resolve: [`mvp.02-content-schemas.23-schema-migration-policy-and-example`](../../tasks/mvp/02-content-schemas/23-schema-migration-policy-and-example.md), [`mvp.02-content-schemas.26-m2-engine-hash-backfill`](../../tasks/mvp/02-content-schemas/26-m2-engine-hash-backfill.md), [`mvp.08-persistence.02-log-only-save-format`](../../tasks/mvp/08-persistence/02-log-only-save-format.md) (acceptance criterion explicitly applies this matrix on pack-hash mismatch), and [`mvp.08-persistence.08-migration-registry`](../../tasks/mvp/08-persistence/08-migration-registry.md). No orphan tasks; no `Status:` field.

## ⚠ Issues

- **Stale "once authored" qualifier on `validation-error.schema.json` removed.** The original parenthetical "(see [`validation-error contract`] once authored)" no longer matches reality — [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json) is on disk and is owned by [`mvp.02-content-schemas.22-validation-error-contract`](../../tasks/mvp/02-content-schemas/22-validation-error-contract.md). The audit dropped the qualifier and tightened the link target. No code change implied; this is the only meaning-touching edit and is called out per § 8 Option A of the doc-audit skill.
- **Save/load screen-55 framing drifts from this matrix's vocabulary.** [`wiki/screens/55-save-load/data-contracts.md`](./wiki/screens/55-save-load/data-contracts.md):80 describes pack-hash mismatch handling as the load gate's "warn-or-abort policy in `version-policy.md`". This file's canonical vocabulary is `refuse / migrate / degrade`, and `degrade` does more than "warn" (it also keeps the save usable in singleplayer). Per Hard Prohibition D the audit did not edit the screen package. Suggested fix (owned by the save-load screen task — the screen package's owning task in [`tasks/task-registry.json`](../../tasks/task-registry.json)): replace "warn-or-abort policy" with "`refuse / migrate / degrade` matrix" and link to this file's § 2.
- **No primary `ownedPaths` entry for `docs/architecture/version-policy.md`.** A registry walk over [`tasks/task-registry.json`](../../tasks/task-registry.json) finds zero tasks naming this file in `ownedPaths`; four tasks reference it as `readFirst` (above). This is the same pattern as several other cross-cutting policy docs (e.g. [`content-platform.md`](./content-platform.md), confirmed by its prior audit) and is not currently CI-blocking, but should be tracked: when the matrix logic is first implemented in code, the implementing task should claim this doc on `Owned Paths (shared)` so future edits are not orphan. Suggested owner: whichever persistence task first lands a runtime that branches on the matrix (today the closest is [`mvp.08-persistence.02-log-only-save-format`](../../tasks/mvp/08-persistence/02-log-only-save-format.md), which already exercises one row).
