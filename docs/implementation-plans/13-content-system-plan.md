# Implementation Plan: 13 — Content System

> Source audit: [docs/readiness-audit/13-content-system.md](../readiness-audit/13-content-system.md)
>
> The audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from that audit
> into concrete documentation, schema, task, and tooling work.
>
> Nothing here invents new gameplay mechanics. Every change formalizes a
> rule that the pack contract, asset pipeline, mod system, and
> determinism docs already imply but have not yet pinned in one place.

---

## 1. Overview

**Scope.** Close the 9 distinct gaps the content-system audit flagged
across the pack-loading lifecycle:

- pack identity and namespacing (manifest `id` pattern)
- dependency declaration and resolution (version ranges, topo order, cycles)
- override precedence (legitimate retexture / rebalance packs)
- per-asset integrity verification (binary tamper detection)
- per-record / per-content versioning
- per-pack localization folder layout and merge order
- balance-corridor validation as a load/publish gate
- pack-load error code catalog with localization keys
- canonical-pack static registry pinned to the engine build

The audit's framing makes the underlying problem clear: the pack
contract is unusually well-formalized for a pre-runtime project, but
the **load-time policies that connect packs to one another** (resolve
order, override rules, namespace, locale merge, integrity) are either
implicit, ambiguous, or absent. An autonomous AI generator can author a
single faction pack from the canonical example with high confidence,
but cannot yet *merge* two community packs without colliding on every
seam this audit names.

**Readiness state today.** AI-Readiness scored **7/10**. Two firm areas
(Q219 manifest format, Q222 signing) anchor the contract. Six are
partial (Q220, Q221, Q223, Q224, Q227, Q231, Q232, Q233). One is
unknown (Q226 per-asset hash). Closing the eight Improvements items in
the audit's summary pushes this section to **9/10** per the audit's own
rationale.

**Out of scope.** Authoring runtime engine code (the resolver
implementation, the IndexedDB user-pack store, the renderer asset
fallback chain). This plan formalizes the contracts and tasks those
layers must satisfy. No new pack type, capability, or signing scheme is
introduced; every clamp, gate, and predicate below is the explicit
version of an implicit assumption already in the docs.

---

## 2. Critical Fixes (Must Do First)

These five items must land before any task that touches manifest
parsing, dependency resolution, asset loading, or community-pack
import. Each one, if left open, produces a class of bugs that no
downstream task can patch — either silent asset tampering, pack-ID
collisions, dependency drift, override ambiguity, or scattered policy
fragmentation.

1. **Content-system policy doc (Issue 3.A-0)** — a single canonical
   `docs/architecture/content-system-policy.md` that the other eight
   issues hyperlink into. Without this, fixes scatter across nine
   unrelated files and re-fragment the audit gap.
2. **Manifest `id` namespace pattern (Issue 3.B-1, Q224)** — one regex
   in `manifest.schema.json`. Must land before any community pack is
   imported, or the canonical-pack registry (item 5) cannot be a
   reliable trust target.
3. **Per-asset integrity (Issue 3.B-2, Q226)** — `sha256` field on
   asset-index entries plus a verifier in
   `pack-validator.ts`. The audit explicitly names this as the
   highest-risk Missing-Logic item.
4. **Dependency declaration object + resolver spec (Issues 3.B-3 & 3.A-1,
   Q221)** — change `dependencies: string[]` to
   `dependencies: { id, version }[]`, and write
   `docs/architecture/pack-resolver.md` with the topological algorithm,
   tie-break rule, version-range matcher, and cycle policy.
5. **Override precedence rule (Issue 3.A-2, Q223)** — explicit
   `overrides` block (or precedence-by-dependency rule) so retexture /
   balance packs are first-class instead of conflict-rejected.

Items 1–5 are documentation + schema + a thin runtime guard each. None
require a renderer, network transport, or full IndexedDB layer to land.
Items 3 and 4 also block the broader Missing-Logic items (per-record
versioning, locale merge order, balance gate) because every one of
those depends on a deterministic resolve order being defined first.

---

## 3. System Improvements

Issues are grouped by the audit's natural axes: **Architecture &
Cross-Cutting Policy**, **Schemas & Data Contracts**, **Validation
Pipeline**, and **Localization & Tooling**.

---

### Architecture & Cross-Cutting Policy

#### Issue 3.A-0: No single cross-cutting content-system policy

