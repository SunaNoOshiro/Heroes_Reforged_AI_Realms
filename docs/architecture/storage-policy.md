# Storage Policy

Canonical contract for IndexedDB writes, per-store byte budgets,
quota-exceeded handling, and eviction order. Owned by the
persistence layer; consumed by the IndexedDB wrapper, the autosave
loop, and the AI-asset cache.

This document is the policy half. Runtime owners:

- IDB wrapper:
  [`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
- Eviction module + warning toast:
  [`tasks/mvp/08-persistence/09-quota-handling.md`](../../tasks/mvp/08-persistence/09-quota-handling.md)
- Budget validator script:
  [`tasks/mvp/08-persistence/28-storage-budget-validator.md`](../../tasks/mvp/08-persistence/28-storage-budget-validator.md)

Cross-cutting framing in
[`edge-cases-policy.md` § 15](./edge-cases-policy.md#15-storage-quota).

---

## Per-Store Byte Budgets

| Store | Soft cap | Eviction trigger | Notes |
|---|---|---|---|
| `saves` | unbounded | none | Player decides via Save UI when to delete. Surface "Manage saves" CTA when quota tight. |
| `scenarios` | unbounded | none | Authored content; persists across sessions. |
| `content` | 100 MB | 90 MB | Pack metadata cache. LRU-evicted at the watermark or on `QuotaExceededError`. |
| `ai-cache` | 200 MB | 180 MB | Streamed AI-generated assets. LRU-evicted at the watermark or on `QuotaExceededError`. |

The static budget gate
[`scripts/check-storage-budget.mjs`](../../scripts/check-storage-budget.mjs)
(`npm run validate:storage-budget`) sums the numeric soft caps in
this table and asserts the total fits within
[RR-05](./runtime-requirements.md#rr-05-storage--indexeddb--50-mb-opfs-preferred-when-present)
times the headroom multiplier documented in the script header.
Adding a new bounded store requires updating this table; the
validator catches silent drift.

The wrapper exposes `getQuotaUsage(): Promise<{ used, quota }>` so
the Save / Load screen can render a percentage indicator
independent of these per-store budgets.

---

## Eviction Order on Quota Error

When a write fails with `QuotaExceededError`, the wrapper performs
the following steps in order until the write succeeds or the final
fall-through fires:

1. **Evict `ai-cache` LRU** until 50 MB of browser quota is free.
2. **Evict `content` LRU** until 50 MB of browser quota is free.
3. **Prune the oldest `auto-N` autosave slot** if any exist.
4. **Surface a non-modal toast** "Storage full — manage saves." The
   toast routes the user to the Save / Load screen.
5. **Throw `StorageExhausted`** to the calling site (e.g. a manual
   `save()`) so the UI can show an actionable modal. Autosave
   writes swallow this error and emit a telemetry counter.

The wrapper never silently drops data: a successful return means
the bytes are durable; every failure path is surfaced typed via
the
[`StorageError`](../../content-schema/schemas/storage-error.schema.json)
taxonomy below.

---

## Warning Threshold

When `getQuotaUsage()` reports `used / quota >= 0.9`, the wrapper
emits a one-time per-session toast:

> Storage nearly full — consider exporting saves.

The toast carries a deep-link to the Save / Load screen's "Export
saves" affordance. Suppression is keyed by session, not by
in-memory state, so refreshing the tab re-arms it.

This is independent of the Save / Load screen's passive warning
row, which the screen renders at `used / quota >= 0.8` per
[`tasks/mvp/08-persistence/01-indexeddb-wrapper.md` § Quota Policy](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md#quota-policy).

---

## Safari 7-Day Eviction

Safari evicts IndexedDB databases that have not been opened for
seven consecutive days. **No code mitigation is possible** — the
policy is enforced by WebKit. The repo response:

- Document the constraint here so persistence contributors do not
  silently invent caches that decay invisibly.
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
**never** part of the canonical state hash, so it is exempt from
[`data-inventory.md`](./data-inventory.md) registration.

---

## StorageError Taxonomy

Schema:
[`content-schema/schemas/storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json)
(registered in
[`schema-matrix.md`](./schema-matrix.md) under the error-shaped
schemas row).

| Code | Meaning |
|---|---|
| `QUOTA_EXCEEDED` | Write would exceed available IDB quota; eviction order fired but the surface call still failed. |
| `IDB_VERSION_ERROR` | Open failed because the on-disk schema version is newer than the running build. |
| `IDB_BLOCKED` | Open blocked by a concurrent connection (another tab open). |
| `IDB_DATA_CORRUPTION` | Read returned data that fails canonical-content-hash verification. |

