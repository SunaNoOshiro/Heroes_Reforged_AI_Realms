# Implementation Report: 27 — Save File Tampering & Mod/Pack Signing

> Source plan:
> [`27-save-tampering-and-pack-signing-plan.md`](./27-save-tampering-and-pack-signing-plan.md)

## 1. Outcome

The doctrine artifacts, schema seam, and owning task files for every
Critical Fix (1–6) and the non-deferred Improvements (Reproducible
Archive, MP Resume Handshake, Save & Pack Threat Model in
`security-model.md`, Save-Envelope MAC Phase-In) landed as canonical
docs + schemas + example fixtures + owning tasks. Code surfaces
(parser modules, signature verifier, MAC implementation, build
script, lint) are scoped into the new tasks per the plan's intent
that this work "only formalizes missing artifacts." `npm run all`
and `npm test` both pass on the resulting tree.

## 2. New artifacts

### Doctrine docs (`docs/architecture/`)
- `parser-hardening.md` — closed entry points + pinned cap table
  (`maxCompressedBytes`, `maxUncompressedBytes`,
  `maxDecompressionRatio`, `maxDepth`, `maxStringLength`,
  `maxArrayLength`, `maxObjectKeys`, `maxNumericMagnitude`) + the
  closed `ParserRejection` vocabulary + streaming requirement +
  worked examples for what goes wrong if you reorder. Critical
  Fix 1.
- `pack-signing.md` — canonical signed message shape, six-step
  verification ordering, trust tiers, mandatory/optional split,
  TOFU + stripping defense, key rotation, downgrade refuse,
  dependency trust propagation, and the fixture matrix the CI
  gate consumes. Critical Fix 2 + Critical Fix 6 + Improvement.
- `save-envelope-mac.md` — M5+ HMAC-SHA-256 phase-in plan: pinned
  algorithm, KDF salt + info, MAC input shape, verification rule,
  cross-installation transfer policy, milestone toggle table,
  what the MAC does NOT protect. Improvement (M4 doc-only).
- `reproducible-archive.md` — `.hrmod` ZIP determinism rules
  (entry order, ZIP-epoch timestamps, DEFLATE level 6, empty
  extra fields, external attributes), `signedBuild.json`
  artifact format, CI-gate contract. Improvement.

### Schemas (`content-schema/schemas/`)
- `save-envelope.schema.json` — outer wrapper around the inner
  save record. Carries `envelopeVersion`, `intent` (`save | replay
  | fixture`), `saveVersion`, `engineHash`, `contentPackHashes`,
  opaque `body`, optional `mac`, optional `signature`. Critical
  Fix 4.

### Schema additions (existing files)
- `manifest.schema.json` — added `assetDigest` (xxh64 over
  canonical-JSON of `assets/index.json`), `previousKeyId`,
  `rotationProof` (Ed25519 by previous key over the rotation
  payload), `signaturePolicy` enum (`optional |
  required-friendly | required-ranked`); tightened
  `signature.value` to a strict 128-hex-char Ed25519 pattern.
  All additions are optional / additive. Critical Fix 2 + 6.

### Example fixtures
- `content-schema/examples/save-envelope/` — four canonical
  envelopes: `canonical-save-no-mac`, `canonical-save-with-mac`,
  `canonical-replay-stripped`, `canonical-fixture-signed`.
- `content-schema/examples/save-malformed/README.md` — fixture
  policy doc; the actual binary fixtures are produced by the
  parser-hardening task at CI time.

### Owning task files
- `tasks/mvp/08-persistence/16-parser-hardening.md` — Critical
  Fix 1.
- `tasks/mvp/08-persistence/17-pre-replay-command-validation.md`
  — Critical Fix 3.
- `tasks/mvp/08-persistence/18-save-envelope-and-intent.md` —
  Critical Fix 4 (M4 work).
- `tasks/mvp/08-persistence/19-save-envelope-mac-phase-in.md` —
  Improvement (M5+ implementation, M4 schema seam already in).
- `tasks/mvp/02-content-schemas/44-pack-signing-verifier.md` —
  Critical Fix 2.
- `tasks/mvp/02-content-schemas/45-reproducible-archive.md` —
  Improvement.
