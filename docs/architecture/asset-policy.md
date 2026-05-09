# Asset Policy — Allowed and Forbidden Asset Kinds

`asset-index.schema.json` declares each asset's `kind` against a
**closed enum**. New kinds require a schema change. New kinds that
require a new decoder require a follow-up amendment to
[`asset-loading.md`](./asset-loading.md). Kinds that touch a
sanitizer-class CVE surface (SVG, font, video, HTML) are
**forbidden** and rejected by the schema before the loader ever
sees them.

Companion docs:
- [`asset-loading.md`](./asset-loading.md) — decoder caps and
  pre-flight pipeline that the kinds below feed into.
- [`pack-contract.md`](./pack-contract.md) — Asset Rule cross-link.
- [`ugc-safety.md`](./ugc-safety.md) — § External URL Ban and the
  closed extension allowlist that this enum is consistent with.

---

## 1. Allowed kinds

The schema enum is the single source of truth. The current set:

| Kind | Underlying format(s) | Decoder | Notes |
|---|---|---|---|
| `image` | PNG, WebP | `createImageBitmap` in a Worker | Generic bitmap (portrait, icon, banner, town background). Magic-byte gated per [`asset-loading.md` § 4](./asset-loading.md#4-magic-byte-table). |
| `sprite` | PNG, WebP | `createImageBitmap` in a Worker | Per-entity sprite sheet. |
| `atlas` | PNG, WebP | `createImageBitmap` in a Worker | TexturePacker-shaped atlas page. |
| `tile` | PNG, WebP | `createImageBitmap` in a Worker | Adventure-map tile. |
| `audio` | OGG, MP3 | `decodeAudioData` in `AudioWorklet` | Single track (theme, ambient bed). |
| `audio-bank` | OGG, MP3 (multi-clip) | `decodeAudioData` in `AudioWorklet` | Sound bank referenced by `sound-set.schema.json`. |
| `sound` | OGG, MP3 | `decodeAudioData` in `AudioWorklet` | One-shot sample. |
| `music` | OGG, MP3 | `decodeAudioData` in `AudioWorklet` | Looping music bed. |
| `ambient` | OGG, MP3 | `decodeAudioData` in `AudioWorklet` | Looping ambient layer. |
| `animation` | JSON | `JSON.parse` (capped) | Animation definition. |
| `theme` | JSON | `JSON.parse` (capped) | UI theme record. |
| `data` | JSON | `JSON.parse` (capped) | Generic structured data; bounded by [`parser-hardening.md`](./parser-hardening.md). |

The **closed extension allowlist** (`png`, `webp`, `ogg`, `mp3`,
`json`) is owned by `asset-index.schema.json` and pinned by
[`ugc-safety.md` § Binary Asset Validators](./ugc-safety.md). An
asset declaring a kind from the table above MUST also use an
extension from the allowlist.

---

## 2. Forbidden kinds

Pack assets MAY NOT include the kinds below. Each row names the
CVE class that closes by exclusion.

| Kind | Why it is forbidden | CVE class avoided |
|---|---|---|
| `svg` / `image/svg+xml` | SVG embeds JavaScript and arbitrary CSS; sanitizers ship a long tail of bypasses (DOMPurify CVE-2020-26870, CVE-2024-45801). | XSS via inline event handlers, stylesheet exfil. |
| `font` / `font/*` | Font shaping CVEs in HarfBuzz / FreeType / DirectWrite (CVE-2023-32360, CVE-2022-39134) target a complex byte-code parser. | Memory-safety bugs in shaping engines. |
| `video` / `video/*` | Browser video codecs (VP8, VP9, H.264, HEVC) repeatedly ship integer-overflow CVEs (CVE-2024-0517 V8 / WebCodecs class). | Codec memory corruption. |
| `text/html` / `html` | HTML imported into a pack would re-introduce inline scripts under the host CSP. | Capability escape; CSP bypass. |
| `wasm` / `application/wasm` | Capability escape; deferred to [`pack-scripting.md`](./pack-scripting.md). | Sandboxed code execution. |
| `js` / `mjs` / `cjs` / `ts` | Same as wasm — gated by [`pack-scripting.md`](./pack-scripting.md). | Capability escape. |

A pack that ships a forbidden kind is refused with
`pack.error.asset.kind-forbidden` (registered in
[`pack-error-codes.md`](./pack-error-codes.md)) at schema-validation
time, not at decode time.

---

## 3. Adding a new kind

1. Open an architecture amendment that updates this doc and
   [`asset-loading.md`](./asset-loading.md) with the decoder, magic
   bytes, caps, and Worker profile.
2. Extend `asset-index.schema.json` `kind` enum.
3. Run `npm run generate:enum-snapshot` and commit the diff per
   [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md).
4. Extend the security-test corpus with refusal fixtures for the
   new kind's worst-case payload.

If the new kind requires a sanitizer (e.g. SVG, HTML), the
amendment MUST be rejected unless the codebase has shipped a
fuzz-tested sanitizer with at least 30 days of CI green; absent
that, the kind stays in the forbidden list.

---

## 4. Cross-references

- `asset-index.schema.json` — closed enum and extension allowlist.
- [`asset-loading.md`](./asset-loading.md) § 4 — magic bytes per
  kind.
- [`pack-contract.md`](./pack-contract.md) — Asset Rule.
- [`ugc-safety.md`](./ugc-safety.md) — extension allowlist
  rationale.
- [`tests/security/escape-vectors/`](../../tests/security/escape-vectors/)
  — kind-forbidden fixture matrix.
