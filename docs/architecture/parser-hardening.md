# Parser Hardening — Save & Pack-Archive Input

Canonical caps that any parser over **untrusted bytes** under
[`src/persistence/`](../../src/) or
[`src/content-runtime/`](../../src/content-runtime/) MUST enforce
**before** invoking `JSON.parse` or expanding a compressed stream.

The save loader and the `.hrmod` pack importer are the two surfaces
that ingest untrusted bytes from the user's filesystem. Both layer
gzip / DEFLATE over JSON; both inherit the classic
decompression-bomb, parse-DoS, array-bomb, and deep-nest failure
modes. Without explicit caps, a hand-crafted save with
`commandLog.length = 10_000_000` is replayed until the tab OOMs; a
1 KB gzip stream that decompresses to gigabytes exhausts memory
before any reducer runs; a `[[[[…]]]]` JSON value overflows the
parser stack.

Companion docs:
- [`pack-contract.md`](./pack-contract.md) — pack-archive shape and
  resource-limit cross-reference.
- [`pack-trust.md`](./pack-trust.md) — pre-import resource-limit
  gate consumed by the trust prompt.
- [`security-model.md`](./security-model.md) — save and pack threat
  model that this doctrine implements.
- [`save-migration.md`](./save-migration.md) — runs only after the
  parser accepts the bytes.

---

## 1. Closed entry points

Only the two parser modules below are allowed to call `JSON.parse`
or to instantiate a `DecompressionStream` over input that
originated outside the engine:

| Module | Owning surface | Limit table |
| --- | --- | --- |
| `src/persistence/parser.ts` | save load (IndexedDB read + `.hrsa.json` import) | `SAVE_LIMITS` |
| `src/content-runtime/parser.ts` | pack import (`.hrmod` archive + `manifest.json` + every record file inside the archive) | `PACK_LIMITS` |

A lint gate (`tools/lint/no-direct-json-parse.ts`, owned by the
parser-hardening task) refuses any direct `JSON.parse` import under
`src/persistence/`, `src/content-runtime/`, `src/engine/`, or
`src/rules/` outside those two modules. The lint reads the
TypeScript AST, not regex over text.

---

## 2. Pinned limits

The constants below are absolute upper bounds. They MUST be checked
**streaming** — abort the moment any cap is exceeded, before the
entire blob is buffered. Buffer-then-check defeats the purpose.

| Constant | `SAVE_LIMITS` | `PACK_LIMITS` | Rationale |
| --- | ---: | ---: | --- |
| `maxCompressedBytes` | 4 MB | 16 MB | Save: typical 7-day save is < 50 KB compressed (per `02-log-only-save-format.md`); 4 MB is ≈ 80× headroom. Pack: typical faction pack is ≈ 4 MB compressed; 16 MB covers a multi-faction "world" pack. |
| `maxUncompressedBytes` | 64 MB | 512 MB | Save: caps a single tab's working set against a malicious save. Pack: matches the worst-case faction pack with binary atlases. |
| `maxDecompressionRatio` | 200 : 1 | 200 : 1 | Closes the classic gzip-bomb expansion ratio. Cross-referenced by [`pack-trust.md` § 1 Resource Limits](./pack-trust.md#1-resource-limits). |
| `maxDepth` | 32 | 32 | JSON nesting depth. Catches `[[[[…]]]]` patterns before the platform `JSON.parse` stack-overflows. 32 is well above any organic pack/save shape. |
| `maxStringLength` | 64 KB | 64 KB | Single string literal cap. Larger strings indicate obfuscation or asset-as-string smuggling. |
| `maxArrayLength` | 100 000 | 100 000 | Single array length cap. Protects `commandLog`, `checkpoints`, `contentPackHashes`, and any other unbounded array. The save schema also pins per-array `maxItems`; the parser cap is the second line of defense if schema parsing has a bug. |
| `maxObjectKeys` | 4 096 | 4 096 | Single object key-count cap. Protects against prototype-pollution-style key floods. |
| `maxNumericMagnitude` | 2⁵³ − 1 | 2⁵³ − 1 | Reject integers outside the JS safe-integer range. The canonical-JSON contract is integer-only; `1.5`, `1e308`, and `-9223372036854775807` are all rejected. |

Numeric-magnitude is checked at **tokenization time** — the parser
inspects each numeric literal before constructing a JS `Number`, so
no value is silently rounded through binary IEEE-754.

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

`OVER_*` rejections include the cap name and the offending position
— byte offset for compression caps, JSON pointer for structural
caps — so logs are diagnosable without re-running the parser.
**Logs MUST NOT include the rejected bytes themselves**: they came
from untrusted input and may be hostile to a log viewer or a
downstream copy/paste path.

---

## 4. Streaming requirement

Each layer is streaming end-to-end:

1. **Compression.** Use `DecompressionStream('gzip')` (M5+, when the
   runtime floor allows) or `pako.Inflate` in incremental mode
   (M4). The stream feeds a custom JSON tokenizer; the parser
   cancels the stream the moment any cap is hit.
2. **JSON.** A custom tokenizer tracks running depth, current array
   length, current string length, and current object key count. It
   does **not** call platform `JSON.parse` until the entire payload
   has been accepted by the streaming validator.
3. **Cancellation.** A cancelled parse aborts the underlying stream
   reader (`reader.cancel()`) so the gzip side stops expanding
   bytes that will be discarded.

"Buffer then check" is rejected: by the time the cap fails, the
memory damage is already done.

---

## 5. Order of operations

Both parsers run in this fixed order. Reordering breaks the threat
model — see § 6.

```text
read bytes (≤ maxCompressedBytes)
  └─> streaming gzip decode (≤ maxUncompressedBytes, ≤ maxRatio)
        └─> streaming JSON tokenize (≤ maxDepth / maxArrayLength /
              maxStringLength / maxObjectKeys / safe-integer)
              └─> JSON.parse (only if every prior cap accepted)
                    └─> hand off to schema validator
```

The schema validator is **outside** this doctrine — it runs against
a parsed JS object and is owned by
[`save.schema.json`](../../content-schema/schemas/save.schema.json)
and
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json).

