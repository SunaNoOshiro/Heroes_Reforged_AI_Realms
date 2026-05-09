# Implementation Plan: 21 — User-Generated Content & Personal Data

> Source audit: [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](../readiness-audit/21-user-generated-content-and-personal-data.md)
> Audit AI-Readiness score at time of writing: **1.5 / 10** — target after this plan: **8 / 10**.
> Original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic and Risk item from Q386–Q409
> into concrete work items grounded in existing artifacts:
> [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json),
> [`content-schema/schemas/asset-index.schema.json`](../../../content-schema/schemas/asset-index.schema.json),
> [`content-schema/schemas/generated-faction.schema.json`](../../../content-schema/schemas/generated-faction.schema.json),
> [`content-schema/schemas/localization.schema.json`](../../../content-schema/schemas/localization.schema.json),
> [`docs/architecture/pack-contract.md`](../../architecture/pack-contract.md),
> [`docs/architecture/ai-generation-pipeline.md`](../../architecture/ai-generation-pipeline.md),
> [`docs/architecture/diagrams/24-save-flow.md`](../../architecture/diagrams/24-save-flow.md),
> existing screens [54-system-menu](../../architecture/wiki/screens/54-system-menu/),
> [55-save-load](../../architecture/wiki/screens/55-save-load/),
> [56-options](../../architecture/wiki/screens/56-options/),
> [57-high-scores](../../architecture/wiki/screens/57-high-scores/),
> [65-map-editor](../../architecture/wiki/screens/65-map-editor/),
> the pack-trust scaffolding declared by **Plan 20**, and the chat-safety
> scaffolding declared by **Plan 19**.

---

## 1. Overview

The audit found that **every privacy and UGC-safety decision point** in the
repo is undefined. Of 24 questions, **19 are ❌ UNKNOWN** and **4 are
⚠ Partial**. There are no fully-specified items.

Existing primitives the plan can build on:

