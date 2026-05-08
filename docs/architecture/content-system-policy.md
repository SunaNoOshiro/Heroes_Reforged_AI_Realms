# Content System Policy

This file is the canonical cross-pack policy reference. Pack contract,
asset pipeline, mod system, and determinism docs link in here for any
rule that spans **two or more packs at load time**. Per-record schema
rules continue to live in [`schema-matrix.md`](./schema-matrix.md);
single-pack folder layout continues to live in
[`pack-contract.md`](./pack-contract.md).

If you find this file disagreeing with the schema, trust the schema and
update this file. If you find another doc duplicating policy text from
here, replace the duplicate with a link.

---

## 1. Pack Identity

Pack `id` (in [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json))
matches the regex `^[a-z0-9]+(_[a-z0-9]+)+$` — at least one underscore
segment, lowercase alphanumerics only. This guarantees a vendor
namespace inside the flat `id` and prevents two community authors from
both shipping `fire_faction`.

Reserved prefixes:

| Prefix | Owner | Notes |
|---|---|---|
| `heroes_reforged_*` | First-party | Listed in [`canonical-packs.json`](../../resources/canonical-packs.json) |
| `community_*` | Community submission gateway | Required by future submission CLI |
| `local_*` | User-local sandbox / dev | Never published |

A community pack using a reserved prefix is rejected at import with
`pack.error.manifest.id-pattern`.

The `id` is the join key for everything cross-pack: dependency edges
(§2), override targets (§3), canonical-packs registry entries (§9), and
locale merge precedence (§6). It must stay stable for the life of the
pack.

---

## 2. Dependency Resolution

`manifest.dependencies` is an array of `{ id, version }` objects (with a
migration window that still accepts plain strings, see
[`pack-resolver.md`](./pack-resolver.md)). The `version` value is a
node-semver-compatible range string.

Resolution rules in detail live in
[`pack-resolver.md`](./pack-resolver.md). Summary:

- Topological order, Kahn's algorithm.
- Tie-break: lexicographic sort of namespaced manifest `id`.
- Range match: `semver.satisfies(installed, range)`.
- Cycles → `pack.error.dependency.cycle`.
- Missing dep → `pack.error.dependency.missing`.
- Two installed versions of the same dep, both required by different
  packs at incompatible ranges → `pack.error.dependency.version-conflict`.

Output is a stable `loadedPacks: PackRecord[]` ordered by resolution
plus a `resolutionTrace` consumed by the mod manager UI.

---

## 3. Override Precedence

A pack may declare an `overrides[]` block in its manifest to replace or
patch records contributed by another pack in its dependency chain.

```json
"overrides": [
  { "target": "shared:ability:hardy", "kind": "patch", "reason": "tier-2 rebalance" }
]
```

Rules:

1. The `target` must be a namespaced ID provided by a pack reachable
   through this pack's transitive `dependencies`. Otherwise →
   `pack.error.override.unordered`.
2. Among multiple overrides of the same target, the later-loaded pack
   wins (precedence is derived from resolution order, §2 — there is no
   separate "load order" UI).
3. `kind: "replace"` swaps the whole record. `kind: "patch"` performs
   JSON-merge-patch (RFC 7396) against the existing record.
4. Without an `overrides` declaration, two packs that both `provides`
   the same ID remain a `pack.error.override.unordered` (preserves the
   existing "fail loudly on duplicate provides" guarantee for the
   non-override path).
5. The mod manager surfaces `overrides[].source` and
   `overrides[].reason` per affected target so the player sees *why* a
   baseline record was replaced.

---

## 4. Asset Integrity

Every entry in `<pack>/assets/index.json` carries a `sha256` hex digest
of the binary asset bytes plus an optional `bytes` size hint. The
content-runtime verifies the digest on load.

- Sha mismatch → fatal `pack.error.asset.integrity` (no presentation
  fallback; integrity is treated as tampering, not absence).
