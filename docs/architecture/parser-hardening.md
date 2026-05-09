# Parser Hardening — Save & Pack-Archive Input

Canonical doctrine for the resource-limit caps that any parser
operating on **untrusted bytes** under [`src/persistence/`](../../src/)
or [`src/content-runtime/`](../../src/content-runtime/) MUST enforce
**before** invoking `JSON.parse` or expanding a compressed stream.

The save loader and the `.hrmod` pack importer are the two surfaces
that ingest untrusted bytes from the user's filesystem. Both rely on
gzip / DEFLATE for size and on JSON for structure; both inherit the
classic decompression-bomb / parse-DoS / array-bomb / deeply-nested-
JSON failure modes from those formats. Without explicit caps, a
hand-crafted save with `commandLog.length = 10_000_000` is replayed
until the tab OOMs; a 1 KB gzip stream that decompresses to gigabytes
exhausts memory before any reducer runs; a `[[[[…]]]]` JSON value
overflows the parser stack.

Companion docs:
- [`pack-contract.md`](./pack-contract.md) — pack-archive shape and
  resource-limit cross-reference.
- [`pack-trust.md`](./pack-trust.md) — the pre-import resource-limit
  gate consumed by the trust prompt.
- [`security-model.md`](./security-model.md) — save and pack threat
  model that this doctrine implements.
- [`save-migration.md`](./save-migration.md) — runs only after the
  parser accepts the bytes.

---

## 1. Closed entry points

The two parser modules below are the **only** code allowed to call
`JSON.parse` or to instantiate a `DecompressionStream` over input
that originated outside the engine:

| Module | Owning surface | Limit table |
| --- | --- | --- |
| `src/persistence/parser.ts` | save load (IndexedDB read + `.hrsa.json` import) | `SAVE_LIMITS` |
| `src/content-runtime/parser.ts` | pack import (`.hrmod` archive + `manifest.json` + every record file inside the archive) | `PACK_LIMITS` |

A lint gate (`tools/lint/no-direct-json-parse.ts`, owned by the
parser-hardening task) refuses any direct `JSON.parse` import under
`src/persistence/`, `src/content-runtime/`, `src/engine/`, or
`src/rules/` outside of the two parser modules. The lint reads the
TypeScript AST, not regex over text.

---

## 2. Pinned limits

The constants below are absolute upper bounds. They MUST be checked
streaming — the parser must abort the moment any cap is exceeded,
**before** the entire blob has been buffered. Buffering first and
checking after defeats the purpose of the cap.

| Constant | `SAVE_LIMITS` | `PACK_LIMITS` | Rationale |
| --- | ---: | ---: | --- |
| `maxCompressedBytes` | 4 MB | 16 MB | Save: typical 7-day save is < 50 KB compressed (per `02-log-only-save-format.md`); a 4 MB cap is ≈ 80× headroom. Pack: typical faction pack is ≈ 4 MB compressed; 16 MB covers a multi-faction "world" pack. |
| `maxUncompressedBytes` | 64 MB | 512 MB | Save: 64 MB caps a single tab's working set against a malicious save. Pack: 512 MB matches the worst-case faction pack with binary atlases. |
| `maxDecompressionRatio` | 200 : 1 | 200 : 1 | Closes the classic gzip-bomb expansion ratio. Pinned in [`pack-trust.md` § Resource Limits](./pack-trust.md) as well; both surfaces use the same ratio. |
| `maxDepth` | 32 | 32 | JSON nesting depth. Catches deeply nested `[[[[…]]]]` patterns before the platform `JSON.parse` stack-overflows. 32 is well above any organic pack/save shape. |
| `maxStringLength` | 64 KB | 64 KB | Single string literal cap. Bigger strings are an indicator of obfuscation or asset-as-string smuggling. |
| `maxArrayLength` | 100 000 | 100 000 | Single array length cap. Protects `commandLog`, `checkpoints`, `contentPackHashes`, and any other unbounded array. The save schema also pins per-array `maxItems`; the parser cap is the second line of defense in case schema parsing has a bug. |
| `maxObjectKeys` | 4 096 | 4 096 | Single object key-count cap. Protects against prototype-pollution-style key floods. |
| `maxNumericMagnitude` | 2⁵³ − 1 | 2⁵³ − 1 | Reject any integer outside the JS safe-integer range. The canonical-JSON contract is integer-only; `1.5`, `1e308`, and `-9223372036854775807` are all rejected. |

The numeric-magnitude check runs at **tokenization time** — the
parser inspects each numeric literal before constructing a JS
`Number`, so we never round through binary-IEEE-754 silently.

---

## 3. Rejection vocabulary

Every parser failure surfaces a closed reason code. The Save/Load
screen and the pack-trust prompt render localized strings keyed on
this code; the load-flow diagram references it by name.

