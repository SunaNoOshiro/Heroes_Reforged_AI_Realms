# Content System Policy

Canonical cross-pack policy reference. Pack-contract, asset-pipeline,
mod-system, and determinism docs link here for any rule that spans
**two or more packs at load time**.

Companion docs:

- [`pack-contract.md`](./pack-contract.md) — single-pack folder
  layout, archive rules, asset-fallback chain.
- [`pack-resolver.md`](./pack-resolver.md) — resolver algorithm.
- [`pack-error-codes.md`](./pack-error-codes.md) — error-code catalog.
- [`schema-matrix.md`](./schema-matrix.md) — per-record schemas.
- [`version-policy.md`](./version-policy.md) — refuse / migrate /
  degrade matrix.

Conflict rule: if this file disagrees with a schema, the schema
wins — fix this file. If another doc duplicates rule text from
here, replace the duplicate with a link.

---

## 1. Pack Identity

Pack `id` (in [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json))
matches `^[a-z0-9]+(_[a-z0-9]+)+$` — at least one underscore segment,
lowercase alphanumerics only. The required namespace prevents two
community authors from both shipping a flat `fire_faction`.

Reserved prefixes:

| Prefix | Owner | Notes |
|---|---|---|
| `heroes_reforged_*` | First-party | Listed in [`canonical-packs.json`](../../resources/canonical-packs.json) |
| `community_*` | Community submission gateway | Required by future submission CLI |
| `local_*` | User-local sandbox / dev | Never published |

A community pack using a reserved prefix is rejected at import with
[`pack.error.manifest.id-pattern`](./pack-error-codes.md).

`id` is the join key for everything cross-pack — dependency edges
(§2), override targets (§3), canonical-packs entries (§9), and
locale-merge precedence (§6). It must stay stable for the life of
the pack.

---

## 2. Dependency Resolution

`manifest.dependencies` is an array of `{ id, version }` objects.
Plain string entries are still accepted during the migration window
and treated as `{ id: dep, version: "*" }` (see
[`pack-resolver.md`](./pack-resolver.md) § 1). `version` is a
node-semver-compatible range string.

The full algorithm lives in [`pack-resolver.md`](./pack-resolver.md).
Summary:

- Topological sort via Kahn's algorithm.
- Tie-break: lexicographic on UTF-8 bytes of the namespaced `id`.
- Range match: `semver.satisfies(installed, range)`.
- Cycles → `pack.error.dependency.cycle`.
- Missing dep → `pack.error.dependency.missing`.
- Two installed versions of the same dep required at incompatible
  ranges → `pack.error.dependency.version-conflict`.

Output: a stable `loadedPacks: PackRecord[]` ordered by resolution,
plus a `resolutionTrace` consumed by the mod-manager UI.

---

## 3. Override Precedence

A pack may declare an `overrides[]` block in its manifest to replace
or patch records contributed by another pack in its dependency chain:

```json
"overrides": [
  { "target": "shared:ability:hardy", "kind": "patch", "reason": "tier-2 rebalance" }
]
```

Rules:

1. `target` must be a namespaced ID provided by a pack reachable
   through this pack's transitive `dependencies`. Otherwise →
   `pack.error.override.unordered`.
2. Among multiple overrides of the same target, the later-loaded
   pack wins (precedence is derived from resolution order, §2 —
   there is no separate "load order" UI).
3. `kind: "replace"` swaps the whole record. `kind: "patch"`
   performs JSON-merge-patch (RFC 7396) against the existing record.
