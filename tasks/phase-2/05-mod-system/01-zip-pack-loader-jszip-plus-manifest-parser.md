# Zip Pack Loader (JSZip) + Manifest Parser

Status: planned

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Load a `.hrmod` file (ZIP with JSON contents) and parse its manifest. Validate the manifest structure before touching any content files.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

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

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