---

## 6. What goes wrong if you reorder

- **Skip compressed-byte cap.** A 1 KB gzip stream expands to 8 GB.
  By the time the JSON tokenizer says "this is not JSON," the
  process is already OOM-killed. Mitigation: the compressed-byte
  cap fires first.
- **Skip ratio cap.** A 4 MB compressed file expands to 800 MB —
  inside the absolute uncompressed cap, but a clear amplification
  bomb. Mitigation: the 200 : 1 ratio cap fires before the
  absolute uncompressed cap.
- **Skip array-length cap; rely on schema.** A `commandLog` with
  100 million entries causes the JSON tokenizer to allocate the
  array. Schema validation only runs after the full parse.
  Mitigation: the array-length cap fires during tokenization.
- **Skip integer-magnitude cap.** `damage: 9007199254740993` is
  parsed by platform `JSON.parse` as `9007199254740992` (silent
  rounding). Reducer behaviour now depends on a value the save
  file did not contain — a determinism violation that can be
  exploited to forge a state-hash match. Mitigation: numeric
  magnitude is checked at tokenization time, before `JSON.parse`.

---

## 7. Test fixtures

The owning task ships fixtures under
[`content-schema/examples/save-malformed/`](../../content-schema/examples/save-malformed/)
and a CI gate (`npm run validate:parser-hardening`) asserts each
fixture is rejected with the expected reason **before** the reducer
or the schema validator is reached. Minimum coverage:

- oversized array (`commandLog.length = 200_000`)
- deep nesting (`[[[[…]]]]` depth = 64)
- non-integer numeric (`damage: 1.5`)
- oversized string (`metadata.name = "X".repeat(70_000)`)
- decompression-ratio bomb (1 KB compressed, 1 GB expanded)

A fixture that survives a parser cap but is later rejected by the
schema validator is a regression of the "schema is the first
surface of contact with hostile input" anti-pattern; the parser
cap is expected to fire first.

---

## 8. Cross-references

- [`docs/architecture/diagrams/25-load-flow.md`](./diagrams/25-load-flow.md)
  — the size and ratio pre-checks at the start of the load flow
  are this doctrine's caps.
