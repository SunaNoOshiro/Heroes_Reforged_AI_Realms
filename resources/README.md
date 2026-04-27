# resources

This folder is reserved for schema-driven content payloads and assets.

Use it for:

- authored packs
- official starter content
- raw or processed art/audio assets
- generated content bundles
- import or export fixtures tied to the content schemas

Guiding rule:

- gameplay records should point to stable IDs
- manifests and asset indexes in `resources/` map those IDs to concrete
  files
- runtime code in `src/` should consume the IDs, not hardcoded file
  paths
