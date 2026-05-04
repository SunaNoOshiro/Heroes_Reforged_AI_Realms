# Rollback Playbook

> Source plan:
> [`docs/implementation-plans/17-final-critical-questions-plan.md`](../implementation-plans/17-final-critical-questions-plan.md)
> (Q295). This file is the operations-side companion to
> [`docs/architecture/pack-contract.md`](../architecture/pack-contract.md),
> [`docs/architecture/revocation.md`](../architecture/revocation.md),
> [`docs/architecture/save-migration.md`](../architecture/save-migration.md),
> and the multiplayer security/transport docs.

The repo's content-platform contract makes a strong claim — packs and
engine builds carry stable IDs and content/engine hashes pinned into
saves and lockstep matches — but it does **not** answer the question
"how do we deactivate a published pack or roll back a regressing
engine build?" once the game is live. This playbook closes that gap.

---

## Status

Several rows in this playbook are `Status: pending owner` because they
depend on production-side decisions (telemetry backend, hosting model)
that are deliberately deferred to Phase 3
([`DEF-013`](../planning/deferred.md), [`DEF-014`](../planning/deferred.md)).
A `pending owner` row records the *contract* the owner will inherit;
implementation and exact runbook commands land when the owner is
named.

---

## 1. Content rollback

| Step | Owner | Trigger | Action |
|---|---|---|---|
| 1.1 Pack revocation | Pack release manager (pending owner) | Malicious or regressing pack reported | Append the pack's `(packId, contentHash)` to the signed revocation list; bump `revocationVersion`; sign with the project key. |
| 1.2 Distribution | Pack release manager | Revocation list appended | Publish the new revocation list at the canonical URL; clients fetch on next startup, see [`docs/architecture/revocation.md`](../architecture/revocation.md). |
| 1.3 Client behavior | Engine | Pack matches a revocation entry | Refuse to load; raise `PACK_REVOKED`; surface a UI banner with the revocation reason and a link to the public advisory. |
| 1.4 Save / replay safety | Engine | Save references a revoked pack | Block load; offer to "open in read-only mode" if the save is purely log-based and the pack content is reconstructible from the log. |
| 1.5 Hot-pin to last-good | Pack release manager | First-party pack regression | Re-issue the prior `(packId, contentHash)` as the canonical "latest"; tag the regressing version revoked. Saves pinned to the regressing hash continue to load only after the user explicitly opts into the older content. |

The signed revocation list is canonical-JSON, deterministic, and
already covered by
[`content-schema/schemas/revocation-registry.schema.json`](../../content-schema/schemas/revocation-registry.schema.json)
and
[`docs/architecture/revocation.md`](../architecture/revocation.md).
This playbook is the *operations runbook* on top of those contracts.

## 2. Engine rollback

| Step | Owner | Trigger | Action |
|---|---|---|---|
| 2.1 Build pinning | Build pipeline owner | Determinism regression detected (multi-engine harness CI red after publish) | Roll the published build back to the prior `engineHash`; flag the regressing hash as quarantined in the revocation list. |
| 2.2 Client-version pinning | Engine | Save / replay / multiplayer payload pins an `engineHash` not in the available set | Refuse to apply; offer the user to download the matching client (post-1.0 rollout) or open in read-only mode. |
| 2.3 Client retention window | Build pipeline owner | Each release | Keep the previous `engineHash` available alongside the current one for **≥ 30 days** so saves and replays from the prior build remain loadable. |
| 2.4 Multiplayer grace | Multiplayer signaling owner | Mismatched `engineHash` in lobby | Reject lobby join with a clear message; do not attempt cross-version play. |

## 3. Save rollback

