# 13. CONTENT SYSTEM (CRITICAL)

### Q: 219. Is there a formal pack manifest format?

**Status:** ✔ Defined

**Answer:**
Yes. The canonical schema is `content-schema/schemas/manifest.schema.json` (Manifest v1) and is the single source of truth. It mandates `schemaVersion`, `id`, `type` (closed enum: `ruleset-pack`, `library-pack`, `faction-pack`, `world-pack`, `scenario-pack`, `asset-pack`), `name`, `version`, `author`, `engine`, `dependencies`, `provides`, with optional `engineHash`, `contentHash`, `capabilities` (closed enum), `signature`, and `sandboxed`. Folder layout (one folder under `resources/packs/` = one pack with one `manifest.json`) is fixed by the pack contract.

**Evidence:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
- [content-schema/examples/packs/emberwild-faction/manifest.json](../../../content-schema/examples/packs/emberwild-faction/manifest.json)
- [tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md](../../../tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md)

---

### Q: 220. Are factions, units, spells, artifacts each separately versioned?

**Status:** ⚠ Partial

**Answer:**
Versioning is at the pack level via `manifest.version` (semver string) — not per individual record. Each record carries its own `schemaVersion` integer that drives schema migrations, but there is no per-record content version. To version a single unit/spell/artifact independently, authors must split it into its own pack. Per-record content versioning (e.g., separate `version` per unit) is ❌ UNKNOWN / not specified.

**Evidence:**
- `manifest.schema.json` → `version` is on the manifest, not per record
- `schema-matrix.md` global rule: "Every record has `schemaVersion` and a stable namespaced `id`"
- Pack types in [docs/architecture/content-platform.md](../../architecture/content-platform.md) (`faction-pack`, `library-pack` for shared spells/abilities/artifacts)

---

### Q: 221. Are pack dependencies declared, and is the resolver specified?

**Status:** ⚠ Partial

**Answer:**
Dependencies are declared in `manifest.dependencies` as a list of pack ID strings. Resolution responsibility is assigned to `src/content-runtime/` (manifest loading + dependency resolution + pack registry assembly) per `pack-contract.md` and `content-platform.md`. However, the actual resolver algorithm — topological order, version-range matching (the example shows `">=1.0.0"`-style version constraints in one task, but the schema only requires plain string IDs), cycle handling, and conflict policy — is ❌ UNKNOWN at the spec level. No `resolver.md` or formal algorithm description exists.

**Evidence:**
- `manifest.schema.json` → `dependencies: array<string>`
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) §"Runtime Ownership"
- [tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md](../../../tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md) (resolver algorithm not detailed)
- Task 5a: declares dep IDs as plain strings (e.g., `"shared_skills"`)

---

### Q: 222. Is there a pack signing / trust model?

**Status:** ✔ Defined

**Answer:**
Yes. The manifest carries an optional `signature` object (`scheme: ed25519`, `keyId`, `value`) and a `sandboxed: boolean` trust flag. Verification is implemented via Web Crypto (`crypto.subtle.verify`) in `src/content-runtime/mod-signature.ts`, returning `"official" | "community" | "unsigned"`. Official first-party packs are signed with the project ed25519 key; community packs are unsigned or community-signed; AI-generated packs MUST be `sandboxed: true` and cannot be signed as official. Bundle-level signing is owned by Task 5d.

**Evidence:**
- `manifest.schema.json` → `signature` (ed25519 only), `sandboxed`
- [tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
- [tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md](../../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md)
- [tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md](../../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md)

---

### Q: 223. How are conflicting packs resolved?

**Status:** ⚠ Partial

**Answer:**
The MVP policy is **fail loudly, no silent last-wins**: if two packs declare the same provided ID, the registry rejects the load with a conflict error (Task 1 acceptance criterion). The mod manager UI surfaces conflict warnings before activation. However, `content-platform.md` also lists "override precedence" and "make conflicts visible in tooling" as runtime responsibilities, implying a future explicit-override mechanism — but the override-precedence algorithm is ❌ UNKNOWN. There is no formal "later pack wins" / "load order" / "dependency-implied order" rule documented.

**Evidence:**
- [tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md](../../../tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md) (acceptance: "Two packs declaring the same provided id → conflict error (load is rejected; no silent last-wins)")
- [tasks/phase-2/05-mod-system/04-mod-manager-ui-install-enable-disable.md](../../../tasks/phase-2/05-mod-system/04-mod-manager-ui-install-enable-disable.md) (conflict detection in UI)
- [docs/architecture/content-platform.md](../../architecture/content-platform.md) §"Runtime Responsibilities" (override precedence noted but unspecified)

---

### Q: 224. Are pack IDs namespaced to prevent collisions?

**Status:** ⚠ Partial

**Answer:**
Record IDs inside packs are namespaced (canonical examples use `<pack>:<kind>:<name>` form, e.g., `emberwild:unit:ash_hound`, `emberwild:building:fort`) and the `provides` block declares each as a fully-qualified namespaced ID. The schema-matrix global rule states "Every record has a stable namespaced `id`". However, the **pack manifest's own `id` field** has only `minLength: 1` — no namespace pattern is enforced (e.g., `id: "emberwild_faction"` is a flat string). There is no formal pattern (regex) requiring a vendor/author prefix on pack IDs themselves.

**Evidence:**
- `manifest.schema.json` → `id: { type: "string", minLength: 1 }` (no pattern)
- [content-schema/examples/packs/emberwild-faction/manifest.json](../../../content-schema/examples/packs/emberwild-faction/manifest.json) → `provides.units: ["emberwild:unit:ash_hound"]` (record-level namespacing)
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) §"Global Rules"

