# Security Tests — Escape-Vectors Corpus

This directory holds the canonical fixture corpus that Plan 28
asserts against. Every fixture stresses one cap, sanitiser,
magic-byte gate, or trust rule pinned in
[`docs/architecture/asset-loading.md`](../../../docs/architecture/asset-loading.md),
[`docs/architecture/asset-policy.md`](../../../docs/architecture/asset-policy.md),
[`docs/architecture/sandbox-model.md`](../../../docs/architecture/sandbox-model.md),
[`docs/architecture/parser-hardening.md`](../../../docs/architecture/parser-hardening.md),
or [`docs/architecture/csp.md`](../../../docs/architecture/csp.md).

Each fixture is shipped as a **text descriptor** in this folder; the
real binary payloads are produced by the loader tasks at CI time
(per the same convention as
[`content-schema/examples/save-malformed/`](../../../content-schema/examples/save-malformed/)).
A descriptor names the input shape, the cap it stresses, and the
expected refusal code. The driver
[`tests/security/run.mjs`](../run.mjs) reads each descriptor, builds
the corresponding payload deterministically, hands it to the real
loader, and asserts the refusal code.

CI runs `npm run test:security` immediately after `npm run validate`.

---

## Coverage matrix

| Fixture | Stresses | Expected refusal code |
|---|---|---|
| `zip-traversal.hrmod.json` | ZIP entry path with `..` / leading `/` | `pack.error.archive.path-traversal` |
| `zip-bomb.hrmod.json` | Compression ratio cap (200:1) and uncompressed-size cap (512 MB) | `pack.error.archive.ratio` or `pack.error.archive.uncompressed-too-large` |
| `proto-pollution.json` | JSON parser hardening — `__proto__` / `constructor` rejection | `parser.error.proto-pollution` |
| `bigint-confusion.json` | JSON parser hardening — numeric-magnitude cap | `parser.error.numeric-magnitude` |
| `malformed-png.png.json` | PNG magic-byte / IHDR pre-flight | `pack.error.asset.mime-mismatch` |
| `oversized-png.png.json` | Image dim cap (`maxImageWidth: 4096`) | `pack.error.asset.dim-cap` |
| `oog-channel-bomb.ogg.json` | Audio channel cap (`maxAudioChannels: 2`) | `pack.error.asset.audio-cap` |
| `icu-injection.json` | Localization "no general templating engine" rule | `pack.error.locale.template-syntax` |
| `mime-polyglot.bin.json` | MIME magic-byte gate — polyglot payload | `pack.error.asset.mime-mismatch` |

A new cap or refusal code added to the architecture docs MUST
land with either a fixture in this directory or a row in the
"Documented exemptions" section below. CI surfaces the gap as
`security-tests.error.uncovered-refusal-code`.

## Documented exemptions

(empty — the corpus tracks every refusal code emitted by the
loader / parser / signature verifier as of Plan 28.)

## Adding a new fixture

1. Pick the cap or refusal code you are stressing.
2. Add a row to the coverage matrix above.
3. Author a `*.json` descriptor in this directory with the input
   shape and the expected refusal code.
4. Update [`tests/security/run.mjs`](../run.mjs) with a builder
   that materialises the descriptor into a real payload.
5. Run `npm run test:security` locally.
