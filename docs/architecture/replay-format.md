# Replay Format

A replay is a **PII-stripped projection** of a save. Both share the
same on-disk shape; the `intent` discriminator distinguishes them.
This keeps the runtime loader, the determinism CI gate, and bug-report
fixtures unified — the same code reads both — while ensuring shared
artifacts do not leak the player's name or save title.

The on-disk `SaveRecord` shape is owned by
[`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md).
The export entry point is owned by
[`tasks/mvp/08-persistence/05-export-import-json.md`](../../tasks/mvp/08-persistence/05-export-import-json.md).

## Discriminator

```typescript
type Intent = "save" | "replay";
```

The `intent` field is part of `SaveRecord`. The Replay API
([`tasks/mvp/01-engine-core/08-replay-api.md`](../../tasks/mvp/01-engine-core/08-replay-api.md))
accepts both shapes; a replay envelope is just a save with a stripped
metadata header.

## Replay Envelope Projection

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

`deterministicId(hash)` returns a UUID-shaped id derived from the
canonical-content hash so two replays of the same session collide on
id (a feature, not a bug — they are the same artifact).

## Field Allowlist

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
re-categorized; an additive schema change must update this table or
the field is excluded from replay envelopes.

## Use Cases

- **Bug report uploads.** A player who shares a `*.hrsa.json`
  generated via "Export as replay" leaks no PII.
- **Determinism CI fixtures.** The fuzz-harness round-trip test
  ([`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md))
  may embed replay envelopes directly without scrubbing.
- **Spectator playback.** A future spectator feature consumes replays
  rather than saves; the host exports a replay and broadcasts it.

## Loader Contract

The loader does **not** branch on `intent`:

- For `intent: "save"`, the load gates apply normally and a
  `loadedAt` is recorded for the slot manifest.
- For `intent: "replay"`, the same gates apply, but the load is
  routed to the Replay viewer (no slot manifest, no Save UI binding).

This keeps the load gate logic singular: one schema-version migration
chain, one pack-hash check, one canonical-content-hash verification,
one replay-and-state-hash assertion.

## Identification On Disk

The `*.hrsa.json` filename convention encodes the intent:

- Saves: `save-{name}-{date}.hrsa.json`
- Replays: `replay-{shortHash}.hrsa.json`

The filename is a hint; the canonical discriminator remains the
`intent` field inside the JSON.
