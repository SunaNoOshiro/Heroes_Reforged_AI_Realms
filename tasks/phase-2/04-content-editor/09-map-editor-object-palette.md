# Map Editor Object Palette

Module: [Content Editor (M4)](../04-content-editor.md)

Description:
Read-only enumeration adapter that walks the active content registries
and groups placeable map objects, adventure buildings, neutral stack
templates, and resource mines into the categorical buckets the editor
palette renders. The palette never resolves assets directly: it emits
stable IDs and lets the renderer's resolver fall back per asset-index
rules.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`

Inputs:
- Pack registry from
  `mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry`
- Map object schema (`content-schema/schemas/map-object.schema.json`)
- Adventure building schema
  (`content-schema/schemas/adventure-building.schema.json`)
- Neutral stack template schema
  (`content-schema/schemas/neutral-stack-template.schema.json`)

Outputs:
- `src/editor/map-editor/object-palette.ts`
- `enumerateMapObjectPalette(registry: PackRegistry): PaletteCategory[]`
- `PaletteCategory`: `{ id: "mines" | "dwellings" | "banks" | "artifacts" | "events" | "scripted" | "decorative", label: string, items: PaletteItem[] }`
- `PaletteItem`: `{ stableId: string, label: string, iconAssetId: string, terrainPrerequisites: string[] }`

Owned Paths:
- `src/editor/map-editor/object-palette.ts`

Dependencies:
- mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- phase-2.04-content-editor.01-editor-routing-plus-shell

Acceptance Criteria:
- Screen package `docs/architecture/wiki/screens/65-map-editor/` consumes
  `PaletteCategory[]` without hardcoded object IDs
- All categories enumerated from the active registry; no hardcoded IDs
- Items are sorted by `label` within a category (stable,
  deterministic)
- Terrain prerequisites surface as a string array; the editor can use
  them to grey out placements at brush time
- Switching the active pack (Emberwild to Necropolis) re-enumerates
  with no engine restart
- Function is pure: same registry input produces same output

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