---

### Q: 225. How are assets referenced — by path, by hash, by ID?

**Status:** ✔ Defined

**Answer:**
**By stable asset ID.** Gameplay records and presentation records reference logical asset IDs (e.g., `unit:ash_hound:sprite`). The mapping from asset ID → concrete file path is owned by the per-pack `assets/index.json` (Asset Index schema). Raw asset paths in gameplay JSON are explicitly forbidden ("Protect These Rules" in CLAUDE.md). The runtime resolver looks up ID → path through the asset-index manifest.

**Evidence:**
- [content-schema/schemas/asset-index.schema.json](../../../content-schema/schemas/asset-index.schema.json)
- [content-schema/examples/packs/emberwild-faction/assets/index.json](../../../content-schema/examples/packs/emberwild-faction/assets/index.json)
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) §"Folder Layout" — "gameplay records use ids, not asset paths"
- [tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md](../../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md)

---

### Q: 226. Are asset hashes verified at load?

**Status:** ❌ UNKNOWN

**Answer:**
No per-asset hash verification is defined. The manifest carries a pack-wide `contentHash` (hex digest of canonical-JSON serialization of every record), required for multiplayer and trusted replay, plus an optional `engineHash`. But the asset-index schema has no `hash`/`sha256`/`integrity` field, and no task specifies per-file verification. Tampered binary assets in a signed pack would only be caught indirectly if the signature scheme covers the archive; per-asset integrity is not contractually enforced.

**Evidence:**
- `manifest.schema.json` → `contentHash` (records only, not assets)
- `asset-index.schema.json` → no hash field on assets
- No grep hit for "asset hash" / "integrity" in `docs/architecture/`

---

### Q: 227. What is the pack validation pipeline (schema → balance → asset integrity)?

**Status:** ⚠ Partial

**Answer:**
A staged pipeline is implied but not formalized end-to-end:
1. **Schema validation** — Zod validators per record (`mvp.02-content-schemas.10-zod-validators-for-all-schemas`); `npm run validate` runs schema/cross-ref checks repo-wide.
2. **Manifest validation** — runtime validator generated from the manifest schema (Task 02b-01); rejects missing required fields.
3. **Asset completeness** — `validatePackAssets()` in `src/engine/pack-validator.ts` (Task 02b-06) checks required sprites/animations/sounds; errors block load, warnings allow placeholder fallback.
4. **Sandbox caps** — `validateSandboxCaps()` enforces HP/ATK/abilities caps for `sandboxed: true` packs.
5. **Signature verification** — Task 05-02 ed25519 check.
6. **Bundle verification** — Task 05-5d for the official set.

**Balance validation** (numeric corridor, fairness checks against the baseline) is referenced by `research/deep-research-report.md` but no automated balance-validator step is wired into the pack load pipeline. ❌ UNKNOWN.