```ts
type ParserRejection =
  | "OVER_COMPRESSED"        // input bytes > maxCompressedBytes
  | "OVER_UNCOMPRESSED"      // expansion exceeded maxUncompressedBytes
  | "OVER_RATIO"             // expansion exceeded maxDecompressionRatio
  | "OVER_DEPTH"             // JSON nesting > maxDepth
  | "OVER_STRING"            // single string literal > maxStringLength
  | "OVER_ARRAY"             // single array length > maxArrayLength
  | "OVER_OBJECT_KEYS"       // single object key count > maxObjectKeys
  | "NON_INTEGER_NUMERIC"    // numeric literal outside safe-integer range
  | "JSON_PARSE_ERROR";      // syntactically malformed JSON
```

`OVER_*` rejections include the cap name and the offending value
position (byte offset for compression caps; JSON pointer for
structural caps) so logs are diagnosable without re-running the
parser. **Logs MUST NOT include the rejected bytes themselves** —
they originated from untrusted input and may be hostile to a log
viewer or a downstream copy/paste path.

---

## 4. Streaming requirement

The parser MUST be streaming end-to-end:

1. **Compression layer.** Use `DecompressionStream('gzip')` (M5+ when
   the runtime floor allows) or `pako.Inflate` in incremental mode
   (M4). The stream is wired to a custom JSON tokenizer; the parser
   cancels the stream the moment any cap is hit.
2. **JSON layer.** A custom tokenizer tracks running depth, current
   array length, current string length, and current object key count.
   It does **not** call platform `JSON.parse` until the entire payload
   has been accepted by the streaming validator.
3. **Cancellation.** A cancelled parse aborts the underlying stream
   reader (`reader.cancel()`) so the gzip side does not continue
   expanding bytes that will be discarded.

The "buffer then check" anti-pattern is rejected because it permits
the very expansion the caps are designed to refuse: by the time the
cap fails, the memory damage is done.

---

## 5. Order of operations

Both parsers run in the same fixed order. Reordering breaks the
threat model — see the worked examples in section 6.

```text
read bytes (≤ maxCompressedBytes)
  └─> streaming gzip decode (≤ maxUncompressedBytes, ≤ maxRatio)
        └─> streaming JSON tokenize (≤ maxDepth / maxArrayLength /
              maxStringLength / maxObjectKeys / safe-integer)
              └─> JSON.parse (only if every prior cap accepted)
                    └─> hand off to schema validator
```

The schema validator is **outside** this doctrine — it runs against a
parsed JS object and is owned by [`save.schema.json`](../../content-schema/schemas/save.schema.json)
and [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json).

---

## 6. What goes wrong if you reorder

Worked examples that motivate the pinned order:

- **Skip compressed-byte cap.** A 1 KB gzip stream expands to 8 GB.
  By the time the JSON tokenizer detects "this is not JSON," the
  process is already OOM-killed. Mitigation: compressed-byte cap
  fires first.
- **Skip ratio cap.** A 4 MB compressed file expands to 800 MB.
  Within the absolute uncompressed cap, but a clear amplification
  bomb. Mitigation: ratio cap (200 : 1) fires before the absolute
  uncompressed cap.
- **Skip array-length cap; rely on schema.** A `commandLog` with
  100 million entries causes the JSON tokenizer to allocate the
  array. Schema validation only runs after the full parse. Mitigation:
  array-length cap fires during tokenization.
- **Skip integer-magnitude cap.** `damage: 9007199254740993` is
  parsed by platform `JSON.parse` as `9007199254740992` (silent
  rounding). Reducer behaviour now depends on a value the save
  file did not actually contain — a determinism violation that
  can be exploited to forge a state-hash match. Mitigation: numeric
  magnitude is checked at tokenization time, before `JSON.parse`.

---

## 7. Test fixtures

The owning task ships fixtures under
[`content-schema/examples/save-malformed/`](../../content-schema/examples/save-malformed/)
and a CI gate (`npm run validate:parser-hardening`) asserts each
fixture is rejected with the expected reason **before** the reducer
or the schema validator is reached. The fixture set covers, at
minimum:

- oversized array (`commandLog.length = 200_000`)
- deep nesting (`[[[[…]]]]` depth = 64)
- non-integer numeric (`damage: 1.5`)
- oversized string (`metadata.name = "X".repeat(70_000)`)
- decompression-ratio bomb (1 KB compressed, 1 GB expanded)

A fixture that survives a parser cap but is later rejected by the
schema validator is a regression of the "schema is the first surface
of contact with hostile input" anti-pattern; the parser cap is
expected to fire first.

---

## 8. Cross-references

- [`docs/architecture/diagrams/25-load-flow.md`](./diagrams/25-load-flow.md) —
  the size and ratio pre-checks visualized at the start of the load
  flow are this doctrine's caps.
- [`pack-trust.md` § Resource Limits](./pack-trust.md) — the pack-import
  surface consumes the same constants table.
- [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md) —
  save format owner; depends on the parser-hardening task.
- Owning task:
  [`tasks/mvp/08-persistence/16-parser-hardening.md`](../../tasks/mvp/08-persistence/16-parser-hardening.md).