| Step | Owner | Trigger | Action |
|---|---|---|---|
| 3.1 Corrupt-save quarantine | Engine | Save load fails any of (a) gzip integrity, (b) schema validation, (c) replay reconstruction | Move the save record into a `quarantine/` IndexedDB store; raise `STORAGE_CORRUPT` (severity `error`); surface UI option to download the quarantined record for manual inspection. |
| 3.2 Last-known-good surfacing | Engine | After 3.1 | List the most recent `verified` snapshot (per [`08-persistence/07-snapshot-rebase.md`](../../tasks/mvp/08-persistence/07-snapshot-rebase.md)) and offer to load from it. |
| 3.3 Migration hot-fix | Schema migration owner | Save was written by a future schema version | If a forward migration exists in the build, run it; otherwise raise `STORAGE_FUTURE_VERSION`; never silently drop fields. |

## 4. Kill-switch policy

Per-feature flags live in a **signed manifest** fetched at startup.

- Flags ship with **conservative defaults**: a missing or unsigned
  manifest never *enables* a feature. A flag controls whether to
  *gate* a feature; the feature still ships disabled if the flag is
  missing.
- The flag manifest is signed with the same project key used for
  pack signatures.
- Flag scope is binary (`enabled: true | false`) plus an optional
  rollout percentage (`rolloutPermille: 0..1000`). The percentage
  hashing input is `(featureId, userId)` so a given user sees a
  stable answer.
- Flags map only to *operational* gates (e.g. AI generation pipeline
  kill, multiplayer matchmaking pause, in-game pack-marketplace
  visibility). They MUST NOT affect deterministic gameplay state —
  a flag flip in mid-match is a determinism break.

## 5. Hot-fix migration

When an additive-only schema change is **not** enough (e.g. a record
field's meaning changed):

1. Author a forward migration under `src/content-schema/migrations/`
   per [`schema-migration-policy.md`](../architecture/schema-migration-policy.md).
2. Bump the schema version in `content-schema/schemas/<schema>.schema.json`.
3. Refresh the enum snapshot if any `enum: [...]` array changed
   ([`enum-lifecycle-policy.md`](../architecture/enum-lifecycle-policy.md)).
4. Verify save-load determinism via the fuzz harness's snapshot
   equivalence acceptance criterion.
5. Bake the migration into the next published build; the prior build
   continues to read pre-migration saves (additive-first rule
   preserves backwards compatibility for one minor version).

## 6. Incident-response RACI

The RACI table is the contractual surface; concrete owners are
backfilled when the team named.

| Surface | R | A | C | I |
|---|---|---|---|---|
| Pack revocation | Pack release manager (pending) | Project lead | Security review, content lead | Players via in-product banner + public advisory |
| Engine rollback | Build pipeline owner (pending) | Project lead | Multiplayer owner, persistence owner | Players via release notes + auto-update prompt |
| Save corruption response | Persistence owner (pending) | Project lead | Engine core owner | Affected player only (in-product) |
| Multiplayer host migration storm | Multiplayer signaling owner (pending) | Project lead | Engine core owner | Players in active matches |
| AI provider outage | AI integration owner (pending) | Project lead | Content lead | Players who opted into generation |
| Signaling-server abuse | Multiplayer signaling owner (pending) | Project lead | Security review | Players via lobby UI |

## 7. Cross-references

- [`docs/architecture/revocation.md`](../architecture/revocation.md)
  — contract for the signed revocation list.
- [`docs/architecture/multiplayer-security.md`](../architecture/multiplayer-security.md)
  — auth, key rotation, signaling-server abuse mitigations.
- [`docs/architecture/pack-contract.md`](../architecture/pack-contract.md)
  — pack signing model and trust tiers.
- [`docs/architecture/save-migration.md`](../architecture/save-migration.md)
  — schema-migration mechanics.
- [`docs/architecture/storage-policy.md`](../architecture/storage-policy.md)
  — quota, eviction, save retention policy.
- [`docs/planning/deferred.md`](../planning/deferred.md)
  — see [`DEF-014`](../planning/deferred.md) for the deployment
  schedule of the hosted revocation-list service.
