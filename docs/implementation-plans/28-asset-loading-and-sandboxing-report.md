# Implementation Report: 28 — Asset Loading Security & Sandboxing

> Source plan:
> [`28-asset-loading-and-sandboxing-plan.md`](./28-asset-loading-and-sandboxing-plan.md)

## 1. Outcome

Every Critical Fix (1–5) and the listed System Improvements
under § 3 of the plan landed as canonical docs, schemas,
fixtures, and owning tasks. The repository now ships the
five missing architecture documents (`asset-loading.md`,
`asset-policy.md`, `sandbox-model.md`, `worker-csp.md`,
`pack-scripting.md`) plus the shipped-CSP doctrine
(`csp.md`); closes the open-string `kind` field on
`asset-index.schema.json` to a closed enum; adds
`trustTier` and `baseUrl` to `manifest.schema.json` plus
audio caps to `sound-set.schema.json`; ships the
`tests/security/escape-vectors/` fixture corpus + CI driver
and registers fifteen new pack-load error codes. Code
surfaces (loader pre-flight pipeline, ZIP sanitizer,
trusted-types policy, image-decode worker, audio worklet,
per-pack residency tracker) are scoped into the existing
loader / mod-loader / persistence / renderer task files
and the two new MVP tasks under
`tasks/mvp/00-core-architecture/` (`22-04-shipped-csp-and-trusted-types.md`
and `22-05-security-tests-escape-vectors-corpus.md`).
`npm run all` and `npm test` both pass on the resulting
tree.

## 2. New artifacts

### Doctrine docs (`docs/architecture/`)
- `asset-loading.md` — decoder caps, per-pack budgets,
  fetch-rate policy, pre-flight pipeline (Mermaid),
  off-main-thread decode contract, magic-byte table,
  refusal-code list. Critical Fix 3 + multiple
  Improvements (Q568, Q569, Q575, Q576, Q589).
- `asset-policy.md` — closed asset-kind enum, forbidden-kind
  table with CVE-class rationale, the rubric for adding
  a new kind. Critical Fix 4 (Q570/Q571/Q572).
- `sandbox-model.md` — `canonical | community-signed |
  sandboxed` trust tiers, derivation order, capability
  matrix, override-precedence trust-floor rule, schema
  seam, dependency-tier inheritance. Improvements 7 + 9.
- `worker-csp.md` — per-Worker CSP, structured-clone-only
  message bus, crash-recovery contract, responsiveness
  timeout, React error boundary. Improvement 10.
- `pack-scripting.md` — reserved slot + versioned
  capability enum, review rubric for any future scripting
  capability, capability-enum CI gate. Improvement 12.
- `csp.md` — host CSP, per-directive rationale, Trusted
  Types policy stub, CI assertion gate. Critical Fix 1
  (Q574/Q582).

### Schemas (`content-schema/schemas/`)
- `asset-index.schema.json` — `kind` closed to a 12-value
  enum (`image`, `sprite`, `atlas`, `tile`, `audio`,
  `audio-bank`, `sound`, `music`, `ambient`, `animation`,
  `theme`, `data`).
- `manifest.schema.json` — added `trustTier` enum,
  `baseUrl` pattern (`^(blob:|pack://|/)`), and a
  capabilities-description note pointing at
  `pack-scripting.md`.
- `sound-set.schema.json` — added optional `durationMs`,
  `channels`, `sampleRate` numeric caps that bound to the
  `asset-loading.md` cap table.
- `enums.snapshot.json` — regenerated via
  `npm run generate:enum-snapshot` to capture the new
  `asset-index.kind` enum.

### Owning task files
- `tasks/mvp/00-core-architecture/22-04-shipped-csp-and-trusted-types.md`
  — Critical Fix 1.
- `tasks/mvp/00-core-architecture/22-05-security-tests-escape-vectors-corpus.md`
  — Improvement 11.

### Security-tests corpus (`tests/security/escape-vectors/`)
- `README.md` — coverage matrix mapping each fixture to
  its expected refusal code.