**Source:** All 9 audit gaps; AI-Readiness rationale ("dependency
resolver, override precedence, per-asset integrity, per-pack
localization layout, and pack-ID namespacing are either implicit,
partial, or absent").

**Problem:**
The 9 audit answers each touch 2–3 surfaces (manifest schema, asset
index, pack-validator, mod system, content-runtime). No file aggregates
these cross-cutting rules; each one is implied in fragments across
`pack-contract.md`, `content-platform.md`, `schema-matrix.md`, and
several task files. There is no single document an AI implementer can
read to understand "what is the contract between two packs at load
time."

**Impact:**
- Implementers re-derive policies from scratch per task.
- Policies drift between subsystems (e.g., resolver picks a precedence
  but the override block in the manifest expects a different one).
- The audit's own Risks list cannot be cleared because there is no home
  for the answer.

**Solution:**
Create `docs/architecture/content-system-policy.md` as the single
canonical reference. Every other deliverable in this plan back-links to
a section of this file. Other docs add a one-line cross-reference
rather than duplicating policy text.

Required sections:
1. **Pack identity** — `id` namespace pattern, collision rule, reserved
   prefixes.
2. **Dependency resolution** — declaration shape, version-range
   semantics, topological order, tie-break, cycle policy. Links to
   `pack-resolver.md`.
3. **Override precedence** — `overrides` block, precedence-by-dependency,
   `overrides[].source`/`reason` reporting in tooling.
4. **Asset integrity** — per-asset sha256, verification policy,
   missing-vs-tampered split.
5. **Per-record versioning** — pack-level vs. record-level
   `schemaVersion` vs. content version; how authors version a single
   record without splitting packs.
6. **Localization bundling** — `locales/<locale>.localization.json`
   layout, merge order, conflict policy.
7. **Validation pipeline** — exact stage order: schema → manifest →
   asset completeness → asset integrity → sandbox caps → balance
   corridor → signature → bundle.
8. **Error codes** — pointer to `pack-error-codes.md`.
9. **Canonical-pack registry** — pointer to
   `resources/canonical-packs.json`.

**Files to Update:**
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — add a "See content-system-policy.md for cross-pack rules" pointer.
- [docs/architecture/content-platform.md](../architecture/content-platform.md) — replace the unspecified "override precedence" sentence with a link to §3 of the new policy doc.
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — link the Localization row to §6.
- [CLAUDE.md](../../CLAUDE.md) — add the new doc to the "Read first" list.

**New Files:**
- `docs/architecture/content-system-policy.md`
- `docs/architecture/pack-resolver.md` (referenced by §2; see Issue 3.A-1)
- `docs/architecture/pack-error-codes.md` (referenced by §8; see Issue 3.C-2)

**Implementation Steps:**
1. Draft `content-system-policy.md` with the nine sections above. Each
   section is 1–2 paragraphs that point at the schema/task/code that
   enforces the rule.
2. Update `pack-contract.md`, `content-platform.md`,
   `schema-matrix.md`, and `CLAUDE.md` to cross-reference the new doc.
3. Run `npm run validate` to confirm no broken links.
4. Add an explicit task: `tasks/mvp/02b-asset-pipeline/11-content-system-policy-doc.md`.

**Dependencies:** none — this is the anchor doc.

**Complexity:** M

---

#### Issue 3.A-1: Dependency resolver algorithm is not specified

**Source:** Q221 (⚠ Partial). Missing-Logic: "Dependency resolver
algorithm — declared as a runtime responsibility, but topological
ordering, version-range matching, and cycle handling are unspecified."

**Problem:**
`manifest.dependencies` is `array<string>` in the schema (plain pack
IDs). The actual resolver — load order, version-range matching, cycle
detection, conflict policy — is owned by `src/content-runtime/` per
`pack-contract.md`, but no algorithm is documented. Task 5a even
declares dependencies as plain strings (`"shared_skills"`), while one
example task hints at `">=1.0.0"`-style ranges that the schema does not
enforce.

**Impact:**
- Two implementers will pick different topo orders → load-order
  divergence breaks `contentHash` equality and therefore multiplayer
  determinism.
- A pack stating `dependencies: ["shared_skills"]` accepts any
  installed `shared_skills` version including breaking ones (audit
  Risks: "dependency drift").
- Cycles between two community packs would either infinite-loop or
  silently load with one pack uninitialized.

**Solution:**
Two artifacts:

1. **Schema change** — `dependencies` becomes an array of objects:

   ```json
   "dependencies": {
     "type": "array",
     "items": {
       "type": "object",
       "required": ["id", "version"],
       "properties": {
         "id":      { "type": "string", "pattern": "<see Issue 3.B-1>" },
         "version": { "type": "string", "pattern": "^[\\^~]?\\d+\\.\\d+\\.\\d+(-[a-z0-9.-]+)?$|^>=?\\d+\\.\\d+\\.\\d+$|^\\d+\\.\\d+\\.\\d+ - \\d+\\.\\d+\\.\\d+$|^\\*$" }
       },
       "additionalProperties": false
     }
   }
   ```

   Use a node-semver-compatible range string. Provide a migration that
   wraps existing string entries into `{ id, version: "*" }` so old
   manifests load.

2. **Algorithm doc** — `docs/architecture/pack-resolver.md` specifies:
   - Build `pack -> deps[]` graph from declared `dependencies`.
   - Topological sort using Kahn's algorithm. **Tie-break: lexicographic
     sort of the namespaced manifest `id`** (deterministic across
     platforms).
   - Version match: each dep's `version` is parsed with `semver.satisfies(installed, range)`. Mismatch → fatal load error.
   - Cycle detection: any node remaining after Kahn's drain → emit
     `pack.error.dependency.cycle` listing every pack in the cycle.
   - Missing dep: `pack.error.dependency.missing` with the requested
     `id` and `version`.
   - Conflicting installed versions for the same `id` (two packs each
     declaring different concrete versions installed): rejected with
     `pack.error.dependency.version-conflict`. No silent picking.
   - Output: a stable `loadedPacks: PackRecord[]` array in resolution
     order, plus a `resolutionTrace` that the mod manager UI surfaces.

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — `dependencies` shape (additive: keep accepting strings until M2 cutover; emit deprecation warning).
- [content-schema/examples/packs/emberwild-faction/manifest.json](../../content-schema/examples/packs/emberwild-faction/manifest.json) — migrate to object form as the canonical example.
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) §"Runtime Ownership" — point at `pack-resolver.md`.
- [tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md](../../tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md) — extend acceptance criteria to assert resolver behavior on fixtures.
- [tasks/phase-2/05-mod-system/05a-baseline-ruleset-and-shared-library-packs.md](../../tasks/phase-2/05-mod-system/05a-baseline-ruleset-and-shared-library-packs.md) — re-issue dep declarations in object form.

**New Files:**
- `docs/architecture/pack-resolver.md`
- `tasks/mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md` (implements the resolver against the spec; lists the four error codes and the deterministic tie-break test).
- Test fixtures under `content-schema/examples/packs/__tests__/resolver/` for: linear chain, diamond, cycle, missing dep, version conflict.

