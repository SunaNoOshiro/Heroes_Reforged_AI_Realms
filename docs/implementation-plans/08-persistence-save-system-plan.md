# Implementation Plan: 08 — Persistence / Save System

> Derived from [docs/readiness-audit/08-persistence-save-system.md](../readiness-audit/08-persistence-save-system.md).
> Original audit file is **not** modified. This plan converts the
> documented gaps (❌ UNKNOWN, ⚠ Partial, Missing Logic, Risks) into
> concrete work items grounded in the existing M1 task tree under
> [tasks/mvp/08-persistence/](../../tasks/mvp/08-persistence/) and the
> screen package at
> [docs/architecture/wiki/screens/55-save-load/](../architecture/wiki/screens/55-save-load/).

---

## 1. Overview

This plan covers the operational and policy gaps in the M1 persistence
module. The audit confirms the **architectural skeleton is sound**:
log-only save format, content/engine-hash pinning, replay-on-load with
xxh64 verification, three-gate fail-loud loader (format / pack-hash /
replay-hash), manifest-only inspection, IndexedDB primary + JSON
export are all defined across the five existing task files,
[`docs/architecture/diagrams/24-save-flow.md`](../architecture/diagrams/24-save-flow.md),
[`docs/architecture/diagrams/25-load-flow.md`](../architecture/diagrams/25-load-flow.md),
and the Save/Load screen package.

What is missing is the layer of **operational contracts** an AI
implementer would otherwise be forced to invent during M1 execution:

- A migrator authoring contract, registry, and support window.
- An autosave cadence, blocking model, retention, and failure UX.
- An atomicity / crash-safety contract for both IndexedDB and the
  File API export path.
- A pinned gzip library + level so on-disk bytes are reproducible.
- A snapshot-and-rebase rule so the command log cannot grow unbounded.
- An on-disk manifest/payload split so list views are O(slots), not
  O(total log bytes).
- A signed-replay envelope so shared `*.replay` artifacts are
  PII-clean and distinguishable from saves.
- A determinism CI gate that re-saves and re-loads every fixture.
- A diagram-drift fix: `24-save-flow.md` still shows a `state` blob
  that contradicts the canonical log-only task — exactly one of the
  two must be corrected.

**Overall readiness state:** 6 / 10 (per audit). Closing the items
below lifts this to 8–9 / 10, which is the threshold for letting
agents implement M1 persistence end-to-end without inventing
decisions.

**In scope of this plan:**

- New operational contracts under
  [`docs/architecture/`](../architecture/) and the existing M1
  persistence task files.
- New task files under
  [`tasks/mvp/08-persistence/`](../../tasks/mvp/08-persistence/)
  for work that does not fit an existing task.
- Extensions (not rewrites) to existing M1 tasks via owned-paths
  shared-extension semantics.

**Explicitly out of scope (deferred):**

- First-party cloud save sync (no MVP task; remains deferred — see
  Q159).
- Cryptographically-signed saves for ranked / leaderboard play. We
  document the gap and the required scheme but defer the
  implementation to whichever phase introduces the ranked mode (see
  Q158, Risks bullet 4).
- Account systems / server-side save store.

---

## 2. Critical Fixes (Must Do First)

These six items unblock M1 exit to "ready for closed alpha." Each
maps directly to a Missing Logic bullet in the audit summary.

### Issue: Diagram drift in 24-save-flow.md

**Source:** Q150 (⚠ Partial); Missing Logic bullet 9.

