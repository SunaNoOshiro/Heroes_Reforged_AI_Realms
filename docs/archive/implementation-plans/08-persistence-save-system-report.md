# Implementation Report: 08 — Persistence / Save System

> Companion to [`08-persistence-save-system-plan.md`](08-persistence-save-system-plan.md).
> The plan is the authoring contract; this report records what was applied.

## Status

All section-2 Critical Fixes and section-3 System Improvements landed.
`npm run validate` passes (links, contracts, cross-refs, commands,
task lint, module graph, UI component coverage, animation budgets,
enums).

Execution followed the order pinned in section 5 of the plan; no
scope, decision, or design was changed.

---

## 1. Updated Files

### `docs/architecture/diagrams/24-save-flow.md`
Stripped the contradictory `state` blob from the example save JSON.
The example payload now mirrors the canonical `SaveRecord` shape from
[`02-log-only-save-format.md`](../../../tasks/mvp/08-persistence/02-log-only-save-format.md)
(no `state`; log-only; loading is replay). Added a "Begin txn / Commit
txn" pair around the manifest + payload writes. Pinned the gzip step
to "Compress gzip (pako, level 6)". Added a one-line canonical
reference to the owning task and an Atomicity section pointing to
the IDB wrapper's `${id}:manifest` / `${id}:payload` split-key
contract.

### `docs/architecture/diagrams/25-load-flow.md`
Added a "Hydrate from latest snapshot, replay tail" branch parallel
to the from-seed path. Added a migration-registry chain step before
the pack-hash gate. Documented the bit-identity contract: replay
from `(snapshot, log_since_snapshot)` is bit-identical to replay
from `(seed, full_log)` for any verified snapshot. Cross-linked to
the rebase task and the migration registry task.

### `docs/architecture/determinism.md`
Added three new sections at the bottom of "Content Hash + Engine
Hash":

- **Save Artifact Byte Determinism** — pinned `pako` level 6 for the
  save artifact only; declared the `canonicalContentHash` excludes
  dynamic metadata; declared full-file byte equality is **not** a
  contract while `canonicalContentHash` equality is; cross-linked the
  fuzz-harness CI gate.
- **Snapshot Rebase** — documented the bit-identity equivalence so
  snapshot replay does not weaken the determinism guarantee.
- **Tamper Detection vs. Forgery** — declared xxh64 detects
  accidental corruption only, not adversarial forgery; documented
  the HMAC-over-`canonicalContentHash` requirement for ranked /
  leaderboard / tournament features as **deferred**.

### `tasks/mvp/08-persistence/01-indexeddb-wrapper.md`
Added:

- `transaction(stores, mode, fn)` helper that atomically writes
  manifest + payload.
- Manifest / payload split-key convention: `${id}:manifest` +
  `${id}:payload`. `list()` reads only manifest records.
- Autosave shadow-key swap pattern (`${slot}.tmp` write, verify,
  rename inside one transaction).
- Quota policy: typed `QuotaExceededError` + `getQuotaUsage()`
  returning `{ used, quota }` from `navigator.storage.estimate()`.
- Acceptance criteria for atomic abort, manifest-only listing, and
  quota detection.

### `tasks/mvp/08-persistence/02-log-only-save-format.md`
Extended `SaveRecord` with:

- `saveVersion: 1` declared as the first member of the migration
  chain.
- `intent: "save" | "replay"` discriminator (replay envelope
  projection link).
- `canonicalContentHash` over the content-bearing subset
  (`saveVersion`, `seed`, `rulesetId`, `contentPackHashes`,
  `turnNumber`, `commandLog`, `checkpoints`, `stateHash`, `intent`),
  excluding `id`, `name`, `createdAt`, `savedAt`, `mp`.
- Optional `mp.{ matchId, participants, hostPlayerId }` block.
- `Checkpoint.snapshot?: SerializedState` for snapshot-rebase.

Added "Compression contract" (pako, level 6, no dictionary,
deterministic), "Snapshot Rebase Cap" (K=50 turns / M=5000 commands /
1 MB compressed cap), "Migration Chain" (links to
`save-migration.md` + registry task), and "Tamper Detection"
(forgery deferred). Re-saving an unchanged session at the same
`stateHash` must produce identical post-compression bytes for the
canonical-content subset.

### `tasks/mvp/08-persistence/03-save-load-ui.md`
Added acceptance criteria for:

