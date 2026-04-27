# src/content-schema

Runtime helpers built around the canonical JSON schemas in
[`content-schema/schemas/`](../../content-schema/schemas/):

- **Zod** validators (one per JSON Schema record type)
- migration functions (`schemaVersion` upgrades)
- compatibility checks (content-hash and engine-hash gates)
- schema-loading utilities (id → handler registration)

## Validator Library: Zod (decision)

Zod was selected over Ajv for three reasons:

1. **Native TypeScript inference.** `z.infer<typeof UnitSchema>` yields
   the exact runtime type without a secondary codegen pass. Every pack
   loader, content runtime, and engine module consumes the same type.
2. **Discriminated-union ergonomics.** The Effect registry and the
   hero-specialty union both use `oneOf` in JSON Schema. `z.discriminatedUnion`
   maps 1:1 and gives fast, accurate error messages pointing at the
   offending `kind` rather than a generic "did not match any schema."
3. **No eval / no code generation.** Ajv compiles validators at
   runtime via `new Function`; the determinism contract in
   [`docs/architecture/determinism.md`](../../docs/architecture/determinism.md)
   forbids that path in gameplay code. Zod is a plain reducer over
   parse graphs.

Tradeoff: the Zod definitions are hand-mirrored from the JSON
Schemas. Drift is prevented by a single round-trip test — every
`examples/records/**/*.json` must validate against both the JSON
Schema (CI) and the Zod validator (unit test). Any disagreement
fails the build.

The JSON source of truth stays in `content-schema/schemas/`. Zod is
the runtime consumer, not a second source of truth.