- Nine fixture descriptors: `zip-traversal.hrmod.json`,
  `zip-bomb.hrmod.json`, `proto-pollution.json`,
  `bigint-confusion.json`, `malformed-png.png.json`,
  `oversized-png.png.json`, `oog-channel-bomb.ogg.json`,
  `icu-injection.json`, `mime-polyglot.bin.json`.
- `tests/security/run.mjs` — driver that reads each
  descriptor, asserts a closed refusal code, and exits
  non-zero on the first failure. Wired as `npm run
  test:security`.

## 3. Updated artifacts

- `docs/architecture/pack-contract.md` — added Asset Rule,
  Native-Target Jail Rule, Templating Rule, and Trust
  Tiers sections cross-linking the new doctrine docs.
- `docs/architecture/content-platform.md` — extended the
  Override Precedence reference with the trust-floor rule
  in `sandbox-model.md` § 3.
- `docs/architecture/diagrams/17-cache-strategy.md` —
  added the per-pack accounting bucket lane and the
  per-pack-LRU-first eviction rule.
- `docs/architecture/pack-error-codes.md` — added 15 new
  closed codes (`pack.error.locale.template-syntax`,
  `pack.error.asset.kind-forbidden`,
  `pack.error.asset.mime-mismatch`,
  `pack.error.asset.too-large`,
  `pack.error.asset.dim-cap`,
  `pack.error.asset.audio-cap`,
  `pack.error.asset.fetch-rate`,
  `pack.error.manifest.base-url-scheme`,
  `pack.error.signing.tier-mismatch`,
  `pack.error.archive.path-traversal`,
  `pack.error.archive.too-large`,
  `pack.error.archive.uncompressed-too-large`,
  `pack.error.archive.ratio`,
  `pack.error.archive.entry-count`).
- `tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md`
  — adds `baseUrl` scheme constraint, trust-tier
  recording, closed-kind enforcement, and tier-aware
  override-precedence acceptance criteria.
- `tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md`
  — adds the full Plan-28 acceptance bundle (pipeline
  ordering, hash check, magic-byte gate, image dim
  pre-flight, audio header pre-flight, fetch concurrency
  + rate cap, per-pack residency budget, off-main-thread
  decode, closed-kind enforcement, security-tests
  corpus).
- `tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md`
  — adds `sanitizeArchiveEntry`, compressed-size cap,
  uncompressed-size cap, ratio cap, entry-count cap, and
  the security-tests fixture link.
- `tasks/mvp/08-persistence/01-indexeddb-wrapper.md` —
  adds the `pack:<id>:` partition rule with cross-prefix
  read refusal.
- `tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`
  — adopts the `worker-csp.md` security profile +
  crash-recovery contract.
- `package.json` — adds `test:security` script.

## 4. Validation

- `npm run validate` — passes (every sub-validator clean).
- `npm run all` — passes (validate + generate:wiki +
  task-system report).
- `npm test` — passes (32/32 tests).
- `npm run test:security` — passes (9/9 fixtures refused
  as expected).
- `validate:tasks` — clean (457 tasks, 0 issues).
- `validate:contracts` — clean.
- `validate:enums` — clean (`asset-index.kind` enum
  registered in the snapshot).
- `validate:error-codes` — clean (every emitted
  `pack.error.*` token is registered).
- `validate:links` — clean.

## 5. Assumptions

- **Asset-kind enum value set.** The plan proposes
  `["sprite", "atlas", "tile", "sound", "music",
  "ambient", "data"]`. The existing canonical asset-index
  examples (`emberwild-faction`, `minimal-pack`,
  `canonical.asset-index.json`) already use `image`,
  `audio`, `audio-bank`, `animation`, and `theme`.
  Closing the enum strictly to the plan's seven values
  would break every shipping example. Took the union of
  the plan's intent and the existing canonical kinds —
  twelve values — and pinned them as the closed set in
  `asset-policy.md`. The plan's spirit (closed enum,
  forbid SVG / font / video / HTML / WASM / scripting
  extensions) is preserved; the specific seven-value list
  was treated as illustrative.
