# UGC Safety

> Sanitization, validation, and enforcement contracts for every
> user-supplied or AI-generated payload that enters the runtime —
> text, images, audio, fonts, and pack capability declarations.

## 1. External URL Ban

Pack assets MUST be **pack-relative**. Absolute schemes (`http://`,
`https://`, `file://`, `data:`, `blob:`) are forbidden in
`assets/index.json`. The schema enforces this with a `pathScheme`
constant and a regex on every entry's `path`. A malicious or
careless pack that declares `https://attacker.example/probe.png`
is rejected at load time with `pack.error.asset.external-url`.

The pack loader MUST reject any `assets/index.json` whose
`pathScheme != "pack-relative"` or whose `path` matches an absolute
scheme — fail loudly per CLAUDE.md "missing gameplay requirements
must fail loudly".

Cross-link:
[`pack-contract.md` § Asset Path Scheme](./pack-contract.md#asset-path-scheme),
[`asset-index.schema.json`](../../content-schema/schemas/asset-index.schema.json).

## 2. CSP Baseline

The app shell ships with the following Content-Security-Policy
header (or `<meta>` equivalent):

```
default-src 'self';
img-src 'self' blob:;
media-src 'self' blob:;
font-src 'self';
connect-src 'self' wss:;
script-src 'self';
style-src 'self' 'unsafe-inline';
object-src 'none';
frame-src 'none';
base-uri 'none';
```

`connect-src 'self' wss:` permits the WebRTC signaling channel.
`img-src` and `media-src` include `blob:` so decoded UGC assets can
be rendered. `script-src 'self'` plus `object-src 'none'` plus the
Asset Path Scheme rule together close the IP-exfiltration surface.

## 3. Text Sanitization Contract

Binding for all of `src/ui/`:

- **Default render mode is text-only.** Any UGC, AI-generated, or
  remote-sourced string MUST be rendered through a JSX text node or
  a `<Text value={...} />` wrapper.
- **`dangerouslySetInnerHTML` is forbidden in `src/ui/`.** A CI lint
  rule (owned by
  [`tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md`](../../tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md))
  enforces zero hits.
- **Markdown is opt-in per schema field.** A schema field may declare
  `"x-rendering": "markdown-restricted"` (e.g.,
  `scenario.description`, `hero.biography`); that mode goes through
  DOMPurify with the closed allowlist `p, em, strong, ul, ol, li,
  code, a[href^="#"]`.
- **Interpolation is opt-in per locale key.** Localization keys
  declare an explicit `interpolation.allowedTokens` array; any token
  not on the list is rendered literally. ICU MessageFormat mode is
  opt-in per key (`interpolation.mode: "icu"`); without it, `{` and
  `}` are escaped.
- **No `eval`-style template engines.** Any future template library
  must be approved via an architecture amendment.
- A Zod-side `safeUserText(maxLen)` helper under `src/content-schema/`
  is used by every schema field that accepts user text.

## 4. ICU Locks

When `interpolation.mode = icu` for a localization key:

- `allowedTokens[]` MUST list every named argument the format string
  uses; the resolver rejects unknown tokens.
- The ICU formatter allowlist (declared in
  [`tasks/mvp/02-content-schemas/37-localization-interpolation-block.md`](../../tasks/mvp/02-content-schemas/37-localization-interpolation-block.md))
  is `plural`, `select`, `selectordinal`, `number`, `date`, `time`.
  Any other formatter rejects the locale entry at load time.
- UGC-supplied translation files (those loaded from a non-canonical
  pack) MAY NOT raise the interpolation tier of an existing canonical
  key (e.g., they cannot turn `mode: literal` into `mode: icu`). The
  merge resolver enforces "tier-min".

## 5. Binary Asset Validators

Constants below are normative.

### Images

- Allowed MIME via magic bytes: `image/png`, `image/webp`.
- Max dimensions: `4096 × 4096`.
- Max file size: `4 MiB`.
- Decoded off the main thread via `createImageBitmap` only (no
  `<img>` first-load probing).
- `image/svg+xml` is **forbidden in UGC** (script-bearing).

### Audio

- Allowed MIME via magic bytes: `audio/ogg` (Vorbis or Opus),
  `audio/mpeg`.
- Max duration: `120 s` per clip; `30 s` for UI clips.
- Max file size: `2 MiB`.
- Decoded via `AudioContext.decodeAudioData`.

### Fonts

- **Disallowed in UGC at v1.** Packs may not declare entries with
  extensions `.otf`, `.ttf`, `.woff`, `.woff2`. The asset-index
  schema rejects them via a closed extension allowlist on `path`.
- Trusted system fonts are the only render surface.
- CSS `font-src 'self'`.

### Validator Order

magic-byte sniff → MIME match → dimension/duration probe →
decode-off-thread → cache. Any failure marks the asset `invalid`
and the pack receives a per-asset diagnostic. No engine crash, no
silent fallback.

Cross-link:
[`tasks/mvp/02b-asset-pipeline/`](../../tasks/mvp/02b-asset-pipeline/),
[`pack-contract.md`](./pack-contract.md).

## 6. Capability Enforcement

The pack manifest's `capabilities[]` is a **load-bearing** declaration,
not decorative.

- **Closed-enum check.** `capabilities[]` MUST be a subset of the
  schema's closed enum; any unknown entry rejects the pack at load
  time.
- **Default-deny.** A pack that omits the `capabilities` field
  entirely is treated as `["scripts.none"]`. The schema declares
  `default: ["scripts.none"]`.
- **Byte-level sniffs.** If `scripts.none` is declared (or default):
  - No file in the pack may have an extension in
    `{js, mjs, cjs, ts, wasm, html, htm, svg}`.
  - No `formulas.ast` node may include kinds outside the Effect
    Registry's pure-evaluator set declared in
    [`effect-registry.md`](./effect-registry.md).
  - No JSON value may include a key matching
    `^__|prototype$|constructor$` (prototype-pollution defense).
- **Cross-reference resource limits.** Decompression-ratio caps and
  ZIP-traversal sanitization are owned by
  [`pack-trust.md` § Resource Limits](./pack-trust.md). This
  document does not redefine those constants; the loader applies
  both layers.

Cross-link:
[`pack-contract.md` § Capability Enforcement](./pack-contract.md#capability-enforcement),
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json).

## 7. Localization Keys

The following key namespaces are reserved for UGC + privacy surfaces:

- `ui.publish.policy.*` — content-policy modal copy (screen 73).
- `ui.report.*` — content-report screen copy (screen 75).
- `ui.ai-provenance.*` — provenance detail screen copy (screen 74).
- `ui.privacy.*` — privacy pane (screen 56) + "Forget me"
  confirmation (screen 60 from screen 54).
- `ui.ugc.warning.*` — inline warnings on tooltips when AI/sandboxed
  content is rendered.

The "Trust & Safety Phrasing" rule from
[`pack-trust.md` § 7](./pack-trust.md#7-trust--safety-phrasing)
extends to all five namespaces: copy is plain, action-oriented, and
free of jargon.

## 8. Cross-References

- [`docs/architecture/pack-contract.md`](./pack-contract.md) — § Asset
  Path Scheme + § Override Precedence + § Capability Enforcement.
- [`docs/architecture/pack-trust.md`](./pack-trust.md) — Resource
  Limits and trust prompt; consumer of capability declarations.
- [`docs/architecture/data-inventory.md`](./data-inventory.md) — per-field
  retention and wipe scope for UGC-derived data.
- [`docs/architecture/persistence.md`](./persistence.md) — storage
  medium for sanitized UGC.
- [`docs/architecture/permissions.md`](./permissions.md) — decoder
  APIs (`createImageBitmap`, `AudioContext.decodeAudioData`).
- [`docs/architecture/ai-generation-pipeline.md`](./ai-generation-pipeline.md)
  — emits `aiProvenance` consumed by screen 74.
- [`docs/architecture/chat-safety.md`](./chat-safety.md) — chat
  sanitization reuses the rules in § 3.