- Manifest-only slot list (N manifest reads, zero payload reads).
- `selectors.persistence.autosaveSlots` rendering distinguishably.
- `ui.persistence.autosave.failed` toast hookup.
- `selectors.persistence.quotaUsage` driving a "Manage saves" CTA at
  > 80 % quota usage.

### `tasks/mvp/08-persistence/05-export-import-json.md`
Added:

- "Export atomicity" acceptance criterion: blob finalized in memory
  before download offered (mocked-`URL.createObjectURL` test).
- `exportReplay(saveId)` API that produces the PII-stripped envelope
  per `replay-format.md`.
- `intent: "replay"` files routed to the Replay viewer on import,
  not the user-save slot list.
- Filename conventions split: `save-{name}-{date}.hrsa.json` vs.
  `replay-{shortHash}.hrsa.json`.

### `tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`
Extended (shared owned-path extension):

- Save / load round-trip step: `load(save(state))` matches pre-save
  `stateHash`.
- Re-save byte-equivalence: two consecutive `save()` calls produce
  identical `canonicalContentHash`.
- Snapshot equivalence: `(snapshot, log_since_snapshot)` replay is
  bit-identical to `(seed, full_log)` replay.

Added new dependencies on `02-log-only-save-format` and
`07-snapshot-rebase`.

### `docs/architecture/wiki/screens/55-save-load/spec.md`
Added new state bindings: `autosaveSlots`, `quotaUsage`. Documented
that `SaveSlotTable` renders autosave rows distinguishably and a
"Manage saves" CTA above the slot list when quota usage exceeds
80 %; no new component nodes were introduced (the affordances live
inside the existing `SaveSlotTable`) so the component-registry
coverage stays stable.

### `docs/architecture/wiki/screens/55-save-load/data-contracts.md`
Added selector rows for `autosaveSlots` and `quotaUsage`. Annotated
`saveSlotManifests` as manifest-only. Added migration support-window
text (last 4 versions; computed against the registry, not a stub).
Added a new "Autosave And Storage Layout" section documenting the
rotating `auto-1`/`-2`/`-3` slots, the `${id}:manifest` /
`${id}:payload` split-key storage layout, and the multiplayer
host-only autosave rule.

### `docs/architecture/wiki/screens/55-save-load/interactions.md`
Added a "During Multiplayer" subsection with:

- Saving during MP is host-only; peer Save tabs are read-only.
- Loading into MP is host-driven; peers receive the agreed log over
  the signaling channel during join.
- Mid-match save records embed the optional `mp` block.
- Peers do not autosave during a remote match.

Cross-linked to `07-multiplayer-plan.md` and `06-autosave.md`. Added
disabled-state rows for out-of-window `saveVersion` (canonical
"incompatible save migration needed") and `QuotaExceededError`
remediation via the "Manage saves" CTA.

### `docs/architecture/wiki/screens/56-options/data-contracts.md`
Added `config.persistence.autosaveEnabled` boolean (default `true`,
binary on/off only — no user-tunable interval at MVP). Documented
that during a multiplayer match the setting is honored only on the
host.

### `docs/archive/implementation-plans/07-multiplayer-plan.md`
Added a "Cross-plan: Persistence interaction (owned by M1)"
subsection inside section 1. It pins the host-only saving rule, the
host-driven loading rule, the optional `mp` block, and the no-peer-
autosave rule, and points to
`wiki/screens/55-save-load/interactions.md` § "During multiplayer".

---

## 2. New Files

### `tasks/mvp/08-persistence/06-autosave.md`
New M1 task. Owns `src/persistence/autosave.ts`. Cadence is at every
End-Day local turn boundary, after per-turn `stateHash` is computed.
Non-blocking model (synchronous capture, async write, queue-depth-1).
Three rotating slots `auto-1`/`-2`/`-3` via shadow-key swap.
Failure path: silent retry once with backoff; second-failure
non-modal toast localized via `ui.persistence.autosave.failed`.
Multiplayer is **host-only**; peers do not autosave.
Selector: `selectors.persistence.autosaveSlots`.

Dependencies: `01-indexeddb-wrapper`, `02-log-only-save-format`,
`03-save-load-ui`, `07-snapshot-rebase`.

