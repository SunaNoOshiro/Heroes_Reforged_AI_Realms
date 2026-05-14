# Replay Format

A replay is a **PII-stripped projection** of a save. Both share the
on-disk shape; the `intent` discriminator distinguishes them. One
loader reads both — same migration chain, same hash gates — so the
runtime, the determinism CI fixtures, and bug-report uploads stay
unified without leaking the player's name or save title.

## Companion docs

- [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — owns the on-disk `SaveRecord` shape projected here.
- [`tasks/mvp/08-persistence/05-export-import-json.md`](../../tasks/mvp/08-persistence/05-export-import-json.md)
  — owns `exportReplay()` and the `*.hrsa.json` filename convention.
- [`tasks/mvp/01-engine-core/08-replay-api.md`](../../tasks/mvp/01-engine-core/08-replay-api.md)
  — owns the `replay(seed, log)` consumer.
- [`save-migration.md`](./save-migration.md) — outer envelope intent
  discriminator and migration chain.
- [`save-envelope-mac.md`](./save-envelope-mac.md) — M5+ MAC seam on
  the outer envelope.
- [`schema-matrix.md`](./schema-matrix.md) — `Save` and `SaveEnvelope`
  rows.

## 1. Discriminator

```typescript
type Intent = "save" | "replay";
```

`intent` is a field on `SaveRecord`. The Replay API
([`08-replay-api.md`](../../tasks/mvp/01-engine-core/08-replay-api.md))
accepts both shapes; a replay is just a save with a stripped metadata
header.

## 2. Replay envelope projection

Given a `SaveRecord` with `intent: "save"`:

```typescript
function projectReplay(save: SaveRecord_save): SaveRecord_replay {
  return {
    saveVersion: save.saveVersion,
    intent: "replay",
    // PII / per-player metadata stripped:
    id: deterministicId(save.canonicalContentHash),
    name: "",                     // empty — no user title
    createdAt: 0,                 // zeroed — no wall clock
    savedAt: 0,                   // zeroed — no wall clock
    // Engine-bearing fields preserved verbatim:
    seed: save.seed,
    rulesetId: save.rulesetId,
    contentPackHashes: save.contentPackHashes,
    turnNumber: save.turnNumber,
    commandLog: save.commandLog,
    checkpoints: save.checkpoints,
    stateHash: save.stateHash,
    canonicalContentHash: save.canonicalContentHash,
    // mp block stripped — match identifiers are PII
  };
}
```

`deterministicId(hash)` returns a UUID-shaped id derived from
`canonicalContentHash`, so two replays of the same session collide on
id — they are the same artifact.

## 3. Field allowlist

Only the fields below may appear in a replay envelope. Anything else
is a leak and must be stripped:

| Field                  | Replay envelope | Reason                                      |
| ---------------------- | --------------- | ------------------------------------------- |
| `saveVersion`          | yes             | Migration identifier                        |
| `intent`               | yes (`"replay"`)| Discriminator                               |
| `id`                   | yes (derived)   | Hash-derived, not the save's UUID           |
| `name`                 | yes (empty)     | Player title — stripped to empty string     |
| `createdAt`            | yes (zero)      | Wall clock — zeroed                         |
| `savedAt`              | yes (zero)      | Wall clock — zeroed                         |
| `seed`                 | yes             | Required for replay                         |
| `rulesetId`            | yes             | Required for replay                         |
| `contentPackHashes`    | yes             | Required for replay gate                    |
| `turnNumber`           | yes             | Required for replay                         |
| `commandLog`           | yes             | The replay payload                          |
| `checkpoints`          | yes             | Snapshot rebase support                     |
| `stateHash`            | yes             | Determinism oracle                          |
| `canonicalContentHash` | yes             | Determinism oracle + id derivation          |
| `mp`                   | **stripped**    | Match identifiers, peer player IDs are PII  |

Future `SaveRecord` fields default to **stripped** unless explicitly
re-categorized. An additive schema change MUST update this table or
the new field is excluded from replay envelopes.

## 4. Use cases

- **Bug report uploads.** A player who shares a `*.hrsa.json` produced
  by "Export as replay" leaks no PII.
- **Determinism CI fixtures.** The fuzz harness round-trip
  ([`09-fuzz-harness…`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md))
  may embed replay envelopes directly without scrubbing.
- **Spectator playback.** A future spectator feature consumes replays
  rather than saves; the host exports a replay and broadcasts it.

## 5. Loader contract

The loader does **not** branch on `intent`:

- `intent: "save"` — load gates apply normally; `loadedAt` is recorded
  for the slot manifest.
- `intent: "replay"` — same gates apply, but the load is routed to
  the Replay viewer (no slot manifest, no Save UI binding).

This keeps the load pipeline singular: one schema-version migration
chain, one pack-hash check, one canonical-content-hash verification,
one replay-and-state-hash assertion.

## 6. Identification on disk

The `*.hrsa.json` filename encodes the intent:

- Saves: `save-{name}-{date}.hrsa.json`
- Replays: `replay-{shortHash}.hrsa.json`

The filename is a hint; the canonical discriminator remains the
`intent` field inside the JSON.

---

## 🔍 Sync Check

- **UI: ✔** — No screen-package surface is asserted by this doc; the
  "Replay viewer" route is named the same way in
  [`05-export-import-json.md`](../../tasks/mvp/08-persistence/05-export-import-json.md)
  acceptance criteria.
- **Schema: ⚠** — The runtime `SaveRecord` shape modeled here matches
  [`02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md);
  however `SaveRecord.localeAtSave` (declared there) has no row in
  the § 3 allowlist, and the on-disk export shape is the outer
  [`save-envelope.schema.json`](../../content-schema/schemas/save-envelope.schema.json)
  whose `intent` enum is `save | replay | fixture` (three values, not
  two). See `## ⚠ Issues`.
- **Tasks: ✔** — Owners cross-link reciprocally:
  [`02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md),
  [`05-export-import-json.md`](../../tasks/mvp/08-persistence/05-export-import-json.md),
  and the parent module
  [`tasks/mvp/08-persistence.md`](../../tasks/mvp/08-persistence.md)
  all reference this doc.

## ⚠ Issues

- **`localeAtSave` is missing from the allowlist.** The owning task
  [`02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  declares `localeAtSave: string` as a `SaveRecord` field
  ("Display only; load does not warn on mismatch"), and § 3 here
  states that "an additive schema change must update this table or
  the field is excluded from replay envelopes." The table currently
  has no row for it, so by its own rule the field would be silently
  stripped, which conflicts with the intent that it is display-only
  and not PII. Per CLAUDE.md root contract (`enum-lifecycle-policy`
  → additive-first), the owner of `02-log-only-save-format.md` must
  decide and add a row. Suggested values: `localeAtSave` — `yes` —
  "Display-only locale tag; not PII".
- **Two-tier model: inner `SaveRecord` vs outer `SaveEnvelope`.**
  This doc models only the inner runtime `SaveRecord`. The actual
  `*.hrsa.json` artifact is a
  [`SaveEnvelope`](../../content-schema/schemas/save-envelope.schema.json)
  whose `intent` enum is `save | replay | fixture` (per
  [`save-migration.md` § Envelope, Intent Discriminator & MAC Phase-In](./save-migration.md#envelope-intent-discriminator--mac-phase-in)
  and owning task
  [`18-save-envelope-and-intent.md`](../../tasks/mvp/08-persistence/18-save-envelope-and-intent.md)),
  and the privacy strip there names `metadata.playerName`,
  `metadata.playerHash`, `metadata.playerLabel`, `metadata.thumbnail`.
  The two layers are consistent in spirit but use different field
  names because the import-time validator schema
  ([`save.schema.json`](../../content-schema/schemas/save.schema.json))
  nests these fields under `metadata` while the runtime record keeps
  them flat. Per CLAUDE.md root contract ("schema evolution is
  additive-first; alias before remove"), the owner of either
  `02-log-only-save-format.md` or `save-migration.md` should add a
  one-paragraph cross-reference noting the runtime ↔ envelope
  field mapping (in particular `name` ↔ `metadata.playerName /
  playerLabel`). Skill did not edit either file (Hard Prohibition D).
- **`fixture` intent absent here.** § 1 declares
  `Intent = "save" | "replay"`, but the envelope schema and
  [`save-migration.md`](./save-migration.md) add a third value
  `fixture` (canonical engine fixture, Ed25519-signed). The runtime
  inner-record discriminator may legitimately remain two-valued
  (fixtures are an envelope concern, not a runtime-load concern), but
  this distinction is not stated. Per § 7 Architecture Quality
  ("explicit responsibilities"), the inner-record vs envelope scope
  should be explicit; preserving the existing two-valued union here
  was the conservative choice (Hard Prohibition A — never change
  meaning). Suggested resolution: a one-line note in § 1 stating
  "the outer envelope adds `fixture`; this projection only applies
  to the `save → replay` transition."