- `sandboxed: true` flag and closed `capabilities` enum on
  [manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  (incl. `scripts.none`).
- `GeneratedFaction.notes` provenance block (`providerId`, `promptHash`,
  `modelHint`, `tokenCount`) on
  [generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json).
- `state.profile.highScores` / `state.players.byId.*.displayName` /
  `metadata.playerName` on the save record — the only PII-adjacent
  fields anywhere in the spec.
- The Map Editor screen ([65-map-editor](../../architecture/wiki/screens/65-map-editor/))
  for local UGC authoring.
- [ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md)
  Stage 6 pack materialization (writes `sandboxed: true` packs).

What is missing is **every UI surface, sanitization contract, validator,
permission policy, and data-inventory artifact** that turns those
primitives into a defensible privacy and UGC-safety posture.

This plan formalizes:

1. A **canonical data-inventory doc** ([`docs/architecture/data-inventory.md`](../../architecture/data-inventory.md))
   listing every persisted field, medium, retention TTL, sensitivity
   tier, and "Forget me" coverage. This becomes the single source of
   truth across audits 21, 22, 27.
2. A **persistence-strategy doc** ([`docs/architecture/persistence.md`](../../architecture/persistence.md))
   naming the storage medium for each slice and banning `localStorage`
   for sensitive data outright.
3. A **UGC-safety contract** ([`docs/architecture/ugc-safety.md`](../../architecture/ugc-safety.md))
   covering text sanitization, image/audio/font validators, URL-scheme
   constraints on `assets/index.json`, decompression caps, and the
   capability-enforcement requirement that turns `scripts.none` from a
   contract claim into a runtime check.
4. An **OS-permissions policy** ([`docs/architecture/permissions.md`](../../architecture/permissions.md))
   listing the closed set of browser/OS APIs the app may use.
5. An **AI-provenance disclosure** binding `GeneratedFaction.notes` to
   user-visible badges, tooltips, and a "View prompt + model"
   affordance.
6. **Schema additions**: `assetPathScheme` constraint on
   `asset-index.schema.json`; optional `playerHash` on save metadata;
   optional `aiProvenance` resolver on packs that re-asserts
   `GeneratedFaction.notes` at the manifest level.
7. **New schemas**: `content-report.schema.json` (UGC report payload)
   and `privacy-options.schema.json` (privacy-pane state slice).
8. **Three new screen packages**:
   [`66-ugc-publish-disclaimer/`](../../architecture/wiki/screens/66-ugc-publish-disclaimer/)
   (publish-time content-policy modal),
   [`67-ai-provenance-detail/`](../../architecture/wiki/screens/67-ai-provenance-detail/)
   (player-facing prompt+model viewer), and
   [`68-content-report/`](../../architecture/wiki/screens/68-content-report/)
   (report-pack/UGC flow distinct from `REPORT_PEER`).
9. **Edits to existing screens**: `54-system-menu` ("Forget me on this
   device"), `56-options` (privacy pane: display-name hashing,
   analytics opt-in, mature-content gate), `57-high-scores`
   (display-name hash render), `65-map-editor` ("Publish…" affordance
   routed to screen 66).
10. **Six new commands** in `command-schema.md`: `WIPE_LOCAL_DATA`,
    `REPORT_PACK`, `OPEN_AI_PROVENANCE`, `TOGGLE_HASHED_DISPLAY_NAME`,
    `TOGGLE_ANALYTICS_OPT_IN`, `TOGGLE_MATURE_CONTENT_GATE`.
11. **New tasks** under
    [`tasks/mvp/02-content-schemas/`](../../../tasks/mvp/02-content-schemas/),
    [`tasks/mvp/07-ui-shell/`](../../../tasks/mvp/07-ui-shell/),
    [`tasks/mvp/08-persistence/`](../../../tasks/mvp/08-persistence/), and
    [`tasks/phase-2/05-mod-system/`](../../../tasks/phase-2/05-mod-system/).

**Sibling plan boundaries.**

- **Plan 19** ([19-chat-safety-and-user-reporting-plan.md](./19-chat-safety-and-user-reporting-plan.md))
  owns the player-behavior `REPORT_PEER` command and chat sanitization.
  This plan adds the **content-targeting** report command
  (`REPORT_PACK`) and **extends the same sanitization rule** to all
  UGC text, but does not redesign chat flows.
- **Plan 20** ([20-save-imports-and-pack-trust-prompts-plan.md](./20-save-imports-and-pack-trust-prompts-plan.md))
  owns the pack-trust prompt, modded HUD badge, pack-picker screen,
  `contentRating` field on `manifest.schema.json`, and the
  decompression-ratio + ZIP-traversal guard. This plan **does not
  duplicate any of those items**; it consumes them. Where Plan 20
  declared a data primitive, this plan layers privacy/inventory rules
  on top.
- **Plan 22** (privacy / retention / error leaks) — when authored,
  will own retention TTLs and crash-dump redaction. This plan
  declares the **data-inventory shape** Plan 22 will populate, and
  the **`WIPE_LOCAL_DATA` command** Plan 22 will extend.
- **Plan 14** ([14-ai-generated-content-pipeline-plan.md](./14-ai-generated-content-pipeline-plan.md))
  owns the AI-generation pipeline including image moderation and
  asset normalization. This plan adds the **player-facing
  provenance surface** that consumes the existing `notes` block; it
  does not redesign the pipeline.
- **Plan 25** (TURN credentials & signaling-server abuse) — when
  authored, will own auth-token storage. This plan **prescribes the
  rule** ("no tokens in `localStorage`") so Plan 25 inherits it.

**In scope:**

- New architecture docs:
  [`docs/architecture/data-inventory.md`](../../architecture/data-inventory.md),
  [`docs/architecture/persistence.md`](../../architecture/persistence.md),
  [`docs/architecture/ugc-safety.md`](../../architecture/ugc-safety.md),
  [`docs/architecture/permissions.md`](../../architecture/permissions.md).
- New schemas:
  [`content-schema/schemas/content-report.schema.json`](../../../content-schema/schemas/content-report.schema.json),
  [`content-schema/schemas/privacy-options.schema.json`](../../../content-schema/schemas/privacy-options.schema.json).
- Schema edits:
  - [`asset-index.schema.json`](../../../content-schema/schemas/asset-index.schema.json)
    — closed `pathScheme` enum + `^(?!https?:)` pattern on `path`.
  - [`generated-faction.schema.json`](../../../content-schema/schemas/generated-faction.schema.json)
    — `notes.playerInspectable: boolean` + `notes.modelVersion`
    additive fields.
  - [`localization.schema.json`](../../../content-schema/schemas/localization.schema.json)
    — `interpolation.allowedTokens` allowlist + ICU mode flag.
  - Save metadata (described by [diagrams/24-save-flow.md](../../architecture/diagrams/24-save-flow.md)
    and codified in `save.schema.json` from Plan 20) — add optional
    `playerHash` and `displayNameMode` fields.
- New screen packages:
  [`66-ugc-publish-disclaimer/`](../../architecture/wiki/screens/66-ugc-publish-disclaimer/),
  [`67-ai-provenance-detail/`](../../architecture/wiki/screens/67-ai-provenance-detail/),
  [`68-content-report/`](../../architecture/wiki/screens/68-content-report/).
- Edits to existing screens: 54, 56, 57, 65 (see § 3).
- Edits to [`pack-contract.md`](../../architecture/pack-contract.md) for
  the asset-path scheme rule and the `scripts.none` enforcement
  reference.
- Edits to [`command-schema.md`](../../architecture/command-schema.md)
  for six new commands.
- Edits to [`schema-matrix.md`](../../architecture/schema-matrix.md) and
  [`content-schema/README.md`](../../../content-schema/README.md) for
  the two new schemas.
- New tasks under content-schemas, ui-shell, persistence, and
  mod-system (see § 4).

**Explicitly out of scope (deferred or owned elsewhere):**

- **Server-side moderation backend** for `REPORT_PACK` intake. This
  plan defines the **client envelope** and **dead-letter local queue
  with retry**; the destination service is owned by an unwritten
  Plan 30 (moderation backend).
- **Pack-picker / modded HUD badge** — owned by Plan 20.
- **`contentRating` taxonomy and age-gate copy** — declared in
  Plan 20; this plan binds the privacy pane in screen 56 to the
  resulting `config.player.allowMatureContent` flag but does not
  redesign the taxonomy.
- **Decompression ratio + ZIP traversal sanitizer** — owned by
  Plan 20 (`pack-trust.md` § Resource Limits). This plan
  cross-references those constants in `ugc-safety.md` but does not
  redefine them.
- **Crash-dump redaction format** — owned by Plan 22.
- **Friend / block list backend sync** — out of MVP scope; this plan
  records *zero* social-state surface today and declares that any
  future surface must add a row to `data-inventory.md` first.
- **Server-hosted publisher CA** — owned by the eventual Plan 24.

---

## 2. Critical Fixes (Must Do First)

These eight items materially change the threat surface (XSS, IP
exfiltration, cleartext PII on shared devices, modded-content
ambiguity) the moment any external user touches the build. They block
any non-internal release that ships UGC or the Map Editor.

---

### Issue: No URL-scheme constraint on `assets/index.json` paths

**Source:** Q390 (❌); Risks bullet 1; Improvements bullet 4.

**Problem:**
[pack-contract.md:93-95](../../architecture/pack-contract.md#L93)
states `assets/index.json owns path-to-asset-id mapping` with no rule
on the path scheme. A malicious pack can declare
`https://attacker.example/probe.png` and the asset resolver fetches
it on render, leaking the loader's IP, `Referer`, and `User-Agent`.

The schema [asset-index.schema.json](../../../content-schema/schemas/asset-index.schema.json)
does not constrain the `path` string beyond JSON `string`.

**Impact:**
- Silent IP exfiltration with zero user-visible signal.
- Browser CSP cannot help unless a baseline is also asserted at the
  app shell level — and none is.
- Affects every loaded asset (sprites, audio, fonts) in every pack
  type (canonical, sandboxed, AI-generated).

**Solution:**

1. Tighten the asset-index schema to forbid absolute schemes:
   ```jsonc
   {
     "$id": "https://heroes-reforged/asset-index.schema.json",
     "type": "object",
     "additionalProperties": false,
     "properties": {
       "pathScheme": {
         "type": "string",
         "const": "pack-relative"
       },
       "entries": {
         "type": "array",
         "items": {
           "type": "object",
           "required": ["assetId", "path"],
           "additionalProperties": false,
           "properties": {
             "assetId": { "type": "string" },
             "path": {
               "type": "string",
               "pattern": "^(?!https?:|file:|data:|blob:)(?!/)(?!\\.\\.)[A-Za-z0-9_./-]+$",
               "maxLength": 256
             }
           }
         }
       }
     },
     "required": ["pathScheme", "entries"]
   }
   ```
2. Document the rule in `pack-contract.md` § "Asset Path Scheme" and
   in the new `ugc-safety.md` § "External URL Ban".
3. Add a baseline CSP recommendation in `ugc-safety.md`:
   `default-src 'self'; img-src 'self' blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self' wss:`.
4. The pack loader (Plan 20 owns the runtime path) MUST reject any
   `assets/index.json` whose `pathScheme != "pack-relative"` or whose
   `path` matches an absolute scheme — fail loudly per CLAUDE.md
   "missing gameplay requirements must fail loudly".

**Files to Update:**
- [content-schema/schemas/asset-index.schema.json](../../../content-schema/schemas/asset-index.schema.json)
  — apply the constraint above.
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
  — add § "Asset Path Scheme" cross-linking the schema.
- [docs/architecture/ugc-safety.md](../../architecture/ugc-safety.md) (new)
  — § "External URL Ban", § "CSP Baseline".
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md)
  — add `pathScheme` row.
- [tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md](../../../tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md)
  — add an acceptance line "rejects manifests whose
  `assets/index.json` declares any non-pack-relative path".

**New Files (if needed):**
- [content-schema/examples/asset-index/canonical.json](../../../content-schema/examples/asset-index/canonical.json).
- [content-schema/examples/asset-index/external-url-rejected.json](../../../content-schema/examples/asset-index/external-url-rejected.json).
- [content-schema/examples/asset-index/path-traversal-rejected.json](../../../content-schema/examples/asset-index/path-traversal-rejected.json).

**Implementation Steps:**
1. Edit the schema; add three canonical/negative examples.
2. Author `ugc-safety.md` § "External URL Ban" + § "CSP Baseline".
3. Cross-link from `pack-contract.md`.
4. Update mod-system task 01 acceptance criteria.
5. Run `npm run validate`.

**Dependencies:**
- None. Schema-only + doc + task-edit; can land first.

**Complexity:** S

---

### Issue: No text-sanitization contract for any UGC string

**Source:** Q388 (❌), Q394 (❌); Risks bullet 2; Improvements bullet 3.

**Problem:**
Hero biographies, scenario descriptions, unit names, AI-generated
`notes`, lobby chat, scenario localization strings — all rendered
through unspecified React components. JSX implicit text-escape is the
only defense. No rule forbids `dangerouslySetInnerHTML` or markdown
rendering of UGC. The same gap exists for chat (audit 19/Q337) and
for localization-string interpolation (Q394).

**Impact:**
- The first contributor to add a markdown preview, rich tooltip, or
  `dangerouslySetInnerHTML` reopens the XSS hole.
- Localization tokens (`%s`, `{{name}}`, ICU) can be abused if a UGC
  scenario supplies a translation file with malicious format strings.
- Audits 19 and 21 stay perpetually open because the contract is
  prose-only.

**Solution:**

1. Author `ugc-safety.md` § "Text Sanitization Contract" with the
   following rules (binding for all of `src/ui/`):
   - **Default render mode is text-only.** Any UGC, AI-generated, or
     remote-sourced string MUST be rendered through a JSX text node
     or a `<Text value={...} />` wrapper. `dangerouslySetInnerHTML`
     is forbidden in `src/ui/`.
   - **Markdown is opt-in per schema field.** A schema field may
     declare `"x-rendering": "markdown-restricted"` (e.g., on
     `scenario.description`); that mode goes through DOMPurify with
     a closed allowlist (`p`, `em`, `strong`, `ul`, `ol`, `li`,
     `code`, `a[href^="#"]`).
   - **Interpolation is opt-in per locale key.** Localization keys
     declare an explicit `interpolation.allowedTokens` array; any
     token not on the list is rendered literally. ICU MessageFormat
     mode is opt-in per key (`interpolation.mode: "icu"`); without
     it, `{` and `}` are escaped.
   - **No `eval`-style template engines.** Any future template
     library must be approved via an architecture amendment.
2. Extend [localization.schema.json](../../../content-schema/schemas/localization.schema.json)
   to express the per-key contract:
   ```jsonc
   {
     "interpolation": {
       "type": "object",
       "additionalProperties": false,
       "properties": {
         "mode": { "enum": ["literal", "named", "icu"], "default": "literal" },
         "allowedTokens": {
           "type": "array",
           "items": { "type": "string", "pattern": "^[a-zA-Z][a-zA-Z0-9_]{0,31}$" },
           "uniqueItems": true,
           "default": []
         }
       }
     }
   }
   ```
3. Add a CI lint under
   [`tasks/mvp/02-content-schemas/`](../../../tasks/mvp/02-content-schemas/)
   that bans `dangerouslySetInnerHTML` in `src/ui/` (allowlist of
   zero matches) and bans direct string concatenation into JSX from
   any `*.user.*` or `*.ugc.*`-tagged data path.
4. Add a Zod-side `safeUserText(maxLen)` helper under
   `src/content-schema/` (extends task 10) used by every schema
   that accepts user text — owned by content-schema task 25 (new).

**Files to Update:**
- [docs/architecture/ugc-safety.md](../../architecture/ugc-safety.md) (new).
- [content-schema/schemas/localization.schema.json](../../../content-schema/schemas/localization.schema.json)
  — add `interpolation` block.
- [content-schema/schemas/scenario.schema.json](../../../content-schema/schemas/scenario.schema.json)
  — declare `"x-rendering": "markdown-restricted"` on `description`
  and `"x-rendering": "text"` on `name`/`shortDescription`.
- [content-schema/schemas/hero.schema.json](../../../content-schema/schemas/hero.schema.json)
  — declare `"x-rendering": "markdown-restricted"` on `biography`.
- [content-schema/schemas/unit.schema.json](../../../content-schema/schemas/unit.schema.json)
  — declare `"x-rendering": "text"` on `name` and `lore`.
- [content-schema/schemas/generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json)
  — declare `"x-rendering": "text"` on `notes` and `summary`.
- [tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md](../../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md)
  — add `safeUserText` helper to acceptance criteria.

**New Files (if needed):**
- New task `tasks/mvp/02-content-schemas/25-safe-user-text-helper-and-jsx-lint.md`.

**Implementation Steps:**
1. Author `ugc-safety.md` § "Text Sanitization Contract".
2. Edit the schemas listed above.
3. Author content-schema task 25.
4. Add the `dangerouslySetInnerHTML` lint rule (acceptance line:
   "matches zero hits in `src/ui/`").
5. Run `npm run validate`.

**Dependencies:**
- Plan 19 (chat sanitization) — this plan reuses the same rule but
  authors the canonical doc; if Plan 19 lands first, that plan's
  cross-link target is `ugc-safety.md` § "Text Sanitization
  Contract".

**Complexity:** M

---

### Issue: No image / audio / font validator for user-supplied bytes

**Source:** Q389 (❌), Q391 (❌); Improvements bullet 5.

**Problem:**
There is no MIME magic-byte check, max-dimensions rule,
decoder-isolation policy, max-duration rule, or font allowlist for
any user-supplied or AI-generated binary asset. The asset-index
schema only owns ID-to-path mapping. The image-moderation gap on the
AI side was logged in audit 14/Q239.

**Impact:**
- A malicious pack can deliver a malformed PNG/WebP/MP3/OTF that
  triggers a decoder bug on first render.
- Oversized images (>16K × 16K) crash the renderer; oversized fonts
  block the main thread for seconds.
- Custom fonts can re-skin localized strings (Q391) without any
  trust signal.

**Solution:**

1. In `ugc-safety.md` § "Binary Asset Validators", declare the
   constants and the validator order. **Constants are normative**:
   - **Images.** Allowed MIME via magic bytes: `image/png`,
     `image/webp`. Max dimensions: `4096 × 4096`. Max file size:
     `4 MiB`. Decoded off the main thread via
     `createImageBitmap` only (no `<img>` first-load probing).
     `image/svg+xml` is **forbidden in UGC** (script-bearing).
   - **Audio.** Allowed MIME via magic bytes: `audio/ogg` (Vorbis or
     Opus), `audio/mpeg`. Max duration: `120 s` per clip,
     `30 s` for UI clips. Max file size: `2 MiB`. Decoded via
     `AudioContext.decodeAudioData`.
   - **Fonts.** **Disallowed in UGC at v1.** Packs may not declare
     entries with extensions `.otf`, `.ttf`, `.woff`, `.woff2`. The
     asset-index schema rejects them via a closed extension
     allowlist on `path`. Trusted system fonts are the only render
     surface; CSS `font-src 'self'`.
2. Add `assetTypeAllowlist` to the asset-index schema:
   ```jsonc
   {
     "properties": {
       "entries": {
         "items": {
           "properties": {
             "path": {
               "pattern": "^[A-Za-z0-9_./-]+\\.(png|webp|ogg|mp3|json)$"
             }
           }
         }
       }
     }
   }
   ```
3. Document the validator order: magic-byte sniff → MIME match →
   dimension/duration probe → decode-off-thread → cache. Any
   failure marks the asset `invalid` and the pack receives a
   per-asset diagnostic (no engine crash, no silent fallback).
4. Add an acceptance line to mod-system task 01 ("zip-pack-loader")
   to gate every binary read through this pipeline.

**Files to Update:**
- [docs/architecture/ugc-safety.md](../../architecture/ugc-safety.md)
  — § "Binary Asset Validators".
- [content-schema/schemas/asset-index.schema.json](../../../content-schema/schemas/asset-index.schema.json)
  — extension allowlist.
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
  — cross-link the validator section.
- [tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md](../../../tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md)
  — add validator gate to acceptance.
- [tasks/mvp/02b-asset-pipeline/](../../../tasks/mvp/02b-asset-pipeline/)
  index — add a new validator task (next free slot).

**New Files (if needed):**
- New task `tasks/mvp/02b-asset-pipeline/<n>-binary-asset-validators.md`
  (where `<n>` is the next free slot in that directory).

**Implementation Steps:**
1. Author `ugc-safety.md` § "Binary Asset Validators".
2. Edit asset-index schema; add canonical + negative examples
   (`forbidden-extension-rejected.json`, `oversized-rejected.json`).
3. Author the asset-pipeline task.
4. Update pack-loader task acceptance.
5. `npm run validate`.

**Dependencies:**
- Issue "URL-scheme constraint" lands first (same schema file).

**Complexity:** M

---

### Issue: `scripts.none` capability is asserted, not enforced

**Source:** Q387 (❌); Risks bullet 5; Improvements bullet 5.

**Problem:**
The pack contract requires `capabilities` to be a closed enum
including `scripts.none`, but no scanner, validator stage, or byte
sniffer is documented for `.hrmod` archives. A malicious pack that
*omits* the capability declaration but smuggles executable bytes
(e.g., `formulas.ast` with side-effecting nodes, or coerced MIME on
an asset) is not blocked by any documented check.

**Impact:**
- The `capabilities` enum becomes decorative rather than load-bearing.
- A sandboxed AI-generated pack and a hand-crafted malicious pack
  receive identical treatment in the loader.
- Audit 20's pack-trust prompt copy promises capability enumeration
  the runtime cannot verify.

**Solution:**

1. In `ugc-safety.md` § "Capability Enforcement", declare the loader
   contract:
   - **Closed-enum check.** The pack manifest's `capabilities[]`
     MUST be a subset of the schema's closed enum; any unknown
     entry rejects the pack at load time.
   - **Byte-level sniffs.** If `scripts.none` is declared:
     - No file in the pack may have an extension in
       `{js, mjs, cjs, ts, wasm, html, htm, svg}`.
     - No `formulas.ast` node may include kinds not in the
       Effect Registry's pure-evaluator set (declared in
       [`docs/architecture/effect-registry.md`](../../architecture/effect-registry.md)).
     - No JSON value may include a key matching `^__|prototype$|constructor$`
       (prototype-pollution defense).
   - **Capability omission ≠ permission.** A pack that omits the
     `capabilities` field entirely is treated as `scripts.none`
     (default-deny).