- `tasks/phase-3/01-multiplayer/36-resumed-from-save.md` —
  Improvement (depends on Plan 26's task 10).

## 3. Updated artifacts

- `docs/architecture/pack-contract.md` — added Verification
  Ordering, Versioning, Trust-on-First-Use, and Reproducible
  Archive sections cross-linking the new doctrine docs.
- `docs/architecture/save-migration.md` — added Envelope, Intent
  Discriminator & MAC Phase-In, MAC Phase-In Plan, and Replay-
  intent migration skip sections.
- `docs/architecture/security-model.md` — added § 5a (Save threat
  model), § 5b (Pack threat model), and § 5c (What this codebase
  does NOT protect) per Plan 27 § Improvement.
- `docs/architecture/match-handshake.md` — added § 7a Resumed-
  from-Save Mode (ABORT reasons `resumeStateHashMismatch`,
  `resumePackHashesMismatch`).
- `docs/architecture/schema-matrix.md` — registered `SaveEnvelope`.
- `docs/architecture/diagrams/25-load-flow.md` — narrative now
  references `parser-hardening.md` for the full cap table and
  pre-replay validation gate (Critical Fix 3).
- `scripts/check-repo-contracts.mjs` — added the
  `.save-envelope.json` suffix mapping so envelope fixtures
  validate against `save-envelope.schema.json` via the
  repo-contracts gate.

## 4. Validation

- `npm run validate` — passes (all 22 sub-validators).
- `npm run all` — passes (validate + generate:wiki + report).
- `npm test` — passes (32/32 tests).
- `validate:tasks` — clean (455 tasks, 0 issues).
- `validate:contracts` — clean (every example fixture validates
  against its schema, including the new `save-envelope` fixtures
  and the manifest additions).
- `validate:links` — clean (every doctrine cross-link resolves).

## 5. Assumptions

- **Per-asset binary hashing (Critical Fix 5) was already in
  place.** `asset-index.schema.json` already requires a per-asset
  `sha256` hex digest (and stronger than the `xxh64` named in the
  plan). The plan's request for "per-asset hash" is therefore
  satisfied by the existing field; the manifest's new `assetDigest`
  binds the asset index's canonical-JSON (which transitively binds
  every per-asset `sha256`) to the Ed25519 signature. No schema
  change to `asset-index.schema.json` was needed.
- **TOFU trust store reuses `trust-store.schema.json`.** The plan
  proposes a `pack-trust-store.schema.json`; the repo already
  ships `trust-store.schema.json` (Plan 20 Task 31) which models
  per-installation pack-trust decisions. Reused that schema rather
  than authoring a parallel one.
- **Per-task-numbering shifts.** The plan calls for tasks
  `06`, `07`, `08`, `09` under `08-persistence/` and certain numbers
  under `02-content-schemas/`. Several of those numbers are already
  occupied by Plan 20 work (e.g. `08-migration-registry.md`,
  `09-quota-handling.md`, `28-save-schema.md`). Took the next
  available slots: parser-hardening = 16, pre-replay-validation =
  17, save-envelope-and-intent = 18, mac-phase-in = 19,
  pack-signing-verifier = 44, reproducible-archive = 45,
  resumed-from-save = phase-3/01-multiplayer/36. All cross-links
  point to the new numbers consistently.
- **`save-migration.md` already existed.** Plan 27 Critical Fix 4
  describes authoring this doc; it already shipped as part of the
  earlier persistence work. Extended it with the envelope /
  intent / MAC sections instead of replacing it. The migrator
  signature, support window, and authoring rule it already
  contained were preserved unchanged.
- **No code yet — task-scoped.** The plan permits formalizing
  artifacts ahead of code; the parser modules, signature verifier,
  MAC implementation, build script, lint, and CI gate scripts
  are all owned by the new tasks and ship behind their respective
  `verifyCommands`. Plan 26's report set the same precedent
  (lockstep envelope and handshake ship as docs + schemas + tasks
  ahead of the M5 implementation).
- **Malformed-save fixtures are README-only at commit time.**
  The actual binary fixtures (gzip bombs, deeply-nested JSON,
  oversized arrays) are produced by the parser-hardening task at
  CI time, not committed as binary blobs in the repo. The README
  in `content-schema/examples/save-malformed/` declares the
  fixture matrix and expected rejection reasons.
- **Envelope fixture signature value.** The `canonical-fixture-
  signed` example uses an all-zero 128-hex-char placeholder for
  `signature.value`; production fixtures will be signed by the
  `engine-fixture` key when the canonical-fixture suite ships.
  The value satisfies the schema pattern.

## 6. Blockers

None.

## 7. Suggested commit message

```
plan-27: save tampering and pack signing doctrine

Authors the parser-hardening, pack-signing, save-envelope-mac, and
reproducible-archive doctrines, ships the save-envelope schema seam +
example fixtures, extends manifest.schema.json with assetDigest +
key-rotation + signaturePolicy fields, and contributes the save / pack
threat-model sections to security-model.md plus the resumed-from-save
mode to match-handshake.md. Adds seven owning task files spanning
parser hardening, pre-replay command validation, the envelope + intent
discriminator, the M5 MAC phase-in, the pack-signing verifier, the
reproducible-archive contract, and the multiplayer load-resume
handshake.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```
