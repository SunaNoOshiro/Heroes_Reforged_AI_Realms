# UGC Safety

Sanitization, validation, and capability rules for every user-supplied
or AI-generated payload that enters the runtime — text, images, audio,
fonts, and pack capability declarations.

Companion docs:
- [`csp.md`](./csp.md) — canonical Content-Security-Policy that
  bounds § 2.
- [`pack-contract.md`](./pack-contract.md) — Asset Path Scheme +
  Override Precedence + Capability Enforcement.
- [`pack-trust.md`](./pack-trust.md) — Resource Limits and trust
  prompt; consumer of capability declarations.
- [`asset-loading.md`](./asset-loading.md) — canonical decoder caps +
  pre-flight pipeline consumed by § 5.
- [`asset-policy.md`](./asset-policy.md) — closed asset-kind enum +
  forbidden-format CVE table.
- [`chat-safety.md`](./chat-safety.md) — chat sanitization reuses § 3.

Schemas this doc binds to:
- [`asset-index.schema.json`](../../content-schema/schemas/asset-index.schema.json)
  — `pathScheme: "pack-relative"`, closed extension allowlist
  (`png`, `webp`, `ogg`, `mp3`, `json`).
- [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  — `capabilities` default-deny, `aiProvenance`.
- [`localization.schema.json`](../../content-schema/schemas/localization.schema.json)
  — per-key `interpolation` block consumed by § 4.

Section numbers below are public anchors — sibling docs, schemas, and
tasks link `#1-external-url-ban`, `#3-text-sanitization-contract`,
`#4-icu-locks`, `#5-binary-asset-validators`,
`#6-capability-enforcement`, and `#7-localization-keys`. Do not
renumber.

---

## 1. External URL Ban

Pack assets MUST be **pack-relative**. Absolute schemes (`http://`,
`https://`, `file://`, `data:`, `blob:`) are forbidden in
`assets/index.json`. The schema enforces this via a
`pathScheme: "pack-relative"` constant plus a `path` regex on every
entry; the loader rejects deviations at load time with
`pack.error.asset.external-url` (catalogued in
[`pack-error-codes.md`](./pack-error-codes.md)). Refusal is fail-loud
per CLAUDE.md.

Cross-link:
[`pack-contract.md` § Asset Path Scheme](./pack-contract.md#asset-path-scheme),
[`asset-index.schema.json`](../../content-schema/schemas/asset-index.schema.json).

## 2. CSP Baseline

The host Content-Security-Policy is canonical in
[`csp.md` § 1 Shipped policy](./csp.md#1-shipped-policy); this doc
defers to it. The host shell ships the policy via a `<meta>` tag and
a matching HTTP header, kept lockstep by the build pipeline (see
[`csp.md` § 3 CI gate](./csp.md#3-ci-gate)).

Why it matters here: `script-src 'self'` plus `object-src 'none'`
plus the Asset Path Scheme rule (§ 1) together close the
IP-exfiltration surface that UGC and AI-generated packs would
otherwise re-open. `img-src` / `media-src` allow `blob:` so decoded
UGC bytes can be rendered; `pack://` virtual fetches never reach the
network origin.

## 3. Text Sanitization Contract

Binding for all of `src/ui/`:

- **Default render mode is text-only.** Every UGC, AI-generated, or
  remote-sourced string MUST render through a JSX text node or a
  `<Text value={...} />` wrapper.
- **`dangerouslySetInnerHTML` is forbidden in `src/ui/`.** A CI lint
  rule (owned by
  [`tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md`](../../tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md))
  enforces zero hits.
- **Markdown is opt-in per schema field.** A field may declare
  `"x-rendering": "markdown-restricted"` (e.g. `scenario.description`,
  `hero.biography`); that mode runs through DOMPurify with the closed
  allowlist `p, em, strong, ul, ol, li, code, a[href^="#"]`.
- **Interpolation is opt-in per locale key.** Localization keys
  declare an explicit `interpolation.allowedTokens` array; tokens
  not on the list render literally. ICU MessageFormat mode is opt-in
  per key (`interpolation.mode: "icu"`); without it, `{` and `}` are
  escaped.
- **No `eval`-style template engines.** Any future template library
  requires an architecture amendment.
- A Zod-side `safeUserText(maxLen)` helper under
  `src/content-schema/` is used by every schema field that accepts
  user text.

## 4. ICU Locks

When `interpolation.mode = "icu"` for a localization key:

- `allowedTokens[]` MUST list every named argument the format string
  uses; the resolver rejects unknown tokens.
- The ICU formatter allowlist (declared by
  [`tasks/mvp/02-content-schemas/37-localization-interpolation-block.md`](../../tasks/mvp/02-content-schemas/37-localization-interpolation-block.md))
  is `plural`, `select`, `selectordinal`, `number`, `date`, `time`.
  Any other formatter rejects the locale entry at load.
- UGC-supplied translation files (loaded from a non-canonical pack)
  MAY NOT raise the interpolation tier of an existing canonical key
  (e.g. cannot turn `mode: "literal"` into `mode: "icu"`). The merge
  resolver enforces "tier-min".

## 5. Binary Asset Validators

The kind enum and forbidden-format CVE table are canonical in
[`asset-policy.md`](./asset-policy.md). The numeric decoder caps are
canonical in
[`asset-loading.md` § 1.1](./asset-loading.md#11-per-asset-decoder-caps).
The values below are the **UGC-tier** ceilings this doc enforces in
addition to those canonical caps; constants are normative for any
asset that arrives via UGC ingestion (publish flow, import,
sandboxed pack load).

### Images

- Allowed MIME via magic bytes: `image/png`, `image/webp`.
- Max dimensions: `4096 × 4096`.
- Max file size: `4 MiB`.
- Decoded off the main thread via `createImageBitmap` only (no
  `<img>` first-load probing).
- `image/svg+xml` is **forbidden in UGC** (script-bearing); see
  [`asset-policy.md` § 2 Forbidden kinds](./asset-policy.md#2-forbidden-kinds).

### Audio

- Allowed MIME via magic bytes: `audio/ogg` (Vorbis or Opus),
  `audio/mpeg`.
- Max duration: `120 s` per clip; `30 s` for UI clips.
- Max file size: `2 MiB`.
- Decoded via `AudioContext.decodeAudioData`.

### Fonts

- **Disallowed in UGC at v1.** Packs may not declare entries with
  extensions `.otf`, `.ttf`, `.woff`, `.woff2`. The asset-index
  schema rejects them via the closed extension allowlist on `path`.
- Trusted system fonts are the only render surface.
- CSS `font-src 'self'`.

### Validator order

magic-byte sniff → MIME match → dimension/duration probe →
decode-off-thread → cache. Any failure marks the asset `invalid`
and the pack receives a per-asset diagnostic. No engine crash, no
silent fallback.

Cross-link:
[`tasks/mvp/02b-asset-pipeline/17-binary-asset-validators.md`](../../tasks/mvp/02b-asset-pipeline/17-binary-asset-validators.md),
[`pack-contract.md` § Asset Rule](./pack-contract.md#asset-rule).

## 6. Capability Enforcement

The pack manifest's `capabilities[]` is a **load-bearing**
declaration, not decorative.

- **Closed-enum check.** `capabilities[]` MUST be a subset of the
  schema's closed enum
  ([`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)):
  `formulas.ast`, `spells.custom-kind`, `abilities.custom-kind`,
  `assets.binary`, `scripts.none`. Any unknown entry rejects the
  pack at load time.
- **Default-deny.** A pack that omits the `capabilities` field is
  treated as `["scripts.none"]`; the schema declares
  `default: ["scripts.none"]`.
- **Byte-level sniffs.** When `scripts.none` is declared (or
  default):
  - No file in the pack may have an extension in
    `{js, mjs, cjs, ts, wasm, html, htm, svg}`.
  - No `formulas.ast` node may include kinds outside the Effect
    Registry's pure-evaluator set declared in
    [`effect-registry.md`](./effect-registry.md).
  - No JSON value may include a key matching
    `^__|prototype$|constructor$` (prototype-pollution defense).
- **Resource limits.** Decompression-ratio caps and ZIP
  path-traversal sanitization are owned by
  [`pack-trust.md` § 1 Resource Limits](./pack-trust.md#1-resource-limits);
  this doc does not redefine those constants. The loader applies
  both layers.

Cross-link:
[`pack-contract.md` § Capability Enforcement](./pack-contract.md#capability-enforcement),
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json).

## 7. Localization Keys

The following key namespaces are reserved for UGC + privacy
surfaces:

| Namespace | Surface |
| --- | --- |
| `ui.publish.policy.*` | Content-policy modal copy (screen 73). |
| `ui.report.*` | Content-report screen copy (screen 75). |
| `ui.ai-provenance.*` | Provenance detail screen copy (screen 74). |
| `ui.privacy.*` | Privacy pane (screen 56) + "Forget me" confirmation (screen 60, entered from screen 54). |
| `ui.ugc.warning.*` | Inline warnings on tooltips when AI / sandboxed content is rendered. |

The "Trust & Safety Phrasing" rule from
[`pack-trust.md` § 7](./pack-trust.md#7-trust--safety-phrasing)
extends to all five namespaces: copy is plain, action-oriented, and
free of jargon.

## 8. Cross-References

- [`docs/architecture/data-inventory.md`](./data-inventory.md) —
  per-field retention and wipe scope for UGC-derived data.
- [`docs/architecture/persistence.md`](./persistence.md) — storage
  medium for sanitized UGC.
- [`docs/architecture/permissions.md`](./permissions.md) — decoder
  APIs (`createImageBitmap`, `AudioContext.decodeAudioData`).
- [`docs/architecture/ai-generation-pipeline.md`](./ai-generation-pipeline.md)
  — emits `aiProvenance` consumed by screen 74.

---

## 🔍 Sync Check

- **UI: ✔** — Localization namespaces in § 7 match
  [`wiki/screens/73-ugc-publish-disclaimer/data-contracts.md`](./wiki/screens/73-ugc-publish-disclaimer/data-contracts.md)
  (`ui.publish.policy.*`),
  [`wiki/screens/74-ai-provenance-detail/data-contracts.md`](./wiki/screens/74-ai-provenance-detail/data-contracts.md)
  (`ui.ai-provenance.*`),
  [`wiki/screens/75-content-report/data-contracts.md`](./wiki/screens/75-content-report/data-contracts.md)
  (`ui.report.*`),
  [`wiki/screens/56-options/data-contracts.md`](./wiki/screens/56-options/data-contracts.md)
  (`ui.privacy.*`), and the "Forget me" flow on
  [`wiki/screens/54-system-menu/`](./wiki/screens/54-system-menu/)
  routed through
  [`wiki/screens/60-confirmation-dialog/`](./wiki/screens/60-confirmation-dialog/).
  `ui.ugc.warning.*` is owned by
  [`tasks/mvp/07-ui-shell/24-ai-content-badge-on-info-cards.md`](../../tasks/mvp/07-ui-shell/24-ai-content-badge-on-info-cards.md).
- **Schema: ✔** — Asset-index `pathScheme: "pack-relative"` plus the
  closed extension allowlist (`png/webp/ogg/mp3/json`), manifest
  `capabilities` default `["scripts.none"]`, the closed capability
  enum
  (`formulas.ast | spells.custom-kind | abilities.custom-kind | assets.binary | scripts.none`),
  the `aiProvenance` block, and the per-key `interpolation` shape
  (`mode ∈ literal | named | icu`, `allowedTokens[]`) all match
  [`asset-index.schema.json`](../../content-schema/schemas/asset-index.schema.json),
  [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json),
  and
  [`localization.schema.json`](../../content-schema/schemas/localization.schema.json);
  `AssetIndex`, `Manifest`, and `Localization` rows are present in
  [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — Owning tasks
  [`tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md`](../../tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md),
  [`37-localization-interpolation-block.md`](../../tasks/mvp/02-content-schemas/37-localization-interpolation-block.md),
  [`36-asset-index-pathscheme-and-extension-allowlist.md`](../../tasks/mvp/02-content-schemas/36-asset-index-pathscheme-and-extension-allowlist.md),
  [`38-manifest-ai-provenance-and-capabilities-default.md`](../../tasks/mvp/02-content-schemas/38-manifest-ai-provenance-and-capabilities-default.md),
  [`39-generated-faction-player-inspectable.md`](../../tasks/mvp/02-content-schemas/39-generated-faction-player-inspectable.md),
  and
  [`tasks/mvp/02b-asset-pipeline/17-binary-asset-validators.md`](../../tasks/mvp/02b-asset-pipeline/17-binary-asset-validators.md)
  all list this doc in `Read First`; matching entries exist in
  `tasks/task-registry.json`.

## ⚠ Issues

- **UGC-tier binary-asset ceilings have no registration in
  `asset-loading.md`.** § 5 declares UGC-tier maxima — image
  `4 MiB` / `4096 × 4096`, audio `2 MiB`, audio duration `120 s` per
  clip / `30 s` for UI clips. The canonical decoder cap table in
  [`asset-loading.md` § 1.1](./asset-loading.md#11-per-asset-decoder-caps)
  pins `maxAssetBytes = 32_000_000` (32 MB) for every kind and
  `maxAudioDurationMs = 60_000` (60 s) for every audio kind, and the
  per-tier matrix in
  [`§ 1.3 Tier hooks`](./asset-loading.md#13-tier-hooks) only lists
  `maxFetchesPerSecondPerPack` and `maxResidentBytesPerPack` as
  tier-aware — there is no UGC / sandboxed-tier row that overrides
  per-asset caps. Without that row, the validator described in
  [`tasks/mvp/02b-asset-pipeline/17-binary-asset-validators.md`](../../tasks/mvp/02b-asset-pipeline/17-binary-asset-validators.md)
  cannot derive its constants from a single source. The audit
  preserved § 5's values rather than silently rewriting them
  (Hard Prohibition A). Closer: the owner of task `mvp.02b.17`
  reconciles the two tables — either by adding a UGC /
  sandboxed-tier row to `asset-loading.md` § 1.3 matching these
  values, or by updating § 5 here to match `asset-loading.md`. The
  audit did not edit `asset-loading.md` (Hard Prohibition D).
- **Stale anchor `#binary-asset-validators` in `permissions.md`.**
  [`permissions.md`](./permissions.md) rows 34–35 link
  `ugc-safety.md#binary-asset-validators` (no leading `5-`), but the
  current heading is `## 5. Binary Asset Validators`, which resolves
  to `#5-binary-asset-validators`. The anchor never resolved.
  Renumbering § 5 here would break every other inbound link that
  uses `#5-binary-asset-validators`, so this audit kept the section
  number stable and surfaces the drift instead. Closer: the owner
  of [`permissions.md`](./permissions.md) updates the two anchor
  references to `#5-binary-asset-validators`. The audit did not
  edit `permissions.md` (Hard Prohibition D).
