# Quota Handling and LRU Eviction

Module: [Persistence (M1)](../08-persistence.md)

Description:
Implement the per-store byte-budget tracker, LRU eviction module,
and 90 %-quota warning toast hook described in
[`docs/architecture/storage-policy.md`](../../../docs/architecture/storage-policy.md).
Every IndexedDB write goes through this layer; on
`QuotaExceededError` it walks the documented eviction order before
surfacing failure.

Read First:
- [`docs/architecture/storage-policy.md`](../../../docs/architecture/storage-policy.md)
- [`docs/architecture/edge-cases-policy.md`](../../../docs/architecture/edge-cases-policy.md)
- [`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](./01-indexeddb-wrapper.md)

Inputs:
- `GameDB` from
  [`01-indexeddb-wrapper.md`](./01-indexeddb-wrapper.md)
- `content-schema/schemas/storage-error.schema.json`
- `navigator.storage.estimate()`

Outputs:
- `src/persistence/quota.ts` — per-store budget tracker, soft caps,
  and quota-warning toast emitter.
- `src/persistence/eviction.ts` — LRU eviction worker; called from
  the wrapper on `QuotaExceededError` and from the budget tracker
  on soft-cap crossings.

Owned Paths:
- `src/persistence/quota.ts`
- `src/persistence/eviction.ts`

Owned Paths (shared):
- `src/persistence/db.ts` — adds the catch-and-evict path inside
  `set()`; primary ownership remains with
  [`01-indexeddb-wrapper.md`](./01-indexeddb-wrapper.md).

Dependencies:
- mvp.08-persistence.01-indexeddb-wrapper

Acceptance Criteria:
- A `QuotaExceededError` from any wrapper `set()` walks the
  documented eviction order:
  1. Evict `ai-cache` LRU until 50 MB free.
  2. Evict `content` LRU until 50 MB free.
  3. Prune oldest `auto-N` autosave slot (if any).
  4. Emit non-modal toast "Storage full — manage saves."
  5. Throw `StorageExhausted` to the caller (manual save) so the
     UI can render an actionable modal. Autosave callers swallow
     and emit a telemetry counter.
- Per-store soft caps trigger LRU eviction at the documented
  watermark (90 MB for `content`, 180 MB for `ai-cache`) before any
  `QuotaExceededError` is observed. Unit test: write 95 MB into
  `content`, observe eviction, total `content` byte size after
  drops to ≤ 90 MB.
- A `getQuotaUsage()` reading of `used / quota >= 0.9` emits the
  one-time per-session toast "Storage nearly full — consider
  exporting saves." The toast suppression key resets on tab
  refresh.
- Every wrapper write returns `Result<void, StorageError>`; raw
  `DOMException`s never escape this layer.
- A test fixture mocks an IDB blocked / version-error /
  data-corruption case and asserts the matching `StorageError.code`.
- The dev-mode debug overlay (`screen 66 — debug-overlay`) reads
  `state.persistence.budgets` (in-memory, non-deterministic) and
  renders per-store byte counts plus the latest `getQuotaUsage()`
  ratio.
- Shared path work on `src/persistence/db.ts` is **additive only**:
  this task wraps existing `set()` calls with the catch-and-evict
  path; it must not rewrite the wrapper's manifest/payload split,
  atomic transaction primitive, autosave shadow-key swap, or any
  other contract owned by
  `mvp.08-persistence.01-indexeddb-wrapper`. The primary contract
  for `src/persistence/db.ts` remains owned by that task; the
  eviction module here is the only new behavior introduced into
  the wrapper file.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