**Problem:**
[`docs/architecture/diagrams/24-save-flow.md`](../architecture/diagrams/24-save-flow.md)
shows a save file containing a `state` blob alongside `commandLog`.
This contradicts
[`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md),
which is explicit that "a save file contains only the metadata and
command log — no game state." An AI implementer reading both must
silently reconcile them; a human reader could implement either, and
the wrong one breaks every other persistence contract (replay-equality,
load-time hash check, log-only size targets).

**Impact:**
- Two sources of truth on the **payload shape** — the most
  load-bearing decision in the module.
- Pack-hash and replay-hash gates (Q157) lose meaning if a `state`
  blob is also written and trusted.

**Solution:**
The implementation contract takes precedence. Strip the `state` field
from the example payload in `24-save-flow.md`, add a one-line note
("save is log-only; loading is replay") above the payload block, and
add a **canonical reference link** from the diagram to
`02-log-only-save-format.md`.

**Files to Update:**
- [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md)
  — remove `state`; align field list with `SaveRecord` in
  `02-log-only-save-format.md`.

**New Files (if needed):** none.

**Implementation Steps:**
1. Open `24-save-flow.md`, locate the example save JSON.
2. Replace it with the canonical `SaveRecord` shape from
   `02-log-only-save-format.md` (`id`, `name`, `createdAt`,
   `savedAt`, `seed`, `rulesetId`, `contentPackHashes`, `turnNumber`,
   `commandLog`, optional `checkpoints`, `stateHash`).
3. Add a "Canonical reference" line pointing to
   `tasks/mvp/08-persistence/02-log-only-save-format.md`.
4. Run `npm run validate` to confirm no link drift.

**Dependencies:** none.

**Complexity:** S.

---

### Issue: No autosave cadence, blocking model, or retention policy

**Source:** Q160 (❌ UNKNOWN); Missing Logic bullet 2; Risks bullet 3.

**Problem:**
"Autosave" appears as a setting in
[`docs/architecture/wiki/screens/56-options/spec.md`](../architecture/wiki/screens/56-options/spec.md)
and as a slot label in
[`docs/architecture/wiki/screens/55-save-load/mockup.html`](../architecture/wiki/screens/55-save-load/mockup.html)
("Autosave - Day 7"), but no task formalizes:

- Cadence (every turn / every day / on End-Day / every N minutes).
- Whether the write blocks the command pipeline.
- Retention (overwrite a single slot vs. rotating slots).
- Failure handling (silent retry, toast, abort).
- Multiplayer interaction (host-only? suppressed entirely?).

**Impact:**
- Players lose hours if a crash hits between two naive End-Day saves.
- A blocking implementation stalls the render loop on save serialize +
  gzip + IndexedDB write.
- An async implementation without explicit retention can balloon
  IndexedDB.

**Solution:**
Adopt the policy already proposed in the audit's Improvements list
and codify it as a new MVP task:

- **Cadence:** at every End-Day local turn boundary, after the
  per-turn `stateHash` is computed but before the next turn's
  command flush.
- **Blocking:** non-blocking. Snapshot the command log + metadata
  synchronously (cheap — log is small), then dispatch the
  IndexedDB write asynchronously. The next turn proceeds while the
  write is in flight; a queued second autosave waits for the first.
- **Retention:** rotating 3 slots: `auto-1`, `auto-2`, `auto-3`,
  oldest overwritten.
- **Failure UX:** silent retry once with exponential backoff; on
  second failure, non-modal toast localized via
  `ui.persistence.autosave.failed`. Game state is not affected.
- **Multiplayer:** host-only autosave during a remote match. Peers
  receive a "host saved" indicator only; no local autosave to avoid
  divergent libraries.

**Files to Update:**
- [tasks/mvp/08-persistence/03-save-load-ui.md](../../tasks/mvp/08-persistence/03-save-load-ui.md)
  — add a `selectors.persistence.autosaveSlots` reference and a
  failure-toast hookup.
- [docs/architecture/wiki/screens/56-options/data-contracts.md](../architecture/wiki/screens/56-options/data-contracts.md)
  — declare the autosave on/off setting key and the cadence it
  controls (binary on/off only — no user-tunable interval at MVP).
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../architecture/wiki/screens/55-save-load/data-contracts.md)
  — add the rotating-slot manifest convention (`auto-1`/`-2`/`-3`).

**New Files (if needed):**
- `tasks/mvp/08-persistence/06-autosave.md` — new M1 task. Owned
  paths: `src/persistence/autosave.ts`. Dependencies: tasks 01, 02,
  03 in this folder, plus the engine End-Day boundary token.

**Implementation Steps:**
1. Author `06-autosave.md` with the policy above and explicit
   acceptance criteria (cadence, non-blocking, rotation, retry,
   MP host-only).
2. Add `selectors.persistence.autosaveSlots` to the Save/Load screen
   data contract; surface `auto-1/2/3` rows distinguishably from
   user slots.
3. Wire the Options screen autosave on/off setting through the
   command pipeline so `06-autosave` reads it at every End-Day.
4. Add a unit test that verifies (a) the write does not block the
   reducer, (b) three saves rotate, (c) a write failure does not
   crash the next turn, (d) MP peers do not autosave.

**Dependencies:**
- mvp.01-engine-core.06-end-of-turn-boundary (or equivalent).
- mvp.08-persistence.02-log-only-save-format.

**Complexity:** M.

---

### Issue: Atomicity / crash-safety contract is undocumented

**Source:** Q161 (❌ UNKNOWN); Missing Logic bullet 3; Risks bullet 6.

**Problem:**
The save-flow ends with "Write to disk" with no transactional
contract.
[`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
exposes per-store get/set/delete/list but does not state whether
the manifest + payload writes share one transaction.
[`tasks/mvp/08-persistence/05-export-import-json.md`](../../tasks/mvp/08-persistence/05-export-import-json.md)
inherits no atomicity guarantee from the File API.

**Impact:**
- A tab kill mid-autosave can produce a half-written record that
  the load gates would reject **and** poison list views (manifest
  visible, payload missing).
- A tab kill mid-export produces a truncated `*.hrsa.json` that the
  player may keep as their only backup.

**Solution:**
- **IndexedDB path:** the wrapper opens **one** IDB transaction
  per save that writes both the manifest record and the payload
  record. On commit, both appear; on abort, neither appears. Add
  an explicit "atomic save transaction" contract to
  `01-indexeddb-wrapper.md`.
- **Autosave path (extension):** before overwriting a rotating slot,
  the new record is written under a shadow key (`${slot}.tmp`),
  the post-replay `stateHash` is verified against the live
  `stateHash`, and only then is the shadow key renamed to the live
  slot inside a single transaction. This is a verify-then-swap
  pattern adapted for IDB.
- **Export path:** finalize the entire JSON blob in memory, then
  invoke `URL.createObjectURL` + anchor-click in a single
  microtask. Streaming downloads are forbidden for `.hrsa.json`.
  Document this in `05-export-import-json.md`.

**Files to Update:**
- [tasks/mvp/08-persistence/01-indexeddb-wrapper.md](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
  — add "Atomic save transaction" section, with the manifest+payload
  one-transaction contract and the shadow-key swap pattern.
- [tasks/mvp/08-persistence/05-export-import-json.md](../../tasks/mvp/08-persistence/05-export-import-json.md)
  — add "Export atomicity" acceptance criterion: blob finalized
  in memory before download is offered.
- [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md)
  — add a "Begin txn / Commit txn" pair around the manifest +
  payload writes.

**New Files (if needed):** none.

**Implementation Steps:**
1. Update the IDB wrapper contract to expose a `transaction(stores,
   mode, fn)` helper that ensures manifest + payload share one txn.
2. Implement the shadow-key swap in `06-autosave.md` (depends on
   the new helper).
3. Add an integration test that aborts a mock IDB transaction
   mid-write and asserts neither manifest nor payload is visible
   afterwards.
4. Add an export-path test that asserts the blob is finalized
   before download is triggered (mock `URL.createObjectURL`).

**Dependencies:**
- This issue must land **before** `06-autosave` so the shadow swap
  has a transaction primitive to use.

**Complexity:** M.

---

### Issue: Compression is not pinned (library, level, byte-equivalence)

**Source:** Q154 (⚠ Partial); Missing Logic bullet 4.

**Problem:**
[`docs/architecture/diagrams/24-save-flow.md`](../architecture/diagrams/24-save-flow.md)
ends with "Compress gzip → Write to disk" with no library, no level,
and no byte-equivalence guarantee. Different gzip implementations
produce different bytes for identical input even at the same level.
The save-size figures themselves disagree (< 50 KB vs. 50–200 KB),
suggesting nobody has pinned a baseline.

**Impact:**
- Cross-machine save-byte comparisons (a useful debugging affordance)
  silently fail.
- Cannot run a "re-save is a no-op at the byte level" determinism
  test (see "Determinism CI gate" below) — the test has no fixed
  output to compare against.

**Solution:**
Pin **`pako` at level 6** (or `CompressionStream` where the spec is
fixed). Document this in the canonical save-format task. The
choice of `pako` is favored over `CompressionStream` for MVP because
the latter is not yet ubiquitous in the targeted browser set per
[`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
(Chrome / Firefox / Safari, no fallbacks).

**Files to Update:**
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — add "Compression contract" section: library = `pako`,
  level = `6`, dictionary = none, deterministic per same input.
- [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md)
  — replace "Compress gzip" with "Compress gzip (pako, level 6)".
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — extend the canonical-bytes section with a note that gzip is
  pinned for save artifacts only and is **not** part of the
  determinism contract for engine state itself.

**New Files (if needed):** none.

**Implementation Steps:**
1. Add `pako` as an explicit M1 dependency.
2. Update `02-log-only-save-format.md` acceptance criteria with
   "re-saving an unchanged session at the same `stateHash`
   produces identical compressed bytes (after stripping the
   dynamic metadata header)."
3. Add a unit test that enforces (2) for a fixture session.

**Dependencies:** none.

**Complexity:** S.

---

### Issue: No log-pruning / snapshot-and-rebase policy

**Source:** Q163 (❌ UNKNOWN); Missing Logic bullet 7; Risks bullet 2.

**Problem:**
The save model is "log forever from `seed`." Optional `Checkpoint[]`
helps load latency but does not prune the log. There is no cap on
command-log length, no rotation policy, no per-save size cap. A
multi-month campaign or a long multiplayer match accumulates tens
of thousands of commands, blowing the 2 s load target documented
in
[`tasks/mvp/08-persistence/03-save-load-ui.md`](../../tasks/mvp/08-persistence/03-save-load-ui.md).

**Impact:**
- Load times degrade linearly with campaign length.
- Save sizes can exceed any reasonable per-save quota (see
  IndexedDB quota issue below).
- The "checkpoints" feature is documented but its rebase semantics
  are not.

**Solution:**
Adopt a snapshot-and-rebase policy:

- Every **K = 50 turns** (or every M = 5 000 commands, whichever
  fires first), capture a verified canonical state snapshot.
- The snapshot is a full canonical-JSON-serialized `GameState`,
  hashed with xxh64 and stored as a new `Checkpoint{ logIndex,
  stateHash, snapshot }` record.
- On the next save, **rebase** the command log: drop all commands
  before the latest verified snapshot, retain `(snapshot,
  log_since_snapshot)`. The seed remains in the metadata for
  archival; replay starts from the snapshot, not from seed.
- Cap the rebased save at **1 MB compressed**; a save that
  would exceed this triggers a forced rebase or surfaces a
  "save too large — start a new chapter?" dialog.

**Files to Update:**
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — extend `Checkpoint` with `snapshot?: SerializedState` and
  declare the K-turn cadence; add the 1 MB cap.
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — add a "Snapshot rebase" section noting that replay from
  `(snapshot, log_since_snapshot)` is contractually equivalent to
  replay from `(seed, full_log)` for any verified snapshot.
- [docs/architecture/diagrams/25-load-flow.md](../architecture/diagrams/25-load-flow.md)
  — add a "Hydrate from latest snapshot, replay tail" branch
  parallel to the from-seed path.

**New Files (if needed):**
- `tasks/mvp/08-persistence/07-snapshot-rebase.md` — new M1 task.
  Owned paths: `src/persistence/snapshot.ts`. Dependencies:
  mvp.01-engine-core.07-state-serializer-plus-xxh64-hash,
  mvp.08-persistence.02-log-only-save-format.

**Implementation Steps:**
1. Author `07-snapshot-rebase.md` with the K-turn cadence, the
   1 MB cap, the rebase-on-save semantics, and a determinism
   acceptance test (snapshot + tail produces same `stateHash` as
   from-seed full log).
2. Update `Checkpoint` in `02-log-only-save-format.md` to include
   the optional `snapshot` field.
3. Wire `06-autosave` to call into snapshot-rebase before writing,
   so autosaves never exceed the 1 MB cap.
4. Add the load-flow snapshot branch to `25-load-flow.md`.

**Dependencies:**
- This issue must land **before** `06-autosave` finalizes, since
  autosave consumes the rebase entry point.

**Complexity:** L.

---

### Issue: No save-format migration registry or policy

**Source:** Q155 (⚠ Partial), Q156 (❌ UNKNOWN); Missing Logic bullet 1.

**Problem:**
Each save carries a `saveVersion` integer (currently `1`), and the
load pipeline validates schema version, content hashes, pack
compatibility, ruleset version, and migration availability. The
Save/Load screen exposes
`selectors.persistence.selectedSaveCompatibility` and the
missing-states catalog declares "incompatible save migration
needed." But:

- No migrator authoring contract (signature? composition rules?
  testing rules?).
- No support window (how many versions back are migrated?).
- No deprecation timeline.
- No content-pack-version migration rule for saves (only a
  warn/abort UI on hash mismatch).
- No immutable-archive policy for very old saves.

**Impact:**
- The first breaking schema change (which is inevitable) has no
  defined process. Every implementer reinvents one.
- The Save/Load compatibility seal renders "migration available?"
  with no actual migration code path behind it.

**Solution:**
Author a migration registry with the following contract:

- **Signature:** `(prev: SaveRecord_vN) => SaveRecord_vN+1` — pure,
  synchronous, no I/O. Each migrator handles exactly one version
  step.
- **Composition:** the loader composes migrators in order from
  `saveVersion` to `current` to produce a final record before
  replay. If any step throws, the load surfaces the
  "incompatible save migration needed" state.
- **Support window:** **last 4 save versions** are migrated
  in-app. Older saves are accepted via export-only path: the user
  is told to keep the file and can re-import after we ship the
  bridging migrators.
- **Authoring rule:** each migrator ships with a fixture
  `saves/migrations/v{N}/sample.json` and a round-trip test that
  loads, migrates, replays, and asserts the post-replay
  `stateHash` is non-zero (the migrator must produce a replayable
  log).
- **Pack-version migration:** out of scope for save migrators —
  the load gate will continue to warn-or-abort on pack-hash
  mismatch. We document this explicitly to prevent scope creep.

**Files to Update:**
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../architecture/wiki/screens/55-save-load/data-contracts.md)
  — replace the implicit "migration availability" line with an
  explicit support-window statement.
- [docs/architecture/wiki/screens/55-save-load/spec.md](../architecture/wiki/screens/55-save-load/spec.md)
  — same.
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — declare `saveVersion: 1` as the first member of a migration
  chain and link to the new migration contract doc.

**New Files (if needed):**
- `docs/architecture/save-migration.md` — canonical migration
  policy doc. Covers signature, composition, support window,
  testing contract, authoring template, and the
  pack-version-mismatch boundary.
- `tasks/mvp/08-persistence/08-migration-registry.md` — new M1
  task. Owned paths: `src/persistence/migrations/`,
  `src/persistence/migrations/index.ts`,
  `src/persistence/migrations/template.ts`.

**Implementation Steps:**
1. Author `docs/architecture/save-migration.md`.
2. Author `08-migration-registry.md` with acceptance criteria:
   (a) `migrate(record)` composes registered migrators in order;
   (b) unknown-version throws the canonical "incompatible save
   migration needed" error; (c) a stub `v1` migrator exists as
   the registry's first entry (no-op) so the wiring is exercised.
3. Add a CI fixture `saves/migrations/v1/sample.json` and a
   round-trip test.
4. Update `selectors.persistence.selectedSaveCompatibility` to
   compute against the registry, not against a stubbed
   "available" boolean.

**Dependencies:**
- mvp.08-persistence.02-log-only-save-format.
- This issue is **prerequisite** for any future schema change.

**Complexity:** M.

---

## 3. System Improvements

Grouped by system. None of these block M1 closed-alpha exit, but
each removes ambiguity an AI implementer would otherwise have to
guess at.

### UI / Screens

#### Issue: Manifest/payload split on disk is unspecified

**Source:** Q162 (✔ Defined for the contract; ⚠ on storage layout);
Missing Logic bullet 8.

**Problem:**
The Save/Load screen reads save manifests first via
`selectors.persistence.saveSlotManifests`, never the full payload —
this is the right contract. But the on-disk layout is unspecified:
if the IndexedDB record stores manifest + payload as one blob, the
"manifest-only" listing still pays the full-blob fetch cost.

**Impact:**
- A library of 30 saves at 200 KB each forces ~6 MB of reads to
  render the slot list.
- Slot-list scroll performance degrades as the library grows.

**Solution:**
Store the manifest as a separate IndexedDB record keyed by
`${id}:manifest` and the payload at `${id}:payload`, both written
inside the single transaction declared in the atomicity fix above.
List views read only `${id}:manifest` records; the payload is
fetched only on Load confirmation.

**Files to Update:**
- [tasks/mvp/08-persistence/01-indexeddb-wrapper.md](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
  — declare the `${id}:manifest` / `${id}:payload` key convention
  and the list-view contract.
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../architecture/wiki/screens/55-save-load/data-contracts.md)
  — note that `saveSlotManifests` reads only manifest records.

**New Files (if needed):** none.

**Implementation Steps:**
1. Add the key convention to `01-indexeddb-wrapper.md`.
2. Add a unit test that asserts `list()` over a fixture of N
   saves issues N manifest reads and zero payload reads.

**Dependencies:** This rides on top of the atomicity-transaction
contract above.

**Complexity:** S.

---

### Data Contracts

#### Issue: Events are never serialized (cross-reference)

**Source:** Cross-reference into the event-system plan
([`11-event-system-plan.md`](./11-event-system-plan.md) § 3.C-2).

**Rule:** Events are deterministic byproducts of replay, not state.
Save records contain `(seed, content hashes, command log, state
snapshot)` only — they MUST NOT contain any field whose key matches
`events?` or `eventLog?`. Replays re-derive events from the command
log; the per-battle `eventLog: Event[]` returned by
`AUTO_RESOLVE_BATTLE` is one-shot UI-bound and never enters the save
record. The runtime contract lives in
[`docs/architecture/event-system.md` § 7 Save & Load](../architecture/event-system.md#7-save--load).

**Files to Update:**
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — add an acceptance criterion: "save record MUST NOT contain any
  field whose key matches `events?` or `eventLog?`".

**Complexity:** **S** (acceptance-criterion edit only; the runtime
contract is owned by the event-system plan).

---

#### Issue: Byte-identical save guarantee is partial

**Source:** Q151 (⚠ Partial); Missing Logic bullet 5.

**Problem:**
Canonical pre-compression bytes are deterministic, but per-save
metadata (`createdAt`, `savedAt`, `id`, `name`) and unfixed gzip
break bit-equality of on-disk files for identical engine state.
There is no "save A == save B byte-for-byte if same state"
acceptance test.

**Impact:**
- Cannot use byte-equality as a fast determinism oracle in CI.
- Players cannot trivially diff two saves to see "did anything
  change?".

**Solution:**
Define a **canonical-content hash** that excludes the dynamic
metadata header and pin the gzip choice. Add a CI fixture that
re-saves an unchanged session and asserts identical
canonical-content bytes (not full file bytes). Document that full
on-disk byte equality is **not** a contract.

**Files to Update:**
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — add a `canonicalContentHash` derived from
  `(seed, rulesetId, contentPackHashes, turnNumber, commandLog,
  stateHash)` and exclude `id`, `name`, `createdAt`, `savedAt`.
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — declare the canonical-content-hash contract and the explicit
  non-contract on full-file bytes.

**New Files (if needed):** none.

**Implementation Steps:**
1. Extend `SaveRecord` with `canonicalContentHash: string`.
2. Compute it during save; verify it during load.
3. Add a CI test that re-saves a fixture twice and asserts
   identical `canonicalContentHash`.

**Dependencies:** Pinned compression (Critical fix above).

**Complexity:** S.

---

#### Issue: No save-vs-replay envelope distinction

**Source:** Q152 (⚠ Partial); Missing Logic bullet 6.

**Problem:**
The save *is* the replay artifact — load is replay. But there is
no envelope spec for shared replays (spectator playback, bug-report
fixtures, determinism-harness fixtures). Sharing a save leaks PII
(player name, save title) and conflates a private library with a
public artifact.

**Impact:**
- A bug-report uploader who shares a `*.hrsa.json` leaks their
  player name and slot title.
- Replays cannot be embedded in determinism CI fixtures without
  manual scrubbing.

**Solution:**
Add an `intent: "save" | "replay"` discriminator to the envelope.
A replay envelope strips `name`, `id`, `createdAt`, `savedAt` and
substitutes a deterministic id derived from
`canonicalContentHash`. The Replay API
([`tasks/mvp/01-engine-core/08-replay-api.md`](../../tasks/mvp/01-engine-core/08-replay-api.md))
accepts both shapes.

**Files to Update:**
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — add `intent` field; document the replay-envelope projection.
- [tasks/mvp/08-persistence/05-export-import-json.md](../../tasks/mvp/08-persistence/05-export-import-json.md)
  — add an "Export as replay" button contract that produces a
  PII-stripped artifact.

**New Files (if needed):**
- `docs/architecture/replay-format.md` — short canonical doc
  declaring the replay envelope as a projection of the save
  envelope, with an explicit field-allowlist.

**Implementation Steps:**
1. Author `docs/architecture/replay-format.md`.
2. Add `intent` to `SaveRecord` and the projection function.
3. Add the "Export as replay" UI hook to the Save/Load spec.

**Dependencies:** none.

**Complexity:** M.

---

### Architecture

#### Issue: IndexedDB quota policy is undefined

**Source:** Risks bullet 7.

**Problem:**
Browsers cap IndexedDB at ~50 MB to unbounded depending on policy
and platform. No quota-handling task exists. A long-running player
or one with many campaigns will eventually hit the cap, and the
write-failure path is undefined.

**Impact:**
- A new save fails silently or with a raw `QuotaExceededError`.
- Autosave (once introduced) starts failing every End-Day with no
  remediation surface.

**Solution:**
Detect quota errors in the IDB wrapper and surface them via the
Save/Load screen's existing error channel. Add a
`selectors.persistence.quotaUsage` reading and a "Manage saves" CTA
that recommends export of older saves before allowing new ones.

**Files to Update:**
- [tasks/mvp/08-persistence/01-indexeddb-wrapper.md](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
  — declare the quota-error path: `set` rejects with a typed
  `QuotaExceededError`; `getQuotaUsage()` exposes a `{ used, quota
  }` reading.
- [docs/architecture/wiki/screens/55-save-load/spec.md](../architecture/wiki/screens/55-save-load/spec.md)
  — add the "Manage saves" CTA above the slot list when usage is
  > 80 % of quota.
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../architecture/wiki/screens/55-save-load/data-contracts.md)
  — add `selectors.persistence.quotaUsage`.

**New Files (if needed):** none.

**Implementation Steps:**
1. Add the `getQuotaUsage` API to the wrapper.
2. Surface it via the screen selector.
3. Add a unit test that simulates a quota-exceeded write and
   asserts the typed error is thrown.

**Dependencies:** none.

**Complexity:** S.

---

#### Issue: Multiplayer + persistence interaction is undocumented

**Source:** Risks bullet 8.

**Problem:**
Whether saves include the in-flight multiplayer command log, who
can save during a remote match, and how a save loaded into
multiplayer reconciles with the remote peer's seed are all
undocumented.

**Impact:**
- A player saving mid-MP-match risks their save being unreplayable
  on their own machine if the remote peer's commands are missing.
- Loading a save into a multiplayer lobby has no defined handshake.

**Solution:**
Adopt the policy already proposed in the audit Improvements list:

- **Saving during MP:** **host-only**. The host's save captures
  the full agreed log. Peers may not save mid-match. The
  Save/Load screen is read-only on peer machines during MP.
- **Loading into MP:** the host loads the save locally, then the
  lobby flow re-establishes lockstep from the saved log; peers
  do not load files, they receive the full log over the
  signaling channel as part of join.
- **Mid-match save metadata:** the save includes
  `mp.{ matchId, participants, hostPlayerId }` so a re-loaded
  match can recognize itself.

**Files to Update:**
- [docs/architecture/wiki/screens/55-save-load/interactions.md](../architecture/wiki/screens/55-save-load/interactions.md)
  — add a "During multiplayer" section with the host-only rule.
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — add the optional `mp` block.

**New Files (if needed):** none — this is documentation and
small additions only. The runtime path lives under the M5
multiplayer module and should be cross-referenced from
[docs/implementation-plans/07-multiplayer-plan.md](07-multiplayer-plan.md).

**Implementation Steps:**
1. Add the host-only / peer-readonly rules to the Save/Load
   interactions doc.
2. Add the optional `mp` block to the `SaveRecord` type.
3. Cross-link from this plan and from the multiplayer plan so M5
   work picks the policy up automatically.

**Dependencies:** This fix should land in M1 even though the M5
runtime code consumes it, so multiplayer implementers do not
re-derive the rule.

**Complexity:** S.

---

#### Issue: No determinism CI gate for saves

**Source:** Improvements bullet "Add a determinism CI gate."

**Problem:**
The M1 fuzz harness (`tasks/mvp/01-engine-core/09-fuzz-harness.md`)
runs 1 000-command AI-vs-AI determinism tests but does not write
saves and re-load them. A regression that breaks save/load round-trip
without breaking pure replay would slip past CI.

**Impact:**
- Saves can silently regress while the engine determinism gate
  remains green.

**Solution:**
Add a new CI test that, for every fuzz-harness fixture, calls
`save()` to produce a `SaveRecord`, then `load()` on the result,
and asserts the post-replay `stateHash` matches the pre-save
`stateHash`. Also asserts byte-equality of `canonicalContentHash`
across two consecutive saves.

**Files to Update:**
- [tasks/mvp/01-engine-core/09-fuzz-harness.md](../../tasks/mvp/01-engine-core/09-fuzz-harness.md)
  — extend with a save/load round-trip step (shared owned-path
  extension).

**New Files (if needed):** none.

**Implementation Steps:**
1. Extend the fuzz harness to write saves and reload them.
2. Add the byte-equality assertion (depends on canonical-content
   hash above).
3. Wire to `npm run validate`.

**Dependencies:** Critical-fix gzip pin and Improvement
canonical-content-hash both must land first.

**Complexity:** S.

---

### Tasks

#### Issue: Cryptographic signature for ranked play (deferred, but document the gap)

**Source:** Q158 (⚠ Partial); Risks bullet 4.

**Problem:**
xxh64 is non-keyed. A motivated user can re-author the command log
and re-hash. This is fine for single-player and cooperative
multiplayer (where per-turn state-hash exchange catches it), but
any future ranked / leaderboard / tournament mode requires a signed
manifest.

**Impact (when ranked mode ships):**
- Forged saves can be submitted as "completed challenges."
- No way to attribute a save to an authenticated player.

**Solution (now):**
Document the gap and the required scheme. **Do not implement
during M1.** Add a section to
[`docs/architecture/determinism.md`](../architecture/determinism.md)
under "Tamper detection" stating: "The xxh64 stateHash detects
accidental corruption and replay drift. It does not detect
adversarial forgery. Ranked / leaderboard / tournament features
must add an HMAC over `canonicalContentHash` keyed by a
server-issued match secret. This work is deferred to the phase
that introduces ranked mode."

**Files to Update:**
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — add the "Tamper detection vs. forgery" subsection.

**New Files (if needed):** none.

**Implementation Steps:**
1. Add the subsection.
2. Cross-link from `02-log-only-save-format.md`.

**Dependencies:** none.

**Complexity:** S.

---

## 4. Suggested Task Breakdown

Convert the issues above into discrete work items. Items prefixed
**[NEW]** are new task files; **[EXT]** items extend an existing
task file via shared owned-paths semantics; **[DOC]** items update
architecture docs only.

- [ ] **[DOC]** Strip `state` from `24-save-flow.md` payload; align
  with `02-log-only-save-format.md`.
- [ ] **[DOC]** Author `docs/architecture/save-migration.md`
  (signature, composition, support window, authoring template,
  pack-version boundary).
- [ ] **[DOC]** Author `docs/architecture/replay-format.md`
  (replay envelope as PII-stripped projection of save envelope).
- [ ] **[DOC]** Add "Tamper detection vs. forgery" subsection to
  `determinism.md`.
- [ ] **[EXT]** `01-indexeddb-wrapper.md`: atomic save transaction,
  manifest/payload split keys, `getQuotaUsage`, typed
  `QuotaExceededError`.
- [ ] **[EXT]** `02-log-only-save-format.md`: gzip pin (pako, level
  6), `canonicalContentHash`, `intent` field, `mp` block,
  `Checkpoint.snapshot`, 1 MB cap.
- [ ] **[EXT]** `03-save-load-ui.md`: `selectors.persistence
  .autosaveSlots`, `selectors.persistence.quotaUsage`, manifest-only
  list contract.
- [ ] **[EXT]** `05-export-import-json.md`: blob-finalized-then-
  download contract; "Export as replay" button.
- [ ] **[EXT]** `01-engine-core/09-fuzz-harness.md`: save/load
  round-trip + canonical-content-hash byte-equality.
- [ ] **[NEW]** `tasks/mvp/08-persistence/06-autosave.md`
  (cadence, non-blocking, rotation, retry, MP host-only).
- [ ] **[NEW]** `tasks/mvp/08-persistence/07-snapshot-rebase.md`
  (K-turn snapshot, rebase-on-save, 1 MB cap).
- [ ] **[NEW]** `tasks/mvp/08-persistence/08-migration-registry.md`
  (registry, composition, v1 stub, fixtures).
- [ ] **[EXT]** `wiki/screens/55-save-load/data-contracts.md` and
  `spec.md`: support-window text, autosave slot rows, "Manage
  saves" CTA, MP host-only rule.
- [ ] **[EXT]** `wiki/screens/55-save-load/interactions.md`: MP
  host-only / peer-readonly section.
- [ ] **[EXT]** `wiki/screens/56-options/data-contracts.md`:
  autosave on/off setting key.

---

## 5. Execution Order

Land in this order. Each step's prerequisites are listed in its
issue's "Dependencies" line; the order below honors them.

1. **[DOC]** Strip `state` from `24-save-flow.md` (unblocks
   everything else by removing the contradiction).
2. **[EXT]** Pin gzip in `02-log-only-save-format.md`.
3. **[EXT]** Add `canonicalContentHash` to `02-log-only-save-format
   .md` (consumes #2).
4. **[EXT]** Atomic save transaction + manifest/payload split keys
   in `01-indexeddb-wrapper.md`.
5. **[NEW]** `08-migration-registry.md` (independent — can land in
   parallel with #4).
6. **[NEW]** `07-snapshot-rebase.md` (depends on #3).
7. **[NEW]** `06-autosave.md` (depends on #4 and #6).
8. **[EXT]** Quota policy in `01-indexeddb-wrapper.md` and
   Save/Load screen package.
9. **[EXT]** Fuzz-harness save/load round-trip (depends on #2, #3).
10. **[DOC]** `save-migration.md`, `replay-format.md`, MP-host-only
    interactions doc, "Tamper detection vs. forgery" subsection.
    These can run in parallel with the implementation work above as
    they are documentation-only.
11. **[EXT]** `intent` field + "Export as replay" button (depends on
    `replay-format.md` from #10).
12. **[EXT]** MP `mp` block in `02-log-only-save-format.md` and
    cross-link from
    [docs/implementation-plans/07-multiplayer-plan.md](07-multiplayer-plan.md).

---

## 6. Risks if Not Implemented

- **Diagram drift remains:** an AI implementer reading
  `24-save-flow.md` writes a save with a `state` blob, breaking
  every replay-equality contract downstream. Highest blast radius
  per line of code.
- **No autosave spec:** players lose hours to crashes. The Options
  screen ships a toggle that does nothing observable, eroding trust.
- **No atomic transaction:** a tab kill mid-autosave poisons the
  rotating slot and the slot list shows a manifest with no payload.
- **Unpinned gzip:** the determinism CI gate cannot byte-compare
  saves. A regression in canonical-bytes ordering can ship.
- **Unbounded log:** load times degrade past the 2 s target as
  campaigns lengthen. Eventually a single save exceeds IndexedDB
  quota with no recovery.
- **No migration registry:** the first breaking schema change
  (inevitable) leaves every existing save unloadable. Players
  abandon long-running campaigns.
- **No quota policy:** new saves fail with raw browser errors and
  no remediation path.
- **MP + persistence undefined:** mid-match saves are unreplayable;
  loading a save into a multiplayer lobby has no defined handshake;
  peers may write divergent autosaves and confuse their own
  libraries.
- **No determinism CI gate for saves:** save/load round-trip
  regresses silently while the pure-replay determinism gate stays
  green.
- **No replay envelope:** bug-report uploads leak PII; determinism
  fixtures cannot be embedded without manual scrubbing.
- **Forgery ignored:** the moment a ranked or leaderboard mode is
  proposed, the entire signing scheme has to be designed under
  shipping pressure.

---

## 7. AI Implementation Readiness

**Score: 6 / 10** (matches the audit; closing every Critical Fix in
section 2 lifts this to 8 / 10; closing the System Improvements in
section 3 lifts it to 9 / 10).

**Rationale:**

The save system has a coherent, determinism-first skeleton — log-only
format, content/engine-hash pinning, replay-on-load with hash
verification, fail-loud gates, manifest-only inspection, IndexedDB
primary + JSON export — and an AI implementer can build the five
existing MVP persistence tasks end-to-end against the existing screen
package and task files. The high-leverage decisions (what is a save,
where it lives, how corruption is detected, how the UI surfaces
compatibility) are all answered.

What blocks autonomous execution today is **operational policy**:
migration authoring, autosave cadence, atomicity, log-pruning / size
bounds, quota handling, gzip determinism pinning, and MP-persistence
interaction. The diagram in `24-save-flow.md` further contradicts the
canonical task. An implementer working without this plan would have
to invent six or seven decisions that should be design choices, not
implementation choices. Landing the Critical Fixes in section 2
removes that authority gap; the System Improvements close the
remaining ambiguities.