2. Tighten [manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
   to make `capabilities` `required` with a `default: ["scripts.none"]`
   and reject `additionalProperties` in the capability declaration
   block.
3. Add an acceptance line to phase-2 mod-system tasks 01 (loader),
   02 (signature), and 03 (sandbox mode) referencing the new
   "Capability Enforcement" section.

**Files to Update:**
- [docs/architecture/ugc-safety.md](../../architecture/ugc-safety.md)
  — § "Capability Enforcement".
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  — `required: ["capabilities"]`, `default: ["scripts.none"]`.
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
  — link the enforcement section from the existing capability
  paragraph.
- [tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md](../../../tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md),
  [tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md),
  [tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md](../../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md)
  — add the byte-sniff acceptance lines.

**New Files (if needed):**
- None; extends existing artifacts.

**Implementation Steps:**
1. Author the section in `ugc-safety.md`.
2. Tighten manifest schema; update its canonical example.
3. Update mod-system tasks 01/02/03.
4. `npm run validate`.

**Dependencies:**
- Plan 20 (`pack-trust.md` — Resource Limits) for the
  decompression-ratio constants this section cross-links.

**Complexity:** M

---

### Issue: `playerName` stored cleartext in saves; no encryption at rest

**Source:** Q402 (❌), Q405 (⚠); Risks bullet 4; Improvements bullets 10, 11.

**Problem:**
[diagrams/24-save-flow.md:30-48](../../architecture/diagrams/24-save-flow.md#L30)
describes the save format as `metadata.playerName` (cleartext) +
gzip + write to disk. There is no field-level hash, no
`metadata.playerHash`, and no encryption layer. On a multi-user
device, sharing a save file shares the player's display name.
GDPR/CCPA "right to erasure" cannot be honored without a wipe
command (Q401, addressed below) and without a hashed identifier
that can be cleanly disowned.

**Impact:**
- Multi-user device exposure: any other account can read
  `metadata.playerName` from `~/.../saves/*.gz`.
- Save-file sharing leaks display name with no opt-out.
- High-score profile slice (`state.profile.highScores`) repeats the
  problem for ranked entries.

**Solution:**

1. Add two optional fields to the save schema (Plan 20 owns the
   schema artifact; this plan registers the additive fields):
   ```jsonc
   {
     "metadata": {
       "displayNameMode": { "enum": ["clear", "hashed"], "default": "hashed" },
       "playerName": { "type": "string", "maxLength": 64 },
       "playerHash": { "type": "string", "pattern": "^[a-f0-9]{16}$" },
       "playerLabel": { "type": "string", "maxLength": 16 }
     }
   }
   ```
   - When `displayNameMode = hashed`: `playerName` is omitted;
     `playerHash` is `xxh64(displayName + localSalt)`; `playerLabel`
     is a player-chosen short opaque string ("Suna" → "S.").
   - When `displayNameMode = clear`: `playerName` is present;
     `playerHash` is omitted. The user can opt in via the privacy
     pane only after reading the disclosure copy.
2. Default flips to `hashed` for new installs. Existing saves
   migrate via the schema-version migration registry: on first load
   under runtime ≥ vX, recompute the hash from the loaded
   `playerName` and rewrite on next save (no destructive migration).
3. The `localSalt` is per-installation, generated via WebCrypto
   `getRandomValues`, stored under the save medium chosen by Plan
   22 (this plan declares **only IndexedDB** as the ban-on-`localStorage`
   target). The salt is wiped by `WIPE_LOCAL_DATA`.
4. **Encryption at rest** is **out of scope for v1** — the save
   format remains gzip + JSON. The privacy pane in screen 56 makes
   this explicit ("Saves are stored unencrypted on this device.
   Treat your save folder like a document folder."). Plan 22 can
   layer a passphrase-derived WebCrypto AES-GCM wrapper on top
   without changing the schema.

**Files to Update:**
- Save schema artifact (declared by Plan 20 task
  `tasks/mvp/02-content-schemas/21-save-schema.md` — pending) — add
  the four optional metadata fields.
- [docs/architecture/diagrams/24-save-flow.md](../../architecture/diagrams/24-save-flow.md)
  — note the hash branch on the "Compose metadata" step.
- [docs/architecture/data-inventory.md](../../architecture/data-inventory.md) (new)
  — add a row per field with sensitivity tier.
- [docs/architecture/persistence.md](../../architecture/persistence.md) (new)
  — declare salt storage under IndexedDB.
- [docs/architecture/wiki/screens/57-high-scores/data-contracts.md](../../architecture/wiki/screens/57-high-scores/data-contracts.md)
  — render `playerLabel` (not `displayName`) when `displayNameMode = hashed`.
- [docs/architecture/wiki/screens/56-options/](../../architecture/wiki/screens/56-options/)
  — add privacy pane (see Issue "No 'Forget me'" below).

**New Files (if needed):**
- None at the schema level (Plan 20's save schema absorbs the fields).
- New persistence task `tasks/mvp/08-persistence/06-display-name-hash-and-salt.md`.

**Implementation Steps:**
1. Edit Plan 20's save schema task to include the four fields.
2. Author the persistence task for hash + salt.
3. Update the save-flow diagram.
4. Author the data-inventory rows.
5. Bind the high-scores screen to `playerLabel`.

**Dependencies:**
- Plan 20 task `02-content-schemas/21-save-schema` (the schema
  artifact). If Plan 20 has not landed, this task **blocks** until
  the file exists, rather than reinventing the schema.

**Complexity:** M

---

### Issue: No "Forget me / wipe local data" command

**Source:** Q401 (❌), Q406 (❌); Risks bullet 7; Improvements bullet 9.

**Problem:**
[54-system-menu](../../architecture/wiki/screens/54-system-menu/) and
[56-options](../../architecture/wiki/screens/56-options/) have no
"delete profile / wipe local data" affordance. There is no
`WIPE_LOCAL_DATA` / `FORGET_ME` / `DELETE_PROFILE` command in any
screen. Audit 19/Q345 confirmed chat history has no wipe path
either. GDPR/CCPA right-to-erasure cannot be honored.

**Impact:**
- Right-to-erasure cannot be honored.
- Shared-device data leakage: high-scores, options, save
  thumbnails, chat history, and the local salt persist across
  account boundaries.
- Audits 21, 22, and 27 stay open.

**Solution:**

1. Add a `WIPE_LOCAL_DATA` command to
   [`command-schema.md`](../../architecture/command-schema.md) with
   payload `{ scope: "all" | "saves" | "profile" | "chat", confirmed: boolean }`.
2. Add a "Forget me on this device" entry to
   [54-system-menu/spec.md](../../architecture/wiki/screens/54-system-menu/spec.md)
   that opens
   [60-confirmation-dialog](../../architecture/wiki/screens/60-confirmation-dialog/)
   with the localization copy
   `ui.privacy.forget-me.confirm` ("This deletes every save, every
   high-score, every option, every chat log, and every local
   key on this device. This cannot be undone.").
3. Add a partial-wipe pane to
   [56-options](../../architecture/wiki/screens/56-options/) (under
   "Privacy") with checkboxes per scope so the user can choose
   "saves only", "chat only", etc.
4. The `WIPE_LOCAL_DATA` handler MUST iterate the rows declared in
   `data-inventory.md`, not a hand-coded list. The data inventory
   becomes the single source of truth ("if it's not in the
   inventory, it doesn't exist; if it's in the inventory, it must
   be wiped"). Any future feature that adds a persistent slice MUST
   add an inventory row before merging.
5. The handler clears: IndexedDB stores, the local salt, any
   future-token store (forbidden by Issue "No auth/token model"
   below), all in-memory state (via reload).

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md)
  — register `WIPE_LOCAL_DATA`.
- [docs/architecture/wiki/screens/54-system-menu/spec.md](../../architecture/wiki/screens/54-system-menu/spec.md),
  [docs/architecture/wiki/screens/54-system-menu/interactions.md](../../architecture/wiki/screens/54-system-menu/interactions.md),
  [docs/architecture/wiki/screens/54-system-menu/data-contracts.md](../../architecture/wiki/screens/54-system-menu/data-contracts.md)
  — add the entry, the binding, and the route to screen 60.
- [docs/architecture/wiki/screens/56-options/](../../architecture/wiki/screens/56-options/)
  — add the per-scope wipe pane.
- [docs/architecture/data-inventory.md](../../architecture/data-inventory.md) (new)
  — declare the "single source of truth" rule.
- [tasks/mvp/08-persistence/](../../../tasks/mvp/08-persistence/) —
  add a new wipe-handler task.

**New Files (if needed):**
- New task `tasks/mvp/08-persistence/07-wipe-local-data-handler.md`
  with `Owned Paths` `src/persistence/wipe-local-data.ts` and
  `Verify` `npm run test -- wipe-local-data`.

**Implementation Steps:**
1. Author the command in `command-schema.md`.
2. Edit screen 54 + screen 56.
3. Author the persistence task.
4. Add the data-inventory rule about "must register before merge".
5. `npm run validate`.

**Dependencies:**
- Issue "Authoring data-inventory.md" (below) lands first — the
  handler iterates that document.

**Complexity:** M

---

### Issue: No data inventory document

**Source:** Q409 (❌); Risks bullet 10; Improvements bullet 1.

**Problem:**
There is no `data-inventory.md`, no DPIA, no field-level retention
table. Inconsistencies between audits 21, 22, and 27 (save tampering)
become inevitable. Legal/compliance has nothing to review. Without
it, the "Forget me" handler cannot have a stable scope.

**Impact:**
- Compliance reviews cannot proceed.
- Each new persistent slice silently widens the privacy footprint.
- "Forget me", encryption-at-rest, and retention TTL decisions stay
  per-feature rather than centrally defined.

**Solution:**

Author [`docs/architecture/data-inventory.md`](../../architecture/data-inventory.md)
as a single Markdown table. **One row per persisted field** across
the entire app. Each row carries:

| Field | State path | Medium | Sensitivity | Retention | Wipe scope | Notes |
|------|------------|--------|-------------|-----------|------------|-------|
| `displayName` (active session) | `state.players.byId.*.displayName` | in-memory | medium | session | n/a | transient |
| `playerHash` (saves) | save `metadata.playerHash` | IndexedDB (saves) | low | until user-deleted | `WIPE_LOCAL_DATA scope=saves\|all` | salted xxh64 |
| `playerName` (saves, opt-in) | save `metadata.playerName` | IndexedDB (saves) | medium | until user-deleted | `WIPE_LOCAL_DATA scope=saves\|all` | only when `displayNameMode = clear` |
| local salt | `state.privacy.localSalt` (mirror) | IndexedDB (privacy) | high | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | per-installation; never leaves device |
| high-score entries | `state.profile.highScores` | IndexedDB (profile) | low | rolling top-10 | `WIPE_LOCAL_DATA scope=profile\|all` | renders `playerLabel` |
| options (`state.ui.options`) | `state.ui.options` | IndexedDB (options) | low | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | volume, language, etc. |
| privacy options (`state.privacy.options`) | `state.privacy.options` | IndexedDB (privacy) | low | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | analytics opt-in, mature gate |
| lobby chat (transient) | `state.net.lobby.chat` | in-memory | medium | session | n/a | not persisted |
| save thumbnail | save `metadata.thumbnail` | IndexedDB (saves) | low | until save deleted | `WIPE_LOCAL_DATA scope=saves\|all` | base64 PNG/WebP |
| AI prompt (per pack) | pack `manifest.aiProvenance.prompt` (if present) | IndexedDB (packs) + .hrmod | medium | until pack uninstalled | n/a (pack scope) | declared by Plan 14 |
| crash dump | (not yet specified) | (deferred) | high | (deferred) | (deferred) | owned by Plan 22 |
| auth tokens | (not specified; banned from `localStorage`) | (forbidden until Plan 25) | high | (n/a) | (n/a) | see Issue "No auth/token model" |

Plus required policy text:

- **The inventory is the single source of truth for `WIPE_LOCAL_DATA`.**
  Any new persistent slice MUST add a row before being merged. CI gate
  (`npm run validate:tasks`) extends to scan IndexedDB store-name
  literals across `src/persistence/` and fail if a store is created
  that has no inventory row.
- **Sensitivity tiers** (low / medium / high) drive default
  retention and default encryption posture; high-tier rows MAY NOT
  go into `localStorage` at all.
- **Cross-references**: every sensitivity-`high` row links to the
  task or doc that justifies its retention.

**Files to Update:**
- [docs/architecture/](../../architecture/) — register the new doc in
  the architecture README index.
- [CLAUDE.md](../../../CLAUDE.md) — add a one-line rule under
  "Protect These Rules": "every persisted field is registered in
  `data-inventory.md`".
- [tasks/mvp/02-content-schemas/](../../../tasks/mvp/02-content-schemas/)
  index — add a doc-only task for authoring the inventory.

**New Files (if needed):**
- [docs/architecture/data-inventory.md](../../architecture/data-inventory.md).
- New task
  [`tasks/mvp/02-content-schemas/26-data-inventory-and-wipe-scope-policy.md`](../../../tasks/mvp/02-content-schemas/26-data-inventory-and-wipe-scope-policy.md).

**Implementation Steps:**
1. Author the doc with the canonical table above.
2. Add the CI gate (registry-scan) to `validate:tasks`.
3. Update `CLAUDE.md`.
4. Author the new content-schemas task.
5. `npm run validate`.

**Dependencies:**
- None — this lands first and unblocks every other privacy fix.

**Complexity:** M

---

### Issue: Override / shadowing without player visibility

**Source:** Q395 (⚠); Risks bullet 6.

**Problem:**
Pack manifests declare `provides[]` and `dependencies[]`. The
pack-contract assigns `src/content-runtime/` ownership of dependency
resolution and pack registry assembly, but **override semantics**
(last-wins / first-wins / namespacing) are not documented anywhere
in [pack-contract.md](../../architecture/pack-contract.md) or
[content-platform.md](../../architecture/content-platform.md). Player
visibility is also missing — there is no "Modded" indicator, no
pack-picker, no per-pack rating display.

**Impact:**
- Competitive integrity: a pack can shadow `unit/peasant` with
  buffed stats and the player has no signal.
- Support triage: bug reports cannot be reproduced without knowing
  which pack provided the live record.
- Replays and screenshots from sandboxed sessions look identical to
  canonical play.

**Solution:**

The **modded HUD badge** and **pack-picker screen** are owned by
**Plan 20**. This plan adds only the **override-precedence rule**:

1. In
   [`docs/architecture/pack-contract.md`](../../architecture/pack-contract.md)
   § "Override Precedence" (new):
   - **Resolution order is `dependencies[]` declaration order**, not
     filesystem order. A pack that lists pack `B` then pack `C`
     resolves IDs in that order; the **last declared pack wins** on
     a collision.
   - **Sandboxed packs can never shadow a non-sandboxed canonical
     pack on a stable ID.** Attempting to do so is a load-time
     error (`override.sandboxed-shadow-canonical`), surfaced via
     Plan 20's pack-trust prompt.
   - **Same-tier collisions** (two non-sandboxed packs claiming the
     same ID) require an explicit `overrides[]` allowlist in the
     downstream pack's manifest. Without it, the load fails with
     `override.unauthorized-shadow`.
2. Add an `overrides[]` field (additive, optional) to
   [manifest.schema.json](../../../content-schema/schemas/manifest.schema.json):
   ```jsonc
   {
     "overrides": {
       "type": "array",
       "items": {
         "type": "object",
         "required": ["packId", "ids"],
         "additionalProperties": false,
         "properties": {
           "packId": { "type": "string" },
           "ids": { "type": "array", "items": { "type": "string" }, "uniqueItems": true }
         }
       }
     }
   }
   ```
3. The "Modded" badge (Plan 20) consumes `overrides[]`: the badge
   tooltip lists every (pack, id) pair contributing to the active
   session.

**Files to Update:**
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
  — § "Override Precedence".
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  — add `overrides[]`.
- [docs/architecture/content-platform.md](../../architecture/content-platform.md)
  — link the precedence rule.
- Plan 20's pack-manager screen 67 (already in scope of Plan 20) —
  this plan only declares the data shape it consumes.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Author the precedence section.
2. Edit the manifest schema; add canonical example with one
   `overrides[]` entry and one negative example
   (`unauthorized-shadow-rejected.json`).
3. Cross-link from `content-platform.md`.
4. `npm run validate`.

**Dependencies:**
- Plan 20 (pack-manager screen, modded HUD badge) consumes this
  rule. Order: this issue can land first; Plan 20's UI consumes the
  data shape afterward.

**Complexity:** S

---

## 3. System Improvements

### UI / Screens

---

### Issue: No UGC publish flow / content-policy disclaimer

**Source:** Q386 (⚠), Q392 (❌); Improvements bullet 6 (cross-ref).

**Problem:**
The Map Editor saves locally. The AI-generation pipeline writes
packs locally. **No publish, share-link, marketplace, or pack-import
flow exists.** Therefore no content-policy modal exists. A creator
who hand-shares a `.hrmod` outside the app sidesteps every safety
prompt by definition.

**Impact:**
- Creators have no acknowledged content policy.
- The "shared the file out-of-band" path has zero friction; legal
  exposure cannot be capped on the creator side.
- Audits 14/Q246, 20/Q380, and 21/Q386 stay perpetually open.

**Solution:**

Author screen package
[`66-ugc-publish-disclaimer/`](../../architecture/wiki/screens/66-ugc-publish-disclaimer/)
covering only the **client-side ack** (no upload destination yet —
that is Plan 30):

- **Title:** "Sharing a creation".
- **Body:** content-policy bullets (no IP infringement, no minors-in-sexual-context,
  no targeted harassment, no illegal content; localization
  `ui.publish.policy.*`).
- **Required actions:**
  - `[ ] I am the author or have rights to every asset in this pack.`
  - `[ ] I accept the content policy.`
- **Output:** writes a manifest companion file
  `signed-acks/<contentHash>.json` (in-pack, optional) recording
  the ack timestamp and a hash of the policy version. The
  acceptance is **per-pack**, not per-session.
- **Routing:**
  - From [65-map-editor](../../architecture/wiki/screens/65-map-editor/)
    → "Publish…" affordance opens screen 66 → on accept, exports
    the `.hrmod` to a user-chosen path. **No network upload.**
  - From AI-generation Stage 6 → if the user chose "Save and
    share" instead of "Save locally", routes through screen 66
    before writing the pack to disk.

The UGC-publish flow defers any **upload destination** to a future
moderation backend (Plan 30). v1's deliverable is **policy ack +
local export only**.

**Files to Update:**
- [docs/architecture/wiki/screens/65-map-editor/spec.md](../../architecture/wiki/screens/65-map-editor/spec.md),
  [docs/architecture/wiki/screens/65-map-editor/interactions.md](../../architecture/wiki/screens/65-map-editor/interactions.md)
  — add `EXPORT_SCENARIO_AS_PACK` and `OPEN_PUBLISH_DISCLAIMER`
  commands; route from "Publish…" through screen 66.
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md)
  — Stage 6 documents the optional ack route.
- [docs/architecture/wiki/screens/index.json](../../architecture/wiki/screens/index.json)
  — register screen 66 under "System & Dialogs" (or share Plan 20's
  group; coordinate ID with Plan 20 if it claimed `66-save-import`
  first — see § 5).
- [docs/architecture/command-schema.md](../../architecture/command-schema.md)
  — register `OPEN_PUBLISH_DISCLAIMER`, `ACCEPT_PUBLISH_DISCLAIMER`,
  `EXPORT_SCENARIO_AS_PACK`.

**New Files (if needed):**
- [docs/architecture/wiki/screens/66-ugc-publish-disclaimer/mockup.html](../../architecture/wiki/screens/66-ugc-publish-disclaimer/mockup.html).
- [docs/architecture/wiki/screens/66-ugc-publish-disclaimer/spec.md](../../architecture/wiki/screens/66-ugc-publish-disclaimer/spec.md).
- [docs/architecture/wiki/screens/66-ugc-publish-disclaimer/interactions.md](../../architecture/wiki/screens/66-ugc-publish-disclaimer/interactions.md).
- [docs/architecture/wiki/screens/66-ugc-publish-disclaimer/data-contracts.md](../../architecture/wiki/screens/66-ugc-publish-disclaimer/data-contracts.md).
- [docs/architecture/wiki/screens/66-ugc-publish-disclaimer/architecture.md](../../architecture/wiki/screens/66-ugc-publish-disclaimer/architecture.md).

**Implementation Steps:**
1. Coordinate the screen number with Plan 20 (which claims
   `66-save-import` in its draft). Use `69-ugc-publish-disclaimer`
   if `66` is taken.
2. Author the five package files.
3. Edit screen 65 to expose `Publish…`.
4. Edit `ai-generation-pipeline.md` Stage 6.
5. Add a phase-2 task `tasks/phase-2/04-content-editor/<n>-publish-disclaimer-flow.md`.

**Dependencies:**
- Plan 20 — coordinate on screen numbering.

**Complexity:** M

---

### Issue: No content-report / takedown flow distinct from `REPORT_PEER`

**Source:** Q393 (❌); Risks bullet 7; Improvements bullet 7.

**Problem:**
Audit 14/Q246 and audit 19/Q358 confirmed there is no separate flow
for unsafe content vs. unsafe player behavior. The only "report"
surface in the spec is the desync diagnostic, which targets engine
bugs, not moderation.

**Impact:**
- A user who sees infringing or harmful UGC can only report a peer,
  which routes nowhere useful for content takedown.
- A pack ID once shipped cannot be invalidated client-side because
  no revocation list is wired (Plan 20 declares the schema; this
  plan declares the **player-facing intake**).

**Solution:**

1. Author screen package
   [`68-content-report/`](../../architecture/wiki/screens/68-content-report/)
   (or `70-content-report` after Plan 20 numbering — see § 5):
   - **Trigger:** any UGC tooltip/info-card carries a "Report this
     content" affordance (Map preview, hero biography modal,
     scenario detail panel, AI-faction info card, pack-manager
     row).
   - **Form:** target (`packId` + `contentHash` auto-filled),
     reason (closed enum: `infringement`, `harassment`,
     `mature-without-rating`, `malware`, `other`), notes
     (text-area, max 1000 chars, sanitized via the contract from
     Issue "No text-sanitization contract"), optional screenshot pointer
     (asset path, no upload at v1).
   - **Output:** a `ContentReport` record validated against the
     new schema, persisted to a local
     `state.privacy.outboundReports[]` queue with retry. **No
     network call at v1**; the queue is authored so Plan 30's
     backend can dequeue once it lands.
2. Author
   [`content-schema/schemas/content-report.schema.json`](../../../content-schema/schemas/content-report.schema.json):
   ```jsonc
   {
     "type": "object",
     "required": ["reportId", "targetType", "targetId", "reason", "submittedAt"],
     "additionalProperties": false,
     "properties": {
       "reportId":   { "type": "string", "pattern": "^[a-f0-9]{16}$" },
       "targetType": { "enum": ["pack", "scenario", "hero", "unit", "ai-faction"] },
       "targetId":   { "type": "string" },
       "contentHash":{ "type": "string", "pattern": "^[a-f0-9]{16}$" },
       "reason":     { "enum": ["infringement", "harassment", "mature-without-rating", "malware", "other"] },
       "notes":      { "type": "string", "maxLength": 1000 },
       "screenshotAssetId": { "type": "string" },
       "submittedAt": { "type": "integer", "minimum": 0 },
       "appVersion":  { "type": "string" },
       "schemaVersion": { "type": "integer", "minimum": 1 }
     }
   }
   ```
3. Add a `REPORT_PACK` command to `command-schema.md` distinct from
   Plan 19's `REPORT_PEER`.

**Files to Update:**
- [docs/architecture/wiki/screens/index.json](../../architecture/wiki/screens/index.json)
  — register the screen.
- [docs/architecture/command-schema.md](../../architecture/command-schema.md)
  — register `OPEN_CONTENT_REPORT`, `SUBMIT_CONTENT_REPORT`,
  `CANCEL_CONTENT_REPORT`.
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md)
  — add the new schema.
- [content-schema/README.md](../../../content-schema/README.md) — list it.

**New Files (if needed):**
- Five files for the screen package (mockup, spec, interactions,
  data-contracts, architecture).
- [content-schema/schemas/content-report.schema.json](../../../content-schema/schemas/content-report.schema.json).
- [content-schema/examples/content-report/canonical.json](../../../content-schema/examples/content-report/canonical.json).
- New task
  [`tasks/mvp/02-content-schemas/27-content-report-schema.md`](../../../tasks/mvp/02-content-schemas/27-content-report-schema.md).
- New task
  [`tasks/phase-2/05-mod-system/08-content-report-intake-and-local-queue.md`](../../../tasks/phase-2/05-mod-system/08-content-report-intake-and-local-queue.md).

**Implementation Steps:**
1. Author the schema + canonical example.
2. Author the screen package.
3. Wire the trigger affordance into the relevant info-card screens
   (map preview, hero biography modal, etc.).
4. Author the two tasks.
5. `npm run validate`.

**Dependencies:**
- Plan 19 (`REPORT_PEER` semantics — distinct from this command).
- Plan 20 (`pack-revocation-list` shape — consumed by the
  eventual moderation-backend Plan 30).

**Complexity:** M

---

### Issue: AI-provenance not visible to players

**Source:** Q396 (⚠); Improvements bullet 12.

**Problem:**
Backend metadata exists on `GeneratedFaction.notes` (`providerId`,
`promptHash`, `modelHint`, `tokenCount`) and the materialized pack
carries `sandboxed: true` plus `contentHash`. **No screen package
displays this to a player.** No "AI-generated" badge, no
"View prompt / model" affordance, no localization key.

**Impact:**
- Players cannot distinguish AI from human-authored content.
- Studios face increasing regulatory pressure to disclose AI use.
- The provenance metadata exists but cannot be exercised.

**Solution:**

1. Add a player-visible "AI-generated" badge wherever a hero,
   faction, scenario, or unit info card renders. The badge is
   bound to `pack.manifest.aiProvenance.present === true` (the new
   manifest field — see schema edit below).
2. Author screen package
   [`67-ai-provenance-detail/`](../../architecture/wiki/screens/67-ai-provenance-detail/)
   (see § 5 for the final number) showing:
   - Provider (`providerId`).
   - Model (`modelHint`).
   - Generation date.
   - Token count.
   - Truncated prompt (first 280 chars; `[truncated]` label).
   - Generation seed.
   - Pack `contentHash`.
3. Trigger: clicking the badge opens screen 67.
4. Add an additive optional `aiProvenance` block to
   [manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
   (NOT a duplicate of `GeneratedFaction.notes` — it is a manifest-level
   re-assertion that the loader can read without parsing every
   record):
   ```jsonc
   {
     "aiProvenance": {
       "type": "object",
       "additionalProperties": false,
       "properties": {
         "present":      { "type": "boolean", "default": false },
         "providerId":   { "type": "string" },
         "modelHint":    { "type": "string" },
         "modelVersion": { "type": "string" },
         "generatedAt":  { "type": "integer", "minimum": 0 },
         "promptHash":   { "type": "string", "pattern": "^[a-f0-9]{16}$" },
         "tokenCount":   { "type": "integer", "minimum": 0 },
         "playerInspectable": { "type": "boolean", "default": true },
         "promptExcerpt":{ "type": "string", "maxLength": 280 }
       },
       "required": ["present"]
     }
   }
   ```
5. Stage 6 of the AI-generation pipeline writes this block when
   materializing a pack from `GeneratedFaction.notes`.

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  — add `aiProvenance`.
- [content-schema/schemas/generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json)
  — add `notes.playerInspectable: boolean` and `notes.modelVersion`.
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md)
  — Stage 6 emits `aiProvenance`.
- [docs/architecture/wiki/screens/index.json](../../architecture/wiki/screens/index.json)
  — register screen 67.
- [docs/architecture/wiki/screens/19-status-bar/](../../architecture/wiki/screens/19-status-bar/)
  — coordinate with Plan 20's "Modded" badge to add a sibling
  "AI-content" badge.
- Hero / unit / faction info-card screen packages — add the
  `[AI]` badge to their spec.
- [docs/architecture/command-schema.md](../../architecture/command-schema.md)
  — register `OPEN_AI_PROVENANCE`.

**New Files (if needed):**
- Five files for screen package 67.

**Implementation Steps:**
1. Edit the manifest schema; add canonical example with
   `aiProvenance.present = true`.
2. Author the screen package.
3. Edit the AI-generation pipeline doc.
4. Add the badge bindings.
5. `npm run validate` + `npm run generate:wiki`.

**Dependencies:**
- Plan 14 (AI-generation pipeline) for `notes` structure (already
  exists).
- Plan 20 (status-bar badges) — coordinate badge layout.

**Complexity:** M

---

### Issue: No privacy pane in `56-options`

**Source:** Q400 (❌), Q403 (❌), Q405 (⚠); Improvements bullets 10, 13, 14.

**Problem:**
[56-options](../../architecture/wiki/screens/56-options/) has volume,
language, and graphics toggles only. No privacy controls — display-name
mode, analytics opt-in, mature-content gate, "Forget me", chat-history
retention.

**Impact:**
- Privacy-relevant decisions are invisible to the player.
- The `WIPE_LOCAL_DATA` command (Critical Fix) has nowhere to live
  in the UI.
- The display-name hash policy (Critical Fix) cannot be toggled.

**Solution:**

1. Add a "Privacy" tab (or section) to `56-options/spec.md` with:
   - **Display name mode:** `Hashed (default)` / `Cleartext` —
     toggle binds to `state.privacy.options.displayNameMode` and
     dispatches `TOGGLE_HASHED_DISPLAY_NAME`.
   - **Analytics:** off (default; no SDK loaded). Plan 22 may add
     opt-in. The toggle is present in v1 to **declare the default**
     even with no SDK behind it.
   - **Mature content:** `Allow` / `Block` (default block);
     dispatches `TOGGLE_MATURE_CONTENT_GATE`. Binds to
     `config.player.allowMatureContent` (the same key Plan 20 uses
     for its `contentRating` gate).
   - **"Forget me on this device":** entry point routes to screen
     54-system-menu's confirmation.
   - **"Use local salt for save metadata":** read-only display of
     "salt fingerprint" (first 4 hex chars) so the user can confirm
     a wipe rotated it.
2. Author
   [`content-schema/schemas/privacy-options.schema.json`](../../../content-schema/schemas/privacy-options.schema.json)
   describing the slice:
   ```jsonc
   {
     "type": "object",
     "required": ["displayNameMode", "analyticsOptIn", "allowMatureContent"],
     "additionalProperties": false,
     "properties": {
       "displayNameMode":   { "enum": ["hashed", "clear"], "default": "hashed" },
       "analyticsOptIn":    { "type": "boolean", "default": false },
       "allowMatureContent":{ "type": "boolean", "default": false },
       "saltFingerprint":   { "type": "string", "pattern": "^[a-f0-9]{4}$" }
     }
   }
   ```

**Files to Update:**
- [docs/architecture/wiki/screens/56-options/spec.md](../../architecture/wiki/screens/56-options/spec.md),
  [docs/architecture/wiki/screens/56-options/interactions.md](../../architecture/wiki/screens/56-options/interactions.md),
  [docs/architecture/wiki/screens/56-options/data-contracts.md](../../architecture/wiki/screens/56-options/data-contracts.md),
  [docs/architecture/wiki/screens/56-options/mockup.html](../../architecture/wiki/screens/56-options/mockup.html)
  — add the Privacy tab.
- [docs/architecture/command-schema.md](../../architecture/command-schema.md)
  — register `TOGGLE_HASHED_DISPLAY_NAME`, `TOGGLE_ANALYTICS_OPT_IN`,
  `TOGGLE_MATURE_CONTENT_GATE`.
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md),
  [content-schema/README.md](../../../content-schema/README.md)
  — register `privacy-options.schema.json`.

**New Files (if needed):**
- [content-schema/schemas/privacy-options.schema.json](../../../content-schema/schemas/privacy-options.schema.json).
- [content-schema/examples/privacy-options/canonical.json](../../../content-schema/examples/privacy-options/canonical.json).
- New task
  [`tasks/mvp/02-content-schemas/28-privacy-options-schema.md`](../../../tasks/mvp/02-content-schemas/28-privacy-options-schema.md).
- New UI-shell task
  [`tasks/mvp/07-ui-shell/10-privacy-pane-in-options.md`](../../../tasks/mvp/07-ui-shell/10-privacy-pane-in-options.md).

**Implementation Steps:**
1. Author the schema + example.
2. Edit screen 56 (all four package files).
3. Author the new commands in `command-schema.md`.
4. Author the two tasks.
5. `npm run validate` + `npm run generate:wiki`.

**Dependencies:**
- Critical Fix "playerName cleartext" (provides the `displayNameMode`
  semantics).
- Plan 20 (`config.player.allowMatureContent` key) — coordinate
  naming.

**Complexity:** M

---

### Data Contracts

---

### Issue: Persistence medium for every state slice is unnamed

**Source:** Q399 (❌); Improvements bullet 2.

**Problem:**
Saves are described as "Compress gzip → Write to disk" with no
medium named. `state.profile.highScores`, `state.ui.options`, and
`state.net.lobby.chat` similarly have no stated backend. Without a
chosen store there is no way to evaluate sensitivity-appropriateness,
quota, async behavior, or wipe scope.

**Impact:**
- Each implementer picks a different store for the same kind of data.
- Sensitive data accidentally lands in `localStorage`.
- "Forget me" cannot enumerate the surface to wipe.

**Solution:**

Author [`docs/architecture/persistence.md`](../../architecture/persistence.md)
with a **closed allowlist of media** and a **per-slice mapping**:

| Slice | Medium | Object store / key | Async | Quota |
|-------|--------|--------------------|-------|-------|
| Saves (`save.schema.json` blobs) | IndexedDB | DB `hr-saves`, store `slots` | yes | per-origin browser quota |
| Profile (high-scores, achievements, salt fingerprint) | IndexedDB | DB `hr-profile`, store `profile` | yes | small (<1 MiB) |
| Privacy options | IndexedDB | DB `hr-profile`, store `privacy` | yes | small |
| UI options (volume, language, hotkeys) | IndexedDB | DB `hr-profile`, store `options` | yes | small |
| Local salt (raw bytes) | IndexedDB | DB `hr-profile`, store `keys` | yes | tiny |
| Pack store (`.hrmod` bytes + extracted records) | IndexedDB + (optional) FS-Access | DB `hr-packs`, store `packs` | yes | large |
| Trust store (Plan 20) | IndexedDB | DB `hr-trust` | yes | small |
| Outbound content reports | IndexedDB | DB `hr-profile`, store `reports` | yes | small |
| Lobby chat | in-memory only | n/a | n/a | n/a |
| Auth tokens | **forbidden until Plan 25** | n/a | n/a | n/a |

Plus required policy:

- **`localStorage` is banned for any slice in this table.** It is
  reserved only for **non-sensitive UI state** that does not need
  async access (currently: zero rows).
- **Cookies are banned client-side.** Future signed-in flows
  (Plan 25) will use HTTP-only cookies set by the signaling server,
  unreadable from JS.
- **FS-Access** is optional (Electron-style desktop wrappers may
  use it for save export); when used, it is **always alongside**
  IndexedDB, never replacing it, so browser-only installs work.
- **Object-store names are stable IDs.** The `data-inventory.md`
  document is the registry; renaming a store requires a migration.

**Files to Update:**
- [CLAUDE.md](../../../CLAUDE.md) — add a one-line rule under
  "Engineering Guide": "all persisted state lives in IndexedDB
  unless `persistence.md` exempts it".
- [docs/architecture/](../../architecture/) README index — register the
  new doc.
- [docs/architecture/diagrams/24-save-flow.md](../../architecture/diagrams/24-save-flow.md)
  — replace "Write to disk" with "Write to IndexedDB store
  `hr-saves.slots`".
- [tasks/mvp/08-persistence/01-indexeddb-wrapper.md](../../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
  — add acceptance line "exposes the four DB names declared in
  `persistence.md`".

**New Files (if needed):**
- [docs/architecture/persistence.md](../../architecture/persistence.md).

**Implementation Steps:**
1. Author the doc.
2. Update CLAUDE.md.
3. Edit save-flow diagram.
4. Update persistence task 01.
5. `npm run validate`.

**Dependencies:**
- Critical Fix "data-inventory.md" lands first (the inventory rows
  reference store names).

**Complexity:** S

---

### Issue: No auth/token model; `localStorage` ban not in writing

**Source:** Q400 (❌); Improvements bullet 14.

**Problem:**
There is no auth model in the spec. Once one lands, the path of
least resistance is "stash JWT in `localStorage`" — same-origin
script readable. The risk is latent today and must be ruled out by
**policy** before code lands.

**Impact:**
- The future first auth implementer reaches for `localStorage`
  by default.
- Any XSS gap (Issue "No text-sanitization") becomes a credential
  exfiltration gap.

**Solution:**

In [`docs/architecture/persistence.md`](../../architecture/persistence.md)
§ "Token & Secret Storage":

- **`localStorage` is forbidden for any token, secret, or key.**
  This rule predates the auth surface.
- **Permitted future patterns** (when an auth surface lands):
  - HTTP-only cookies set by the signaling server (the auth
    boundary lives server-side; Plan 25 owns the signaling
    server).
  - Non-extractable WebCrypto `CryptoKey` instances stored in
    IndexedDB (the key is opaque to JS and survives reload).
- **WebRTC TURN credentials** are short-lived and ephemeral by
  design; never persisted (Plan 25 / audit 25 cross-ref).
- **Local salt** (this plan, Critical Fix #5) is non-sensitive
  outside the device threat model and lives in IndexedDB
  `hr-profile.keys`.

CI gate:
- Add a lint rule (under content-schema task 25 or a new
  `audit` task) that scans `src/` for `localStorage.setItem` and
  `document.cookie =` and fails on any match outside an explicit
  allowlist (currently empty).

**Files to Update:**
- [docs/architecture/persistence.md](../../architecture/persistence.md)
  — § "Token & Secret Storage".
- [tasks/mvp/02-content-schemas/25-safe-user-text-helper-and-jsx-lint.md](../../../tasks/mvp/02-content-schemas/25-safe-user-text-helper-and-jsx-lint.md)
  (the same lint task) — add `localStorage`/cookie hits to the
  zero-hit allowlist.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Author the section.
2. Extend the lint task.
3. `npm run validate`.

**Dependencies:**
- Issue "Persistence medium…" provides the document; this issue
  extends it.

**Complexity:** S

---

### Schemas

---

### Issue: Localization-string injection (format / template)

**Source:** Q394 (❌).

**Problem:**
[localization.schema.json](../../../content-schema/schemas/localization.schema.json)
does not constrain UGC-supplied translations or scenario descriptions
against `%s`, `{{...}}`, or ICU MessageFormat injection. There is no
"interpolation-only at trusted boundaries" rule.

**Impact:**
- A UGC scenario that ships a translation file can inject template
  tokens into trusted UI surfaces.
- The chat sanitization rule (Plan 19) is bypassed for any string
  that flows through the localization pipeline.

**Solution:**

Already covered in Critical Fix "No text-sanitization contract"
(extension to localization schema). This issue formally records the
schema-level acceptance line:

- `localization.schema.json` MUST require `interpolation.mode` per
  key.
- Default `mode = literal` (no interpolation; `{`/`}` escaped).
- `mode = named` requires `allowedTokens` (closed allowlist).
- `mode = icu` requires `allowedTokens` plus an ICU-formatter
  allowlist (declared in `ugc-safety.md` § "ICU Locks").
- UGC-supplied translation files (those loaded from a non-canonical
  pack) MAY NOT raise the interpolation tier of an existing
  canonical key (e.g., they cannot turn `mode: literal` into
  `mode: icu`). The merge resolver enforces "tier-min".

**Files to Update:**
- [content-schema/schemas/localization.schema.json](../../../content-schema/schemas/localization.schema.json)
  — declare `interpolation` block (already covered by Critical Fix
  "Text-sanitization contract").
- [docs/architecture/ugc-safety.md](../../architecture/ugc-safety.md)
  — § "ICU Locks".
- [tasks/mvp/02-content-schemas/14-localization-schema.md](../../../tasks/mvp/02-content-schemas/14-localization-schema.md)
  — add acceptance line for `interpolation` block.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Edit the schema (covered by Critical Fix).
2. Author `ugc-safety.md` § "ICU Locks".
3. Update the localization task.
4. `npm run validate`.

**Dependencies:**
- Critical Fix "No text-sanitization contract".

**Complexity:** S

---

### Architecture

---

### Issue: No OS-permissions policy; latent permission creep

**Source:** Q407 (❌); Risks bullet 8; Improvements bullet 13.

**Problem:**
No screen package declares clipboard / mic / camera / contacts /
notification / geolocation usage. WebRTC is in scope for
DataChannel only. Latent surfaces (clipboard for chat export,
microphone if voice chat lands) exist with no allowlist.

**Impact:**
- Future contributors wire OS APIs ad-hoc; the absence of an
  allowlist is a governance risk.
- A voice-chat MVP could land without a privacy review because
  there is no policy to fail against.

**Solution:**

Author [`docs/architecture/permissions.md`](../../architecture/permissions.md)
with a closed allowlist:

| API | Purpose | Owner | Justification |
|-----|---------|-------|---------------|
| `WebRTC RTCDataChannel` | gameplay command transport | Plan 07 | sole multiplayer transport; no media tracks |
| `WebRTC ICE / STUN / TURN` | NAT traversal | Plan 07 | required by DataChannel |
| `IndexedDB` | persistence | Plan 08 | per `persistence.md` |
| `File System Access API` | save export only | Plan 08 (optional desktop) | user-initiated; never background |
| `Clipboard read/write` | save-link share, content-report screenshot ref | Plan 21 (this plan) | user-gesture-only; no background read |
| `WebCrypto` | salt / hashing / future tokens | this plan + Plan 25 | non-extractable keys |
| `Canvas / WebGL2` | renderer | Plan 06 | rendering only; never reads CORS-tainted images |
| `HTMLCanvasElement.toBlob` | screenshot for content reports | this plan | user-initiated only |
| `Notification API` | (deferred) | (none) | requires architecture amendment |
| `Microphone / Camera` | (deferred; voice chat out of MVP) | (none) | requires architecture amendment |
| `Geolocation` | forbidden | (none) | not used; banned indefinitely |
| `Contacts API` | forbidden | (none) | not used; banned indefinitely |
| `Bluetooth / Serial / USB / HID` | forbidden | (none) | not used; banned indefinitely |

Plus required policy:

- Adding any API not on this list requires an architecture
  amendment PR that updates `permissions.md` AND adds a
  `data-inventory.md` row if the API can produce persisted data.
- Permission requests fire on **explicit user gesture** only —
  never on session start, never on screen mount.

**Files to Update:**
- [docs/architecture/](../../architecture/) README index.
- [CLAUDE.md](../../../CLAUDE.md) — add a one-line rule under
  "Protect These Rules": "OS / browser API usage is bound by
  `docs/architecture/permissions.md`".

**New Files (if needed):**
- [docs/architecture/permissions.md](../../architecture/permissions.md).

**Implementation Steps:**
1. Author the doc.
2. Update CLAUDE.md.
3. `npm run validate`.

**Dependencies:**
- None.

**Complexity:** S

---

### Issue: No analytics-identifier model

**Source:** Q403 (❌); Improvements bullet 10 (analytics toggle).

**Problem:**
The only mention of "telemetry" in the architecture is a negative
one ("Live games never rewrite pack records based on telemetry").
No analytics SDK is loaded, no client-id is generated, no opt-in
toggle exists.

**Impact:**
- The first analytics integrator chooses a default (most likely
  "auto-generate UUID, persist in `localStorage`, opt-out only").
- Without a stated default, the product accumulates an analytics
  surface no one designed.

**Solution:**

In `data-inventory.md` add a row:
- `analyticsClientId` — **not generated at v1**; if added later,
  must be opt-in (`state.privacy.options.analyticsOptIn === true`),
  must be a UUIDv4, must be regeneratable via the privacy pane
  ("Reset analytics ID"), must live in IndexedDB (`hr-profile.privacy`),
  must be wiped by `WIPE_LOCAL_DATA scope=profile|all`.

In `docs/architecture/persistence.md` § "Analytics" (subsection):
- No analytics SDK is loaded at v1.
- Any future SDK is **gated behind `analyticsOptIn`** with no
  network calls before opt-in.
- The opt-in toggle in screen 56 (Privacy pane) is the **only**
  switch.

The "Reset analytics ID" affordance lives in screen 56 alongside
the toggle.

**Files to Update:**
- [docs/architecture/data-inventory.md](../../architecture/data-inventory.md)
  — add the row.
- [docs/architecture/persistence.md](../../architecture/persistence.md)
  — § "Analytics".
- [docs/architecture/wiki/screens/56-options/](../../architecture/wiki/screens/56-options/)
  — add the "Reset analytics ID" affordance to the Privacy pane.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Add the inventory row.
2. Add the persistence section.
3. Edit screen 56.
4. `npm run validate`.

**Dependencies:**
- Critical Fix "data-inventory.md".
- Issue "Persistence medium for every state slice".
- Issue "No privacy pane in 56-options".

**Complexity:** S

---

### Issue: No crash-dump / telemetry pipeline policy

**Source:** Q404 (❌).

**Problem:**
No crash-dump destination, no telemetry transport, no PII redaction
policy. The desync diagnostic captures engine state only and its
persistence is unspecified.

**Impact:**
- The first crash-reporting integrator ships ad-hoc.
- Crash reports may include `playerName`, save thumbnails, or chat
  excerpts.

**Solution:**

Plan 22 owns the full crash-dump pipeline. This plan **prescribes
the redaction baseline** so Plan 22 inherits a clear contract:

In `data-inventory.md` § "Crash Dumps":
- A crash dump MAY include: build hash, engine hash, redacted
  command index, last-N command kinds (no payloads), state hash,
  exception class, exception message **with PII tokens stripped**.
- A crash dump MUST NOT include: `playerName`, `playerLabel`,
  `playerHash`, save thumbnails, chat content, prompt content,
  asset bytes.
- Persistence: in-memory only at v1; user-initiated export to a
  local file only. No network upload until Plan 22 declares one.
- The "Forget me" handler clears any in-memory crash dumps and any
  on-disk export (when wired).

In `docs/architecture/permissions.md` cross-link this section.

**Files to Update:**
- [docs/architecture/data-inventory.md](../../architecture/data-inventory.md)
  — § "Crash Dumps".
- [docs/architecture/permissions.md](../../architecture/permissions.md)
  — cross-link.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Add the section.
2. Cross-link.
3. `npm run validate`.

**Dependencies:**
- Critical Fix "data-inventory.md".

**Complexity:** S

---

### Issue: No friend / recent-players / block list scaffolding

**Source:** Q408 (❌).

**Problem:**
None of the three exist. Plan 19 declared no `MUTE_PEER` /
`BLOCK_PEER` schema. Audit 18 confirmed peer identity is "whoever
holds the room code" — recent-players is not constructible.

**Impact:**
- The audit stays open indefinitely.
- Future moderation work has no schema foothold.

**Solution:**

This plan **does not** add a friends/block schema (out of MVP
scope, and Plan 19 has primary ownership). It records a single
**negative-constraint row** in `data-inventory.md`:

- "No social state is persisted today. Adding friend / block /
  recent-players state requires (a) a schema under
  `content-schema/schemas/social-*.schema.json`, (b) a
  `data-inventory.md` row, (c) a corresponding `WIPE_LOCAL_DATA`
  scope, and (d) a privacy-pane disclosure. Until those land, no
  social slice may be merged."

This is a **governance row**, not an implementation row. It exists
so a future contributor cannot add `state.social.*` without
following the procedure.

**Files to Update:**
- [docs/architecture/data-inventory.md](../../architecture/data-inventory.md)
  — § "Future: Social State (gated)".

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Add the section.
2. `npm run validate`.

**Dependencies:**
- Critical Fix "data-inventory.md".

**Complexity:** S

---

### Issue: Localization key namespace for UGC / privacy is undefined

**Source:** Q388, Q392, Q396, Q401, Q403 (cumulative — every new
screen adds copy with no key home).

**Problem:**
The new screens (publish disclaimer, AI provenance detail, content
report, privacy pane, "Forget me" confirmation) introduce 30+
strings. Without a namespace plan, copy accumulates technical
jargon and inconsistent tone (already flagged in Plan 20's
localization issue).

**Impact:**
- Phrasing drifts.
- Translators cannot find the keys.
- The "Trust & Safety Phrasing" rule (Plan 20) is not extended to
  UGC.

**Solution:**

Reserve the following key namespaces (declared in `ugc-safety.md`
§ "Localization Keys"):

- `ui.publish.policy.*` — content-policy modal copy.
- `ui.report.*` — content-report screen copy.
- `ui.ai-provenance.*` — provenance detail screen copy.
- `ui.privacy.*` — privacy pane + "Forget me" confirmation copy.
- `ui.ugc.warning.*` — inline warnings on tooltips when AI/sandboxed
  content is rendered.

Extend Plan 20's "Trust & Safety Phrasing" rule to apply to all
five namespaces.

**Files to Update:**
- [docs/architecture/ugc-safety.md](../../architecture/ugc-safety.md)
  — § "Localization Keys".
- Canonical English locale (path declared by Plan 14).

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Author the section.
2. Add keys to the canonical locale.
3. `npm run validate`.

**Dependencies:**
- Plan 14 (localization scaffolding) for the locale path.
- Plan 20's "Trust & Safety Phrasing" rule.

**Complexity:** S

---

### Tasks

The new tasks are listed in § 4. They follow the existing
numbering: next free slot per directory.

---

## 4. Suggested Task Breakdown

These tasks are authored verbatim into the task tree. IDs assume
the next free slot per directory **as of the timestamp of this
plan**; coordinate with Plan 20 if it claims overlapping slots
first.

**`tasks/mvp/02-content-schemas/`**

- [ ] 25 — `safe-user-text` helper + JSX `dangerouslySetInnerHTML` ban + `localStorage`/cookie ban CI lint
- [ ] 26 — `data-inventory.md` author + wipe-scope policy + CI registry-scan
- [ ] 27 — `content-report.schema.json` + canonical example
- [ ] 28 — `privacy-options.schema.json` + canonical example
- [ ] 29 — `asset-index.schema.json` extension: `pathScheme`, extension allowlist, examples (canonical / external-URL-rejected / path-traversal-rejected / forbidden-extension-rejected)
- [ ] 30 — `localization.schema.json` extension: `interpolation` block + canonical example
- [ ] 31 — `manifest.schema.json` extensions: `aiProvenance` block + `overrides[]` + `capabilities` default-deny
- [ ] 32 — `generated-faction.schema.json` extensions: `notes.playerInspectable`, `notes.modelVersion`
- [ ] (edit) 10 — extend Zod validator coverage to schemas 27, 28, 29, 30, 31, 32
- [ ] (edit) 14 — add `interpolation` block acceptance line

**`tasks/mvp/02b-asset-pipeline/`**

- [ ] (next free) `binary-asset-validators.md` — magic-byte sniff, dimension/duration probe, decode-off-thread, font ban, font-`'self'` CSP

**`tasks/mvp/07-ui-shell/`**

- [ ] 10 — Privacy pane in screen 56 (display-name mode, analytics opt-in, mature-content gate, "Forget me" entry)
- [ ] 11 — Render `playerLabel` (not `displayName`) in screen 57-high-scores when `displayNameMode = hashed`
- [ ] 12 — AI-content badge on hero/unit/faction info-card screen packages

**`tasks/mvp/08-persistence/`**

- [ ] 06 — Display-name hash + per-installation salt (`src/persistence/display-name-hash.ts`)
- [ ] 07 — `WIPE_LOCAL_DATA` handler (`src/persistence/wipe-local-data.ts`) — iterates `data-inventory.md` rows
- [ ] 08 — Outbound content-report queue (`src/persistence/content-report-queue.ts`) — local persistence + retry-stub
- [ ] (edit) 01 — IndexedDB wrapper exposes the four DB names declared in `persistence.md`
- [ ] (edit) 02 — save-format binds the `metadata.playerHash` / `metadata.displayNameMode` fields

**`tasks/phase-2/04-content-editor/`**

- [ ] (next free) `publish-disclaimer-flow.md` — Map Editor `Publish…` → screen 66-ugc-publish-disclaimer → local `.hrmod` export

**`tasks/phase-2/05-mod-system/`**

- [ ] (edit) 01 — pack loader rejects non-pack-relative asset paths + applies binary validators + applies `scripts.none` byte sniffs
- [ ] (edit) 02 — signature verification respects `aiProvenance.present` and never auto-trusts AI packs
- [ ] (edit) 03 — sandbox mode includes the override-precedence enforcer + `unauthorized-shadow` failure path
- [ ] 08 — Content-report intake + local queue (binds screen 68-content-report)
- [ ] 09 — AI-provenance detail screen (screen 67) wiring + `OPEN_AI_PROVENANCE` command handler

**Architecture / docs**

- [ ] Author [`docs/architecture/data-inventory.md`](../../architecture/data-inventory.md)
      with the seed table from Critical Fix "Authoring data-inventory"
- [ ] Author [`docs/architecture/persistence.md`](../../architecture/persistence.md)
      with the per-slice mapping table + `localStorage` ban
- [ ] Author [`docs/architecture/ugc-safety.md`](../../architecture/ugc-safety.md)
      with §§ External URL Ban, CSP Baseline, Text Sanitization Contract,
      Binary Asset Validators, Capability Enforcement, ICU Locks,
      Localization Keys
- [ ] Author [`docs/architecture/permissions.md`](../../architecture/permissions.md)
      with the closed-allowlist table
- [ ] Edit [`pack-contract.md`](../../architecture/pack-contract.md) for
      Asset Path Scheme + Override Precedence + Capability Enforcement
      cross-links
- [ ] Edit [`command-schema.md`](../../architecture/command-schema.md)
      to register `WIPE_LOCAL_DATA`, `REPORT_PACK`, `OPEN_AI_PROVENANCE`,
      `TOGGLE_HASHED_DISPLAY_NAME`, `TOGGLE_ANALYTICS_OPT_IN`,
      `TOGGLE_MATURE_CONTENT_GATE`, `OPEN_PUBLISH_DISCLAIMER`,
      `ACCEPT_PUBLISH_DISCLAIMER`, `EXPORT_SCENARIO_AS_PACK`,
      `OPEN_CONTENT_REPORT`, `SUBMIT_CONTENT_REPORT`, `CANCEL_CONTENT_REPORT`
- [ ] Edit [`schema-matrix.md`](../../architecture/schema-matrix.md) and
      [`content-schema/README.md`](../../../content-schema/README.md) for
      the two new schemas + the schema extensions
- [ ] Edit [`24-save-flow.md`](../../architecture/diagrams/24-save-flow.md)
      to replace "Write to disk" with the IndexedDB store name
- [ ] Edit [`ai-generation-pipeline.md`](../../architecture/ai-generation-pipeline.md)
      to emit `aiProvenance` and (optionally) route through screen 66
- [ ] Edit [`CLAUDE.md`](../../../CLAUDE.md) to add the data-inventory rule
      and the `permissions.md` rule

**Screen packages**

- [ ] Author screen 66 (`ugc-publish-disclaimer`) — five files
- [ ] Author screen 67 (`ai-provenance-detail`) — five files
- [ ] Author screen 68 (`content-report`) — five files
- [ ] Edit screen 54 (`system-menu`) — add "Forget me on this device"
- [ ] Edit screen 56 (`options`) — add Privacy pane
- [ ] Edit screen 57 (`high-scores`) — render `playerLabel`
- [ ] Edit screen 65 (`map-editor`) — add `Publish…` affordance
- [ ] Edit hero / unit / faction info-card screens — add AI-content badge
- [ ] Edit [`index.json`](../../architecture/wiki/screens/index.json) to
      register screens 66, 67, 68 (coordinate numbering with Plan 20)
- [ ] Run `npm run generate:wiki`

**Localization**

- [ ] Add `ui.publish.policy.*`, `ui.report.*`, `ui.ai-provenance.*`,
      `ui.privacy.*`, `ui.ugc.warning.*` keys to canonical locale
- [ ] Extend Plan 20's "Trust & Safety Phrasing" rule to all five
      namespaces

---

## 5. Execution Order

The graph below resolves into a buildable order. **Dependencies are
strictly file-level.** Where a step's prerequisite is owned by
Plan 20, the dependency is on the **file** declared by Plan 20 (e.g.,
`save.schema.json`), not on Plan 20 as a whole.

**Wave 1 — Foundational docs (parallel):**

1. Author `data-inventory.md` (Critical Fix #7).
2. Author `persistence.md` (Improvements: persistence medium).
3. Author `permissions.md` (Improvements: OS-permissions policy).
4. Author `ugc-safety.md` skeleton (§§ to be filled by Wave 2).

**Wave 2 — Schema edits (parallel; depend on Wave 1):**

5. `asset-index.schema.json` — `pathScheme` + extension allowlist
   (Critical Fix #1, #3).
6. `manifest.schema.json` — `aiProvenance` + `overrides[]` +
   `capabilities` default-deny (Critical Fix #4, #8; Improvements:
   AI provenance).
7. `localization.schema.json` — `interpolation` block (Critical
   Fix #2; Improvements: localization injection).
8. `generated-faction.schema.json` — `playerInspectable` +
   `modelVersion` (Improvements: AI provenance).
9. `content-report.schema.json` — new (Improvements: content
   report).
10. `privacy-options.schema.json` — new (Improvements: privacy
    pane).

**Wave 3 — Cross-cutting docs + commands (parallel; depend on Wave 2):**

11. `pack-contract.md` edits (Asset Path Scheme + Override
    Precedence + Capability Enforcement cross-link).
12. `command-schema.md` edits (12 new commands).
13. `schema-matrix.md` + `content-schema/README.md` updates.
14. `ugc-safety.md` final sections (Text Sanitization Contract,
    Binary Asset Validators, Capability Enforcement, ICU Locks,
    Localization Keys).
15. `24-save-flow.md` edit (medium = IndexedDB).
16. `ai-generation-pipeline.md` edit (Stage 6 emits `aiProvenance`).
17. `CLAUDE.md` edits.

**Wave 4 — Save schema field additions:**

18. Coordinate with Plan 20: add `metadata.playerHash`,
    `metadata.displayNameMode`, `metadata.playerLabel`, optional
    `metadata.playerName` to the save schema task. **If Plan 20
    has not landed**, this wave waits until that schema artifact
    exists; otherwise this wave only adds fields.

**Wave 5 — Screens (depend on Waves 1–4):**

19. Author screen 66 (`ugc-publish-disclaimer`).
20. Author screen 67 (`ai-provenance-detail`).
21. Author screen 68 (`content-report`).
22. Edit screen 54 (system-menu) — Forget me.
23. Edit screen 56 (options) — Privacy pane.
24. Edit screen 57 (high-scores) — `playerLabel`.
25. Edit screen 65 (map-editor) — `Publish…`.
26. Edit hero / unit / faction info-card screen packages — AI badge.
27. Update `index.json` and run `npm run generate:wiki`.

**Wave 6 — Localization (depends on Wave 5):**

28. Add the five key namespaces to the canonical locale.
29. Extend Plan 20's phrasing rule.

**Wave 7 — Persistence + UI tasks (depend on Waves 1–6):**

30. `tasks/mvp/02-content-schemas/25-32` (eight tasks, parallel).
31. `tasks/mvp/02b-asset-pipeline/<n>-binary-asset-validators`.
32. `tasks/mvp/07-ui-shell/10-12` (parallel).
33. `tasks/mvp/08-persistence/06-display-name-hash`.
34. `tasks/mvp/08-persistence/07-wipe-local-data-handler` —
    depends on 06 and on `data-inventory.md`.
35. `tasks/mvp/08-persistence/08-content-report-queue`.
36. `tasks/phase-2/04-content-editor/<n>-publish-disclaimer-flow`.
37. `tasks/phase-2/05-mod-system/01-03` edits, `08`, `09`.

**Wave 8 — Validation:**

38. `npm run validate:tasks` (must enforce the data-inventory
    registry-scan rule).
39. `npm run validate` (full repo).
40. `npm run generate:task-system-report` to regenerate the
    traceability map.

**Numbering coordination with Plan 20:** Plan 20 claimed screens
66, 67, 68 in its draft (`save-import`, `pack-manager`,
`pack-trust-prompt`). If those land first, this plan re-numbers
its screens to 69, 70, 71 — the canonical numbers are decided at
merge time by [`docs/architecture/wiki/screens/index.json`](../../architecture/wiki/screens/index.json)
and updated in the task list above.

---

## 6. Risks if Not Implemented

- **Silent IP exfiltration** (Q390) — a malicious or careless pack
  declares `https://attacker.example/probe.png`; loader fetches it
  on render; IP, Referer, UA leak with no user signal.
- **Persistent XSS via UGC text** (Q388) — any future component
  switching to `dangerouslySetInnerHTML` (markdown previews, rich
  tooltips) reopens the hole because no contract forbids it.
- **Localization injection** (Q394) — UGC translation files inject
  template tokens into trusted UI surfaces; bypasses the chat
  sanitization rule.
- **Decoder-bug surface on UGC binaries** (Q389, Q391) — malformed
  PNG/WebP/MP3/font triggers a decoder bug on first render; no
  validator pipeline catches it.
- **Capability claim is decorative** (Q387) — `scripts.none` is
  asserted in the manifest but no scanner enforces it; a malicious
  pack omitting the capability and smuggling executable bytes is
  not blocked.
- **Cleartext `playerName` on shared devices** (Q405) — a
  multi-user device exposes the display name in saves; sharing a
  save file shares the name with no opt-out.
- **No encryption-at-rest** (Q402) — combined with cleartext
  `playerName`, GDPR right-to-erasure cannot be honored even with
  a wipe command unless the wipe enumerates every store.
- **No "Forget me"** (Q401, Q406) — right-to-erasure cannot be
  honored, period; chat history, options, and saves persist
  forever or until the user wipes browser storage manually.
- **Override / shadowing without visibility** (Q395) — UGC packs
  can shadow canonical IDs without an HUD signal; competitive
  integrity erodes; support cannot triage.
- **No takedown / report flow** (Q393) — once a malicious or
  infringing pack ships, there is no client-side mechanism to
  invalidate it or refuse it in saves/replays.
- **No content-policy ack at publish** (Q392) — creators have no
  acknowledged content policy; legal exposure cannot be capped on
  the creator side.
- **AI provenance hidden from players** (Q396) — players cannot
  distinguish AI from human-authored content; regulatory
  disclosure requirements are not satisfiable.
- **Latent permission creep** (Q407) — with no `permissions.md`,
  future contributors wire clipboard / mic / camera ad-hoc; the
  absence of an allowlist is a governance risk.
- **Latent token-storage default** (Q400) — once an auth surface
  lands, the path of least resistance is `localStorage`; any XSS
  becomes credential exfiltration.
- **No analytics-identifier model** (Q403) — the first analytics
  integrator picks a default that bypasses opt-in.
- **No crash-dump redaction policy** (Q404) — crash reports may
  include `playerName`, save thumbnails, or chat excerpts.
- **No data inventory** (Q409) — inconsistencies between audits
  21, 22, and 27 become inevitable; the legal team has nothing to
  review; new persistent slices silently widen the privacy
  footprint.
- **Latent social-state surface** (Q408) — a future contributor
  adds `state.social.*` ad-hoc with no governance gate.

---

## 7. AI Implementation Readiness

**Before this plan:** **1.5 / 10**
**After this plan:** **8 / 10** (target)

**Why 8, not 10:**

- The plan formalizes every contract an AI agent needs to land the
  surface autonomously: four new architecture docs, two new
  schemas, six schema extensions, three new screen packages, edits
  to four existing screens, twelve new commands, and ~20 new task
  files with `Owned Paths`, `Dependencies`, `Verify`, and
  `Acceptance Criteria`. This satisfies the "data-driven,
  contract-first" rule in [CLAUDE.md](../../../CLAUDE.md) without
  requiring further invention.
- Three items remain inherently dependent on later plans and are
  flagged as such, capping the score at 8:
  1. **Plan 22 (privacy / retention / error leaks)** must land
     before crash-dump redaction graduates from "in-memory only,
     no upload" to a full pipeline. Until then, this plan
     declares the **redaction baseline** so Plan 22 inherits a
     clear contract.
  2. **Plan 25 (signaling-server credentials, authenticated
     peers)** must land before any auth-token storage exists.
     Until then, this plan declares the **`localStorage` ban** so
     Plan 25 cannot regress it.
  3. **Plan 30 (moderation backend)** must land before
     `REPORT_PACK` envelopes leave the device. Until then, this
     plan declares the **client envelope** and a **local queue
     with retry stub**, so Plan 30 has a clean dequeue point.
- A separate cap of *0.5* is from the **screen-numbering
  coordination** with Plan 20: until both plans land, the canonical
  screen numbers in [`index.json`](../../architecture/wiki/screens/index.json)
  are not finalized.
- An AI agent asked to "implement UGC + personal-data storage"
  after this plan can pick `npm run tasks:next:mvp`, land the
  schema tasks (25–32) and persistence tasks (06–08) in the
  declared order, with `npm run validate` and
  `npm run validate:tasks` enforcing every contract. The
  data-inventory registry-scan turns the privacy footprint into a
  hard CI gate. No fresh invention is required at any step.