### `tasks/mvp/08-persistence/07-snapshot-rebase.md`
New M1 task. Owns `src/persistence/snapshot.ts`. Cadence: K = 50
turns OR M = 5 000 commands, whichever fires first. Rebase semantics
preserve `seed`, `contentPackHashes`, `turnNumber`; `commandLog` is
sliced to the tail since the latest verified snapshot.
1 MB compressed cap enforced before write (rebase, then localized
"save too large — start a new chapter?" dialog if still over).
Determinism: replay from `(snapshot, log_since_snapshot)` is
bit-identical to replay from `(seed, full_log)`.

Dependencies:
`mvp.01-engine-core.07-state-serializer-plus-xxh64-hash`,
`mvp.01-engine-core.08-replay-api`,
`mvp.08-persistence.02-log-only-save-format`.

### `tasks/mvp/08-persistence/08-migration-registry.md`
New M1 task. Owns `src/persistence/migrations/`,
`src/persistence/migrations/index.ts`,
`src/persistence/migrations/template.ts`, plus a `v1.ts` no-op
registry entry that exercises the wiring. Migrator signature is
`(prev: SaveRecord_vN) => SaveRecord_vN+1` — pure, synchronous,
no I/O. Composition runs in order from on-disk `saveVersion` to
current. Support window is the last 4 versions; older saves surface
the canonical "incompatible save migration needed" error. Pack-
version migration is explicitly **out of scope** (handled by the
load gate's warn-or-abort policy, not migrators).

Dependency: `mvp.08-persistence.02-log-only-save-format`.

### `docs/architecture/save-migration.md`
Canonical migration policy: signature, composition, support window,
authoring template (template + fixture + round-trip test), pack-
version boundary (out of scope for migrators), tamper-detection
cross-reference, and an authoring checklist.

### `docs/architecture/replay-format.md`
Canonical replay-format doc: `intent: "save" | "replay"`
discriminator, projection function (`projectReplay`), explicit
field-allowlist table (PII fields stripped: `name`, `createdAt`,
`savedAt`, `mp`; engine-bearing fields preserved), filename
conventions, loader contract (no branching on `intent`; same gates
apply, replay routes to the Replay viewer instead of the slot list).

---

## 3. Assumptions

⚠️ Assumption: `config.persistence.autosaveEnabled` is the chosen
key for the Options autosave on/off setting. The plan said to "declare
the autosave on/off setting key … (binary on/off only — no
user-tunable interval at MVP)" but did not pin the exact key name. I
used `config.persistence.*` to keep the namespace adjacent to other
persistence concerns; the existing `config.dev.*`, `config.audio.*`,
and `config.ui.*` keys in screen 56 follow the same `<domain>.<flag>`
convention.

⚠️ Assumption: `auto-{1|2|3}` slot keys with sibling
`${slot}.tmp:manifest` / `${slot}.tmp:payload` shadow keys are the
chosen syntax for the rotating-slot manifest convention. The plan
calls for `auto-1`/`-2`/`-3` rotation but does not pin the shadow-key
naming; I extended the wrapper's existing `${id}:manifest` /
`${id}:payload` split-key convention symmetrically.

⚠️ Assumption: the migration-fixture path is `saves/migrations/v{N}/sample.json`,
matching the plan's "fixture `saves/migrations/v{N}/sample.json`"
phrasing. The repo does not yet have a `saves/` top-level directory
(it lives under `src/persistence/migrations/` for runtime); the
fixture path is reserved by the migration registry task and will be
created when the first concrete migrator ships.

⚠️ Assumption: the `09-fuzz-harness-…` task file is the canonical
fuzz-harness file the plan refers to as `09-fuzz-harness.md`. The
plan uses the short form; the actual file in the repo is
`09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`. I edited
that file.

---

## 4. Blockers

None. All section-2 Critical Fixes and section-3 System Improvements
landed and `npm run validate` passes end-to-end.

---

## 5. Validation

```
$ npm run validate
generate:task-registry  ✓ Wrote 326 tasks and 24 modules
validate:links          ✓ All Markdown links resolve
validate:contracts      ✓ Repo contract checks passed
validate:cross-refs     ✓ Cross-reference checks passed
validate:commands       ✓ Command coverage check passed
validate:tasks          ✓ Task lint passed: 326 tasks, 0 issues
validate:arch           ✓ Module-graph check passed
validate:ui-components  ✓ Screen component coverage check passed
validate:animation-budgets ✓ animation-budget validator: ok
validate:enums          ✓ Enum snapshot check passed
```
