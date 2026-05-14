# Rollback Playbook

Operations runbook for deactivating a published pack, rolling back a
regressing engine build, or recovering a corrupt save once the game
is live. The contracts this playbook stands on are pinned elsewhere;
this file is the **action layer** on top of them.

Companion docs:

- [`pack-contract.md`](../architecture/pack-contract.md) — pack
  signing, trust tiers, and `(packId, contentHash, engineHash)`
  pinning.
- [`revocation.md`](../architecture/revocation.md) — signed
  revocation-registry contract, client-side check, replay fallback.
- [`save-migration.md`](../architecture/save-migration.md) — save
  schema migrator authoring, composition, and support window.
- [`schema-migration-policy.md`](../architecture/schema-migration-policy.md)
  — schema-side migration registry under
  `src/content-schema/migrations/`.
- [`enum-lifecycle-policy.md`](../architecture/enum-lifecycle-policy.md)
  — when to refresh the enum snapshot.
- [`multiplayer-security.md`](../architecture/multiplayer-security.md)
  — auth, key rotation, signaling-server abuse mitigations.
- [`storage-policy.md`](../architecture/storage-policy.md) — quota,
  eviction, save retention.
- [`deferred.md`](../planning/deferred.md) —
  [`DEF-013`](../planning/deferred.md) (stats backend),
  [`DEF-014`](../planning/deferred.md) (hosted revocation-list
  service).
- Schema:
  [`revocation-registry.schema.json`](../../content-schema/schemas/revocation-registry.schema.json),
  [`revocation-entry.schema.json`](../../content-schema/schemas/revocation-entry.schema.json),
  [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json).

---

## Status

Several roles below carry `pending owner` because they depend on
production-side decisions (telemetry backend, hosting model)
deliberately deferred to Phase 3 ([`DEF-013`](../planning/deferred.md),
[`DEF-014`](../planning/deferred.md)). A `pending owner` row records
the **contract** the owner will inherit; the runbook commands land
when the owner is named.

---

## 1. Content rollback

