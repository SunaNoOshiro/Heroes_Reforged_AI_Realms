# 20. SAVE IMPORTS & PACK TRUST PROMPTS

> **Audit context:** This repo is design-first / schema-first. No runtime
> currently exists. The Save/Load **screen package** (#55) defines slot-based
> save/load via internal storage, and the save-flow diagrams (#24, #25)
> describe a deterministic save = `{ state, packHashes, commandLog,
> stateHash, metadata }`. Neither the screen package nor any architecture doc
> defines an external **save-import** flow (file picker, URL, share link),
> and no **pack trust prompt UI** is specified anywhere — only the
> back-end trust *fields* (`signature`, `sandboxed`, `capabilities`) on the
> manifest schema. Most questions below therefore land on ❌ UNKNOWN or
> ⚠ Partial because the surface is contracted at the schema layer but
> intentionally not yet wired through to a UI/runtime.

---

### Q: 361. When a user imports a save file, is the source (local file, URL, share link) presented before parsing begins?

**Status:** ❌ UNKNOWN

**Answer:**
No save-import surface is specified. Screen 55 only browses **internal save
slots** (`selectors.persistence.saveSlotManifests`) — there is no file
picker, URL field, or share-link affordance, and no spec describes
displaying the import source before parsing.

**Evidence:**
- [docs/architecture/wiki/screens/55-save-load/spec.md](../architecture/wiki/screens/55-save-load/spec.md)
- [docs/architecture/wiki/screens/55-save-load/interactions.md](../architecture/wiki/screens/55-save-load/interactions.md) — only `SELECT_SAVE_SLOT`, `SAVE_GAME_SLOT`, `LOAD_GAME_SLOT`, `REQUEST_DELETE_SAVE_SLOT`, `CLOSE_SAVE_LOAD`
- [docs/architecture/diagrams/25-load-flow.md](../architecture/diagrams/25-load-flow.md) — no source-disclosure step

---

### Q: 362. Is the user warned that imported saves can reference untrusted packs and may execute scripts or load assets?

**Status:** ❌ UNKNOWN

**Answer:**
No such warning is specified. The pack contract enforces `scripts.none` as
a capability and treats `sandboxed: true` packs as restricted, but no UI
copy or prompt warning the user about untrusted-pack references on save
import is documented.

**Evidence:**
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — `Trust Fields`, `Capabilities`
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — `capabilities` includes `scripts.none`
- No copy in [docs/architecture/wiki/screens/55-save-load/](../architecture/wiki/screens/55-save-load/)

---

### Q: 363. Is the save validated against the schema BEFORE any side-effecting load (asset fetch, pack mount) occurs?

**Status:** ⚠ Partial

**Answer:**
The intent is documented: "Loading validates schema version, content
hashes, pack compatibility, ruleset version, and migration availability
**before hydrating state**." The load-flow diagram orders `Read save →
Decompress → Valid format? → Check pack hashes → Load required packs →
Restore state`, suggesting validation precedes pack mount. However, there
is no explicit save **schema** file (e.g. `save.schema.json`) under
`content-schema/schemas/` — schema validation is asserted at the contract
level but the contract artifact does not exist yet.

**Evidence:**
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md:66](../architecture/wiki/screens/55-save-load/data-contracts.md#L66)
- [docs/architecture/diagrams/25-load-flow.md:11-30](../architecture/diagrams/25-load-flow.md)
- Missing: `content-schema/schemas/save.schema.json`

---

### Q: 364. Are required pack hashes shown to the user before download/install of those packs is initiated?

**Status:** ❌ UNKNOWN

**Answer:**
The save format pins `packHashes` per-pack and the screen package shows a
"compatibility seal" with hash status, but no flow describes presenting
the **list of required pack IDs/hashes** to the user before initiating
download or install. There is no pack-installer UI specified.

**Evidence:**
- [docs/architecture/diagrams/24-save-flow.md:29-48](../architecture/diagrams/24-save-flow.md) — `packHashes` field
- [docs/architecture/wiki/screens/55-save-load/mockup.html](../architecture/wiki/screens/55-save-load/mockup.html) — `Content hash: match` label only
- Missing: pack-install/pack-fetch screen package

---

### Q: 365. Does importing a save automatically install referenced packs, or require explicit per-pack consent?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The current load flow assumes **packs already exist
locally** (`Check pack hashes → All packs match?`); a "missing pack →
fetch and install" path with consent gating is not modeled.

**Evidence:**
- [docs/architecture/diagrams/25-load-flow.md](../architecture/diagrams/25-load-flow.md)
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — defines pack format but not install consent UX

---

### Q: 366. Is a content hash mismatch surfaced clearly, distinguishing "version skew" from "tampered file"?

**Status:** ⚠ Partial

**Answer:**
A `compatibility` selector
(`selectors.persistence.selectedSaveCompatibility`) covers
"Version/hash/migration result" and the load diagram includes a "pack
mismatch — continue or abort?" branch and a "Save corrupt!" terminal for
`stateHash` mismatch. Two failure modes are present (pack-hash mismatch vs.
state-hash mismatch), but the UI does not explicitly label them as
"version skew" vs. "tampering"; copy is undefined.

**Evidence:**
- [docs/architecture/wiki/screens/55-save-load/spec.md:37](../architecture/wiki/screens/55-save-load/spec.md#L37)
- [docs/architecture/diagrams/25-load-flow.md](../architecture/diagrams/25-load-flow.md) — branches `H` (warn pack mismatch) and `Q` (Save corrupt!)
- Missing: localization keys distinguishing "skew" vs. "tamper"

---

### Q: 367. Is a save file size cap enforced before parse to prevent zip-bomb / decompression-bomb attacks?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Saves are gzip-compressed and noted as "typically ~50–200 KB
compressed", but no documented cap, decompression-ratio guard, or
streaming-budget rule exists. Save-import doesn't exist as a surface yet,
so the threat model has not been written.

**Evidence:**
- [docs/architecture/diagrams/24-save-flow.md:50](../architecture/diagrams/24-save-flow.md#L50)
- No size/ratio constants in `content-schema/` or `docs/architecture/`

---

### Q: 368. Are nested archives within a save (if supported) traversal-protected against path traversal (`../`)?

**Status:** ❌ UNKNOWN

**Answer:**
Saves are documented as a single gzip-compressed JSON object (no nested
archive structure described), so the question is not directly applicable
to the current save format. However, **packs** are `.hrmod` ZIPs and no
path-traversal protection rule is documented for ZIP extraction.

**Evidence:**
- [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md) — saves are `{ state, packHashes, commandLog, stateHash, metadata }`, gzip only
- [docs/architecture/pack-contract.md:106](../architecture/pack-contract.md#L106) — `.hrmod` is a ZIP; no traversal rule documented

---

### Q: 369. Does the save importer reject files whose declared schema version is newer than the runtime supports?

**Status:** ⚠ Partial

**Answer:**
The save format includes `saveVersion: 1`, and the screen-package data
contract states "Loading validates schema version" — implying a forward
upper-bound check. However, the explicit policy ("reject newer", as
opposed to "warn and refuse migration") is not codified, and no
`save.schema.json` defines the version range.

**Evidence:**
- [docs/architecture/diagrams/24-save-flow.md:30](../architecture/diagrams/24-save-flow.md#L30) — `"saveVersion": 1`
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md:66](../architecture/wiki/screens/55-save-load/data-contracts.md#L66)

---

### Q: 370. Does the save importer reject files whose declared schema version is older and lacks a registered migration?

**Status:** ⚠ Partial

**Answer:**
Same source asserts the runtime checks "migration availability before
hydrating state", and the screen mockup surfaces a "Schema migration: none"
status indicator. The intent is to gate load on a registered migration,
but no migration registry contract or rejection rule is defined yet.

**Evidence:**
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md:66](../architecture/wiki/screens/55-save-load/data-contracts.md#L66)
- [docs/architecture/wiki/screens/55-save-load/mockup.html](../architecture/wiki/screens/55-save-load/mockup.html) — `Schema migration: none`
- Missing: migration registry / rejection policy doc

---

### Q: 371. Is the user warned when import would overwrite an existing save slot, and is the overwrite reversible?

**Status:** ⚠ Partial

**Answer:**
An `overwriteGuard` selector and an explicit confirmation route through
screen `60-confirmation-dialog` are specified for in-app `SAVE_GAME_SLOT`.
The warning exists for the slot-save path. **Reversibility** (undo,
trash/recycle, prior-version retention) is not specified. The "import →
overwrite" path is not separately defined.

**Evidence:**
- [docs/architecture/wiki/screens/55-save-load/spec.md:38](../architecture/wiki/screens/55-save-load/spec.md#L38)
- [docs/architecture/wiki/screens/55-save-load/interactions.md:17-19](../architecture/wiki/screens/55-save-load/interactions.md)
- Missing: undo-overwrite / retention policy

---

### Q: 372. Are imported saves quarantined to a sandboxed directory until the user confirms trust?

**Status:** ❌ UNKNOWN

**Answer:**
No quarantine staging directory or "pending import" zone is documented.
The `sandboxed` manifest flag exists for **packs**, not for imported
saves.

**Evidence:**
- [docs/architecture/pack-contract.md:55-61](../architecture/pack-contract.md#L55) — pack-level sandbox flag only
- No save-quarantine mention anywhere

---

### Q: 373. Are macOS quarantine attributes / Windows MOTW preserved or honored when reading user-supplied save files?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The project is "browser-first" per the README, so OS
quarantine attributes typically don't reach the page; however, no
desktop/Electron path or OS-attribute policy is documented.

**Evidence:**
- [README.md:3](../../README.md#L3) — "Browser-first turn-based strategy engine"
- No platform-attribute handling in `docs/architecture/`

---

### Q: 374. When a user installs a pack from outside the canonical registry, is an explicit trust prompt shown?

**Status:** ❌ UNKNOWN

**Answer:**
The contract layer encodes `signature`, `sandboxed`, and `capabilities` to
support a trust decision, but no **trust prompt UI**, screen package, or
copy is defined for first-time third-party pack installation.

**Evidence:**
- [content-schema/schemas/manifest.schema.json:68-78](../../content-schema/schemas/manifest.schema.json#L68)
- [docs/architecture/pack-contract.md:55-66](../architecture/pack-contract.md#L55)
- Missing: trust-prompt screen package

---

### Q: 375. Does the prompt distinguish "signed by known publisher", "signed by unknown publisher", and "unsigned"?

**Status:** ❌ UNKNOWN

**Answer:**
The manifest schema models a single `signature` object (`scheme: ed25519`,
`keyId`, `value`); there is no documented **publisher registry / known-key
list**, and no prompt distinguishing the three trust tiers exists.

**Evidence:**
- [content-schema/schemas/manifest.schema.json:68-78](../../content-schema/schemas/manifest.schema.json#L68)
- Missing: known-publisher registry, trust-tier prompt

---

### Q: 376. Are pack permissions enumerated to the user (writes saves? loads remote assets? overrides core rules?) before activation?

**Status:** ⚠ Partial

**Answer:**
The contract has the right primitive: `capabilities` is a closed enum
(`formulas.ast`, `spells.custom-kind`, `abilities.custom-kind`,
`assets.binary`, `scripts.none`) and "new capability strings require a
schema change". A UI surface that enumerates these to the user before
activation is **not** specified.

**Evidence:**
- [content-schema/schemas/manifest.schema.json:54-67](../../content-schema/schemas/manifest.schema.json#L54)
- [docs/architecture/pack-contract.md:63-66](../architecture/pack-contract.md#L63)
- Missing: capability-disclosure UI

---

### Q: 377. Is the prompt phrased to make the security implications clear to non-technical users, not just experts?

**Status:** ❌ UNKNOWN

**Answer:**
No prompt copy exists, so phrasing is undefined. Localization keys for a
trust prompt are absent from the localization schema and from screen
packages.

**Evidence:**
- [content-schema/schemas/localization.schema.json](../../content-schema/schemas/localization.schema.json)
- No `ui.pack-trust.*` keys defined

---

### Q: 378. Can the user revoke trust for a pack later, and does that immediately disable it across all save slots?

**Status:** ❌ UNKNOWN

**Answer:**
No trust-revocation flow is documented. There is no "trusted packs"
registry surface, no revocation command, and no propagation rule across
save slots.

**Evidence:**
- No trust-registry schema in `content-schema/schemas/`
- No revocation command in [docs/architecture/command-schema.md](../architecture/command-schema.md)

---

### Q: 379. Does activating an untrusted pack put the session into a clearly marked "modded" mode visible in the HUD?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The `sandboxed` flag prevents ranked/trusted flows
contractually, but no HUD badge, "Modded" indicator, or screen-spec
modification is documented in the UI screen packages.

**Evidence:**
- [docs/architecture/pack-contract.md:60-61](../architecture/pack-contract.md#L60)
- No "modded mode" indicator in any screen spec under [docs/architecture/wiki/screens/](../architecture/wiki/screens/)

---

### Q: 380. Are trusted/untrusted packs visually distinguished in the pack picker?

**Status:** ❌ UNKNOWN

**Answer:**
No pack-picker / pack-manager screen package exists. Screen-package
indices do not list a pack-management screen.

**Evidence:**
- [docs/architecture/wiki/screens/](../architecture/wiki/screens/) — no pack-picker package present
- Missing: pack manager / pack browser screen

---

### Q: 381. Is there a "panic" UI to disable all third-party packs and revert to canonical content?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No "safe mode" / "disable all mods" toggle exists in any
screen package or system-menu spec.

**Evidence:**
- [docs/architecture/wiki/screens/54-system-menu/](../architecture/wiki/screens/54-system-menu/) — no panic-mode action
- Missing: safe-mode/panic command

---

### Q: 382. Can a pack auto-enable other packs as dependencies, and does each transitive pack get its own trust prompt?

**Status:** ⚠ Partial

**Answer:**
The manifest models `dependencies: string[]` and the pack-contract assigns
"dependency resolution" to `src/content-runtime/`. Transitive resolution
is therefore part of the architectural scope. **Per-transitive-pack trust
prompting** is not specified.

**Evidence:**
- [content-schema/schemas/manifest.schema.json:50-53](../../content-schema/schemas/manifest.schema.json#L50)
- [docs/architecture/pack-contract.md:118-127](../architecture/pack-contract.md#L118)
- Missing: transitive-trust prompt rule

---

### Q: 383. Does the trust prompt persist the decision globally, per save, or per session?

**Status:** ❌ UNKNOWN

**Answer:**
No persistence scope is defined because no trust-prompt or trust-store is
defined. This is a policy decision still to be made.

**Evidence:**
- No trust-store schema or doc anywhere in `content-schema/` or `docs/`

---

### Q: 384. Are signature-verification failures shown as a hard error rather than a soft warning the user can click through?

**Status:** ❌ UNKNOWN

**Answer:**
No signature-verification UX is specified. The schema supports `signature`
with `ed25519` but neither the verification path nor failure presentation
is documented.

**Evidence:**
- [content-schema/schemas/manifest.schema.json:68-78](../../content-schema/schemas/manifest.schema.json#L68)
- Missing: signature-verification flow + UX rule

---

### Q: 385. Is there a per-pack content-safety rating displayed (violence, language, mature themes) before installation?

**Status:** ❌ UNKNOWN

**Answer:**
The manifest schema has no content-rating field
(`required: schemaVersion, id, type, name, version, author, engine,
dependencies, provides`; optional adds `engineHash, contentHash,
capabilities, signature, sandboxed`). No rating taxonomy or display
surface exists.

**Evidence:**
- [content-schema/schemas/manifest.schema.json:6-87](../../content-schema/schemas/manifest.schema.json)
- Missing: rating field, rating taxonomy, install-time disclosure UI

---

## 🔍 Summary

### Missing Logic
- **No external save-import surface.** Screen 55 is slot-only; no file
  picker, drag-and-drop, URL-import, or share-link path.
- **No `save.schema.json`.** Save format lives only in a Mermaid diagram,
  so "validate before hydrate" has no concrete validator artifact.
- **No pack-trust prompt UI.** Trust *fields* exist on the manifest
  (`signature`, `sandboxed`, `capabilities`) but no screen, copy, or
  command surfaces them at install time.
- **No pack-manager / pack-picker screen.** Cannot enumerate, distinguish
  trusted vs. untrusted, or revoke trust without one.
- **No "panic" / safe-mode UI.** No documented way to disable all
  third-party packs in one action.
- **No publisher / known-key registry**, so the "signed by known
  publisher" tier in question 375 has no backing.
- **No quarantine / staging directory** for imported saves; no MOTW or
  `com.apple.quarantine` policy (browser-first, but a desktop wrapper is
  not ruled out).
- **No size cap, decompression-ratio guard, or ZIP path-traversal rule**
  for `.hrmod` archives.
- **No trust-revocation command** or propagation policy.
- **No content-safety rating** field on the manifest schema.
- **No localization keys** for trust-prompt copy (`ui.pack-trust.*`).

### Risks
- **Zip-bomb / oversized save** on import: with no size cap or
  decompression-ratio cap, a malicious `.hrmod` or save could DoS the
  parser thread or exhaust memory.
- **Path traversal** during `.hrmod` extraction: no documented sanitizer
  for entries containing `..` or absolute paths.
- **Silent pack auto-install / auto-enable**: with no consent step,
  importing a save could pull arbitrary packs and capability-claims into
  the runtime.
- **Trust-tier ambiguity**: "signed", "unknown publisher", and "unsigned"
  collapse into a single `signature` object today — users cannot make an
  informed decision.
- **Hash-mismatch confusion**: a single "compatibility" status conflates
  benign version skew with active tampering, training users to click
  through warnings.
- **No revocation path**: a known-bad pack cannot be globally
  invalidated, and there is no kill-switch list.
- **No "modded" indicator**: replays/screenshots from sandboxed sessions
  are indistinguishable from canonical play, complicating support and
  competitive integrity.

### Improvements
1. Add `content-schema/schemas/save.schema.json` with `saveVersion`,
   `engineHash`, `packHashes` (per-pack `id` + `contentHash`),
   `commandLog`, `stateHash`, `metadata`, plus `min/maxSchemaVersion`.
2. Author a **save-import screen package** under
   `docs/architecture/wiki/screens/` covering: source disclosure
   (file/URL/share), schema-validate-before-mount, hash mismatch states
   (skew vs. tamper), and overwrite confirmation.
3. Author a **pack-manager + pack-trust-prompt screen package** covering:
   capability enumeration, signature tier (known / unknown / unsigned),
   per-transitive-pack consent, persistence scope (global vs. per-save
   vs. session), and revocation.
4. Add a **safe-mode / panic** command to `command-schema.md` with a
   matching system-menu entry and a HUD "Modded" badge for sandboxed
   sessions.
5. Add a **size cap + decompression-ratio guard** policy to
   `pack-contract.md` and a ZIP path-traversal sanitizer rule, both
   referenced from `content-runtime` task contracts.
6. Add a **publisher-registry** schema (known `keyId` → publisher name)
   and a **revocation-list** schema, both content-loadable so the trust
   tier in question 375 has a backing data source.
7. Add `ui.pack-trust.*` and `ui.save-import.*` localization keys; require
   non-expert phrasing in the localization style guide.
8. Add an optional `contentRating` object to `manifest.schema.json` with
   a closed taxonomy (violence, language, sexual, themes) and surface it
   on install.
9. Add explicit "reject newer schemaVersion" and "reject older without
   migration" rules in `save.schema.json` companion doc.
10. Document MOTW / `com.apple.quarantine` policy if/when a desktop
    wrapper enters scope; until then state explicitly that import is
    browser-only and document the Origin/COOP rules that apply.

### AI-Readiness
**Score: 2/10**

**Reason:** The contract primitives are healthy on the **back-end** side
(`signature`, `sandboxed`, closed `capabilities` enum, `packHashes`,
`stateHash`, `engineHash`), and the save/load lifecycle is sketched in
diagrams. But every **user-facing security decision point** in this
audit is undefined: no save-import flow, no pack-trust prompt, no
pack-manager, no panic UI, no quarantine, no decompression guards, no
publisher registry, no revocation, no content rating. An AI agent asked
to "implement save imports and pack trust" today would have to invent
roughly ten missing schemas / screen packages — far more invention than
the project's "data-driven, contract-first" rules permit. Until at least
the save-import screen package, pack-trust screen package, and
`save.schema.json` exist, this surface is not buildable autonomously.