**Implementation Steps:**
1. Write `pack-resolver.md` with the algorithm + every error code emitted.
2. Patch `manifest.schema.json` to accept the object form (additive; keep accepting string for one migration window).
3. Migrate the canonical example manifest to the object form.
4. Author the new task file (`12-pack-resolver-algorithm.md`) with `verifyCommands` that load each fixture and assert (a) load order, (b) cycle detection, (c) version-mismatch rejection.
5. Update `Task 02b-01` acceptance criteria to delegate resolver semantics to this new task to avoid double-ownership.
6. Run `npm run validate:tasks` and `npm run validate`.

**Dependencies:** Issue 3.B-1 (namespace pattern feeds the `id`'s regex inside the dep object).

**Complexity:** L

---

#### Issue 3.A-2: Override precedence is unspecified

**Source:** Q223 (⚠ Partial). Missing-Logic: "Override-precedence rule
— `content-platform.md` mentions 'override precedence' and 'show
override source and precedence', but no formal precedence exists.
Today the only documented behavior is 'duplicate provides → reject load.'"

**Problem:**
The MVP "fail loudly on duplicate provides" rule rejects every pack
that touches an existing record. This forbids legitimate retexture /
balance / translation packs that *intentionally* alter a baseline
record. The audit Risks call this out: "A future override channel is
needed and currently undefined."

**Impact:**
- Community retexture packs cannot ship at all.
- Balance-tweak packs cannot ship at all.
- The mod manager has nothing to display under "show override source
  and precedence" because there is no override mechanism.
- An AI generator producing a "polish pack" cannot do so without
  forking the original pack.

**Solution:**
Add an explicit `overrides` block to `manifest.schema.json` that
declares "I intend to replace these IDs from packs in my dependency
chain":

```json
"overrides": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["target", "kind"],
    "properties": {
      "target": { "type": "string" },        // namespaced ID being replaced
      "kind":   { "type": "string", "enum": ["replace", "patch"] },
      "reason": { "type": "string" }         // surfaced in mod-manager UI
    },
    "additionalProperties": false
  }
}
```

Resolver rule (added to `pack-resolver.md`):

1. A pack may only override an ID **if its dependency chain transitively includes the pack that originally `provides` that ID**.
2. Among multiple overrides of the same target, **dependency-derived order wins** (later-loaded pack overrides earlier-loaded). This makes precedence deterministic without a separate "load order" UI.
3. Two packs with no dependency relationship overriding the same target → fatal `pack.error.override.unordered` (forces the user to declare a dep edge between them in a third "compat" pack).
4. The mod manager surfaces `overrides[].source` (overriding pack id) + `overrides[].reason` per affected target so the player sees *why* a baseline record was replaced.
5. `kind: "replace"` swaps the whole record; `kind: "patch"` performs JSON-merge-patch (RFC 7396) on the existing record. `patch` is the path that lets balance packs ship a delta without restating the full unit.

`provides` of a target that the pack also lists in `overrides` is no
longer a duplicate-provides conflict — it is the override path. Without
the `overrides` declaration, duplicate-provides remains a load
rejection (preserving the audit's "fail loudly" guarantee).

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — add `overrides` property.
- [docs/architecture/content-platform.md](../architecture/content-platform.md) — replace the unspecified "override precedence" line with a link to the new policy section.
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — note `overrides` as a first-class manifest field.
- [tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md](../../tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md) — extend manifest-validator acceptance criteria with override-block validation.
- [tasks/phase-2/05-mod-system/04-mod-manager-ui-install-enable-disable.md](../../tasks/phase-2/05-mod-system/04-mod-manager-ui-install-enable-disable.md) — add the override-source visualization requirement.

**New Files:**
- `tasks/phase-2/05-mod-system/08-override-precedence-and-patch-merge.md` — implementation task for the override path: validates `overrides[].target` exists in deps, applies replace/patch merge, emits `pack.error.override.unordered` on unrelated overrides.
- Fixtures under `content-schema/examples/packs/__tests__/overrides/` covering: legal replace, legal patch, override of non-dep (rejected), unordered override (rejected).

**Implementation Steps:**
1. Patch `manifest.schema.json` with the `overrides` block.
2. Document the precedence rule in `content-system-policy.md` §3 and `pack-resolver.md`.
3. Write the new mod-system task with `verifyCommands` covering all four fixture cases.
4. Update existing tasks to point at the new override task instead of restating the policy.

**Dependencies:** Issue 3.A-0 (policy doc), Issue 3.A-1 (resolver, which evaluates override edges).

**Complexity:** L

---

#### Issue 3.A-3: No static registry of canonical packs

**Source:** Q232 (⚠ Partial). Improvements: "Publish a 'registry of
canonical packs' as a JSON file pinned to the engine build."

**Problem:**
First-party packs are recognized only by ed25519 signature key match
(Task 5d). There is no enumerated list of "this engine build expects
exactly these official pack IDs at these versions with this signing
key fingerprint." Bundle verification (Task 5d) therefore has no
static target — it can verify each pack's signature individually but
cannot detect a *missing* baseline pack ("baseline-ruleset is gone")
or a *mis-versioned* baseline ("user replaced 1.0.0 with a 0.9.0").

**Impact:**
- The bundle-verification step in Task 5d cannot fail closed when a
  baseline pack is absent.
- A user could disable a baseline pack and load a community
  replacement signed by anyone, defeating the trust model.
- Engine releases cannot be reproduced from `engineHash` + canonical
  pack list because no list exists.

**Solution:**
Ship `resources/canonical-packs.json`, pinned to the engine build:

```json
{
  "$schema": "heroes-reforged/canonical-packs.schema.json",
  "engineHash": "<hex>",
  "schemaVersion": 1,
  "packs": [
    {
      "id": "heroes_reforged.baseline_ruleset",
      "version": "1.0.0",
      "type": "ruleset-pack",
      "signatureKeyId": "hr-official-2026",
      "contentHash": "<hex>",
      "required": true
    },
    {
      "id": "heroes_reforged.shared_skills",
      "version": "1.0.0",
      ...
    }
  ]
}
```

At startup, the bundle verifier (Task 5d) loads
`canonical-packs.json`, then for each entry:
1. Confirms a pack with that `id` is loaded.
2. Confirms its `version` satisfies the pinned version.
3. Confirms its `signature.keyId` matches `signatureKeyId`.
4. Confirms its `contentHash` matches.

Any failure with `required: true` blocks game start with
`pack.error.canonical.missing|mismatch`. `required: false` entries are
optional bundles (e.g., faction packs not in the base game).

**Files to Update:**
- [tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md) — add the canonical-packs registry as the verification target.

**New Files:**
- `content-schema/schemas/canonical-packs.schema.json` — JSON schema for the new file.
- `resources/canonical-packs.json` — the actual pinned registry (one entry per first-party pack).
- `tasks/phase-2/05-mod-system/09-canonical-packs-registry.md` — task that authors the schema, the file, and the bundle-verifier integration.

**Implementation Steps:**
1. Author the schema.
2. Author the registry file with one entry per pack listed in 5a/5b/5c.
3. Extend Task 5d's `verifyCommands` to assert that startup fails when the registry references a missing pack.
4. Wire `npm run validate` to validate the registry against its schema and to confirm every `required: true` entry exists in `resources/packs/`.

**Dependencies:** Issue 3.A-1 (registry must reference resolver-validated packs); Tasks 5a/5b/5c (the canonical packs themselves).

**Complexity:** M

---

### Schemas & Data Contracts

#### Issue 3.B-1: Manifest `id` has no namespace pattern

**Source:** Q224 (⚠ Partial). Risk: "Pack-ID collisions: two community
authors can both pick `id: 'fire_faction'` since no namespace pattern
is enforced."

**Problem:**
`manifest.schema.json` has `id: { type: "string", minLength: 1 }` —
flat strings allowed. Record IDs are namespaced by convention
(`emberwild:unit:ash_hound`) but the manifest's own `id` is not.

**Impact:**
- Two community authors collide on `id: "fire_faction"`.
- The dependency resolver (Issue 3.A-1) cannot uniquely key its
  graph nodes when collisions exist in the user-pack store.
- The canonical-pack registry (Issue 3.A-3) has no reliable trust
  target — first-party `baseline-ruleset` could be shadowed by a
  community pack with the same flat `id`.

**Solution:**
Add a regex pattern that requires a vendor namespace segment:

```
"id": {
  "type": "string",
  "pattern": "^[a-z0-9]+(_[a-z0-9]+)+$",
  "minLength": 3
}
```

This enforces at least one underscore segment (`vendor_pack`,
e.g. `heroes_reforged.baseline_ruleset` if dotted is preferred, or
`emberwild_faction`). Reserve the `heroes_reforged_` prefix for
official packs in `content-system-policy.md` §1.

A short migration window: existing flat-ID example manifests are
renamed to namespaced form (`emberwild_faction` → keep, since it
already has the underscore segment). Any non-conforming first-party
pack ID is renamed before the schema flip.

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — `id` pattern.
- [content-schema/examples/packs/emberwild-faction/manifest.json](../../content-schema/examples/packs/emberwild-faction/manifest.json) — confirm `id` already conforms; if not, rename and update all references.
- All example pack manifests under `content-schema/examples/packs/` — audit and rename as needed.
- `docs/architecture/content-system-policy.md` §1 — document the pattern, the reserved-prefix rule, and the rename guidance.

**New Files:** none.

**Implementation Steps:**
1. Grep `content-schema/examples/packs/*/manifest.json` for `"id":` and confirm every value matches the new pattern.
2. Patch the schema.
3. Add a `verifyCommands` step in Task 02b-01: validate every example manifest against the patched schema.
4. Add the reserved-prefix entry to `content-system-policy.md`.

**Dependencies:** Issue 3.A-0 (policy doc owns the prefix table).

**Complexity:** S

---

#### Issue 3.B-2: No per-asset integrity verification

**Source:** Q226 (❌ UNKNOWN). Missing-Logic: "Per-asset hash /
integrity verification — pack-level `contentHash` exists, but binary
assets have no SHA-256/SRI on the asset-index entries."

**Problem:**
`asset-index.schema.json` has only `id`, `kind`, `path` per asset. The
manifest's `contentHash` covers canonical-JSON serialization of
records, *not* binary assets. A tampered sprite inside a signed
`.hrmod` archive could pass signature verification if archive-level
signing only signs the manifest.

**Impact:**
- Trust model leaks: "official" packs can be tampered post-extraction.
- AI-generated sandboxed packs can ship binary payloads outside the
  HP/ATK/abilities cap (e.g., a malicious image payload) with no
  integrity contract.
- Multiplayer determinism is preserved (records are hashed) but
  *visual / audio drift* between peers becomes possible without
  detection.

**Solution:**
Add `sha256` to each asset-index entry:

```json
"assets": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "kind", "path", "sha256"],
    "properties": {
      "id":     { "type": "string" },
      "kind":   { "type": "string" },
      "path":   { "type": "string" },
      "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
      "bytes":  { "type": "integer", "minimum": 0 }
    },
    "additionalProperties": true
  }
}
```

Verification (added to `pack-validator.ts` per Task 02b-06):

- On load, every asset listed in `assets[]` is fetched, SHA-256
  computed, compared to the declared `sha256`. Mismatch → fatal
  `pack.error.asset.integrity` (no fallback even for presentation
  assets — integrity violation is treated as tampering, not absence).
- Missing assets retain the existing presentation-vs-gameplay split
  (the audit's Q228 ✔ rule). Only **mismatched** assets get the new
  fatal-only treatment.
- For very large assets, `bytes` lets the loader pre-flight quota
  before downloading.

A small build-tool script (`scripts/build-asset-index.ts` or extend
the existing pack scaffold script) recomputes `sha256` on every asset
when the pack is built, so authors do not maintain hashes by hand.

**Files to Update:**
- [content-schema/schemas/asset-index.schema.json](../../content-schema/schemas/asset-index.schema.json) — add `sha256` (required) and `bytes` (optional).
- [content-schema/examples/packs/emberwild-faction/assets/index.json](../../content-schema/examples/packs/emberwild-faction/assets/index.json) — populate `sha256` for every asset.
- [tasks/mvp/02b-asset-pipeline/06-pack-completeness-validator-all-required-assets-present.md](../../tasks/mvp/02b-asset-pipeline/06-pack-completeness-validator-all-required-assets-present.md) — extend `validatePackAssets()` to verify hashes; add `pack.error.asset.integrity` to the error catalog.
- [tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md) — note that the resolver returns the verified asset only.
- [tasks/mvp/02b-asset-pipeline/08-new-faction-scaffold-script.md](../../tasks/mvp/02b-asset-pipeline/08-new-faction-scaffold-script.md) — scaffold must emit `sha256` for stub assets and document how to re-hash when authors add new files.

**New Files:**
- `scripts/build-asset-index.ts` (or extend the existing scaffold script) — walks `<pack>/assets/` and (re)writes `sha256` + `bytes` for every entry in `index.json`.
- `tasks/mvp/02b-asset-pipeline/13-per-asset-integrity-and-build-script.md` — the build-tool task; `verifyCommands` regenerate emberwild's index and assert no diff.

**Implementation Steps:**
1. Patch `asset-index.schema.json` to require `sha256`.
2. Write `scripts/build-asset-index.ts`. Hash with WebCrypto's `crypto.subtle.digest('SHA-256', bytes)` for parity with the runtime verifier.
3. Run the script against `emberwild-faction` to populate the canonical example.
4. Extend `validatePackAssets()` to verify hashes; add `pack.error.asset.integrity` to `pack-error-codes.md`.
5. Add an `npm` script `build:asset-index` and document it in `pack-contract.md`.

**Dependencies:** Issue 3.C-2 (error code catalog hosts `pack.error.asset.integrity`).

**Complexity:** M

---

#### Issue 3.B-3: Per-record / per-content versioning is undefined

**Source:** Q220 (⚠ Partial). Missing-Logic: "Per-record / per-content
versioning — only pack-level semver and per-record `schemaVersion`.
Authors who want to bump just one unit must split it into a new pack."

**Problem:**
A unit, spell, or artifact today has only `schemaVersion` (an integer
that drives migrations) — no content-level version. To version one
unit independently, an author must split it into its own pack, which
fragments the user's pack list.

**Impact:**
- A balance pass on a single unit forces a whole new pack.
- AI generators producing an iterative balance loop ("generate v1,
  evaluate, regenerate v1.1") cannot pin "use v1.1 of this one unit"
  without splitting.
- The save / replay layer cannot distinguish two versions of the same
  unit ID across the same pack version (the audit's pack-level
  `contentHash` collapses them).

**Solution:**
Two-step formalization:

1. Define **pack version is the canonical content version**. Per-record
   versioning is *not* added to the schema — adding a record-level
   `version` would explode the determinism surface and conflict with
   `contentHash`. Instead, document the recommended workflow: bump the
   pack `version` by patch (`1.0.0 → 1.0.1`) for a single-record tweak.
2. Add a small **content-version manifest section** that names which
   record IDs changed in each pack version, so consumers (saves,
   replays, AI generators) can diff:

   ```json
   "changelog": {
     "type": "array",
     "items": {
       "type": "object",
       "required": ["version", "changed"],
       "properties": {
         "version": { "type": "string" },
         "changed": { "type": "array", "items": { "type": "string" } }
       },
       "additionalProperties": false
     }
   }
   ```

   `changed[]` holds namespaced record IDs (e.g.,
   `["emberwild:unit:ash_hound"]`). The pack-validator confirms every
   ID in `changed[]` exists in `provides`.

This avoids the per-record-version explosion while giving balance and
replay tooling a deterministic per-record diff.

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — add optional `changelog`.
- [content-schema/examples/packs/emberwild-faction/manifest.json](../../content-schema/examples/packs/emberwild-faction/manifest.json) — seed with a single `1.0.0` entry listing every provided ID.
- [docs/architecture/content-system-policy.md](../architecture/content-system-policy.md) §5 — document the workflow: "bump patch for a single-record change, list the ID in `changelog`."

**New Files:** none.

**Implementation Steps:**
1. Patch the schema.
2. Update the canonical example.
3. Document the policy in `content-system-policy.md` §5.
4. Extend Task 02b-01 acceptance: `changelog[*].changed[*]` ⊆ flattened `provides`.

**Dependencies:** Issue 3.A-0.

**Complexity:** S

---

#### Issue 3.B-4: Per-pack localization layout undefined

**Source:** Q233 (⚠ Partial). Missing-Logic: "Per-pack localization
layout — schema exists; canonical folder placement
(`locales/<locale>.localization.json`) and merge order across packs
are undefined."

**Problem:**
`localization.schema.json` defines a per-locale string table, but the
pack-contract folder layout has no `locales/` subdir, no example of a
faction pack carrying its own translations, and no documented merge
order across packs (does the world-pack override the faction-pack's
strings?).

**Impact:**
- Audit Risk: "Locale fragmentation: a community faction pack and a
  community translation pack could both define `ui.faction.fire.name`
  with conflicting entries."
- Translators don't know where to put files.
- AI generators producing a faction pack cannot ship localized strings
  in the canonical structure.

**Solution:**
Pin the layout in the pack-contract:

```
resources/packs/<pack>/
  manifest.json
  records/
  assets/
    index.json
    ...
  locales/
    en.localization.json
    fr.localization.json
    de.localization.json
```

Merge order (added to `content-system-policy.md` §6 and
`pack-resolver.md`):

1. After dependency resolution, the resolver concatenates each pack's
   per-locale entries in resolution order (deps first, dependents
   last).
2. **Later-loaded pack wins per-key** within a locale. A community
   translation pack must `dependencies: [<faction-pack>]` to legally
   override; an unrelated translation pack overriding strings of a
   pack outside its dep chain is a `pack.error.locale.unordered` (same
   semantics as override-unordered, Issue 3.A-2).
3. Missing locale → fall back to `fallbackLocale` declared in each
   per-locale file; if no fallback, fall back to `en`.
4. The localization registry exposes `getString(key, locale)` plus
   `getStringSource(key, locale)` for tooling — the latter returns the
   pack ID that won the merge, surfaced in the localization editor.

**Files to Update:**
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) §"Folder Layout" — add `locales/`.
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) Localization row — replace "embedded in screen data contracts" with "per-pack `locales/<locale>.localization.json`, merged by resolution order."
- [content-schema/examples/packs/emberwild-faction/](../../content-schema/examples/packs/emberwild-faction/) — add `locales/en.localization.json` with at least the faction display strings.
- [tasks/mvp/02-content-schemas/14-localization-schema.md](../../tasks/mvp/02-content-schemas/14-localization-schema.md) — extend acceptance criteria to validate the `locales/` folder.

**New Files:**
- `tasks/mvp/02b-asset-pipeline/14-per-pack-localization-and-merge.md` — implements the merge in `src/content-runtime/`, including `getStringSource()` and the unordered-locale rejection.
- `content-schema/examples/packs/emberwild-faction/locales/en.localization.json`.

**Implementation Steps:**
1. Update the pack-contract folder layout.
2. Add the canonical example locale file.
3. Document the merge rule in `content-system-policy.md` §6.
4. Author the new task with `verifyCommands`: load three packs (base, faction, translation), assert that `getString("ui.faction.fire.name", "en")` returns the translation pack's value and `getStringSource(...)` returns the translation pack's ID.

**Dependencies:** Issue 3.A-1 (resolver), Issue 3.A-2 (override unordered semantics, reused for locale-unordered).

**Complexity:** M

---

### Validation Pipeline

#### Issue 3.C-1: No automated balance-corridor validator

**Source:** Q227 (⚠ Partial). Missing-Logic: "Balance-validation step
— research-report numeric corridor exists; no automated balance gate
in the load/publish pipeline."

**Problem:**
`research/deep-research-report.md` defines a numeric corridor for unit
HP / ATK / DEF / cost / growth, but no validator enforces it during
pack load or publish. AI-generated and community packs slip through
schema-valid-but-balance-broken.

**Impact:**
- AI-generated factions can ship absurd stats (HP 50000, ATK 1) and
  pass every other validator.
- The sandbox HP ≤ 500 / ATK ≤ 50 caps in Task 5-03 catch only the
  most extreme outliers — not "5x the corridor's upper edge for the
  unit's tier."
- Ranked-eligible community packs have no machine check for fairness.

**Solution:**
Add `npm run validate:balance` plus an in-pipeline gate:

1. Encode the research report's corridor into a JSON spec:
   `content-schema/balance/corridor.json` —
   `{ tier: number, hpRange: [min, max], atkRange: [min, max], ... }`.
2. Build `scripts/validate-balance.ts` that walks every unit / spell /
   artifact in a pack and asserts each numeric stat is inside the
   tier's corridor.
3. Two policies:
   - For packs **not flagged sandboxed**: corridor violation → fatal
     `pack.error.balance.outOfCorridor`.
   - For sandboxed packs: corridor violation → warning (still loads,
     but the mod manager surfaces a `BALANCE-WARN` badge alongside
     `SANDBOX`).
4. The validator runs as part of `npm run validate` for first-party
   packs and as a publish-gate step in the mod manager UI for imports.

**Files to Update:**
- [tasks/mvp/02b-asset-pipeline/06-pack-completeness-validator-all-required-assets-present.md](../../tasks/mvp/02b-asset-pipeline/06-pack-completeness-validator-all-required-assets-present.md) — note the balance validator runs after asset completeness.
- [tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md](../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md) — extend with the BALANCE-WARN behavior for sandboxed packs.
- [tasks/phase-2/05-mod-system/04-mod-manager-ui-install-enable-disable.md](../../tasks/phase-2/05-mod-system/04-mod-manager-ui-install-enable-disable.md) — surface `BALANCE-WARN` and `pack.error.balance.outOfCorridor` errors.
- [package.json](../../package.json) — add `"validate:balance"` script.
- [docs/architecture/content-system-policy.md](../architecture/content-system-policy.md) §7 — list the validator as the sixth pipeline stage.

**New Files:**
- `content-schema/balance/corridor.json` — the corridor spec, derived from `research/deep-research-report.md`.
- `content-schema/balance/corridor.schema.json` — schema for the spec itself.
- `scripts/validate-balance.ts` — implementation.
- `tasks/mvp/02b-asset-pipeline/15-balance-corridor-validator.md` — task.

**Implementation Steps:**
1. Distill the research report's numeric corridor into `corridor.json`.
2. Author the schema and the validator script.
3. Run against `emberwild-faction` to confirm the corridor is correctly tuned (the canonical pack must pass).
4. Wire `npm run validate` to call `validate:balance` on every pack under `resources/packs/`.
5. Add the new task with `verifyCommands` covering: in-corridor pack passes; out-of-corridor non-sandboxed pack fails; out-of-corridor sandboxed pack warns.

**Dependencies:** Issue 3.C-2 (error code catalog).

**Complexity:** L

---

#### Issue 3.C-2: No pack-load error code catalog

**Source:** Q231 (⚠ Partial). Missing-Logic: "Pack-load error code
catalog — error wording is ad-hoc per task; no localized error table
or enumerated codes."

**Problem:**
Tasks 02b-01, 02b-06, 05-01, 05-03, 05-04 each emit ad-hoc error
strings. There is no central enumeration, no localization keys, no
shared catalog the mod manager can render with consistent UX.

**Impact:**
- UI error wording drifts per task; localizers cannot translate
  without auditing every error site.
- Telemetry / analytics cannot bucket failures by stable code.
- The new error codes introduced by issues 3.A-1, 3.A-2, 3.B-2,
  3.B-4, 3.C-1 (cycle, version-conflict, override-unordered,
  asset-integrity, locale-unordered, balance-outOfCorridor) need a
  home before they multiply.

**Solution:**
Create `docs/architecture/pack-error-codes.md` — single canonical
table, columns: `code | severity | localization key | example
message | when emitted`. Each code is a stable string namespaced as
`pack.error.<area>.<reason>`. The localization key is the same string
prefixed with `pack.error.`.

Initial catalog (extend as new errors arise):

| Code | Severity | Loc Key | When |
|---|---|---|---|
| `pack.error.manifest.missing` | fatal | `pack.error.manifest.missing` | no `manifest.json` in archive |
| `pack.error.manifest.schema` | fatal | `pack.error.manifest.schema` | manifest fails JSON-schema validation |
| `pack.error.manifest.id-pattern` | fatal | `pack.error.manifest.id-pattern` | `id` violates namespace pattern (Issue 3.B-1) |
| `pack.error.dependency.missing` | fatal | `pack.error.dependency.missing` | resolver cannot find a declared dep |
| `pack.error.dependency.cycle` | fatal | `pack.error.dependency.cycle` | resolver detects a cycle |
| `pack.error.dependency.version-conflict` | fatal | `pack.error.dependency.version-conflict` | two installed versions of the same dep |
| `pack.error.override.unordered` | fatal | `pack.error.override.unordered` | two packs override the same target without a dep edge |
| `pack.error.asset.missing` | fatal (gameplay) / warn (presentation) | `pack.error.asset.missing` | pack-validator cannot find a declared asset path |
| `pack.error.asset.integrity` | fatal | `pack.error.asset.integrity` | sha256 mismatch (Issue 3.B-2) |
| `pack.error.sandbox.cap` | fatal | `pack.error.sandbox.cap` | sandboxed pack exceeds HP/ATK/abilities cap |
| `pack.error.balance.outOfCorridor` | fatal (non-sandbox) / warn (sandbox) | `pack.error.balance.outOfCorridor` | balance validator (Issue 3.C-1) |
| `pack.error.signature.invalid` | fatal | `pack.error.signature.invalid` | ed25519 verification failed |
| `pack.error.canonical.missing` | fatal | `pack.error.canonical.missing` | canonical-packs registry entry missing (Issue 3.A-3) |
| `pack.error.canonical.mismatch` | fatal | `pack.error.canonical.mismatch` | registry-pinned hash/version mismatch |
| `pack.error.locale.unordered` | fatal | `pack.error.locale.unordered` | locale entries collide without dep edge |

A small TS module re-exports the codes as a typed enum so callers
cannot mistype them.

**Files to Update:**
- All listed tasks (02b-01, 02b-06, 05-01, 05-03, 05-04) — replace ad-hoc error strings with code references.
- [content-schema/schemas/localization.schema.json](../../content-schema/schemas/localization.schema.json) — none, but the canonical en localization adds the `pack.error.*` keys.

**New Files:**
- `docs/architecture/pack-error-codes.md`
- `src/content-runtime/error-codes.ts` (typed enum + helpers; created when runtime work begins, but the doc lands now).
- `tasks/mvp/02b-asset-pipeline/16-pack-error-code-catalog.md` — task that authors the doc, the typed enum module, and adds an `npm run validate:error-codes` check that asserts every emitted code is in the catalog.

**Implementation Steps:**
1. Author `pack-error-codes.md` from the audit-derived initial table.
2. Add the `pack.error.*` keys to the canonical English localization file (the same one introduced by Issue 3.B-4).
3. Add a lint step in `npm run validate:tasks`: every task that mentions a `pack.error.*` code must reference an entry in the catalog.

**Dependencies:** Issue 3.A-0 (policy doc §8 links here).

**Complexity:** M

---

## 4. Suggested Task Breakdown

Each item below is a concrete unit that can be estimated, scheduled,
and AI-implemented independently. Filename suggestions follow the
repo's existing task-system numbering. Two of these (02b-12, 02b-15)
are blocking-critical; the rest can run in parallel after the policy
doc lands.

- [ ] **T1.** Author `docs/architecture/content-system-policy.md` and
  cross-link from `pack-contract.md`, `content-platform.md`,
  `schema-matrix.md`, `CLAUDE.md`. *(Issue 3.A-0)*
- [ ] **T2.** Patch `manifest.schema.json` `id` namespace pattern,
  audit example manifests, document reserved `heroes_reforged_*`
  prefix. *(Issue 3.B-1)*
- [ ] **T3.** New task
  `tasks/mvp/02b-asset-pipeline/13-per-asset-integrity-and-build-script.md`
  — patch `asset-index.schema.json`, write `scripts/build-asset-index.ts`,
  extend `validatePackAssets()`, populate emberwild example.
  *(Issue 3.B-2)*
- [ ] **T4.** New doc `docs/architecture/pack-resolver.md` + new task
  `tasks/mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md`.
  Migrate `dependencies` to object form (additive). Author resolver
  fixtures. *(Issue 3.A-1)*
- [ ] **T5.** Add `overrides` block to `manifest.schema.json` + new task
  `tasks/phase-2/05-mod-system/08-override-precedence-and-patch-merge.md`.
  *(Issue 3.A-2)*
- [ ] **T6.** New schema `canonical-packs.schema.json` + file
  `resources/canonical-packs.json` + new task
  `tasks/phase-2/05-mod-system/09-canonical-packs-registry.md`.
  *(Issue 3.A-3)*
- [ ] **T7.** Add optional `changelog` block to `manifest.schema.json`
  with `provides`-membership validation. *(Issue 3.B-3)*
- [ ] **T8.** Pin `locales/<locale>.localization.json` layout in
  `pack-contract.md`; add canonical example file; new task
  `tasks/mvp/02b-asset-pipeline/14-per-pack-localization-and-merge.md`.
  *(Issue 3.B-4)*
- [ ] **T9.** Author `corridor.json` + `corridor.schema.json` +
  `scripts/validate-balance.ts` + new task
  `tasks/mvp/02b-asset-pipeline/15-balance-corridor-validator.md`.
  Add `npm run validate:balance`. *(Issue 3.C-1)*
- [ ] **T10.** Author `docs/architecture/pack-error-codes.md` + new task
  `tasks/mvp/02b-asset-pipeline/16-pack-error-code-catalog.md` +
  `npm run validate:error-codes` lint. *(Issue 3.C-2)*
- [ ] **T11.** Update existing affected tasks (02b-01, 02b-06, 05-01,
  05-03, 05-04, 05-5d, 5a/5b/5c) to point at the new specs and
  replace ad-hoc error strings with `pack.error.*` codes.
- [ ] **T12.** Run `npm run validate` and `npm run validate:tasks` to
  confirm nothing regresses; update `docs/planning/implementation-log.md`
  with one entry per landed task.

---

## 5. Execution Order

The order below minimizes rework. Items 1–3 unblock everything else;
items 4–6 are mutually independent and can run in parallel; items 7–10
depend on 4 (resolver) or 10 (error catalog).

1. **T1 (policy doc)** — anchors every later cross-reference.
2. **T2 (id namespace pattern)** — must ship before T4 and T6 because
   both consume the `id` regex.
3. **T10 (error code catalog)** — must ship before T3, T4, T5, T6, T8,
   T9 because every one of those introduces new `pack.error.*` codes.
4. **T4 (resolver doc + dep object migration)** — gates T5, T6, T8.
5. **T3 (per-asset integrity)** — independent of T4; can run parallel.
6. **T5 (override precedence)** — depends on T4 (resolver evaluates
   override edges).
7. **T8 (per-pack localization & merge)** — depends on T4 (merge order
   = resolution order) and T5 (reuses unordered-rejection semantics).
8. **T6 (canonical-packs registry)** — depends on T2, T4 (registry
   references resolver-validated packs by namespaced id).
9. **T7 (changelog block)** — independent; can run parallel after T1.
10. **T9 (balance corridor validator)** — independent of T4; depends
    on T10 for the error code.
11. **T11 (downstream task updates)** — runs continuously as each new
    contract lands.
12. **T12 (final validation)** — last.

A reasonable single-sprint slice: T1 + T2 + T10 + T3 + T4 + T7. That
clears every Critical Fix from §2 except T5 (override precedence).

---

## 6. Risks if Not Implemented

Each risk maps directly to an audit Risk or Missing-Logic line.

- **Silent asset tampering.** Without T3 (per-asset integrity), a
  modified sprite inside a signed `.hrmod` archive may pass
  signature verification and visually drift two multiplayer peers
  apart with no detection.
- **Pack-ID collisions.** Without T2 (namespace pattern), two
  community authors collide on `id: "fire_faction"`; the user-pack
  store cannot distinguish them; the canonical-pack registry has no
  reliable trust target.
- **Dependency drift.** Without T4 (object dependencies + version
  ranges + resolver spec), `dependencies: ["shared_skills"]` will
  load against any installed version, including breaking ones.
  Multiplayer determinism breaks the moment two clients have
  different `shared_skills` versions.
- **Override semantics ambiguity.** Without T5, the only legal way
  to retexture or rebalance an existing record is to fork the whole
  baseline pack — fragmenting the user's pack list and breaking the
  shared trust model.
- **Locale fragmentation.** Without T8, two community packs both
  defining `ui.faction.fire.name` produce undefined behavior; AI
  translation generators have no canonical folder to write to.
- **Balance-broken AI packs ship unchecked.** Without T9, an
  AI-generated faction can pass every existing validator with HP
  50000 / ATK 1 and enter ranked play.
- **Inconsistent error UX.** Without T10, every load failure is an
  ad-hoc string; localizers, telemetry, and the mod-manager UI all
  drift.
- **Bundle verification has no static target.** Without T6, a
  malicious user could disable a baseline pack and the engine would
  start anyway with a community replacement signed by anyone.
- **Per-record version churn.** Without T7, any single-unit balance
  pass requires a new pack, fragmenting the catalogue.
- **Policy fragmentation.** Without T1, fixes for the eight items
  above scatter across nine files and re-create the original
  audit-gap pattern.

---

## 7. AI Implementation Readiness

**Score: 8.5 / 10** *(after this plan lands; up from the audit's 7/10).*

Rationale:

- The 9 audit gaps are converted into 12 concrete tasks with explicit
  files, schemas, and `verifyCommands`-style acceptance criteria. An
  AI agent can pick any of T1–T10 from `npm run tasks:next` and have a
  self-contained scope.
- Three Critical Fixes are documentation-only (T1, T7, T10) so the
  agent can land them without runtime infrastructure.
- The schema and resolver work (T2, T3, T4, T5, T8) is anchored in
  fixtures (`content-schema/examples/packs/__tests__/...`) the agent
  can author and validate offline.
- The remaining 1.5-point gap is intrinsic: the balance corridor (T9)
  ultimately needs human-validated tuning of `corridor.json` against
  the research report; an agent can scaffold the validator but should
  defer corridor-tuning to a human review pass.
- Extension safety is preserved: every change is additive (new
  manifest fields are optional except `dependencies`-shape and `id`
  pattern, which have explicit migration windows). No existing
  passing pack stops loading without a one-line edit.
