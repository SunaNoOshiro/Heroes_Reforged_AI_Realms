# Implementation Plan: 20 — Save Imports & Pack Trust Prompts

> Source audit: [docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md](../readiness-audit/20-save-imports-and-pack-trust-prompts.md)
> Audit AI-Readiness score at time of writing: **2 / 10** — target after this plan: **8 / 10**.
> Original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic and Risk item from Q361–Q385
> into concrete work items grounded in existing artifacts:
> [55-save-load](../architecture/wiki/screens/55-save-load/),
> [diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md),
> [diagrams/25-load-flow.md](../architecture/diagrams/25-load-flow.md),
> [pack-contract.md](../architecture/pack-contract.md),
> [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json),
> and the persistence task tree at
> [tasks/mvp/08-persistence/](../../tasks/mvp/08-persistence/).

---

## 1. Overview

The audit flagged that **every user-facing security decision point** for
save imports and pack trust is undefined. Of 25 questions, **15 are ❌
UNKNOWN** and **6 are ⚠ Partial**.

Back-end primitives are healthy:

- `signature`, `sandboxed`, closed `capabilities` enum on
  [manifest.schema.json](../../content-schema/schemas/manifest.schema.json).
- `packHashes`, `stateHash`, `engineHash` on the save record described
  in [diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md).
- A slot-only save/load screen
  [55-save-load](../architecture/wiki/screens/55-save-load/) with
  schema-version + content-hash awareness.

What is missing is **every UI/runtime surface that turns those
primitives into a user decision**, plus the safety-policy doc that
binds them to runtime constraints (size caps, decompression ratios,
ZIP traversal, quarantine, revocation).

This plan formalizes:

1. A **save-record schema** under
   [`content-schema/schemas/`](../../content-schema/schemas/) so
   "validate before hydrate" has a concrete validator.
2. A **save-import screen package** covering source disclosure,
   schema-validate-before-mount, pack-hash disclosure before fetch,
   skew-vs-tamper labelling, overwrite confirmation with retention,
   and quarantine staging.
3. A **pack-manager + pack-trust-prompt screen package** covering
   capability enumeration, signature tier, per-transitive consent,
   persistence scope, and revocation.
4. A **safe-mode / panic** command in
   [command-schema.md](../architecture/command-schema.md) with a
   matching [54-system-menu](../architecture/wiki/screens/54-system-menu/)
   entry and a HUD "Modded" badge.
5. A **safety-policy doc** ([pack-trust.md](../architecture/pack-trust.md))
   that owns size caps, decompression-ratio guards, ZIP path-traversal
   sanitizer rules, quarantine staging, MOTW posture, and signature
   verification UX.
6. **Publisher-registry** and **revocation-list** schemas so the
   "known publisher" trust tier (Q375) has a backing data source.
7. **Optional `contentRating`** addition to the manifest with a closed
   taxonomy and an install-time disclosure binding.
8. **Localization keys** under `ui.save-import.*` and
   `ui.pack-trust.*` with non-expert phrasing requirements.
9. New persistence tasks under
   [`tasks/mvp/08-persistence/`](../../tasks/mvp/08-persistence/) and
   new content-schema tasks under
   [`tasks/mvp/02-content-schemas/`](../../tasks/mvp/02-content-schemas/).

**Sibling plan boundaries.**

- **Plan 06** ([06-data-contracts-and-schema-plan.md](./06-data-contracts-and-schema-plan.md))
  owns the schema matrix and additive-evolution rules; this plan
  registers four new schemas with it but does not change those rules.
- **Plan 08** ([08-persistence-save-system-plan.md](./08-persistence-save-system-plan.md))
  owns the slot-based save/load loop. This plan adds the **import
  surface and the schema artifact** the loop validates against.
- **Plan 13** ([13-content-system-plan.md](./13-content-system-plan.md))
  owns pack loading, dependency resolution, and pack-runtime. This
  plan adds the **trust-prompt UI** and the **revocation gate** that
  pack-runtime must consult before mounting.
- **Plan 17** ([17-final-critical-questions-plan.md](./17-final-critical-questions-plan.md))
  owns the engine-hash binding policy. This plan reuses
  `engineHash` on the save schema; no policy change.
- **Plan 22** (privacy / retention) — when authored, will own retention
  TTLs for the trust-store and quarantine staging. This plan declares
  the **shapes** and the **default scope (per-installation, no
  network telemetry)** so Plan 22 can inherit cleanly.
- **Plan 24** (TLS / authenticated peers) — when authored, will own
  the trust-anchor for `keyId` issuance. This plan declares the
  **publisher-registry shape** so Plan 24 can populate it.

**In scope:**

- One new schema:
  [`content-schema/schemas/save.schema.json`](../../content-schema/schemas/save.schema.json).
- One new schema:
  [`content-schema/schemas/publisher-registry.schema.json`](../../content-schema/schemas/publisher-registry.schema.json).
