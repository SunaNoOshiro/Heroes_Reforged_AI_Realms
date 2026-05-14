# Asset Policy — Allowed and Forbidden Asset Kinds

`asset-index.schema.json` declares each asset's `kind` against a
**closed enum**. The two tables below are the human-readable
mirror of that enum. The schema is canonical; on any disagreement,
trust the schema and update this doc.

Two rules cover every change:

- **New kind** → schema enum amendment + this doc + (if a new
  decoder) [`asset-loading.md`](./asset-loading.md).
- **Sanitizer-class CVE surface** (SVG, font, video, HTML) →
  **forbidden**, rejected at schema-validation time before the
  loader ever sees the bytes.

Companion docs:
- [`asset-loading.md`](./asset-loading.md) — decoder caps and
  pre-flight pipeline that the kinds below feed into.
- [`pack-contract.md`](./pack-contract.md) — Asset Rule cross-link.
- [`ugc-safety.md`](./ugc-safety.md) §§ 1, 5 — External URL Ban and
  the closed extension allowlist this enum is consistent with.
- [`pack-error-codes.md`](./pack-error-codes.md) — owner of
  `pack.error.asset.kind-forbidden` (referenced in § 2).

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
[`ugc-safety.md` § 5](./ugc-safety.md#5-binary-asset-validators). An
asset declaring a kind from the table above MUST also use an
extension from the allowlist; the asset-index `path` regex enforces
both layers at schema time.

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
[`pack-error-codes.md`](./pack-error-codes.md)) at
**schema-validation time**, not at decode time. The byte-level
extension sniff that backs up the schema check for default
(`scripts.none`) packs is owned by
[`ugc-safety.md` § 6](./ugc-safety.md#6-capability-enforcement).

---

## 3. Adding a new kind

1. Open an architecture amendment that updates this doc plus
   [`asset-loading.md`](./asset-loading.md) (decoder, magic bytes,
   per-asset caps) and, when a new Worker / Worklet surface is
   needed, [`worker-csp.md`](./worker-csp.md) (security profile).
2. Extend `asset-index.schema.json` `kind` enum and the `path`
   regex's extension group if the new format adds an extension.
3. Run `npm run generate:enum-snapshot` and commit the diff per
   [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md).
4. Extend the security-test corpus under
   [`tests/security/escape-vectors/`](../../tests/security/escape-vectors/)
   (owned by
   [`tasks/mvp/00-core-architecture/22-05-security-tests-escape-vectors-corpus.md`](../../tasks/mvp/00-core-architecture/22-05-security-tests-escape-vectors-corpus.md))
   with refusal fixtures for the new kind's worst-case payload.

If the new kind requires a sanitizer (e.g. SVG, HTML), the
amendment MUST be rejected unless the codebase has shipped a
fuzz-tested sanitizer with at least 30 days of CI green; absent
that, the kind stays in the forbidden list.

---

## 4. Cross-references

- `asset-index.schema.json` — closed `kind` enum and extension
  allowlist.
- [`asset-loading.md` § 4](./asset-loading.md#4-magic-byte-table) —
  magic bytes per kind.
- [`pack-contract.md` § Asset Rule](./pack-contract.md#asset-rule)
  — pack-side binding of `kind`, `sha256`, and the cap table.
- [`ugc-safety.md` § 1](./ugc-safety.md#1-external-url-ban),
  [§ 5](./ugc-safety.md#5-binary-asset-validators) — extension
  allowlist rationale and UGC-tier validator order.
- [`pack-error-codes.md`](./pack-error-codes.md) — `pack.error.asset.kind-forbidden`
  and the rest of the closed asset error-code list.
- [`tests/security/escape-vectors/`](../../tests/security/escape-vectors/)
  — kind-forbidden fixture matrix.

---

## 🔍 Sync Check

- **UI: ✔** — Doc has no UI surface; no screen package to
  cross-check.
- **Schema: ✔** — Table § 1 matches
  [`asset-index.schema.json`](../../content-schema/schemas/asset-index.schema.json)
  `kind` enum (12 values: `image | sprite | atlas | tile | audio | audio-bank | sound | music | ambient | animation | theme | data`)
  and the schema's `description` already pins enforcement to
  this doc; closed extension allowlist (`png/webp/ogg/mp3/json`) on
  the schema's `path` regex matches § 1. `AssetIndex` row present
  in [`schema-matrix.md`](./schema-matrix.md).
  `pack.error.asset.kind-forbidden` resolves in
  [`pack-error-codes.md`](./pack-error-codes.md) and back-references
  this doc § 2.
- **Tasks: ✔** — Both owning tasks list this doc in `Read First`:
  [`tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md`](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md)
  (loader-side closed-kind enforcement) and
  [`tasks/mvp/00-core-architecture/22-05-security-tests-escape-vectors-corpus.md`](../../tasks/mvp/00-core-architecture/22-05-security-tests-escape-vectors-corpus.md)
  (fixture corpus for the kind-forbidden refusal); both have
  matching entries in `tasks/task-registry.json`. Companion arch
  docs (`asset-loading.md`, `pack-contract.md`, `ugc-safety.md`,
  `pack-error-codes.md`, `pack-scripting.md`) back-link
  reciprocally.

## ⚠ Issues

- **No `kind-forbidden` fixture in `tests/security/escape-vectors/`
  yet.** § 4 and § 2 both point at
  [`tests/security/escape-vectors/`](../../tests/security/escape-vectors/)
  as the refusal-matrix corpus. The directory currently ships
  fixtures for `malformed-png`, `mime-polyglot`, `oversized-png`,
  `oog-channel-bomb`, `bigint-confusion`, `icu-injection`,
  `proto-pollution`, `zip-bomb`, and `zip-traversal`, but no
  forbidden-kind fixture (e.g. a pack declaring `kind: "svg"` or
  `kind: "wasm"`). The owning task
  [`tasks/mvp/00-core-architecture/22-05-security-tests-escape-vectors-corpus.md`](../../tasks/mvp/00-core-architecture/22-05-security-tests-escape-vectors-corpus.md)
  already lists this doc's § 2 forbidden-kind table among its
  Inputs, so closing the gap is in-scope for that task. Skill did
  not add the fixture (Hard Prohibition D — never edit
  cross-checked files). Suggested fixtures: one per forbidden row
  (`svg`, `font`, `video`, `html`, `wasm`, `js`), each asserting
  `Result.err("pack.error.asset.kind-forbidden", …)` at
  schema-validation time.
