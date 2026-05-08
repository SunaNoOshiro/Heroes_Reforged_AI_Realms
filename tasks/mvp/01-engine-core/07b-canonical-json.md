# Canonical JSON + Content Hash

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Implement a canonical JSON serializer that produces a byte-exact
stable encoding of any JSON-compatible value, and a `contentHash`
helper that hashes the canonical bytes with xxh64. This is distinct
from the state serializer (Task 7), which operates on `GameState`:
this module operates on *static content records* (unit.json,
faction.json, manifest.json, ...) so that pack integrity and mod
identity are computable without depending on file-system ordering
or author whitespace.

"Canonical" here means: sorted object keys (UTF-8 code-point order),
no whitespace, no trailing newline, every number an integer (strings
for non-integer numerics), no `undefined`, no `NaN`, no `Infinity`,
`\uXXXX` escapes for control characters only. The resulting bytes
are deterministic across OS, locale, Node version, and browser
runtime.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- JSON records loaded by the content loader
- xxh64 implementation from Task 7

Outputs:
- `src/engine/canonical-json.ts` — `canonicalize(value): string`
- `src/engine/content-hash.ts` — `contentHash(value): string` returning
  16-hex-char xxh64 digest
- `scripts/hash-pack.mjs` — CLI that recomputes and rewrites each
  manifest's `contentHash` field after content edits
- Fuzz test: 10 000 random JSON-compatible values, re-serialize →
  re-parse → re-serialize returns identical bytes

Downstream Consumers:
- `mvp.02-tooling.04-property-based-testing` adds
  `src/engine/__tests__/canonical-json.property.test.ts` that pins
  the round-trip identity, key-order insensitivity, and byte-stability
  invariants as `fast-check` properties. The property test consumes
  the canonicalizer authored here; this task does not own the
  property file.

Owned Paths:
- `src/engine/canonical-json.ts`
- `src/engine/content-hash.ts`
- `scripts/hash-pack.mjs`

Dependencies:
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash

Acceptance Criteria:
- `canonicalize` is deterministic and agnostic to input key order and
  whitespace
- Same record hashed on macOS, Linux, and Windows CI runners returns
  the same 16-hex digest
- Running `hash-pack.mjs` on a clean tree is a no-op (zero diff);
  running it after any content edit updates exactly the affected
  manifests
- CI gate: `node scripts/hash-pack.mjs --check` fails the build if any
  manifest's `contentHash` disagrees with its content
- No floats, no `JSON.stringify` of user data reachable from this
  module without going through `canonicalize`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
