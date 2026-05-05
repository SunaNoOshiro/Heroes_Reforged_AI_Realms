# Zip Pack Loader (JSZip) + Manifest Parser

Status: planned

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Load a `.hrmod` file (ZIP with JSON contents) and parse its manifest. Validate the manifest structure before touching any content files.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/asset-loading.md`](../../../docs/architecture/asset-loading.md)
- [`docs/architecture/parser-hardening.md`](../../../docs/architecture/parser-hardening.md)

Inputs:
- `.hrmod` file (ZIP) — user-provided
- JSZip library

Outputs:
- `src/content-runtime/mod-loader.ts`
- `loadModPack(zipBuffer: ArrayBuffer): Promise<Result<RawModPack, ModLoadError>>`
- Archive layout:
  ```json
  {
    "schemaVersion": 1,
    "id": "my_faction_pack",
    "type": "faction-pack",
    "name": "My Faction Pack",
    "version": "1.0.0",
    "author": "PlayerName",
    "engine": ">=0.1.0",
    "dependencies": [],
    "provides": {
      "factions": ["my-faction:faction:main"]
    },
    "signature": {
      "scheme": "ed25519",
      "keyId": "community-key",
      "value": "ed25519-base64-sig"
    },
    "sandboxed": false
  }
  ```
  ZIP contains one canonical pack root with `manifest.json` plus record
  folders such as `units/`, `heroes/`, `buildings/`, and `assets/`

Owned Paths:
- `src/content-runtime/mod-loader.ts`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas
- phase-2.04-content-editor.06-mod-pack-export-import

Acceptance Criteria:
- Valid ZIP with valid manifest returns `Ok(RawModPack)`
- ZIP with missing `manifest.json` returns `Err("Missing manifest")`
- ZIP with invalid manifest JSON returns `Err` with parse error details
- ZIP with multiple manifest files returns `Err`
- Canonical record folders are discoverable without a separate `files[]`
  inventory in the manifest
- **`sanitizeArchiveEntry(path)` rejects** entries containing `..`,
  leading `/` or backslashes, NUL bytes, or symlink flags. Refusal
  code: `pack.error.archive.path-traversal`. Run before any
  decompression of that entry.
- **Compressed-size cap.** `maxCompressedBytes: 64 MB`. Streaming
  ZIP read refuses on `pack.error.archive.too-large` once the
  cumulative compressed bytes exceed the cap.
- **Uncompressed-size cap.** `maxUncompressedBytes: 512 MB`.
  Refusal code: `pack.error.archive.uncompressed-too-large`.
- **Decompression-ratio cap.** `maxDecompressionRatio: 200:1`.
  The check fires per-entry on the first chunk that crosses the
  ratio threshold so a zip-bomb refuses early. Refusal code:
  `pack.error.archive.ratio`.
- **Entry-count cap.** `maxEntries: 20_000`. Refusal code:
  `pack.error.archive.entry-count`.
- **Verification ordering.** Caps and traversal sanitiser run
  **before** schema parsing per
  [`pack-contract.md` § Verification Ordering](../../../docs/architecture/pack-contract.md#verification-ordering).
- **Security-test fixture.** Loading
  [`tests/security/escape-vectors/zip-traversal.hrmod.json`](../../../tests/security/escape-vectors/zip-traversal.hrmod.json)
  refuses with `pack.error.archive.path-traversal`; loading
  `zip-bomb.hrmod.json` refuses with one of `pack.error.archive.ratio`,
  `pack.error.archive.uncompressed-too-large`, or
  `pack.error.archive.too-large`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