- One new schema:
  [`content-schema/schemas/pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json).
- One new schema:
  [`content-schema/schemas/trust-store.schema.json`](../../content-schema/schemas/trust-store.schema.json).
- Manifest extension: optional `contentRating` on
  [manifest.schema.json](../../content-schema/schemas/manifest.schema.json).
- New architecture doc:
  [`docs/architecture/pack-trust.md`](../architecture/pack-trust.md)
  (single source of truth for caps, traversal, quarantine, revocation,
  signature UX, modded HUD).
- New screen package:
  [`docs/architecture/wiki/screens/66-save-import/`](../architecture/wiki/screens/66-save-import/).
- New screen package:
  [`docs/architecture/wiki/screens/67-pack-manager/`](../architecture/wiki/screens/67-pack-manager/).
- New screen package:
  [`docs/architecture/wiki/screens/68-pack-trust-prompt/`](../architecture/wiki/screens/68-pack-trust-prompt/).
- Edits to
  [55-save-load/spec.md](../architecture/wiki/screens/55-save-load/spec.md)
  to expose an "Import…" affordance routing to screen 66.
- Edits to
  [54-system-menu/](../architecture/wiki/screens/54-system-menu/)
  to add a "Safe mode (disable all packs)" entry.
- Edits to
  [19-status-bar/](../architecture/wiki/screens/19-status-bar/) to
  add a "Modded" badge binding.
- Edits to
  [pack-contract.md](../architecture/pack-contract.md) to add the
  size cap, decompression-ratio guard, and traversal rule, all
  cross-linked from `pack-trust.md`.
- Edits to
  [command-schema.md](../architecture/command-schema.md) to register
  six new commands (see § 4).
- Edits to
  [schema-matrix.md](../architecture/schema-matrix.md) and
  [content-schema/README.md](../../content-schema/README.md) to list
  the four new schemas.
- Edits to
  [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json)
  to register screens 66, 67, 68 under "System & Dialogs".
- Edits to
  [tasks/mvp/08-persistence/05-export-import-json.md](../../tasks/mvp/08-persistence/05-export-import-json.md)
  to bind the import path to screen 66 and the new save schema.
- Edits to
  [tasks/mvp/02-content-schemas/](../../tasks/mvp/02-content-schemas/)
  index plus three new schema-task files.
- Three new task files under
  [`tasks/mvp/08-persistence/`](../../tasks/mvp/08-persistence/):
  06 (save schema + validator), 07 (save-import screen + quarantine),
  08 (pack-trust prompt + manager + safe mode).

**Explicitly out of scope (deferred / owned elsewhere):**

- Server-hosted publisher CA or pack registry (none exists; this plan
  models the **client-local** registry only — Plan 24 may upgrade it).
- AI-classifier-based content rating (manifest field is **author-asserted**;
  the runtime does not infer rating).
- Desktop wrapper / Electron MOTW handling — explicitly stated as
  "browser-only at v1" in the safety doc; revisit when a desktop
  packaging task lands.
- In-game pack hot-swap — packs mount only at session start; the
  trust prompt fires only at import or at first activation.

---

## 2. Critical Fixes (Must Do First)

These six items unblock safe save import and pack trust. They are
gating because they materially change the threat surface (parser DoS,
silent pack execution, untrusted side-effects) the moment any
non-internal user touches the import flow.

---

### Issue: No `save.schema.json` artifact backing "validate before hydrate"

**Source:** Q363 (⚠), Q369 (⚠), Q370 (⚠); Missing-Logic bullet 2;
Improvements bullets 1, 9.

**Problem:**
The save record is described only in
[diagrams/24-save-flow.md:29-48](../architecture/diagrams/24-save-flow.md)
and asserted in
[55-save-load/data-contracts.md:66](../architecture/wiki/screens/55-save-load/data-contracts.md#L66)
("Loading validates schema version, content hashes, pack
compatibility, ruleset version, and migration availability before
hydrating state"). There is no concrete schema file in
[`content-schema/schemas/`](../../content-schema/schemas/) and the
"reject newer schemaVersion" / "reject older without migration" rules
are not codified.

**Impact:**
- "Validate before hydrate" has no validator artifact — every
  consumer reinvents shape checks.
- Forward-version (newer save on older runtime) and back-version
  (older save on newer runtime) policies live as prose, not enforced
  bounds.
- AI agents implementing the import path have nothing to compile
  against.

**Solution:**
Author
[`content-schema/schemas/save.schema.json`](../../content-schema/schemas/save.schema.json)
that mirrors the existing
[`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
shape and the diagram fields, with explicit version-bound rules.

```jsonc
{
  "$id": "https://heroes-reforged/save.schema.json",
  "type": "object",
  "required": [
    "saveVersion", "engineHash", "rulesetId", "seed",
    "packHashes", "commandLog", "stateHash", "metadata"
  ],
  "additionalProperties": false,
  "properties": {
    "saveVersion": { "type": "integer", "minimum": 1 },
    "minRuntimeSaveVersion": { "type": "integer", "minimum": 1 },
    "maxRuntimeSaveVersion": { "type": "integer", "minimum": 1 },
    "engineHash":  { "type": "string", "pattern": "^[a-f0-9]{16}$" },
    "rulesetId":   { "type": "string" },
    "seed":        { "type": "string", "pattern": "^[0-9]+$" },
    "packHashes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "version", "contentHash"],
        "additionalProperties": false,
        "properties": {
          "id":          { "type": "string" },
          "version":     { "type": "string" },
          "contentHash": { "type": "string", "pattern": "^[a-f0-9]{16}$" },
          "required":    { "type": "boolean", "default": true }
        }
      }
    },
    "commandLog": { "type": "array", "items": { "type": "object" } },
    "stateHash":  { "type": "string", "pattern": "^[a-f0-9]{16}$" },
    "metadata": {
      "type": "object",
      "required": ["name", "savedAt", "turnNumber"],
      "additionalProperties": true,
      "properties": {
        "name":       { "type": "string", "maxLength": 120 },
        "savedAt":    { "type": "integer", "minimum": 0 },
        "turnNumber": { "type": "integer", "minimum": 0 },
        "thumbnail":  { "type": "string", "pattern": "^data:image/(png|webp);base64," }
      }
    }
  }
}
```

Companion rules (codified in `pack-trust.md` § "Save Version Bounds"):

- **Reject newer:** if `saveVersion > runtimeMaxSaveVersion`, importer
  refuses load with `ui.save-import.reject.too-new`. No "click
  through" path.
- **Reject older without migration:** if `saveVersion <
  runtimeMinSaveVersion` AND no entry in the migration registry
  reaches `runtimeMaxSaveVersion` from `saveVersion`, refuse load
  with `ui.save-import.reject.no-migration`.
- **Skew vs tamper distinction:**
  - `packHashes` mismatch on a `required: true` pack →
    `compatibility=skew`, copy `ui.save-import.warn.pack-skew`.
  - `stateHash` mismatch after replay → `compatibility=tamper`,
    copy `ui.save-import.error.tamper`. **Hard error**, no continue.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)
  — add `save.schema.json` row.
- [content-schema/README.md](../../content-schema/README.md) —
  list the new schema.
- [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md)
  — link to schema, note `minRuntimeSaveVersion` /
  `maxRuntimeSaveVersion` semantics.
- [docs/architecture/diagrams/25-load-flow.md](../architecture/diagrams/25-load-flow.md)
  — split current single "Valid format?" branch into "Schema valid?"
  → "Schema version in range?" → "Migration available?".
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../architecture/wiki/screens/55-save-load/data-contracts.md)
  — bind `selectors.persistence.selectedSaveCompatibility` to the
  `compatibility = ok | skew | tamper | unsupported` enum.
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — add `Read First` link to the new schema; add acceptance line
  "save round-trips through `save.schema.json` validator without
  loss".

**New Files (if needed):**
- [content-schema/schemas/save.schema.json](../../content-schema/schemas/save.schema.json).
- [content-schema/examples/save/canonical.json](../../content-schema/examples/save/canonical.json)
  — minimal valid save.
- [content-schema/examples/save/too-new-rejected.json](../../content-schema/examples/save/too-new-rejected.json)
  — `saveVersion` above runtime max.
- [content-schema/examples/save/no-migration-rejected.json](../../content-schema/examples/save/no-migration-rejected.json)
  — `saveVersion` below runtime min, no migration.
- [content-schema/examples/save/pack-skew.json](../../content-schema/examples/save/pack-skew.json)
  — `packHashes[i].contentHash` differs from runtime.

**Implementation Steps:**
1. Author the schema and four examples.
2. Wire schema into `npm run validate` (cross-ref + canonical-example
   linter).
