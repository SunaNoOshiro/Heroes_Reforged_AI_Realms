# Binary Asset Validators

Status: planned

Module: [Asset Pipeline](../02b-asset-pipeline.md)

Description:
Implement the magic-byte sniff, MIME match, dimension/duration
probe, decode-off-thread, and font ban for every binary asset
loaded from a pack. Constants and validator order are normative
per [`ugc-safety.md` § Binary Asset Validators](../../../docs/architecture/ugc-safety.md#5-binary-asset-validators).

Read First:
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/asset-normalization.md`](../../../docs/architecture/asset-normalization.md)

Inputs:
- Allowed image MIMEs: `image/png`, `image/webp`. Max 4096×4096,
  4 MiB.
- Allowed audio MIMEs: `audio/ogg`, `audio/mpeg`. Max 120 s, 2 MiB.
- Forbidden: `image/svg+xml`, `.otf`, `.ttf`, `.woff`, `.woff2`.
- Decoder APIs: `createImageBitmap`,
  `AudioContext.decodeAudioData`.

Outputs:
- `src/content-runtime/binary-asset-validators.ts`
- `src/content-runtime/__tests__/binary-asset-validators.test.ts`

Owned Paths:
- `src/content-runtime/binary-asset-validators.ts`
- `src/content-runtime/__tests__/binary-asset-validators.test.ts`

Dependencies:
- mvp.02-content-schemas.36-asset-index-pathscheme-and-extension-allowlist

Acceptance Criteria:
- Validator order: magic-byte sniff → MIME match →
  dimension/duration probe → decode-off-thread → cache.
- Any failure marks the asset `invalid` and emits a per-asset
  diagnostic; no engine crash, no silent fallback.
- Forbidden extensions are rejected at the schema layer (covered
  by task 36); this validator is the runtime safety net.
- Tests cover canonical, malformed-PNG, oversized-PNG,
  zero-byte-WebP, audio-too-long, and forbidden-font cases.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