Every `StorageError` carries an optional `details` object whose
shape is per-code; `QUOTA_EXCEEDED` and `IDB_DATA_CORRUPTION` may
include `store` (one of `saves` / `scenarios` / `content` /
`ai-cache`) and an optional `key`. Consumers pattern-match on
`code` to render localized messages.

---

## Cross-References

- [`edge-cases-policy.md` § 15](./edge-cases-policy.md#15-storage-quota)
  — cross-cutting policy entry
- [`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
  — wrapper contract
- [`tasks/mvp/08-persistence/09-quota-handling.md`](../../tasks/mvp/08-persistence/09-quota-handling.md)
  — eviction module owner
- [`tasks/mvp/08-persistence/28-storage-budget-validator.md`](../../tasks/mvp/08-persistence/28-storage-budget-validator.md)
  — budget validator script owner
- [Screen 55 Save / Load](./wiki/screens/55-save-load/interactions.md)
  — toast surfaces
- [Screen 66 Debug Overlay](./wiki/screens/66-debug-overlay/) —
  diagnostic readout consumer

---

## 🔍 Sync Check

- **UI: ✔** — Both quota toasts ("Storage full — manage saves." and "Storage nearly full — consider exporting saves.") match [`wiki/screens/55-save-load/interactions.md`](./wiki/screens/55-save-load/interactions.md) line 54 verbatim. Screen 55 is the canonical surface; screen 66 is the dev-only diagnostics consumer.
- **Schema: ✔** — `StorageError` codes (`QUOTA_EXCEEDED`, `IDB_VERSION_ERROR`, `IDB_BLOCKED`, `IDB_DATA_CORRUPTION`) match [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json) `oneOf` branches exactly. Schema registered in [`schema-matrix.md`](./schema-matrix.md) under the error-shaped schemas row.
- **Tasks: ⚠** — All three owning tasks (`01-indexeddb-wrapper`, `09-quota-handling`, `28-storage-budget-validator`) exist on disk and back-link here; `task-registry.json` mirrors them. The eviction order in this doc matches `09-quota-handling.md` Acceptance Criteria step-for-step. Two non-blocking gaps detailed below.

## ⚠ Issues

- **Inbound anchor `#15-storage-quota-q218` was broken.** The previous revision linked twice (intro and Cross-References) to `edge-cases-policy.md#15-storage-quota-q218`, but commit `446a5a8` dropped the `(Q218)` suffix from that heading; the actual anchor is now `#15-storage-quota`. The audit fixed both links in this file (the canonical heading was the source of truth) and notes that [`edge-cases-policy.md` § ⚠ Issues](./edge-cases-policy.md) lists this file among the corpus-wide cleanup targets and recommends exactly this fix. No other rewrites of edge-cases-policy.md were required from this audit.
- **`StorageExhausted` exception name vs `StorageError { code: 'QUOTA_EXCEEDED' }` Result code.** Step 5 of the eviction order names a thrown `StorageExhausted` for the manual-save call site, while [`01-indexeddb-wrapper.md` § Quota Policy](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md#quota-policy) and [`09-quota-handling.md` Acceptance Criteria](../../tasks/mvp/08-persistence/09-quota-handling.md#acceptance-criteria) describe the wrapper's `set()` returning `Result.err(StorageError { code: 'QUOTA_EXCEEDED' })`. The two names are consistent across this doc, edge-cases § 15, and task 09 (thrown class for manual saves vs. typed Result for autosave), but the schema only defines the Result-side `StorageError` shape and there is no schema entry for the `StorageExhausted` thrown class. Per CLAUDE.md root contract on adversarial input typing, the persistence module owner (`mvp.08-persistence.09-quota-handling`) should either (a) add a one-line clarification to that task naming `StorageExhausted` as a thrown wrapper around `StorageError { code: 'QUOTA_EXCEEDED' }`, or (b) drop the `StorageExhausted` name and unify on `StorageError`. Skill did not pick a side because either fix lives outside this file (Hard Prohibition D).
- **Screen 66 spec does not list `state.persistence.budgets`.** The Diagnostics section (here) and [`09-quota-handling.md` Acceptance Criteria](../../tasks/mvp/08-persistence/09-quota-handling.md#acceptance-criteria) both assert that the dev debug overlay reads `state.persistence.budgets`, but [`wiki/screens/66-debug-overlay/spec.md`](./wiki/screens/66-debug-overlay/spec.md) State Bindings only enumerates `state.debug.*` and `state.content.hashes`. Per CLAUDE.md UI rules (screen-package state-binding tables are the per-screen source of truth), the screen-66 owner (post-MVP task in [`tasks/phase-2/08-meta-systems/`](../../tasks/phase-2/08-meta-systems/)) should add a `budgets` row pointing at `state.persistence.budgets` with the per-store byte counts + `getQuotaUsage()` ratio binding. Skill did not edit the screen spec (Hard Prohibition D).