3. Add a Zod validator counterpart under
   [`src/content-schema/`](../../src/content-schema/) (extends the
   pattern of [`tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md`](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md);
   actual code lives under that task's owned paths).
4. Update [25-load-flow.md](../architecture/diagrams/25-load-flow.md)
   diagram to call out the three failure terminals (`too-new`,
   `no-migration`, `tamper`).

**Dependencies:**
- mvp.02-content-schemas.10-zod-validators-for-all-schemas (validator
  hook).
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash (`stateHash`
  source).

**Complexity:** M

---

### Issue: No save-import surface (file picker, URL, share link)

**Source:** Q361 (❌), Q362 (❌), Q364 (❌), Q365 (❌), Q366 (⚠),
Q371 (⚠); Missing-Logic bullet 1; Improvements bullet 2.

**Problem:**
[55-save-load](../architecture/wiki/screens/55-save-load/) only
browses internal slots
(`selectors.persistence.saveSlotManifests`). The interactions list is
slot-only: `SELECT_SAVE_SLOT`, `SAVE_GAME_SLOT`, `LOAD_GAME_SLOT`,
`REQUEST_DELETE_SAVE_SLOT`, `CLOSE_SAVE_LOAD`. There is no surface for
file/URL/share-link import, no source disclosure, no pack-hash
disclosure, no pack-trust warning, and no overwrite-with-retention
flow.

The persistence task
[tasks/mvp/08-persistence/05-export-import-json.md](../../tasks/mvp/08-persistence/05-export-import-json.md)
declares an `importSave(file: File)` API but binds to no screen
package and surfaces no pre-parse decisions.

**Impact:**
- Save import either (a) silently parses + mounts referenced packs
  (Q365 risk) or (b) is added ad-hoc by whoever lands the
  `importSave` UI, breaking the "screen package first" rule from
  [CLAUDE.md](../../CLAUDE.md) "UI evolution policy".
- Pack-hash disclosure (Q364) cannot happen because there is no
  surface.
- Skew-vs-tamper distinction (Q366) cannot be displayed.
- Q371 (overwrite warning + reversibility) has no UI.

**Solution:**
Author a new screen package
[`docs/architecture/wiki/screens/66-save-import/`](../architecture/wiki/screens/66-save-import/)
with the canonical five files. Behaviour summary:

- **Step 1 — Source disclosure (Q361):**
  - Tabs: `Local file`, `URL`, `Share link / paste`.
  - Active tab shows the literal source string before parsing
    (`save.example.com/...` or filename + size). No automatic parse.
  - Single primary action `IMPORT_SAVE_BEGIN`.
- **Step 2 — Schema validate (Q363, Q369, Q370):**
  - Validate `save.schema.json` BEFORE any pack mount, asset fetch,
    or IndexedDB write. State machine:
    `validating → schema_ok | schema_too_new | schema_no_migration | schema_invalid`.
- **Step 3 — Quarantine staging (Q372):**
  - On `schema_ok`, place the parsed object in a quarantine area
    (`state.persistence.import.staging`); **no slot write**, **no
    pack fetch** until user confirms.
- **Step 4 — Pack disclosure (Q364, Q365):**
  - Render the `packHashes[]` table: `id`, `version`,
    `contentHash`, `installed | missing | mismatched`.
  - For each `missing`, show explicit consent rows: `[ ] Install
    "Pack X v1.2 (hash …)"` — default unchecked.
  - Show one row per **transitive** dependency (Q382) once the
    manifest dependency tree is resolved (preview only — actual
    install gated on per-pack consent).
- **Step 5 — Trust review (Q362):**
  - Inline banner: "This save references X packs. Untrusted packs
    can run code, load assets, and override rules." Localization:
    `ui.save-import.warn.untrusted-packs`.
  - "Review pack trust" button routes to screen 68 (pack-trust
    prompt) for any `installed: false` or `untrusted: true` pack
    before proceeding.
- **Step 6 — Compatibility seal (Q366):**
  - Three labelled states with distinct copy and color:
    - `compatibility=ok` → green seal, `ui.save-import.seal.ok`.
    - `compatibility=skew` → amber seal,
      `ui.save-import.seal.version-skew` ("Save references a
      different version of pack X. May replay differently.").
    - `compatibility=tamper` → red seal,
      `ui.save-import.seal.tamper-detected` ("Save state hash does
      not match replay. File is corrupted or tampered."). Hard
      error — no `Load anyway` button.
- **Step 7 — Overwrite + retention (Q371):**
  - If the user picks an existing slot, route through screen
    [60-confirmation-dialog](../architecture/wiki/screens/60-confirmation-dialog/)
    with `ui.save-import.confirm.overwrite`.
  - On overwrite, the previous slot contents are **moved** to a
    rolling "trash" ring (selector
    `selectors.persistence.recycle.savedSlots`) capped at 3 entries
    per slot for 7 days, then evicted. New command
    `RESTORE_OVERWRITTEN_SAVE` listed in `command-schema.md`.

Quarantine policy (also lives in `pack-trust.md` § "Save
Quarantine"):

- Staging area is an in-memory object only (no IndexedDB write).
- Cleared on `CLOSE_SAVE_LOAD`, on tab unload, and on import
  completion.
- A staged save cannot be loaded into the engine until pack consent
  + trust review complete.

**Files to Update:**
- [docs/architecture/wiki/screens/55-save-load/spec.md](../architecture/wiki/screens/55-save-load/spec.md)
  — add an `Import…` button binding that dispatches
  `OPEN_SAVE_IMPORT` and routes to screen 66.
- [docs/architecture/wiki/screens/55-save-load/interactions.md](../architecture/wiki/screens/55-save-load/interactions.md)
  — add `OPEN_SAVE_IMPORT` and `RESTORE_OVERWRITTEN_SAVE`.
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../architecture/wiki/screens/55-save-load/data-contracts.md)
  — add `selectors.persistence.recycle.savedSlots` and
  `selectors.persistence.import.staging`.
- [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json)
  — add `66-save-import` under `system-dialogs` (or a new
  `system-import` group, see § 3 UI/Screens decision).
- [docs/architecture/command-schema.md](../architecture/command-schema.md)
  — add `OPEN_SAVE_IMPORT`, `IMPORT_SAVE_BEGIN`, `IMPORT_SAVE_CONFIRM`,
  `IMPORT_SAVE_CANCEL`, `RESTORE_OVERWRITTEN_SAVE`.
- [tasks/mvp/08-persistence/05-export-import-json.md](../../tasks/mvp/08-persistence/05-export-import-json.md)
  — add `Read First` to screen 66; rewrite acceptance to require
  routing through screen 66 instead of a one-shot file dialog;
  reference `save.schema.json` for validation.

**New Files (if needed):**
- [docs/architecture/wiki/screens/66-save-import/mockup.html](../architecture/wiki/screens/66-save-import/mockup.html).
- [docs/architecture/wiki/screens/66-save-import/spec.md](../architecture/wiki/screens/66-save-import/spec.md).
- [docs/architecture/wiki/screens/66-save-import/interactions.md](../architecture/wiki/screens/66-save-import/interactions.md).
- [docs/architecture/wiki/screens/66-save-import/data-contracts.md](../architecture/wiki/screens/66-save-import/data-contracts.md).
- [docs/architecture/wiki/screens/66-save-import/architecture.md](../architecture/wiki/screens/66-save-import/architecture.md).

**Implementation Steps:**
1. Author the five screen-package files. Use
   [55-save-load](../architecture/wiki/screens/55-save-load/) as the
   shape template.
2. Bind every selector and command to the new save schema and to
   the `pack-trust.md` policy doc.
3. Update screen index, regenerate the wiki via
   `npm run generate:wiki`.
4. Edit the persistence task to depend on screen 66 and the new
   save schema.
5. Add localization keys (see localization issue below).

**Dependencies:**
- `save.schema.json` (above) — drives validation states.
- `pack-trust.md` (below) — drives the warning banner copy and
  the size-cap policy referenced from screen 66.

**Complexity:** L

---

### Issue: No pack-trust prompt UI

**Source:** Q374 (❌), Q375 (❌), Q376 (⚠), Q377 (❌), Q382 (⚠),
Q384 (❌); Missing-Logic bullet 3; Improvements bullets 3, 6.

**Problem:**
[manifest.schema.json:54-78](../../content-schema/schemas/manifest.schema.json#L54)
has `signature`, `sandboxed`, `capabilities` — the right back-end
primitives. Yet no screen package, no copy, and no command surfaces
them. Three trust tiers (signed-known, signed-unknown, unsigned)
collapse to a single object today. Per-transitive-pack consent
(Q382) is unspecified. Signature-verification failure presentation
(Q384) is undefined.

**Impact:**
- Importing a save (or installing a pack from a URL/file) silently
  pulls capability claims (`assets.binary`, `formulas.ast`,
  `spells.custom-kind`) into the runtime.
- Users cannot distinguish a forged pack from a benign third-party
  one.
- A signature failure trivially becomes a click-through warning
  unless the screen contract makes it terminal.

**Solution:**
Author screen
[`docs/architecture/wiki/screens/68-pack-trust-prompt/`](../architecture/wiki/screens/68-pack-trust-prompt/)
with the canonical five files. Behaviour:

- **Header — pack identity:**
  - `pack.name`, `pack.version`, `pack.author`, `pack.id`,
    truncated `contentHash`.
- **Trust tier ribbon (Q375):**
  Computed from `signature` + publisher registry (next issue):
  - `tier=signed-known` → green ribbon,
    `ui.pack-trust.tier.signed-known` ("Signed by known publisher:
    {publisherName}").
  - `tier=signed-unknown` → amber ribbon,
    `ui.pack-trust.tier.signed-unknown` ("Signed by unknown
    publisher. Key ID: {keyId}").
  - `tier=unsigned` → red ribbon, `ui.pack-trust.tier.unsigned`
    ("This pack is not signed. Anyone could have created it.").
  - `tier=signature-failed` → black ribbon, **terminal** (no install
    button), `ui.pack-trust.tier.signature-failed` (Q384).
- **Capability disclosure (Q376):**
  Render `capabilities[]` as a labelled list; each capability has a
  fixed user-facing description from
  `ui.pack-trust.capability.<name>`:
  - `formulas.ast` → "Can change game formulas (damage, growth,
    economy)."
  - `spells.custom-kind` → "Can add new spell kinds."
  - `abilities.custom-kind` → "Can add new ability kinds."
  - `assets.binary` → "Loads custom images/sounds."
  - `scripts.none` → (rendered as a positive: "No code execution.").
- **Phrasing (Q377):**
  All copy is reviewed against a non-expert phrasing guide added to
  the localization style guide (no "AST", no "ed25519", no
  "sandboxed"; use plain analogues).
- **Trust-decision controls:**
  - Two primary actions: `Trust this pack` /
    `Run sandboxed (limited)`.
  - Secondary action: `Cancel`.
  - Persistence-scope picker (Q383): radio with
    `Just this session` (default), `For this save`,
    `Always (until I revoke)`.
- **Transitive consent (Q382):**
  When the trust prompt is opened in batch mode (driven by save
  import or by the pack manager), each dependency renders as its
  own collapsible row. The "Trust" decision must be **per pack** —
  no `Trust all` button.

Bind selectors:

- `selectors.packs.pendingTrustDecisions: PackTrustRequest[]`
- `selectors.packs.trustStore: TrustStoreEntry[]`

**Files to Update:**
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md)
  — add a § "Trust UX" with a one-line link to screen 68 and to
  `pack-trust.md`.
- [docs/architecture/command-schema.md](../architecture/command-schema.md)
  — add `OPEN_PACK_TRUST_PROMPT`, `GRANT_PACK_TRUST`,
  `DENY_PACK_TRUST`, `RUN_PACK_SANDBOXED`.
- [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json)
  — register `68-pack-trust-prompt`.

**New Files (if needed):**
- [docs/architecture/wiki/screens/68-pack-trust-prompt/mockup.html](../architecture/wiki/screens/68-pack-trust-prompt/mockup.html).
- [docs/architecture/wiki/screens/68-pack-trust-prompt/spec.md](../architecture/wiki/screens/68-pack-trust-prompt/spec.md).
- [docs/architecture/wiki/screens/68-pack-trust-prompt/interactions.md](../architecture/wiki/screens/68-pack-trust-prompt/interactions.md).
- [docs/architecture/wiki/screens/68-pack-trust-prompt/data-contracts.md](../architecture/wiki/screens/68-pack-trust-prompt/data-contracts.md).
- [docs/architecture/wiki/screens/68-pack-trust-prompt/architecture.md](../architecture/wiki/screens/68-pack-trust-prompt/architecture.md).

**Implementation Steps:**
1. Author the five screen-package files.
2. Define the `TrustStoreEntry` shape inside
   `trust-store.schema.json` (see schema issue below).
3. Wire the trust-decision flow: install path consults trust store;
   if no entry → enqueue a `PackTrustRequest` and open screen 68.
4. Add localization keys.
5. Add screen-snapshot tests for the four ribbon tiers.

**Dependencies:**
- `publisher-registry.schema.json` (drives `tier=signed-known`).
- `trust-store.schema.json` (persists user decisions).
- `pack-trust.md` (signature-verification flow it references).

**Complexity:** L

---

### Issue: No size cap, decompression-ratio guard, or ZIP path-traversal rule

**Source:** Q367 (❌), Q368 (❌); Risks bullets "Zip-bomb" and
"Path traversal"; Improvements bullet 5.

**Problem:**
Saves are gzip-compressed JSON ("typically 50–200 KB compressed";
[diagrams/24-save-flow.md:50](../architecture/diagrams/24-save-flow.md#L50))
and packs are `.hrmod` ZIPs
([pack-contract.md:106](../architecture/pack-contract.md#L106)). No
size cap, decompression-ratio cap, or path-traversal sanitizer is
documented anywhere.

**Impact:**
- A 50 KB gzip can decompress to >1 GB JSON → tab freeze, OOM.
- A `.hrmod` entry named `../../etc/passwd` or `C:\foo` may write
  outside the pack directory once a desktop wrapper exists; even in
  the browser, virtual FS layers can be confused.
- "Validate before hydrate" is meaningless if the validate step itself
  exhausts memory.

**Solution:**
Codify in
[`docs/architecture/pack-trust.md`](../architecture/pack-trust.md)
§ "Resource Limits":

- **Save file size cap (compressed):** 4 MiB. Above this, the
  importer refuses **before** decompression with
  `ui.save-import.reject.too-large`.
- **Save decompression ratio cap:** 1 : 200. Decompression streams
  through a counter; if `bytesOut / bytesIn > 200`, abort with
  `ui.save-import.reject.bomb`.
- **Save decompressed size cap:** 64 MiB. Hard ceiling regardless of
  ratio.
- **Pack ZIP size cap:** 256 MiB compressed.
- **Pack ZIP decompression ratio cap:** 1 : 50.
- **Pack ZIP decompressed size cap:** 2 GiB (per pack).
- **Pack ZIP entry-count cap:** 50,000.
- **ZIP path-traversal sanitizer:** every entry path is normalized
  (`POSIX`, no leading `/`, no `..` segments, no NUL, no
  Windows drive prefixes); reject the whole pack on first violation
  with `ui.pack-trust.error.unsafe-entry`. The rule is mirrored in
  [pack-contract.md](../architecture/pack-contract.md) so the
  pack loader and trust UI agree.
- **Streaming budget:** importer must abort if total wall time
  exceeds 5 s on a 4 MiB save (covers parser-DoS attempts that fit
  inside the size cap).

**Files to Update:**
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md)
  — add § "Resource Limits" with the seven caps and the path-traversal
  rule; cross-link to `pack-trust.md`.
- [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md)
  — add a "size check → ratio check → schema validate" pre-step.
- [docs/architecture/diagrams/25-load-flow.md](../architecture/diagrams/25-load-flow.md)
  — same pre-steps before "Read save".
- [tasks/mvp/08-persistence/05-export-import-json.md](../../tasks/mvp/08-persistence/05-export-import-json.md)
  — acceptance: "imports rejected before decompression when over
  4 MiB", "imports aborted on >200x ratio".
- [tasks/phase-3/02-ai-generation/](../../tasks/phase-3/02-ai-generation/)
  pack-loader task (if present) — add traversal sanitizer acceptance.

**New Files (if needed):**
- [docs/architecture/pack-trust.md](../architecture/pack-trust.md)
  (created by the trust-prompt issue above).

**Implementation Steps:**
1. Author the § "Resource Limits" section.
2. Add a constants table referenced by both `import-save` and
   `pack-loader` tasks.
3. Add unit tests in the persistence task for the three save caps;
   in the pack-loader task for the four pack caps + traversal.
4. Update the 24/25 diagrams.

**Dependencies:**
- None upstream of this plan.

**Complexity:** S

---

### Issue: No publisher-registry, no revocation list, no trust store

**Source:** Q375 (❌), Q378 (❌), Q383 (❌), Q384 (❌); Missing-Logic
bullets 6, 9; Improvements bullet 6.

**Problem:**
The "signed by known publisher" tier (Q375) requires a known-key
list. Trust revocation (Q378) requires a revocation list and a
propagation rule. Trust-decision persistence scope (Q383) requires
a trust store. None of these schemas exist.

**Impact:**
- Q375's three-tier prompt has no backing data → the screen ships
  with only two tiers (signed/unsigned), defeating the audit fix.
- A known-bad pack cannot be globally invalidated; an old save that
  references it loads silently.
- "Always trust" decisions in screen 68 have nowhere to persist.

**Solution:**
Author three companion schemas plus a single architecture section
in `pack-trust.md` § "Trust Anchors".

**A. Publisher registry**
[`content-schema/schemas/publisher-registry.schema.json`](../../content-schema/schemas/publisher-registry.schema.json):

```jsonc
{
  "$id": "https://heroes-reforged/publisher-registry.schema.json",
  "type": "object",
  "required": ["registryVersion", "publishers"],
  "additionalProperties": false,
  "properties": {
    "registryVersion": { "const": 1 },
    "publishers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["keyId", "name", "scheme", "publicKey"],
        "additionalProperties": false,
        "properties": {
          "keyId":     { "type": "string", "pattern": "^[a-z0-9-]{4,64}$" },
          "name":      { "type": "string", "maxLength": 80 },
          "scheme":    { "const": "ed25519" },
          "publicKey": { "type": "string", "pattern": "^[A-Za-z0-9+/=]{40,128}$" },
          "addedAt":   { "type": "integer", "minimum": 0 }
        }
      }
    }
  }
}
```

- Shipped as a content artifact under `resources/registries/` (path
  declared by Plan 13). The registry is **not** fetched at runtime.
- Adding a publisher requires a content-pack PR to the canonical
  registry; the file is not edited from the UI in v1.

**B. Pack revocation list**
[`content-schema/schemas/pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json):

```jsonc
{
  "$id": "https://heroes-reforged/pack-revocation-list.schema.json",
  "type": "object",
  "required": ["listVersion", "revoked"],
  "additionalProperties": false,
  "properties": {
    "listVersion": { "type": "integer", "minimum": 1 },
    "revoked": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["packId", "contentHash", "reason"],
        "additionalProperties": false,
        "properties": {
          "packId":      { "type": "string" },
          "contentHash": { "type": "string", "pattern": "^[a-f0-9]{16}$" },
          "reason":      { "enum": ["malware", "tampered", "deprecated", "user-revoked"] },
          "revokedAt":   { "type": "integer", "minimum": 0 }
        }
      }
    }
  }
}
```

- Shipped alongside the publisher registry.
- A revoked entry blocks `GRANT_PACK_TRUST` and forces sandboxed
  mode at most; if `reason in [malware, tampered]`, mounting is
  refused entirely with `ui.pack-trust.error.revoked`.

**C. User trust store**
[`content-schema/schemas/trust-store.schema.json`](../../content-schema/schemas/trust-store.schema.json):

```jsonc
{
  "$id": "https://heroes-reforged/trust-store.schema.json",
  "type": "object",
  "required": ["storeVersion", "entries"],
  "additionalProperties": false,
  "properties": {
    "storeVersion": { "const": 1 },
    "entries": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["packId", "contentHash", "decision", "scope", "decidedAt"],
        "additionalProperties": false,
        "properties": {
          "packId":      { "type": "string" },
          "contentHash": { "type": "string", "pattern": "^[a-f0-9]{16}$" },
          "decision":    { "enum": ["trust", "sandboxed", "deny"] },
          "scope":       { "enum": ["session", "save", "global"] },
          "saveId":      { "type": "string" },
          "decidedAt":   { "type": "integer", "minimum": 0 }
        }
      }
    }
  }
}
```

- Persisted in IndexedDB under a dedicated object store (not in any
  save record). Cleared by safe-mode or by the explicit
  `REVOKE_PACK_TRUST` command.
- Lookups key on `packId + contentHash`: a trust decision does **not**
  carry across pack-content updates (changing a pack re-prompts).
- Propagation across saves: revoking trust globally
  (`scope=global`, `decision=deny` or revocation) means existing
  saves that reference that pack can no longer load until the user
  re-trusts (or chooses sandboxed).

`pack-trust.md` § "Trust Anchors" describes the lookup precedence:
**revocation list (deny) > trust store (deny) > publisher registry
(known) > trust store (allow) > prompt user**.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)
  — add three rows.
- [content-schema/README.md](../../content-schema/README.md) —
  list three new schemas.
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md)
  — add a one-paragraph § "Trust Anchors" pointing at the three
  schemas.
- [docs/architecture/command-schema.md](../architecture/command-schema.md)
  — add `REVOKE_PACK_TRUST`, `OPEN_PACK_MANAGER`,
  `ENTER_SAFE_MODE`, `EXIT_SAFE_MODE`.

**New Files (if needed):**
- [content-schema/schemas/publisher-registry.schema.json](../../content-schema/schemas/publisher-registry.schema.json).
- [content-schema/schemas/pack-revocation-list.schema.json](../../content-schema/schemas/pack-revocation-list.schema.json).
- [content-schema/schemas/trust-store.schema.json](../../content-schema/schemas/trust-store.schema.json).
- [content-schema/examples/publisher-registry/canonical.json](../../content-schema/examples/publisher-registry/canonical.json)
  — empty `publishers: []` plus one fixture entry.
- [content-schema/examples/pack-revocation-list/canonical.json](../../content-schema/examples/pack-revocation-list/canonical.json)
  — empty `revoked: []`.
- [content-schema/examples/trust-store/canonical.json](../../content-schema/examples/trust-store/canonical.json)
  — empty `entries: []`.

**Implementation Steps:**
1. Author the three schemas + canonical examples.
2. Wire into `npm run validate` and `schema-matrix.md`.
3. Author `pack-trust.md` § "Trust Anchors" with the lookup
   precedence table.
4. Add a Zod validator for each (under task
   [`mvp.02-content-schemas.10-zod-validators-for-all-schemas`](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md)).

**Dependencies:**
- None upstream; schemas are leaves.

**Complexity:** M

---

### Issue: No safe-mode / panic UI; no "modded" HUD indicator

**Source:** Q379 (❌), Q381 (❌); Missing-Logic bullets 4, 7;
Improvements bullet 4.

**Problem:**
[pack-contract.md:60-61](../architecture/pack-contract.md#L60)
states that `sandboxed: true` packs cannot enter ranked/trusted
flows, but no HUD indicator is documented. No "disable all packs"
toggle exists in any screen.

**Impact:**
- Replays/screenshots of sandboxed sessions are visually
  indistinguishable from canonical play, complicating support and
  competitive integrity.
- A user with a misbehaving pack has no recourse short of clearing
  IndexedDB.

**Solution:**

**A. Safe mode**
- New command `ENTER_SAFE_MODE` in
  [command-schema.md](../architecture/command-schema.md).
  Effects:
  - Sets `state.session.safeMode = true`.
  - All non-canonical packs unmount on the next session start.
  - Trust store is **not cleared** (so the user keeps prior choices)
    but is **bypassed** while safe mode is on.
  - Save loads in safe mode that require non-canonical packs are
    blocked at the import step with
    `ui.save-import.reject.safe-mode-blocks-pack`.
- New entry in
  [54-system-menu](../architecture/wiki/screens/54-system-menu/)
  spec: "Safe mode (disable all packs)" → routes through
  [60-confirmation-dialog](../architecture/wiki/screens/60-confirmation-dialog/)
  with copy `ui.system-menu.confirm.safe-mode`.
- `EXIT_SAFE_MODE` re-arms packs at next session start.

**B. Modded indicator**
- Selector `selectors.session.moddedIndicator: "off" | "trusted" |
  "sandboxed" | "mixed"`:
  - `off` — only canonical packs mounted.
  - `trusted` — third-party packs mounted, all `decision=trust`.
  - `sandboxed` — at least one pack mounted with
    `decision=sandboxed`.
  - `mixed` — at least one trusted **and** at least one sandboxed.
- Bind in
  [19-status-bar/spec.md](../architecture/wiki/screens/19-status-bar/spec.md)
  as a small badge with localization keys
  `ui.status-bar.modded.<state>` and a tooltip listing pack IDs.
- The badge is **always visible** when not `off` — there is no
  dismiss control. Replays inherit the badge from the save's
  `packHashes` (signal is `mixed`/`sandboxed` if any non-canonical
  pack is referenced).

**Files to Update:**
- [docs/architecture/wiki/screens/54-system-menu/spec.md](../architecture/wiki/screens/54-system-menu/spec.md),
  [interactions.md](../architecture/wiki/screens/54-system-menu/interactions.md),
  [data-contracts.md](../architecture/wiki/screens/54-system-menu/data-contracts.md)
  — add Safe-mode menu item.
- [docs/architecture/wiki/screens/19-status-bar/spec.md](../architecture/wiki/screens/19-status-bar/spec.md),
  [interactions.md](../architecture/wiki/screens/19-status-bar/interactions.md),
  [data-contracts.md](../architecture/wiki/screens/19-status-bar/data-contracts.md)
  — add Modded badge.
- [docs/architecture/command-schema.md](../architecture/command-schema.md)
  — register `ENTER_SAFE_MODE`, `EXIT_SAFE_MODE`.
- [docs/architecture/pack-trust.md](../architecture/pack-trust.md)
  § "Safe Mode" — author the policy.
- [content-schema/schemas/localization.schema.json](../../content-schema/schemas/localization.schema.json)
  — no schema change needed (localization is keyed); the new keys
  go in the locale data files only.

**New Files (if needed):**
- None (all extensions to existing screens + docs).

**Implementation Steps:**
1. Author `pack-trust.md` § "Safe Mode" and § "Modded Indicator".
2. Edit the two screen packages.
3. Add the two commands.
4. Add localization keys to the canonical locale.
5. Add a screen-snapshot test of the four badge states.

**Dependencies:**
- Trust store schema (above) — Safe mode bypasses entries that
  reference it.

**Complexity:** S

---

## 3. System Improvements

Critical fixes above land the floor. The improvements below close
the remaining ⚠ Partial / ❌ UNKNOWN items and harden long-tail
risks.

### UI / Screens

**Issue: No pack-manager / pack-picker screen (Q380)**

**Source:** Q380 (❌); Missing-Logic bullet 4.

**Problem:**
There is no surface to enumerate installed packs, distinguish
trusted vs. untrusted, or revoke trust.

**Impact:**
- Users cannot audit what packs are installed.
- `REVOKE_PACK_TRUST` (registered above) has no UI binding without
  this screen.
- No visual separation between trusted and sandboxed packs at
  selection time.

**Solution:**
Author screen
[`docs/architecture/wiki/screens/67-pack-manager/`](../architecture/wiki/screens/67-pack-manager/):

- Tabular list of installed packs with columns: name, version,
  author, trust tier (icon), capabilities (chips), `Trusted | Sandboxed |
  Denied | Revoked` status, contentHash (truncated).
- Filters: `All | Canonical | Third-party | Sandboxed | Denied`.
- Per-row actions: `Trust`, `Run sandboxed`, `Revoke trust`, `Remove`.
- Header action: `Install pack…` (file picker → screen 68 trust prompt).
- Empty-state: "Only canonical content is installed."

**Files to Update:**
- [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json)
  — add `67-pack-manager` under `system-dialogs`.
- [docs/architecture/command-schema.md](../architecture/command-schema.md)
  — add `INSTALL_PACK_FROM_FILE`, `REMOVE_PACK`,
  `OPEN_PACK_MANAGER` (registered).
- [54-system-menu/spec.md](../architecture/wiki/screens/54-system-menu/spec.md)
  — add "Manage packs…" entry routing to screen 67.

**New Files (if needed):**
- [docs/architecture/wiki/screens/67-pack-manager/](../architecture/wiki/screens/67-pack-manager/)
  with the canonical five files.

**Implementation Steps:**
1. Author the five screen-package files.
2. Bind selectors `selectors.packs.installed`,
   `selectors.packs.trustStore`.
3. Wire `Install pack…` button to file picker → traversal sanitizer
   → screen 68.
4. Update screen index, regenerate the wiki.

**Dependencies:**
- Trust-store schema (Critical Fix § publisher-registry).
- Screen 68 (Critical Fix § pack-trust prompt).

**Complexity:** M

---

### Data Contracts

**Issue: Skew vs tamper not labelled in selectors (Q366)**

**Source:** Q366 (⚠).

**Problem:**
[55-save-load/spec.md:37](../architecture/wiki/screens/55-save-load/spec.md#L37)
defines `selectors.persistence.selectedSaveCompatibility` as
"Version/hash/migration result", a single status. Two distinct
failure modes (pack-hash mismatch vs. state-hash mismatch) collapse
to one warning, training users to click through.

**Impact:**
- Users cannot distinguish benign version skew from an actively
  corrupted/tampered file.
- "Continue or abort?" presents identically in both cases.

**Solution:**
Replace the single status with a discriminated union:

```ts
type Compatibility =
  | { status: "ok" }
  | { status: "skew", mismatched: { packId: string, expected: string, actual: string }[] }
  | { status: "tamper", expectedStateHash: string, actualStateHash: string }
  | { status: "unsupported", reason: "too-new" | "no-migration" | "missing-pack" };
```

The `tamper` branch is **terminal**: no `Continue anyway` button.
The `skew` branch shows the per-pack diff and a `Continue (will
desync)` action gated on a checkbox.

**Files to Update:**
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../architecture/wiki/screens/55-save-load/data-contracts.md)
  — replace selector shape.
- [docs/architecture/wiki/screens/66-save-import/data-contracts.md](../architecture/wiki/screens/66-save-import/data-contracts.md)
  — bind to the same shape.
- [docs/architecture/diagrams/25-load-flow.md](../architecture/diagrams/25-load-flow.md)
  — add the four terminals.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Edit the two screen packages.
2. Update the diagram.
3. Add a screen-snapshot test for each of the four states.

**Dependencies:**
- `save.schema.json` (Critical Fix § save schema).

**Complexity:** S

---

### Schemas

**Issue: No `contentRating` field on manifest (Q385)**

**Source:** Q385 (❌); Missing-Logic bullet 10; Improvements bullet 8.

**Problem:**
[manifest.schema.json](../../content-schema/schemas/manifest.schema.json)
has no rating field, so install-time disclosure is impossible.

**Impact:**
- Parental-control / store-compliance posture is undefined.
- Authors cannot self-rate even when willing.

**Solution:**
Add an **optional** `contentRating` object to
[manifest.schema.json](../../content-schema/schemas/manifest.schema.json)
following the additive-first rule:

```jsonc
"contentRating": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "violence": { "enum": ["none", "mild", "moderate", "intense"] },
    "language": { "enum": ["none", "mild", "strong"] },
    "sexual":   { "enum": ["none", "mild", "explicit"] },
    "themes":   { "enum": ["none", "mature"] },
    "selfRated": { "type": "boolean", "default": true }
  }
}
```

Bind in screen 68 (pack-trust prompt) as a sub-section labelled
"Author-declared content" with one row per axis. Field is
**advisory only** — not used for any gameplay or matchmaking gate
in v1.

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json).
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md)
  — add `contentRating` to the optional-fields list.
- [docs/architecture/wiki/screens/68-pack-trust-prompt/spec.md](../architecture/wiki/screens/68-pack-trust-prompt/spec.md)
  — add the disclosure section.
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)
  — note manifest extension.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Add the field with `additionalProperties: false` enforced inside
   the object.
2. Update the canonical example
   [`content-schema/examples/manifest/canonical.json`](../../content-schema/examples/manifest/canonical.json)
   to include a rating block.
3. Add a non-rated example
   ([`content-schema/examples/manifest/no-rating.json`](../../content-schema/examples/manifest/no-rating.json)).
4. Run `npm run validate`.

**Dependencies:**
- None.

**Complexity:** S

---

### Architecture

**Issue: Browser-only quarantine + MOTW posture undocumented (Q372, Q373)**

**Source:** Q372 (❌), Q373 (❌); Missing-Logic bullet 7;
Improvements bullet 10.

**Problem:**
The save-quarantine staging zone exists in the import-flow design
above, but the broader OS-attribute story (MOTW, `com.apple.quarantine`)
is undocumented. The README states "browser-first" but does not
rule out a desktop wrapper.

**Impact:**
- A future Electron / Tauri packaging task has no policy hook to
  consult.
- "Should we honour the OS quarantine bit?" lands as a contested
  decision late, not as an inherited policy.

**Solution:**
Add a § "Platform Posture" to
[`pack-trust.md`](../architecture/pack-trust.md):

- **v1 (browser-only):** import is via the File API; OS attributes
  do not propagate. The in-memory quarantine staging area
  (Critical Fix § save-import) is the only sandbox; this is
  documented as the **single source of truth** for save-import
  threats in the browser.
- **vNext (desktop wrapper, when authored):** if a desktop wrapper
  enters scope, the wrapper MUST:
  - read MOTW / `com.apple.quarantine` and surface the bit on
    screen 66 with a labelled banner;
  - refuse "Always trust" decisions for any pack file that still
    has the quarantine bit set, until the user explicitly clears it
    via OS-native UI;
  - preserve the bit when copying staged files into the install
    location.

**Files to Update:**
- [docs/architecture/pack-trust.md](../architecture/pack-trust.md)
  — add the section.
- [README.md](../../README.md) — one-line link to `pack-trust.md`
  § "Platform Posture" beside the existing "browser-first" claim.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Author the section.
2. Add the README link.

**Dependencies:**
- None.

**Complexity:** S

---

### Tasks

**Issue: Persistence task tree has no save-import safety task**

**Source:** Q361, Q362, Q364–Q372 collectively.

**Problem:**
[`tasks/mvp/08-persistence/`](../../tasks/mvp/08-persistence/) holds
five tasks. Task 05 (export/import JSON) declares the API but does
not own the import-screen flow, the schema validator, or the
quarantine staging.

**Impact:**
- Any AI agent picking the persistence module via
  `npm run tasks:next` will land on task 05 and re-invent the
  flow.
- The audit's gating items have no `Owned Paths` anywhere.

**Solution:**
Author three new persistence tasks, splitting the work along
ownership lines:

- `tasks/mvp/08-persistence/06-save-schema-and-validator.md` —
  owns the `save.schema.json` artifact and the runtime validator
  (`src/persistence/validate-save.ts`). Acceptance ties to
  Critical Fix § save schema.
- `tasks/mvp/08-persistence/07-save-import-screen-and-quarantine.md` —
  owns screen 66 implementation (`src/ui/screens/SaveImportScreen.tsx`
  and friends), the in-memory staging selector, the four
  resource-cap checks, and the per-pack consent rows.
- `tasks/mvp/08-persistence/08-pack-trust-prompt-and-manager.md` —
  owns screens 67 and 68, the trust-store IndexedDB object store,
  the publisher-registry / revocation-list loaders, the
  signature-verification path (calls into the Web Crypto API), and
  the safe-mode + modded-indicator selectors.

Each task carries:

- `Read First` block citing the screen-package files and
  `pack-trust.md`.
- `Owned Paths` = the implementation files.
- `Owned Paths (shared)` = none (these are leaf tasks).
- `Dependencies` = listed below in § 5.
- `Verify` = `npm run validate`, `npm test`, plus a
  task-specific Playwright smoke for the screen.
- `Acceptance Criteria` quoting the Critical Fix bullets verbatim.

Update task 05 (`05-export-import-json.md`) to:
- depend on task 06 (validator) and task 07 (screen);
- narrow `Owned Paths` to **export-only** (`exportSave` +
  `SaveLoadImportExportControls.tsx`);
- import path moves to task 07.

**Files to Update:**
- [tasks/mvp/08-persistence/05-export-import-json.md](../../tasks/mvp/08-persistence/05-export-import-json.md)
  — narrow scope, add dependencies.
- [tasks/mvp/08-persistence.md](../../tasks/mvp/08-persistence.md)
  (module index) — add tasks 06, 07, 08.

**New Files (if needed):**
- [tasks/mvp/08-persistence/06-save-schema-and-validator.md](../../tasks/mvp/08-persistence/06-save-schema-and-validator.md).
- [tasks/mvp/08-persistence/07-save-import-screen-and-quarantine.md](../../tasks/mvp/08-persistence/07-save-import-screen-and-quarantine.md).
- [tasks/mvp/08-persistence/08-pack-trust-prompt-and-manager.md](../../tasks/mvp/08-persistence/08-pack-trust-prompt-and-manager.md).

**Implementation Steps:**
1. Author the three new task files using the canonical task template
   from
   [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
   as the shape reference.
2. Run `npm run generate:task-registry` and
   `npm run validate:tasks`.
3. Confirm `npm run tasks:next:mvp` lists task 06 once its
   dependencies are met.

**Dependencies:**
- See § 5 Execution Order.

**Complexity:** M

---

**Issue: Schema-task tree has no entries for the four new schemas**

**Source:** All Critical Fix schemas (`save`, `publisher-registry`,
`pack-revocation-list`, `trust-store`).

**Problem:**
[`tasks/mvp/02-content-schemas/`](../../tasks/mvp/02-content-schemas/)
indexes one task per schema (units, factions, spells, …). The four
new schemas have no owning task, so
[`mvp.02-content-schemas.10-zod-validators-for-all-schemas`](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md)
will not pick them up.

**Solution:**
Author one schema-task per schema, following the existing template
([01-unit-schema.md](../../tasks/mvp/02-content-schemas/01-unit-schema.md)):

- `tasks/mvp/02-content-schemas/21-save-schema.md`
- `tasks/mvp/02-content-schemas/22-publisher-registry-schema.md`
- `tasks/mvp/02-content-schemas/23-pack-revocation-list-schema.md`
- `tasks/mvp/02-content-schemas/24-trust-store-schema.md`

Each task owns its `.schema.json`, its canonical-example folder,
and a single `Acceptance Criteria` line: "schema validates the
canonical example and rejects each negative example".

**Files to Update:**
- [tasks/mvp/02-content-schemas.md](../../tasks/mvp/02-content-schemas.md)
  (module index) — add four new tasks.
- [tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md)
  — add the four schemas to its dependency list (so it picks them
  up).
- [tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md](../../tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md)
  — add `save.schema.json` to the migration registry contract.

**New Files (if needed):**
- The four task files listed above.

**Implementation Steps:**
1. Author the four task files using
   [01-unit-schema.md](../../tasks/mvp/02-content-schemas/01-unit-schema.md)
   as the template.
2. Run `npm run generate:task-registry` and
   `npm run validate:tasks`.

**Dependencies:**
- None upstream within this plan; downstream consumers are tasks 06
  / 07 / 08 in `08-persistence`.

**Complexity:** S

---

**Issue: Localization keys for trust-prompt + save-import copy missing (Q377)**

**Source:** Q377 (❌); Missing-Logic bullet 11; Improvements bullet 7.

**Problem:**
No `ui.pack-trust.*` or `ui.save-import.*` keys exist in the
canonical locale, and no non-expert phrasing rule exists in the
localization style guide.

**Impact:**
- Screens 66, 67, 68 ship with placeholder copy.
- Phrasing accumulates technical jargon ("AST", "ed25519", "manifest")
  without review.

**Solution:**
- Add the full key set under `ui.save-import.*` and `ui.pack-trust.*`
  to the canonical English locale (path declared by Plan 14).
- Add a § "Trust & Safety Phrasing" to the localization style guide
  (or, if absent, to
  [content-schema/schemas/localization.schema.json](../../content-schema/schemas/localization.schema.json)
  README) requiring:
  - no acronyms longer than 4 letters in user-facing copy;
  - no terms `AST`, `ed25519`, `sandboxed`, `manifest`,
    `hash`, `nonce`, `entropy` — replace with plain analogues
    listed in a glossary table;
  - all warning copy must include both *what changes* and *why it
    matters* in two short sentences max.

**Files to Update:**
- Canonical English locale data file (path defined by Plan 14;
  if not yet authored, this plan's task 08 ships the file with
  scope limited to these key namespaces).
- [content-schema/README.md](../../content-schema/README.md) — add
  the phrasing rule.

**New Files (if needed):**
- None (extends an existing locale).

**Implementation Steps:**
1. Author the key set listed in Critical Fix issues 1–6.
2. Add the phrasing rule.
3. Add a CI check (under task 08) that screens 66/67/68 reference
   no string literals not present in the locale.

**Dependencies:**
- Plan 14 (localization scaffolding) for the locale path. Until
  Plan 14 lands, scope this work to the namespaces above.

**Complexity:** S

---

## 4. Suggested Task Breakdown

These tasks are authored verbatim into the task tree. IDs follow
the existing numbering (next free slot per directory).

**`tasks/mvp/02-content-schemas/`**

- [ ] 21 — `save.schema.json` + canonical/negative examples + version-bound rules
- [ ] 22 — `publisher-registry.schema.json` + canonical example
- [ ] 23 — `pack-revocation-list.schema.json` + canonical example
- [ ] 24 — `trust-store.schema.json` + canonical example
- [ ] (edit) 10 — extend Zod validator coverage to schemas 21–24
- [ ] (edit) 11 — register `save.schema.json` in the migration stub

**`tasks/mvp/08-persistence/`**

- [ ] 06 — Save schema runtime validator (`src/persistence/validate-save.ts`)
- [ ] 07 — Save-import screen 66 + in-memory quarantine + size/ratio caps
- [ ] 08 — Pack-trust screens 67 + 68 + trust-store IndexedDB + safe mode + modded badge
- [ ] (edit) 05 — Narrow scope to export-only; depend on 06 and 07

**Architecture / docs**

- [ ] Author [`docs/architecture/pack-trust.md`](../architecture/pack-trust.md)
      with sections: Resource Limits, Save Quarantine, Trust Anchors,
      Safe Mode, Modded Indicator, Save Version Bounds, Platform Posture
- [ ] Edit [`pack-contract.md`](../architecture/pack-contract.md)
      to cross-link the resource-limits and traversal rules
- [ ] Edit [`command-schema.md`](../architecture/command-schema.md)
      to register new commands (Critical Fix issues 2, 3, 5, 6)
- [ ] Edit [`schema-matrix.md`](../architecture/schema-matrix.md) and
      [`content-schema/README.md`](../../content-schema/README.md) for
      the four new schemas
- [ ] Edit [`24-save-flow.md`](../architecture/diagrams/24-save-flow.md)
      and [`25-load-flow.md`](../architecture/diagrams/25-load-flow.md)
      with size/ratio pre-checks and skew/tamper terminals

**Screen packages**

- [ ] Author screen 66 (`save-import`) — five files
- [ ] Author screen 67 (`pack-manager`) — five files
- [ ] Author screen 68 (`pack-trust-prompt`) — five files
- [ ] Edit screen 55 (`save-load`) to expose `Import…`
- [ ] Edit screen 54 (`system-menu`) to add Safe-mode + Manage-packs
- [ ] Edit screen 19 (`status-bar`) to add Modded badge
- [ ] Edit [`index.json`](../architecture/wiki/screens/index.json) to
      register screens 66, 67, 68
- [ ] Run `npm run generate:wiki`

**Manifest extension**

- [ ] Add optional `contentRating` to
      [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
      and update its canonical example

**Localization**

- [ ] Add `ui.save-import.*` and `ui.pack-trust.*` keys to canonical
      locale
- [ ] Add "Trust & Safety Phrasing" rule to the localization style guide

---

## 5. Execution Order

The graph below resolves into a buildable order. **Dependencies are
strictly file-level**: the dependent task cannot land until the
listed file exists in the form named.

1. **Schema tasks** (parallel):
   - 02-content-schemas/21 (`save.schema.json`)
   - 02-content-schemas/22 (`publisher-registry.schema.json`)
   - 02-content-schemas/23 (`pack-revocation-list.schema.json`)
   - 02-content-schemas/24 (`trust-store.schema.json`)
2. **`pack-trust.md`** authored — depends on 22, 23, 24 (so the
   "Trust Anchors" section can cite real schemas).
3. **Manifest `contentRating` extension** — independent, can land
   in parallel with steps 1–2.
4. **`command-schema.md` + `schema-matrix.md` + `24/25 diagram`
   edits** — independent of code; can land in parallel with steps
   1–3.
5. **Screen package 68 (`pack-trust-prompt`)** — depends on
   `pack-trust.md` and on schemas 22, 23, 24.
6. **Screen package 66 (`save-import`)** — depends on
   `save.schema.json` (step 1), `pack-trust.md` (step 2), and
   screen 68 (step 5).
7. **Screen package 67 (`pack-manager`)** — depends on screen 68
   and on the trust-store schema.
8. **Edits to screens 54, 55, 19** — depend on screens 66/67/68
   plus the new commands.
9. **Localization keys** — depend on screens 66/67/68 (the keys are
   declared by those packages).
10. **Persistence task 06 (validator)** — depends on schema task 21.
11. **Persistence task 07 (import + quarantine)** — depends on
    task 06 and screen 66.
12. **Persistence task 08 (trust + safe mode)** — depends on
    schemas 22/23/24, screens 67/68, command-schema edits, and
    `pack-trust.md`.
13. **Edits to persistence task 05** — depend on tasks 06 and 07
    landing.
14. **`npm run generate:wiki` + `npm run validate`** — gate
    handoff.

Steps 1, 3, and 4 can run in parallel as the first wave. Step 2
joins them. Steps 5–9 are documentation and cannot regress runtime;
they should land before any persistence task starts so AI agents
implementing tasks 06–08 have complete contracts to read.

---

## 6. Risks if Not Implemented

- **Parser DoS** (Q367) — without size and decompression caps, a
  4 KB gzip can decompress to >1 GB JSON; the import tab freezes or
  the page crashes. Trivial to weaponize via shared link.
- **Silent pack mount on save import** (Q365) — without per-pack
  consent at the import surface, a save can install third-party
  packs (with `formulas.ast` or `assets.binary` capabilities)
  without the user clicking through any trust UI.
- **ZIP path traversal** (Q368) — without the `..` sanitizer,
  `.hrmod` extraction can write outside the pack directory under any
  desktop wrapper, and confuse virtual FS layers in the browser.
- **Trust-tier ambiguity** (Q375) — collapsing "signed-known",
  "signed-unknown", and "unsigned" into one warning trains users to
  click through; the manifest's `signature` field becomes
  decorative.
- **Unverified signatures shown as soft warnings** (Q384) — without
  a `tier=signature-failed` terminal, users can ignore signature
  failures the same way they ignore self-signed-cert warnings.
- **Hash-mismatch confusion** (Q366) — without skew-vs-tamper
  labelling, a benign content-pack version bump and an actively
  tampered file present identically.
- **No revocation path** (Q378) — a known-bad pack remains loadable
  forever; saves that referenced it continue to load silently with
  no indicator.
- **Modded replays indistinguishable from canonical** (Q379) — a
  replay or screenshot from a sandboxed session looks identical to
  trusted play. Support cannot triage; competitive integrity erodes.
- **No safe-mode escape hatch** (Q381) — a misbehaving pack that
  crashes on session start has no recovery path short of clearing
  IndexedDB; the user loses every save.
- **Manifest has no rating** (Q385) — store compliance and parental
  controls have no hook; adding the field later forces a manifest
  schema migration.
- **No localization scaffolding** (Q377) — security copy
  accumulates expert jargon ("AST", "sandboxed", "ed25519"),
  silently lowering the security floor for non-expert users.
- **No save schema artifact** (Q363) — every consumer reinvents
  shape checks; "validate before hydrate" is asserted but not
  enforced.
- **Overwrite irreversible on import** (Q371) — a misclicked
  import permanently destroys a slot; no recycle ring.
- **No quarantine** (Q372) — staged imports touch IndexedDB before
  the user confirms; aborting an import leaves orphaned records.

---

## 7. AI Implementation Readiness

**Before this plan:** **2 / 10**
**After this plan:** **8 / 10** (target)

**Why 8, not 10:**

- The plan formalizes every contract an AI agent needs to land the
  surface autonomously: four schemas with examples, three screen
  packages with the canonical five files, six new commands, a
  policy doc with explicit constants, and three new task files
  with `Owned Paths`, `Dependencies`, `Verify`, and `Acceptance
  Criteria`. This satisfies the "data-driven, contract-first" rule
  in [CLAUDE.md](../../CLAUDE.md) without requiring further
  invention.
- Two items remain inherently dependent on later plans and are
  flagged as such, capping the score at 8:
  1. **Plan 14 (localization)** must land before localization keys
     can graduate from "scope-limited namespaces" to the full
     locale workflow. Until then, the screens ship with the namespace
     keys and an inline phrasing rule.
  2. **Plan 24 (signed peers / authenticated identity)** must land
     before the publisher registry can be administered through any
     in-product flow. Until then, the registry is a static
     content artifact bumped via PR — acceptable for v1 because no
     third-party publisher exists yet, but it caps the
     trust-revocation flow's reach.
- An AI agent asked to "implement save imports and pack trust"
  after this plan can pick `npm run tasks:next:mvp`, land schema
  tasks 21–24, then persistence tasks 06–08 in order, with
  `npm run validate` and `npm run validate:tasks` enforcing every
  contract. No fresh invention is required at any step.