- Asset missing entirely → existing presentation-vs-gameplay split in
  [`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders).

Authors do not maintain hashes by hand. `npm run generate:asset-index`
walks the pack and rewrites every `sha256`/`bytes` pair from the file
on disk. Pack publish runs the same script before computing
`contentHash`.

---

## 5. Per-Record Versioning

There is no per-record `version` field. The pack-level semver is the
single content-version key — adding record-level versioning would
explode the determinism surface and conflict with `contentHash`.

Authors who want to bump a single record:

1. Bump the pack `version` by patch (e.g. `1.0.0` → `1.0.1`).
2. Add a `changelog` entry to the manifest naming the affected record
   IDs:

   ```json
   "changelog": [
     { "version": "1.0.1", "changed": ["emberwild:unit:ash_hound"] }
   ]
   ```

The pack-validator confirms every ID in `changelog[].changed[]` is also
listed in `provides`. Saves, replays, and AI generators use the
changelog to diff between two pack versions without re-hashing.

---

## 6. Localization Bundling

Per-pack localization lives at `<pack>/locales/<locale>.localization.json`
following [`localization.schema.json`](../../content-schema/schemas/localization.schema.json).

Layout (extension of [`pack-contract.md` § Folder Layout](./pack-contract.md#folder-layout)):

```text
resources/packs/<pack>/
  manifest.json
  records/
  assets/
  locales/
    en.localization.json
    fr.localization.json
```

Merge order:

1. After dependency resolution (§2), the resolver concatenates each
   pack's per-locale entries in resolution order (deps first,
   dependents last).
2. Later-loaded pack wins per-key inside a locale.
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

Pack load runs the following stages in order. Any fatal error halts
the load with a code from §8:

1. **Schema** — manifest, asset-index, every record file passes its
   JSON-Schema check.
2. **Manifest** — `id` namespace pattern (§1), `engine` range,
   `capabilities` in the closed enum.
3. **Asset completeness** — every asset id referenced from a gameplay
   record resolves through `assets/index.json`
   ([`pack-contract.md`](./pack-contract.md#multi-page-atlas-manifests)).
4. **Asset integrity** — every `assets[].sha256` matches the file on
   disk (§4).
5. **Sandbox caps** — for `sandboxed: true` packs only: HP / ATK /
   abilities count caps from
   [`tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md`](../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md).
6. **Balance corridor** — two checks against
   [`content-schema/balance/corridor.json`](../../content-schema/balance/corridor.json):
   - **Per-unit:** every numeric stat falls inside the tier band
     widened by the per-stat `tolerance` factors. Outliers →
     `pack.error.balance.outOfCorridor`.
   - **Per-pack:** the average per-unit skew (where -1 = at tier
     `lo`, 0 = tier mid, +1 = at tier `hi`) must fall within
     `factionBudget.skewThreshold`. Without this check a pack of
     all-top-of-band units would pass per-unit but be objectively
     stronger than other factions — out of band → `pack.error.balance.factionImbalance`.
   Sandboxed packs warn instead of fail for both checks.
7. **Signature** — ed25519 verification per Task 5-02.
8. **Bundle** — canonical-packs registry check (§9).

The mod manager UI surfaces failures by code and severity; see §8.

---

## 8. Error Codes

Every load failure emits a stable `pack.error.<area>.<reason>` code.
The full table — code, severity, localization key, when emitted —
lives in [`pack-error-codes.md`](./pack-error-codes.md).

A typed enum re-exports the codes from
`src/content-runtime/error-codes.ts` so callers cannot mistype them.
Tasks that emit a new code must add it to the catalog table in the
same change.

---

## 9. Canonical-Pack Registry

First-party packs are listed in
[`resources/canonical-packs.json`](../../resources/canonical-packs.json),
pinned to the engine build via `engineHash`. The bundle verifier
(Task 5d) loads the registry at startup and confirms, for every
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

---

## See Also

- [`pack-contract.md`](./pack-contract.md) — single-pack folder
  layout, archive rules, asset fallback chain.
- [`pack-resolver.md`](./pack-resolver.md) — full resolver algorithm.
- [`pack-error-codes.md`](./pack-error-codes.md) — error code table.
- [`schema-matrix.md`](./schema-matrix.md) — per-record schemas.
- [`version-policy.md`](./version-policy.md) — refuse / migrate /
  degrade matrix.
