# Parser Hardening — Save & Pack-Archive Caps

Module: [Persistence (M1)](../08-persistence.md)

Description:
Author the parser-hardening doctrine and the two thin wrappers that
own every `JSON.parse` and `DecompressionStream` call against
untrusted input.

Read First:
- [`docs/architecture/parser-hardening.md`](../../../docs/architecture/parser-hardening.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/diagrams/25-load-flow.md`](../../../docs/architecture/diagrams/25-load-flow.md)

Inputs:
- Save bytes from IndexedDB read or `*.hrsa.json` import.
- `.hrmod` archive bytes plus the inner `manifest.json` and every
  record file.

Outputs:
- `src/persistence/parser.ts` — `parseSaveBytes(raw, limits) → { ok, value | reason }`
- `src/content-runtime/parser.ts` — `parsePackBytes(raw, limits) → { ok, value | reason }`
- `tools/lint/no-direct-json-parse.ts` — AST lint that refuses
  direct `JSON.parse` imports outside the two parser modules under
  `src/persistence/`, `src/content-runtime/`, `src/engine/`,
  `src/rules/`.
- `content-schema/examples/save-malformed/` — fixture set covering
  oversized array, deep nesting, non-integer numeric, oversized
  string, decompression-ratio bomb. Each fixture pairs with the
  expected rejection reason.
- `scripts/check-parser-hardening.mjs` — golden test runner;
  asserts each fixture rejects with the expected reason **before**
  the schema validator or the reducer is reached.

Owned Paths:
- `docs/architecture/parser-hardening.md`
- `src/persistence/parser.ts`
- `src/content-runtime/parser.ts`
- `tools/lint/no-direct-json-parse.ts`
- `content-schema/examples/save-malformed/`
- `scripts/check-parser-hardening.mjs`

Dependencies:
- mvp.08-persistence.01-indexeddb-wrapper

Acceptance Criteria:
- Every cap from `parser-hardening.md` § 2 is enforced as a streaming
  rejection (the parser cancels the stream the moment any cap is
  exceeded; it never buffers the full payload then checks).
- The closed `ParserRejection` vocabulary in
  `parser-hardening.md` § 3 is the only rejection surface; rejection
  records carry the cap name and the offending position (byte
  offset for compression caps, JSON pointer for structural caps).
- Rejection records do **not** include the rejected bytes
  themselves.
- Schema parse runs only after every cap accepts.
- The `no-direct-json-parse` lint rejects any direct `JSON.parse`
  import under `src/persistence/`, `src/content-runtime/`,
  `src/engine/`, `src/rules/` outside the two parser modules.
- `npm run validate:parser-hardening` runs the golden test set; each
  malformed fixture produces the expected rejection reason; the
  CI gate fails if any fixture's reason changes.
- The verify gate is wired into `npm run validate` so a regression
  is caught at PR time.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
