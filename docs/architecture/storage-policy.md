# Storage Policy

Canonical contract for IndexedDB writes, per-store budgets,
quota-exceeded handling, and eviction order. Owned by the
persistence layer; consumed by the IndexedDB wrapper, the autosave
loop, and the AI-asset cache.

This document is the policy half. The runtime IDB wrapper is owned
by
[`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md);
the eviction module is owned by
[`tasks/mvp/08-persistence/09-quota-handling.md`](../../tasks/mvp/08-persistence/09-quota-handling.md).
Cross-cutting framing in
[`edge-cases-policy.md` § 15](./edge-cases-policy.md#15-storage-quota-q218).

---

## Per-Store Byte Budgets

| Store | Soft cap | Eviction trigger | Notes |
|---|---|---|---|
| `saves` | unbounded | none | Player decides via Save UI when to delete. Surface "Manage saves" CTA when quota tight. |
| `scenarios` | unbounded | none | Authored content; persists across sessions. |
| `content` | 100 MB | 90 MB | Pack metadata cache. LRU-evicted on demand. |
| `ai-cache` | 200 MB | 180 MB | Streamed AI-generated assets. LRU-evicted on demand. |

The static budget gate
[`scripts/check-storage-budget.mjs`](../../scripts/check-storage-budget.mjs)
(`npm run validate:storage-budget`) sums the numeric soft caps in
this table and asserts the total fits within
[RR-05](./runtime-requirements.md#rr-05-storage--indexeddb--50-mb-opfs-preferred-when-present)
times a documented headroom multiplier. Adding a new bounded
store updates this table; the validator catches silent drift.

The wrapper exposes `getQuotaUsage()` so the Save / Load screen can
render a percentage indicator independent of these per-store
budgets.

---

## Eviction Order on Quota Error

When a write fails with `QuotaExceededError`, the wrapper performs
the following steps in order until the write succeeds or the final
fall-through fires:

1. **Evict `ai-cache` LRU** until 50 MB is free in browser quota.
2. **Evict `content` LRU** until 50 MB is free.
3. **Prune the oldest `auto-N` autosave slot** if any exist.
4. **Surface a non-modal toast** "Storage full — manage saves." The
   toast routes the user to the Save / Load screen.
5. **Throw `StorageExhausted`** to the calling site (e.g. a manual
   `save()`) so the UI can show an actionable modal. Autosave
   writes swallow this error and emit a telemetry counter.

The wrapper never silently drops data: a successful return means
the bytes are durable; any failure path is surfaced typed.

---

## Warning Threshold

When `getQuotaUsage()` returns `used / quota >= 0.9`, the wrapper
emits a one-time per-session toast:

> Storage nearly full — consider exporting saves.

The toast carries a deep-link to the Save / Load screen's "Export
saves" affordance. Suppression is keyed by session, not by
in-memory state, so refreshing the tab re-arms it.

---

## Safari 7-Day Eviction

Safari evicts IndexedDB databases that have not been opened for
seven consecutive days. **No code mitigation is possible** — the
policy is enforced by WebKit. The repo response:

- Document the constraint in this file (here) so persistence
  contributors do not silently invent caches that decay invisibly.
- Rely on the user-initiated **Export saves** UX (already planned)
  as the durable backup path for irreplaceable saves.

This degrades gracefully on other browsers; only Safari users may
need to refresh their export occasionally.

---

## Diagnostics

`state.persistence.budgets` is a non-deterministic, in-memory-only
shape used by the dev-mode debug overlay
([screen 66 — debug-overlay](./wiki/screens/66-debug-overlay/)). It
holds the latest `getQuotaUsage()` reading plus per-store byte
counts. The shape is **never** persisted in save records and is
**never** part of the canonical state hash.

---

## StorageError Taxonomy

Schema:
[`content-schema/schemas/storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json).

| Code | Meaning |
|---|---|
| `QUOTA_EXCEEDED` | Write would exceed available IDB quota; eviction order fired but the surface call still failed. |
| `IDB_VERSION_ERROR` | Open failed because the on-disk schema version is newer than the running build. |
| `IDB_BLOCKED` | Open blocked by a concurrent connection (another tab open). |
| `IDB_DATA_CORRUPTION` | Read returned data that fails canonical-content-hash verification. |

Every `StorageError` carries an optional `details` object with a
`store` field (one of `saves` / `scenarios` / `content` /
`ai-cache`) and an optional `key`. Consumers pattern-match on
`code` to render localized messages.

---

## Cross-References

- [`edge-cases-policy.md` § 15](./edge-cases-policy.md#15-storage-quota-q218) — cross-cutting policy entry
- [`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md) — wrapper contract
- [`tasks/mvp/08-persistence/09-quota-handling.md`](../../tasks/mvp/08-persistence/09-quota-handling.md) — eviction module owner
- [Screen 55 Save / Load](./wiki/screens/55-save-load/interactions.md) — toast surfaces