**Evidence:**
- [tasks/mvp/02b-asset-pipeline/06-pack-completeness-validator-all-required-assets-present.md](../../../tasks/mvp/02b-asset-pipeline/06-pack-completeness-validator-all-required-assets-present.md)
- [tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md](../../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md)
- [tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md](../../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md)
- [tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
- [tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md](../../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md)

---

### Q: 228. Can a pack be loaded partially if some assets are missing?

**Status:** ✔ Defined

**Answer:**
Yes — for **presentation** assets only. Project rule (`content-platform.md` §"Update Safety"): "allow missing visuals to fall back; reject missing gameplay requirements loudly." The pack-completeness validator splits findings into `errors` (block load — e.g., missing sprite sheet, missing portrait) and `warnings` (allow load with placeholder — e.g., missing icon, missing animation sequence). Gameplay records that depend on missing IDs must fail validation.

**Evidence:**
- [docs/architecture/content-platform.md](../../architecture/content-platform.md) §"Update Safety"
- [tasks/mvp/02b-asset-pipeline/06-pack-completeness-validator-all-required-assets-present.md](../../../tasks/mvp/02b-asset-pipeline/06-pack-completeness-validator-all-required-assets-present.md) (errors vs. warnings split)
- CLAUDE.md "Protect These Rules": "missing presentation may fall back; missing gameplay requirements must fail loudly"

---

### Q: 229. Is there a pack sandbox mode for untrusted content?

**Status:** ✔ Defined

**Answer:**
Yes. `manifest.sandboxed: true` is a runtime-enforced trust flag. AI-generated packs are auto-flagged sandboxed (immutable: cannot be removed). Sandbox caps:
- HP ≤ 500, ATK ≤ 50, abilities count ≤ 5 per unit
- Cannot participate in ranked matches
- Cannot be signed as "official"
- Visible `SANDBOX` badge in mod manager UI

**Evidence:**
- `manifest.schema.json` → `sandboxed: boolean`
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) §"Trust Fields"
- [tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md](../../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md)

---

### Q: 230. Can packs be hot-reloaded during development?

**Status:** ✔ Defined

**Answer:**
Yes, in dev mode. `src/renderer/hot-reload.ts` (dev-only, tree-shaken in prod) watches `resources/packs/**/*` via Vite's HMR; on change it evicts the cached asset and reloads granularly (replacing one sprite reloads only that texture). Game state (hero positions, resources, turn) is preserved across reload. A small toast surfaces the reloaded asset name. The hot-reload module is fenced with `import.meta.hot` so it is absent from production builds.

**Evidence:**
- [tasks/mvp/02b-asset-pipeline/07-dev-hot-reload-watch-folder-reload-without-restart.md](../../../tasks/mvp/02b-asset-pipeline/07-dev-hot-reload-watch-folder-reload-without-restart.md)

---

### Q: 231. Are pack errors surfaced to the user with actionable messages?

**Status:** ⚠ Partial

**Answer:**
Acceptance criteria across the load chain demand actionable error text — manifest validator emits "clear error with JSON path", missing-asset validator returns explicit messages like `"Missing required sprite: sprites/ember-archer.png"`, sandbox cap violation returns `"HP cap exceeded (max 500)"`, mod-manager UI shows error toasts on invalid drops. However, there is no central error-code catalog or localization-keyed error table for pack-load failures (errors today appear as ad-hoc strings, not localization keys). User-facing wording standards are ❌ UNKNOWN.

**Evidence:**
- Acceptance criteria in tasks 02b-01, 02b-06, 05-01, 05-03, 05-04
- [content-schema/schemas/localization.schema.json](../../../content-schema/schemas/localization.schema.json) (exists for UI but not yet wired to pack-load error codes)

---

### Q: 232. Is there a registry of canonical packs vs. user packs?

**Status:** ⚠ Partial

**Answer:**
The distinction exists by convention and trust state, not as a formal "registry of canonical packs":
- **First-party / official packs** live under `resources/packs/` (baseline-ruleset, shared-skills, shared-abilities, shared-spells, shared-artifacts, six faction packs) and are signed with the project ed25519 key (Task 5d).
- **Community / user packs** are imported as `.hrmod` archives via the mod manager into IndexedDB; they are unsigned or community-signed.
- Trust state (`"official" | "community" | "unsigned"`) is reported by `verifySignature()`.

There is **no static manifest enumerating "the canonical set"** — official packs are recognized only by signature key match. The closest thing is the bundle verification command from Task 5d.