- [`pack-trust.md` § 1 Resource Limits](./pack-trust.md#1-resource-limits)
  — pack-import surface; see `## ⚠ Issues` for the value drift
  between this doctrine and the pack-trust + pack-error-codes
  tables.
- [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — save-format owner; depends on the parser-hardening task.
- Owning task:
  [`tasks/mvp/08-persistence/16-parser-hardening.md`](../../tasks/mvp/08-persistence/16-parser-hardening.md).

---

## 🔍 Sync Check

- **UI: ✔** — Rejection codes (`OVER_COMPRESSED`, `OVER_RATIO`,
  `OVER_DEPTH`, …) referenced from
  [`diagrams/25-load-flow.md`](./diagrams/25-load-flow.md) are
  consumed by screens 70 / 72 via `pack-trust.md` § 10 Error
  Codes; no copy-strings or commands are owned in this file, so
  the UI surface is purely indirect and resolves cleanly.
- **Schema: ⚠** — `commandLog` and `contentPackHashes` named in
  the `maxArrayLength` rationale match
  [`save.schema.json`](../../content-schema/schemas/save.schema.json)
  and
  [`save-envelope.schema.json`](../../content-schema/schemas/save-envelope.schema.json).
  `checkpoints` does not appear as a field in `save.schema.json`;
  it survives only in
  [`replay-format.md`](./replay-format.md) and the save-flow
  diagram. The cap rule itself is unchanged ("any unbounded array"
  is the operative clause); detailed in `## ⚠ Issues`.
  `manifest.schema.json` is the post-parser surface owned by
  [`pack-contract.md`](./pack-contract.md).
- **Tasks: ✔** — Owning task
  [`tasks/mvp/08-persistence/16-parser-hardening.md`](../../tasks/mvp/08-persistence/16-parser-hardening.md)
  exists with `Owned Paths` covering this doc, both parser
  modules, the AST lint, the malformed fixtures, and the
  `validate:parser-hardening` golden runner; `task-registry.json`
  has matching entries; downstream tasks
  `mvp.08-persistence.10-save-schema-and-validator`,
  `mvp.08-persistence.17-pre-replay-command-validation`, and
  `mvp.08-persistence.18-save-envelope-and-intent` declare it as
  a dependency. The `validate:parser-hardening` script is not yet
  wired in `package.json`; that wiring is part of task 16's
  acceptance, not a doc gap.

## ⚠ Issues

- **Pack-archive limit values disagree across three doctrine
  docs.** This file's `PACK_LIMITS` column pins
  `maxCompressedBytes = 16 MB`, `maxUncompressedBytes = 512 MB`,
  `maxDecompressionRatio = 200 : 1`, and is silent on entry count
  (entry-count is a ZIP concern, not a JSON parser concern).
  [`pack-trust.md` § 1 Resource Limits](./pack-trust.md#1-resource-limits)
  pins the user-facing pack limits at `256 MiB compressed`,
  `2 GiB decompressed`, `1 : 50 ratio`, and `50 000 entries`.
  [`pack-error-codes.md`](./pack-error-codes.md) (rows
  `pack.error.archive.too-large`,
  `pack.error.archive.uncompressed-too-large`,
  `pack.error.archive.ratio`, `pack.error.archive.entry-count`)
  pins them at `64 MB`, `512 MB`, `200 : 1`, and `20 000`.
  The three sets cannot all be canonical. Per
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) and
  the project root contract that surface caps are public API,
  the owning tasks must reconcile to a single set:
  [`tasks/mvp/08-persistence/16-parser-hardening.md`](../../tasks/mvp/08-persistence/16-parser-hardening.md)
  owns this file's table,
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  owns `pack-trust.md` § 1, and the pack-error-codes table is
  owned by the pack-error-codes task surface. Suggested values:
  pick one row per cap and align the other two docs to it; the
  pack-archive entry-count cap is orthogonal to this doctrine
  and stays in `pack-trust.md` / `pack-error-codes.md`. Skill
  did not edit either sibling doc (Hard Prohibition D — never
  edit cross-checked files).
- **`save.checkpoints` referenced but not defined in
  `save.schema.json`.** The `maxArrayLength` rationale lists
  `checkpoints` alongside `commandLog` and `contentPackHashes`;
  the term is also used in
  [`replay-format.md`](./replay-format.md) and
  [`diagrams/24-save-flow.md`](./diagrams/24-save-flow.md), but
  [`save.schema.json`](../../content-schema/schemas/save.schema.json)
  does not declare a `checkpoints` field. Either the schema is
  missing the field (snapshot-rebase support per
  [`tasks/mvp/08-persistence/07-snapshot-rebase.md`](../../tasks/mvp/08-persistence/07-snapshot-rebase.md))
  or the term is stale in the architecture docs. The
  parser cap is unaffected — it applies to any array — but the
  identifier should be reconciled by the save-schema owner
  ([`tasks/mvp/08-persistence/10-save-schema-and-validator.md`](../../tasks/mvp/08-persistence/10-save-schema-and-validator.md))
  or the snapshot-rebase task. Skill did not edit either file
  (Hard Prohibition D).
- **`pack-trust.md` § 1 Resource Limits subsections lack stable
  anchors.** This file links
  [`pack-trust.md` § 1 Resource Limits](./pack-trust.md#1-resource-limits)
  but the per-surface tables ("Save imports" and "Pack `.hrmod`
  ZIPs") inside that section are H3-level without explicit
  anchor IDs, so a deep link to one of the two tables is not
  available. Non-blocking — the existing `#1-resource-limits`
  anchor resolves and the section is short. Suggested fix on
  the next pack-trust audit: add explicit anchors
  (`#11-save-imports`, `#12-pack-hrmod-zips`) so future docs can
  cite the surface they mean. Out of scope for this audit.
