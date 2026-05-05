# IndexedDB Wrapper

Status: planned

Module: [Persistence (M1)](../08-persistence.md)

Description:
Thin async wrapper around IndexedDB with three object stores: `saves`, `scenarios`, `content`. Handles open/upgrade/error lifecycle. Exposes simple get/set/delete/list operations per store, plus an explicit transaction primitive used by the atomic save path and the autosave shadow-key swap.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- None (standalone module)

Outputs:
- `src/persistence/db.ts`
- `openDB(): Promise<GameDB>`
- `GameDB.saves`: `{ get(id), set(id, data), delete(id), list() }`
- `GameDB.scenarios`: same interface
- `GameDB.content`: same interface
- `GameDB.transaction(stores, mode, fn)` — runs `fn` inside a single
  IDB transaction; commits if `fn` resolves, aborts otherwise.
- `GameDB.getQuotaUsage(): Promise<{ used: number, quota: number }>`
- Auto-upgrades schema on version bump (current version: 1)

Owned Paths:
- `src/persistence/db.ts`

## Manifest / Payload Split Keys

The Save/Load screen renders manifests only; payloads are heavy. To
keep list views O(slots) and not O(total log bytes), a save is split
into two sibling IDB records under deterministic keys:

- `${id}:manifest` — small JSON header: `id`, `name`, `createdAt`,
  `savedAt`, `turnNumber`, `seed`, `rulesetId`, `contentPackHashes`,
  `saveVersion`, `intent`, `mp?`, `canonicalContentHash`, `stateHash`,
  `byteLength` of payload.
- `${id}:payload` — the gzipped canonical `commandLog` + `checkpoints`.

`list()` returns only `*:manifest` records, in last-modified-descending
order. The full payload is fetched only when the player clicks Load
or opens the slot detail panel.

## Atomic Save Transaction

Manifest and payload are written **inside one IDB transaction** so
they commit together or not at all. The wrapper exposes:

```typescript
transaction(
  stores: ("saves" | "scenarios" | "content")[],
  mode: "readonly" | "readwrite",
  fn: (tx: GameTxn) => Promise<void> | void,
): Promise<void>
```

On `fn` rejection or thrown exception, the transaction aborts and
neither record is visible. A tab kill mid-write produces no
half-state — the load gates and the slot list will not see a manifest
without its payload.

## Autosave Shadow-Key Swap

The autosave rotating slots use a verify-then-swap shadow-key pattern
on top of `transaction()`:

1. Compute the new `SaveRecord` and gzip it in memory.
2. Open `transaction(["saves"], "readwrite", tx => { … })`:
   - Write the new manifest under `${slot}.tmp:manifest`.
   - Write the new payload under `${slot}.tmp:payload`.
   - Verify the in-memory `stateHash` matches the live `stateHash`.
   - Delete `${slot}:manifest` and `${slot}:payload`.
   - Rename the `.tmp` keys to the live keys (delete + put inside the
     same txn).
3. On any failure inside `fn`, the txn aborts and the live slot is
   untouched.

This pattern is the contract `06-autosave.md` consumes; do not
implement autosave rotation outside of `transaction()`.

## Quota Policy

Browsers cap IndexedDB at ~50 MB to ~unbounded. The wrapper detects
quota exhaustion and exposes it in two shapes:

- `set()` returns `Result<void, StorageError>`. On
  `QuotaExceededError` the wrapper hands off to the eviction
  module (owned by
  [`09-quota-handling.md`](./09-quota-handling.md)) which walks the
  per-store budget table, evicts LRU, and either succeeds (returns
  `Ok`) or surfaces `StorageError { code: 'QUOTA_EXCEEDED' }` after
  the documented eviction order is exhausted.
- `getQuotaUsage(): Promise<{ used: number, quota: number }>`
  returns the live `navigator.storage.estimate()` reading; the
  Save/Load screen renders a warning row when
  `used / quota >= 0.8`, and the eviction module emits the
  one-time per-session "Storage nearly full" toast at
  `>= 0.9`.

`StorageError` shapes are pinned in
[`content-schema/schemas/storage-error.schema.json`](../../../content-schema/schemas/storage-error.schema.json);
the full eviction policy and per-store byte budgets live in
[`docs/architecture/storage-policy.md`](../../../docs/architecture/storage-policy.md).

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module

Acceptance Criteria:
- `openDB()` resolves in < 50ms on first open
- `set` + `get` round-trip preserves exact object
- `list()` returns all entries sorted by last modified date
- Works in Chrome, Firefox, Safari (no fallbacks needed for MVP)
- `transaction(["saves"], "readwrite", fn)` writes manifest + payload
  atomically: aborting `fn` mid-write leaves zero records of the
  partial save.
- A unit test that mocks an IDB abort mid-transaction asserts neither
  `${id}:manifest` nor `${id}:payload` is visible afterwards.
- `list()` over a fixture of N saves issues exactly N manifest reads
  and zero payload reads (assert via mock counter).
- `set()` on a quota-exceeded environment returns
  `Result.err(StorageError { code: 'QUOTA_EXCEEDED' })` only after
  the eviction module has walked the documented order without
  freeing enough space; raw `DOMException`s never escape.
- `getQuotaUsage()` returns a `{ used, quota }` reading consistent
  with `navigator.storage.estimate()`.
- The wrapper depends on the eviction module
  ([`09-quota-handling.md`](./09-quota-handling.md)) for the LRU
  walk and toast emission. Per-store byte budgets and the
  eviction order are pinned in
  [`docs/architecture/storage-policy.md`](../../../docs/architecture/storage-policy.md).
- **Pack partition.** Any key written on behalf of pack `<id>`
  MUST be prefixed `pack:<id>:`. The wrapper exposes a
  `forPack(packId)` view that returns a scoped get/set/delete/list
  surface; reads from that surface are filtered to the prefix and
  refuse cross-prefix reads with `storage.error.cross-prefix`.
  Rule pinned in
  [`docs/architecture/sandbox-model.md` § 2](../../../docs/architecture/sandbox-model.md#2-capability-matrix)
  ("`IndexedDB` write" / "Cross-prefix `IndexedDB` read" rows).
  Engine-internal stores (`saves`, `scenarios`, `content` host
  records) are not subject to the prefix.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