**Evidence:**
- [tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
- [tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md](../../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md)
- [tasks/phase-2/05-mod-system/04-mod-manager-ui-install-enable-disable.md](../../../tasks/phase-2/05-mod-system/04-mod-manager-ui-install-enable-disable.md) (IndexedDB user-pack store)

---

### Q: 233. How are localizations bundled per pack?

**Status:** ⚠ Partial

**Answer:**
The localization schema (`localization.schema.json`) defines a `locale`-scoped string table (per-locale `entries` keyed by dotted IDs like `ui.main-menu.title`) with optional `fallbackLocale` and explicit placeholder declarations. The schema-matrix lists `Localization` as a record kind that "make[s] packs localizable without changing gameplay records." However, **per-pack bundling rules are not explicitly described**: there is no canonical `locales/` folder convention shown in the pack-contract folder layout, no example of a faction pack carrying its own `locales/en.localization.json` / `locales/fr.localization.json`, and no documented merge order across packs (does the active world-pack override the faction-pack's strings?). ❌ UNKNOWN at the layout level.

**Evidence:**
- [content-schema/schemas/localization.schema.json](../../../content-schema/schemas/localization.schema.json)
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) (Localization row)
- [tasks/mvp/02-content-schemas/14-localization-schema.md](../../../tasks/mvp/02-content-schemas/14-localization-schema.md)
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — folder layout has no `locales/` subdir
- Schema-matrix note: "embedded in screen data contracts" (today localization keys live with screen packages, not packs)

---

## 🔍 Summary

### Missing Logic
- **Per-asset hash / integrity verification** — pack-level `contentHash` exists, but binary assets have no SHA-256/SRI on the asset-index entries. A tampered sprite inside a signed-but-not-rebuilt archive could slip through.
- **Dependency resolver algorithm** — declared as a runtime responsibility, but topological ordering, version-range matching (the example uses `">=1.0.0"` ranges that the schema does not enforce), and cycle handling are unspecified.
- **Override-precedence rule** — `content-platform.md` mentions "override precedence" and "show override source and precedence", but no formal precedence (load-order? dependency-order? explicit `overrides` block?) exists. Today the only documented behavior is "duplicate provides → reject load."
- **Per-record / per-content versioning** — only pack-level semver and per-record `schemaVersion`. Authors who want to bump just one unit must split it into a new pack.
- **Per-pack localization layout** — schema exists; canonical folder placement (`locales/<locale>.localization.json`) and merge order across packs are undefined.
- **Balance-validation step** — research-report numeric corridor exists; no automated balance gate in the load/publish pipeline.
- **Pack-load error code catalog** — error wording is ad-hoc per task; no localized error table or enumerated codes for "missing manifest", "schema violation", "missing required asset", "sandbox cap exceeded", etc.
- **Manifest `id` namespace pattern** — record IDs are namespaced by convention; pack manifest `id` itself has no enforced namespace pattern (collision risk between user packs).

### Risks
- **Silent asset tampering**: signature covers manifest+records (via `contentHash`), but binary asset payloads in `.hrmod` archives could be swapped if the archive-level signature is not strict.
- **Pack-ID collisions**: two community authors can both pick `id: "fire_faction"` since no namespace pattern is enforced.
- **Dependency drift**: dependency strings are plain IDs, not version constraints — a pack stating `dependencies: ["shared_skills"]` will load against any installed `shared_skills` version, including breaking changes.
- **Override semantics ambiguity**: "fail loudly on duplicate provides" forbids legitimate retexture/balance-tweak packs that want to *intentionally* override a baseline record. A future override channel is needed and currently undefined.
- **Locale fragmentation**: no merge order means a community faction pack and a community translation pack could both define `ui.faction.fire.name` with conflicting entries.
- **No partial-load contract for binary corruption**: the warnings/errors split is defined for missing assets, not malformed/corrupt ones.

### Improvements
- Add `assets[i].sha256` (or `integrity: "sha256-<base64>"`) to the asset-index schema and verify on load (errors block, warnings warn — symmetric with the missing-asset policy).
- Adopt explicit dependency objects: `{ id: string, version: string (semver range) }` instead of bare strings; document the resolver (deterministic topological sort with stable tie-break by ID).
- Define an `overrides` block in the manifest (or a precedence rule based on declared `dependencies`) so retexture/balance packs are first-class instead of conflict-rejected.
- Add a regex pattern to manifest `id` (e.g., `^[a-z0-9]+(_[a-z0-9]+)+$` requiring at least one underscore segment for vendor namespacing).
- Add `locales/<locale>.localization.json` to the canonical pack folder layout and define merge order = dependency order, with later packs winning per-key.
- Enumerate pack-load error codes in a single `pack-error-codes.md` and back them with localization keys (`pack.error.manifest.missing`, `pack.error.asset.missing`, etc.).
- Add an automated balance-corridor validator gated behind `npm run validate:balance` so AI-generated and community packs can be machine-checked against the research baseline.
- Publish a "registry of canonical packs" as a JSON file pinned to the engine build (list of expected official pack IDs + version + signature key fingerprint) so the bundle-verification step has a static target.

### AI-Readiness
Score: **7/10**

Reason: The pack contract is unusually well-formalized for a pre-runtime project: a strict JSON schema as single source of truth, a closed enum of pack types, an explicit sandbox flag wired to caps, ed25519 signing, ID-based asset indirection, and per-task acceptance criteria covering the full load chain. An AI agent can author a faction pack from the canonical example with high confidence. Where readiness drops: the dependency resolver, override precedence, per-asset integrity, per-pack localization layout, and pack-ID namespacing are either implicit, partial, or absent — exactly the surfaces an autonomous agent would need to negotiate when generating *and merging* untrusted content. Closing the eight items in "Improvements" would push this section to 9/10.
