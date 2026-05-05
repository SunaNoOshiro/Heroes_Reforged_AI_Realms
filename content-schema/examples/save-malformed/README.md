# Malformed Save Fixtures (Parser Hardening)

Owning task:
[`tasks/mvp/08-persistence/16-parser-hardening.md`](../../../tasks/mvp/08-persistence/16-parser-hardening.md).
Owning doctrine:
[`docs/architecture/parser-hardening.md`](../../../docs/architecture/parser-hardening.md).

This directory holds hostile-input fixtures that the parser hardening
gate (`npm run validate:parser-hardening`) feeds to
`src/persistence/parser.ts` (and its pack-side twin
`src/content-runtime/parser.ts`). Each fixture is paired with the
expected closed `ParserRejection` reason from
[`parser-hardening.md` § 3](../../../docs/architecture/parser-hardening.md#3-rejection-vocabulary).

The fixture set covers, at minimum:

| Fixture | Cap exercised | Expected reason |
| --- | --- | --- |
| `oversized-array.json.gz` | `maxArrayLength` | `OVER_ARRAY` |
| `deep-nesting.json.gz` | `maxDepth` | `OVER_DEPTH` |
| `non-integer-numeric.json.gz` | `maxNumericMagnitude` (integer-only) | `NON_INTEGER_NUMERIC` |
| `oversized-string.json.gz` | `maxStringLength` | `OVER_STRING` |
| `decompression-bomb.gz` | `maxDecompressionRatio` | `OVER_RATIO` |

The fixtures themselves are produced by a small generator in the
parser-hardening task; they are not authored as static files in this
directory because some (the bomb especially) would slow the working
tree. The generator output is gitignored and rebuilt at CI time.

Adding a new cap to `parser-hardening.md` requires adding a fixture
here and an expected outcome in the gate's manifest.