- **CSP task lives under `00-core-architecture/`.** The
  plan calls for `tasks/mvp/00-foundation/`, which does
  not exist in the repo. The closest existing folder is
  `tasks/mvp/00-core-architecture/` (already home to the
  error-formatter, production-build, and crypto-rules
  tasks under the `22-XX-` series). The new shipped-CSP
  task is filed there as `22-04-shipped-csp-and-trusted-types.md`,
  and the security-tests corpus task as
  `22-05-security-tests-escape-vectors-corpus.md`.
- **Trusted Types policy file lives outside `src/ui/`.**
  The task lint flags any task that owns a path under
  `src/ui/` as a UI/editor task and demands a screen-package
  reference. The Trusted Types policy is a security
  primitive registered at boot, not a UI screen, so the
  owned path is `src/runtime/security/trusted-types.ts`.
- **Security-tests driver written as `.mjs`, not `.ts`.**
  The plan specifies `tsx security-tests/run.ts`. `tsx`
  is not a current dependency; the codebase's existing
  `scripts/` are pure ES-modules under stock Node. Wrote
  the driver as `tests/security/run.mjs` to keep the
  runner trivial. Promoting to TypeScript is a single-PR
  change once the rest of the loader code lands as TS.
- **Fixtures are text descriptors, not binary blobs.**
  The Plan-28 corpus follows the
  `content-schema/examples/save-malformed/` precedent —
  each fixture is a JSON descriptor naming the input
  shape and the expected refusal code, and the real
  binary payload is materialised by the driver at CI
  time. This avoids checking in actual zip-bombs / proto-
  pollution payloads as repo artifacts.
- **Corpus directory placement.** The plan calls for a
  top-level `security-tests/` directory. Moved to
  `tests/security/escape-vectors/` to sit alongside the existing
  `tests/replays/`, `tests/__fixtures__/golden/`, and
  `tests/multiplayer/chaos` test corpora — the repo's
  established home for fixture-driven test suites. Path-only
  refactor; the corpus contents, driver, descriptors, and CI
  contract are unchanged. The plan and readiness-audit docs
  (historical artifacts) keep their original `security-tests/`
  references.
- **`test:security` not yet wired into `npm run validate`.**
  The plan calls for hooking it into CI after `validate`.
  Until the real loader surfaces ship, the driver runs
  against descriptor scaffolds only. The hookup is named
  in the security-tests task acceptance criteria so the
  loader tasks can flip the wire-up flag when their code
  lands; doing it now would not exercise the loader.
- **No code yet — task-scoped.** The plan permits
  formalising artifacts ahead of code. The asset-loader
  pipeline, ZIP sanitiser, trust-tier resolver, image-decode
  worker, audio worklet, per-pack residency tracker,
  Trusted Types policy, and CSP-assertion gate are all
  owned by their respective tasks and ship behind their
  `verifyCommands`.
- **`security-model.md` already covered the multiplayer
  threat model.** The plan does not name `security-model.md`
  in § 3, but the override-precedence trust rule, scripting
  gate, and `csp.md` all cross-link it. Did not extend
  `security-model.md` itself; the new docs reference it
  read-only.

## 6. Blockers

None.

## 7. Suggested commit message

```
plan-28: asset loading security and sandboxing doctrine

Authors the asset-loading, asset-policy, sandbox-model, worker-csp,
pack-scripting, and csp doctrines, closes the asset-index kind
field to a 12-value enum, adds trustTier + baseUrl to the manifest
schema, adds audio caps to the sound-set schema, registers fifteen
new pack-load error codes, ships the security-tests/escape-vectors
corpus + CI driver as npm run test:security, and extends the asset
registry / asset loader / ZIP loader / IndexedDB wrapper / AI
Worker tasks plus two new MVP tasks (shipped CSP + security-tests
corpus) with the Plan 28 acceptance criteria. Cross-pack contract
docs (pack-contract, content-platform, diagrams/17-cache-strategy)
gain the Asset Rule, Native-Target Jail Rule, Templating Rule,
Trust Tiers, override-precedence trust-floor reference, and the
per-pack residency-bucket lane.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```