4. Two packs that both `provides` the same ID without a matching
   `overrides[]` entry on the downstream pack → also
   `pack.error.override.unordered` (preserves "fail loudly on
   duplicate provides" for the non-override path).
5. The mod manager surfaces `overrides[].reason` plus the overrider
   pack id (derived from resolution context, not authored on the
   override entry) per affected target so the player sees *why* a
   baseline record was replaced.

The trust-floor rule (sandboxed cannot shadow canonical) is owned
by [`sandbox-model.md` § 3](./sandbox-model.md#3-override-precedence-trust-rule)
and pinned in [`pack-contract.md` § Override Precedence](./pack-contract.md#override-precedence).

---

## 4. Asset Integrity

Every entry in `<pack>/assets/index.json` carries a `sha256` hex
digest of the binary asset bytes plus an optional `bytes` size hint.
The content-runtime verifies the digest on load.

- Sha mismatch → fatal `pack.error.asset.integrity` (no
  presentation fallback; integrity is treated as tampering, not
  absence).
- Asset missing entirely → presentation-vs-gameplay split in
  [`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders).

Authors do not maintain hashes by hand. `npm run generate:asset-index`
walks the pack and rewrites every `sha256` / `bytes` pair from the
file on disk. Pack publish runs the same script before computing
`contentHash`.

---

## 5. Per-Record Versioning

There is no per-record `version` field. The pack-level semver is
the single content-version key — adding record-level versioning
would explode the determinism surface and conflict with
`contentHash`.

Authors who want to bump a single record:

1. Bump the pack `version` by patch (e.g. `1.0.0` → `1.0.1`).
2. Add a `changelog` entry to the manifest naming the affected
   record IDs:

   ```json
   "changelog": [
     { "version": "1.0.1", "changed": ["emberwild:unit:ash_hound"] }
   ]
   ```

The pack-validator confirms every ID in `changelog[].changed[]` is
also listed in `provides`. Saves, replays, and AI generators use
the changelog to diff between two pack versions without re-hashing.

---

## 6. Localization Bundling

Per-pack localization lives at
`<pack>/locales/<locale>.localization.json`, following
[`localization.schema.json`](../../content-schema/schemas/localization.schema.json).

Folder layout (extending [`pack-contract.md` § Folder Layout](./pack-contract.md#folder-layout)):

```text
resources/packs/<pack>/
  manifest.json
  records/
  assets/
  locales/
    en.localization.json
    fr.localization.json
```

Merge rules:

1. After dependency resolution (§2), the resolver concatenates
   each pack's per-locale entries in resolution order (deps first,
   dependents last).
2. Within a single locale, the later-loaded pack wins per key.
3. A pack overriding a string key from another pack must declare a
   dependency edge to the providing pack. An unrelated translation
   pack overriding strings of a pack outside its dep chain →
   `pack.error.locale.unordered` (same semantics as §3
   override-unordered).
4. Missing locale → fall back to each file's `fallbackLocale`; if
   none, fall back to `en`.
5. The localization registry exposes `getString(key, locale)` and
   `getStringSource(key, locale)`. The latter returns the pack ID
   that won the merge, surfaced in the localization editor.

---

## 7. Validation Pipeline

Pack load runs the stages below in order. Any fatal error halts the
load with a code from §8.

1. **Schema** — manifest, asset-index, every record file passes
   its JSON-Schema check.
2. **Manifest** — `id` namespace pattern (§1), `engine` range,
   `capabilities` in the closed enum.
3. **Asset completeness** — every asset id referenced from a
   gameplay record resolves through `assets/index.json`
   ([`pack-contract.md`](./pack-contract.md#multi-page-atlas-manifests)).
4. **Asset integrity** — every `assets[].sha256` matches the file
   on disk (§4).
5. **Sandbox caps** — for `sandboxed: true` packs only: HP / ATK /
   abilities-count caps from
   [`tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md`](../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md).
6. **Balance corridor** — two checks against
   [`content-schema/balance/corridor.json`](../../content-schema/balance/corridor.json):
   - **Per-unit:** every numeric stat falls inside the tier band
     widened by the per-stat `tolerance` factors. Outliers →
     `pack.error.balance.outOfCorridor`.
   - **Per-pack:** the average per-unit skew (where `-1 = at tier
     lo`, `0 = tier mid`, `+1 = at tier hi`) must fall within
     `factionBudget.skewThreshold`. Without this gate a pack of
     all-top-of-band units would pass per-unit but be objectively
     stronger than other factions — out of band →
     `pack.error.balance.factionImbalance`.

   Sandboxed packs warn instead of fail for both checks.
7. **Signature** — Ed25519 verification per
   [`tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md).
8. **Bundle** — canonical-packs registry check (§9).

The mod manager UI surfaces failures by code and severity; see §8.

---

## 8. Error Codes

Every load failure emits a stable `pack.error.<area>.<reason>`
code. The full table (code, severity, localization key, when
emitted) lives in [`pack-error-codes.md`](./pack-error-codes.md).

A typed enum re-exports the codes from
`src/content-runtime/error-codes.ts` so callers cannot mistype
them. Tasks that emit a new code MUST add it to the catalog table
in the same change.

---

## 9. Canonical-Pack Registry

First-party packs are listed in
[`resources/canonical-packs.json`](../../resources/canonical-packs.json),
pinned to the engine build via `engineHash`. The bundle verifier
loads the registry at startup and confirms, for every
`required: true` entry:

1. A pack with that `id` is loaded.
2. Its `version` satisfies the pinned version.
3. Its `signature.keyId` matches `signatureKeyId`.
4. Its `contentHash` matches.

Failure → `pack.error.canonical.missing` or
`pack.error.canonical.mismatch`. `required: false` entries are
optional bundles (extra factions, asset packs).

The schema for the registry is
[`canonical-packs.schema.json`](../../content-schema/schemas/canonical-packs.schema.json).
The `verifyBundle(loadedPacks, registry)` implementation is owned
by
[`tasks/phase-2/05-mod-system/09-canonical-packs-registry.md`](../../tasks/phase-2/05-mod-system/09-canonical-packs-registry.md);
end-to-end signing and bundle verification of every official pack
is owned by
[`tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md).

---

## 🔍 Sync Check

- **UI: ✔** — Mod-manager surfaces (override `reason`, resolution trace, locale `getStringSource`) align with [`wiki/screens/71-pack-manager/`](./wiki/screens/71-pack-manager/) and [`pack-resolver.md` § 6](./pack-resolver.md). Wording on `overrides[].source` tightened to clarify it is derived from resolution context, not an authored field.
- **Schema: ✔** — `id` pattern, `dependencies` shape, `overrides` enum (`replace | patch`), `changelog` structure, `assets[].sha256`, locale layout, and canonical-packs fields all match [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json), [`localization.schema.json`](../../content-schema/schemas/localization.schema.json), and [`canonical-packs.schema.json`](../../content-schema/schemas/canonical-packs.schema.json). Schema-matrix rows for `Manifest`, `Localization`, and `CanonicalPacks` present in [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — Doc is owned by [`tasks/mvp/02b-asset-pipeline/11-content-system-policy-doc.md`](../../tasks/mvp/02b-asset-pipeline/11-content-system-policy-doc.md); cross-referenced by tasks `mvp.02b-asset-pipeline.{12,15,16}`, `phase-2.05-mod-system.{08,09}`, and indirectly by `phase-2.05-mod-system.{02,03,05d}`. No orphan references.

## ⚠ Issues

- **`overrides[].source` is not an authored field.** Earlier prose said the mod manager surfaces `overrides[].source` and `overrides[].reason`, but [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json) only authors `target`, `kind`, and `reason`; the overrider pack id is derived from the resolver. Tightened §3 rule 5 inline to call this out explicitly. No code change implied.
- **Bundle-verifier task ownership split.** The doc previously labelled the bundle verifier "Task 5d", but the `verifyBundle` implementation now lives in [`phase-2.05-mod-system.09-canonical-packs-registry`](../../tasks/phase-2/05-mod-system/09-canonical-packs-registry.md), with [`phase-2.05-mod-system.05d-official-pack-signing-and-bundle-verification`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md) consuming it for the official-bundle smoke test. Updated §9 to reference both task IDs explicitly. The description on [`canonical-packs.schema.json`](../../content-schema/schemas/canonical-packs.schema.json) (`"bundle verifier (Task 5d)"`) is now stale; closing that gap requires an edit to the schema description, owned by `phase-2.05-mod-system.09-canonical-packs-registry`. Skill did not edit the schema (Hard Prohibition D — never edit cross-checked files).
- **`override.sandboxed-shadow-canonical` / `override.unauthorized-shadow` not in the error-code catalog.** [`pack-contract.md` § Override Precedence](./pack-contract.md#override-precedence) and [`sandbox-model.md`](./sandbox-model.md) reference these codes, but they are absent from [`pack-error-codes.md`](./pack-error-codes.md). Per CLAUDE.md root contract / [`pack-error-codes.md` § Adding a Code](./pack-error-codes.md#adding-a-code), `phase-2.05-mod-system.08-override-precedence-and-patch-merge` must add the rows. Not surfaced in this doc directly (this file delegates the trust-floor rule to `sandbox-model.md` § 3), but flagged here so the audit ledger captures the gap.