| Step | Owner | Trigger | Action |
|---|---|---|---|
| 1.1 Pack revocation | Pack release manager (pending) | Malicious or regressing pack reported | Append a `revocation-entry` (`contentHash`, `reasonCode`, `revokedAt`, `signature`) to the signed revocation registry; bump the registry's monotonic `version`; sign with the maintainer key. |
| 1.2 Distribution | Pack release manager (pending) | Registry appended | Publish the new registry at the canonical URL; clients fetch on next startup per [`revocation.md` § 2](../architecture/revocation.md). |
| 1.3 Client behaviour | Engine | Pack matches a registry entry | Reject the pack from **canonical contexts** (ranked matchmaker, signed marketplace, trusted replay); the mod manager surfaces the `pack.error.revoked` warning carrying the matched `reasonCode`. A user MAY re-enable a revoked pack in **sandbox contexts** only, per [`pack-contract.md` § Sandbox enforcement](../architecture/pack-contract.md#sandbox-enforcement). |
| 1.4 Replay safety | Engine | Replay references a revoked pack | Remain **playable** in `revoked content present` mode (replays do not silently break years later). A **canonical** replay (multiplayer or trusted leaderboard) rejects revoked packs at session-creation. |
| 1.5 Hot-pin to last-good | Pack release manager (pending) | First-party pack regression | Re-issue the prior `(packId, contentHash)` as the canonical "latest"; revoke the regressing `contentHash`. Saves pinned to the regressing hash load only after the user explicitly opts into the older content. |

The registry shape is deterministic canonical-JSON, already pinned by
[`revocation-registry.schema.json`](../../content-schema/schemas/revocation-registry.schema.json)
+ [`revocation-entry.schema.json`](../../content-schema/schemas/revocation-entry.schema.json).
This playbook is the operations runbook on top of those contracts.

## 2. Engine rollback

| Step | Owner | Trigger | Action |
|---|---|---|---|
| 2.1 Build pinning | Build pipeline owner (pending) | Determinism regression detected (multi-engine harness CI red after publish) | Roll the published build back to the prior `engineHash`; quarantine the regressing hash in the registry. |
| 2.2 Client-version pinning | Engine | Save / replay / multiplayer payload pins an `engineHash` not in the available set | Refuse to apply; offer the user to download the matching client (post-1.0 rollout) or open in read-only mode. |
| 2.3 Client retention window | Build pipeline owner (pending) | Each release | Keep the previous `engineHash` available alongside the current one for **≥ 30 days** so saves and replays from the prior build remain loadable. |
| 2.4 Multiplayer grace | Multiplayer signaling owner (pending) | Mismatched `engineHash` in lobby | Reject lobby join with a clear message; never attempt cross-version play. See [`match-handshake.md`](../architecture/match-handshake.md) for the wire-level abort. |

## 3. Save rollback

| Step | Owner | Trigger | Action |
|---|---|---|---|
| 3.1 Corrupt-save quarantine | Engine | Save load fails any of (a) gzip integrity, (b) schema validation, (c) replay reconstruction | Move the save into the quarantine staging area; emit a `STORAGE_*` corruption error (severity `error`); surface UI option to download the quarantined record for inspection. |
| 3.2 Last-known-good surfacing | Engine | After 3.1 | List the most recent verified snapshot (per [`07-snapshot-rebase.md`](../../tasks/mvp/08-persistence/07-snapshot-rebase.md)) and offer to load from it. |
| 3.3 Migration hot-fix | Schema migration owner (pending) | Save was written by a future schema version | If a forward migrator exists in the build, run it per [`save-migration.md`](../architecture/save-migration.md); otherwise emit a `STORAGE_*` future-version error. **Never silently drop fields.** |

## 4. Kill-switch policy

Per-feature flags live in a **signed manifest** fetched at startup.

- **Conservative defaults.** A missing or unsigned manifest never
  *enables* a feature. A flag controls whether to *gate* a feature;
  the feature ships disabled when the flag is absent.
- **Signed.** The manifest is signed with the project's maintainer
  key (custody is deferred alongside the revocation key — see
  [`revocation.md` § 1](../architecture/revocation.md#1-signed-revocation-registry)).
- **Shape.** `enabled: boolean` plus optional
  `rolloutPermille: 0..1000`. The percentage hash input is
  `(featureId, userId)` so a given user sees a stable answer.
- **Scope.** Operational gates only (AI generation kill,
  matchmaking pause, in-game pack-marketplace visibility). Flags
  MUST NOT affect deterministic gameplay state — a flag flip
  mid-match is a determinism break.

## 5. Hot-fix migration

When an additive-only schema change is **not** enough (e.g. a field's
meaning changed):

1. Author a forward migrator under `src/content-schema/migrations/`
   per [`schema-migration-policy.md`](../architecture/schema-migration-policy.md).
2. Bump `schemaVersion` in the affected
   `content-schema/schemas/<schema>.schema.json`.
3. Refresh the enum snapshot if any `enum: [...]` array changed, per
   [`enum-lifecycle-policy.md`](../architecture/enum-lifecycle-policy.md).
4. Verify save-load determinism via the fuzz harness's snapshot-
   equivalence acceptance criterion.
5. Bake the migrator into the next published build; the prior build
   continues to read pre-migration saves (additive-first preserves
   backwards compatibility for one minor version).

## 6. Incident-response RACI

The RACI table is the contractual surface; concrete owners are
backfilled once each role has a named team.

| Surface | R | A | C | I |
|---|---|---|---|---|
| Pack revocation | Pack release manager (pending) | Project lead | Security review, content lead | Players via in-product banner + public advisory |
| Engine rollback | Build pipeline owner (pending) | Project lead | Multiplayer owner, persistence owner | Players via release notes + auto-update prompt |
| Save corruption response | Persistence owner (pending) | Project lead | Engine core owner | Affected player only (in-product) |
| Multiplayer host-migration storm | Multiplayer signaling owner (pending) | Project lead | Engine core owner | Players in active matches |
| AI provider outage | AI integration owner (pending) | Project lead | Content lead | Players who opted into generation |
| Signaling-server abuse | Multiplayer signaling owner (pending) | Project lead | Security review | Players via lobby UI |

---

## 🔍 Sync Check

- **UI: ⚠** — Step 1.3 names `pack.error.revoked` (the mod-manager
  warning string per [`revocation.md` § 2](../architecture/revocation.md#2-client-side-check)),
  but that string is not yet pinned to a screen package — see the
  open issue in
  [`revocation.md` § ⚠ Issues](../architecture/revocation.md#-issues).
  Steps 3.1 / 3.3 name `STORAGE_*` corruption / future-version error
  codes that no screen-package strings table carries yet.
- **Schema: ❌** — (a) Step 1.1 names the bumped envelope counter
  `revocationVersion`; the schema field is `version` per
  [`revocation-registry.schema.json`](../../content-schema/schemas/revocation-registry.schema.json)
  and is now reflected in the rewrite. (b) Steps 3.1 / 3.3 name
  `STORAGE_CORRUPT` / `STORAGE_FUTURE_VERSION` as enum values; the
  canonical [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json)
  closed enum is `QUOTA_EXCEEDED | IDB_VERSION_ERROR | IDB_BLOCKED |
  IDB_DATA_CORRUPTION` — no `STORAGE_*`-prefixed values and nothing
  for "future schema version". This is the same prefix divergence
  flagged in [`error-taxonomy.md` § ⚠ Issues](../architecture/error-taxonomy.md#-issues);
  the rewrite uses the prefix-style placeholder per the taxonomy
  doctrine, but the schema must add the values before code emits
  them.
- **Tasks: ❌** — (a) Step 3.1 previously claimed quarantined saves
  go into a `quarantine/` **IndexedDB** store; the owning task
  [`mvp.08-persistence.11-save-import-screen-and-quarantine`](../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md)
  AC pins quarantine staging as **in-memory only**, cleared on
  `CANCEL_SAVE_IMPORT` / tab unload / import completion. The rewrite
  drops the IDB-store claim. (b) Owning tasks for revocation
  registry runtime
  ([`phase-2.05-mod-system.11-revocation-registry`](../../tasks/phase-2/05-mod-system/11-revocation-registry.md)),
  snapshot rebase
  ([`mvp.08-persistence.07-snapshot-rebase`](../../tasks/mvp/08-persistence/07-snapshot-rebase.md)),
  and pack-signature multiplayer handshake
  ([`phase-3.01-multiplayer.15-pack-signature-and-build-attestation-policy`](../../tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md))
  all resolve. No orphan tasks point at this file.

## ⚠ Issues

- **Schema field naming: `revocationVersion` vs `version`.** The
  prior text said "bump `revocationVersion`"; the registry schema
  field is `version` (an integer ≥ 1, monotonic to defeat rollback)
  per [`revocation-registry.schema.json`](../../content-schema/schemas/revocation-registry.schema.json).
  The rewrite uses `version`. No schema change required; the doc was
  the side that drifted.
- **`STORAGE_CORRUPT` / `STORAGE_FUTURE_VERSION` are not in the
  storage-error schema.** [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json)
  defines `QUOTA_EXCEEDED | IDB_VERSION_ERROR | IDB_BLOCKED |
  IDB_DATA_CORRUPTION`; no `STORAGE_*`-prefixed value exists and
  there is no "future schema version" code. Two possible
  reconciliations: (a) add `STORAGE_CORRUPT` and
  `STORAGE_FUTURE_VERSION` as new `oneOf` arms in the schema (the
  prefix matches the doctrine in [`error-taxonomy.md` § 2](../architecture/error-taxonomy.md#2-error-categories));
  or (b) reuse `IDB_DATA_CORRUPTION` for 3.1 and add a new arm only
  for 3.3 (`SAVE_VERSION_NEWER_THAN_RUNTIME` or similar). Owner:
  [`mvp.08-persistence.09-quota-handling`](../../tasks/mvp/08-persistence/09-quota-handling.md)
  (the storage-error catalogue owner), co-owning with
  [`mvp.08-persistence.08-migration-registry`](../../tasks/mvp/08-persistence/08-migration-registry.md)
  for the future-version code. Suggested values: add arms
  `{ code: "STORAGE_CORRUPT", details: { store, key, stage: "gzip"
  | "schema" | "replay" } }` and `{ code: "STORAGE_FUTURE_VERSION",
  details: { onDiskVersion, runtimeVersion } }`; regenerate the
  enum snapshot per
  [`enum-lifecycle-policy.md`](../architecture/enum-lifecycle-policy.md).
  Skill did not edit the schema (Hard Prohibition D).
- **`PACK_REVOKED` is not a defined code; the canonical surface is a
  warning string.** Step 1.3 previously named `PACK_REVOKED` as the
  "raised" code, but [`revocation.md` § 2](../architecture/revocation.md#2-client-side-check)
  pins the surface as the mod-manager warning string
  `pack.error.revoked` (carrying `reasonCode`), and behavior is
  "reject from canonical contexts" rather than a hard load refusal
  (revoked packs remain re-enable-able in **sandbox** contexts; old
  replays remain playable in `revoked content present` mode). The
  rewrite collapses the playbook step to the warning-string surface
  and the canonical-context rejection contract, matching
  `revocation.md`. The companion mod-manager strings-table gap
  (`pack.error.revoked` not yet pinned to a screen package) is
  tracked in [`revocation.md` § ⚠ Issues](../architecture/revocation.md#-issues),
  owned by
  [`phase-2.05-mod-system.11-revocation-registry`](../../tasks/phase-2/05-mod-system/11-revocation-registry.md).
- **Quarantine store: `quarantine/` IDB store vs in-memory staging.**
  Step 3.1 previously said the quarantined save moves "into a
  `quarantine/` IndexedDB store". The IndexedDB wrapper
  ([`mvp.08-persistence.01-indexeddb-wrapper`](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md))
  declares only three stores (`saves`, `scenarios`, `content`), and
  the screen-70 owning task
  ([`mvp.08-persistence.11-save-import-screen-and-quarantine`](../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md))
  pins quarantine staging as **in-memory only**, cleared on
  `CANCEL_SAVE_IMPORT`, tab unload, and completion. Per CLAUDE.md
  ("every persisted field is registered in `data-inventory.md`"), a
  persistent quarantine store would also need a row in
  [`data-inventory.md`](../architecture/data-inventory.md), which it
  does not have. The rewrite drops the IDB-store claim and uses
  "quarantine staging area" (the in-memory surface). No code or
  data-inventory change implied; the doc was the side that drifted.
- **Revocation-registry envelope vs `revocation-entry` shape.** Step
  1.1 previously said "append the pack's `(packId, contentHash)`";
  the per-entry schema
  ([`revocation-entry.schema.json`](../../content-schema/schemas/revocation-entry.schema.json))
  carries `contentHash`, `reasonCode`, `revokedAt`, `signature` —
  there is no `packId` field (a `contentHash` is sufficient to
  identify the published artifact). The rewrite uses the schema
  field set. No schema change implied.
- **Kill-switch manifest signing-key custody is deferred.** Step 4
  says the flag manifest is signed "with the same project key used
  for pack signatures"; the only first-party signing key pinned
  today is the per-pack `signatureKeyId` in
  [`resources/canonical-packs.json`](../../resources/canonical-packs.json),
  not a single project-wide key. Maintainer key custody (revocation
  registry + flag manifest + any future maintainer-signed surface)
  is explicitly deferred in
  [`revocation.md` § 1](../architecture/revocation.md#1-signed-revocation-registry).
  The rewrite makes the deferral explicit. Owner: deferred — closes
  when the sharing layer is scheduled. No code change implied today;
  the gap is tracked alongside the revocation key gap already in
  [`revocation.md` § ⚠ Issues](../architecture/revocation.md#-issues).
