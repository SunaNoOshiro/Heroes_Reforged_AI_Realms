# Implementation Plan: 28 — Asset Loading Security & Sandboxing Untrusted Content

## 1. Overview

This plan converts the gaps identified in
[../readiness-audit/28-asset-loading-and-sandboxing.md](../readiness-audit/28-asset-loading-and-sandboxing.md)
into concrete document, schema, and task work.

**Audit-stated readiness:** 2/10. Only the closed effect interpreter (Q581) and
the structured formula AST (Q584) are sound; every decoder, sandbox-boundary,
budget, hash, CSP, and trust-tier rule is missing or partial.

**Scope of this plan:**
- New architecture documents that the audit names as missing
  (`asset-loading.md`, `asset-policy.md`, `sandbox-model.md`,
  `worker-csp.md`, `pack-scripting.md`).
- Schema additions on `manifest.schema.json`, `asset-index.schema.json`,
  `sound-set.schema.json`.
- Task additions/modifications under
  `tasks/mvp/02b-asset-pipeline/`,
  `tasks/mvp/06-renderer/`,
  `tasks/mvp/08-persistence/`,
  `tasks/phase-2/05-mod-system/`,
  plus a new `tasks/mvp/00-foundation/` entry for the shipped CSP.
- A `security-tests/escape-vectors/` corpus and CI hookup.

**Out of scope:** rewriting the audit, reopening Q581/Q584 (already ✔),
designing new gameplay logic.

---

## 2. Critical Fixes (Must Do First)

These five items unblock every other defense and must land before any pack
loader is wired up.

1. **Ship a Content Security Policy** (Q574, Q582) — without a CSP every other
   defense is enforced by intent only.
2. **Add per-asset SHA-256 to `asset-index.schema.json`** (Q577) — without it
   the decoder is the first thing that ever touches asset bytes.
3. **Author `docs/architecture/asset-loading.md`** with concrete caps
   (image dims, audio duration, fetch concurrency, per-pack memory) (Q568,
   Q569, Q575, Q576, Q589).
4. **Author `docs/architecture/asset-policy.md`** that closes the asset-kind
   enum (PNG/OGG/WebP/JSON allowed; SVG/font/video/HTML forbidden) and pin
   it from `pack-contract.md` (Q570, Q571, Q572).
5. **Add ZIP sanitizer step** to the `.hrmod` loader: traversal reject,
   uncompressed-size cap, ratio cap (Q566, Q578).

---

## 3. System Improvements

### Architecture (new docs)

#### Issue: No `asset-loading.md` design doc

**Source:** Q568, Q569, Q575, Q576, Q589 — Improvements item 1.

**Problem:** No central place names the per-decoder caps, per-pack budgets,
or fetch-rate policy. Each task speaks only to its slice.

**Impact:** Decoder DoS is wide open; an AI implementer would have to invent
the numbers.

**Solution:** New canonical design doc that other tasks reference by stable
section anchors.

**New Files:** `docs/architecture/asset-loading.md`.

**Content sections:**
- Decoder caps: `maxImageWidth: 4096`, `maxImageHeight: 4096`,
  `maxImagePixels: 16_777_216`, `maxAudioDurationMs: 60_000`,
  `maxAudioChannels: 2`, `maxAudioSampleRate: 48_000`.
- Per-asset caps: `maxAssetBytes: 32 MB`.
- Per-pack caps: `maxAssetsPerPack: 10_000`,
  `maxResidentBytesPerPack: 64 MB`.
- Fetch caps: `maxConcurrentFetches: 8`,
  `maxFetchesPerSecondPerPack: 32`.
- Pre-flight pipeline:
  `bytes → magic-byte check → cap pre-flight → hash verify → decoder`.
- Off-main-thread decode: `createImageBitmap` in a Worker,
  `decodeAudioData` in an `AudioWorklet`.

**Files to Update:**
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — add
  cross-link to asset-loading.md.
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md)
  — reference caps by section.
- [docs/architecture/diagrams/17-cache-strategy.md](../../architecture/diagrams/17-cache-strategy.md)
  — add per-pack accounting bucket.

**Implementation Steps:**
1. Draft `asset-loading.md` with the cap table above, one row per cap.
2. Add a "Pre-flight Pipeline" Mermaid sequence (bytes → check → decode).
3. Cross-link from `pack-contract.md` Asset Rule and from task 02b/05.
4. `npm run validate` to confirm links resolve.

**Dependencies:** none.

**Complexity:** M.

---

#### Issue: No `asset-policy.md` (allowed/forbidden asset kinds)

**Source:** Q570, Q571, Q572 — Improvements item 2.

**Problem:** `asset-index.schema.json` `kind` is free-form string. No rule
forbids SVG, custom fonts, or video in pack assets.

**Impact:** A future pack could ship `svg`/`font`/`video` kinds and trip
SVG-sanitizer / font-engine / video-codec CVEs.

**Solution:** Closed asset-kind enum, codified in the schema and pinned by a
short policy doc.

**New Files:** `docs/architecture/asset-policy.md`.

**Files to Update:**
- [content-schema/schemas/asset-index.schema.json](../../../content-schema/schemas/asset-index.schema.json)
  — change `kind` from open string to closed enum:
  `["sprite", "atlas", "tile", "sound", "music", "ambient", "data"]`.
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) —
  Asset Rule: "Allowed kinds enumerated in `asset-policy.md`. Pack assets MAY
  NOT include `svg`, `font/*`, `video/*`, or `text/html`."

**Implementation Steps:**
1. Author `asset-policy.md` with allowed/forbidden tables and rationale per
   row (link CVE classes for forbidden formats).
2. Lock `asset-index.schema.json` `kind` to a closed enum.
3. Run `npm run validate:contracts` — fix any canonical example that uses a
   non-enum kind.
4. Add task acceptance criterion to 02b/04 that registry rejects unknown
   kinds at registration time.

**Dependencies:** none.

**Complexity:** S.

---

#### Issue: No `sandbox-model.md` (trust tiers + capability matrix)

**Source:** Q580, Q591 — Improvements item 7, item 9.

**Problem:** `manifest.sandboxed: boolean` is a one-bit flag. There is no
matrix that says what sandboxed packs may do per surface (decode, override,
storage, network, signing).

**Impact:** A `sandboxed: true` pack today shares the same `AssetRegistry`,
`PackRegistry`, `IndexedDB`, and main thread as canonical content.

**Solution:** Trust-tier model: `canonical | community-signed | sandboxed`,
with a capability matrix and an override-precedence trust rule.

**New Files:** `docs/architecture/sandbox-model.md`.

**Content sections:**
- Trust tiers and how each is established (signature root, manifest flag).
- Capability matrix (rows = surfaces: asset decode, override canonical
  records, register custom kinds, IndexedDB write, network reach, fetch
  concurrency budget; columns = trust tiers).
- Override-precedence trust rule: a `sandboxed: true` pack MUST NOT
  override a record owned by a canonical/community-signed pack.

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  — add `trustTier: "canonical" | "community-signed" | "sandboxed"`
  (default `"sandboxed"`); `sandboxed: boolean` becomes derived for
  back-compat.
- [docs/architecture/content-platform.md](../../architecture/content-platform.md)
  — Override-precedence section: cite trust-tier rule.
- [tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md](../../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md)
  — registration must record `trustTier`; resolver must enforce
  override-precedence rule.

**Implementation Steps:**
1. Draft `sandbox-model.md` with the matrix.
2. Extend `manifest.schema.json` with `trustTier` enum.
3. Update task 02b/04 with a "tier-aware override" acceptance criterion.
4. Update `content-platform.md` Override section.
5. `npm run validate:contracts` and `npm run validate:tasks`.

**Dependencies:** asset-loading.md, asset-policy.md (so the matrix can
reference cap budgets).

**Complexity:** M.

---

#### Issue: No `worker-csp.md` (off-main-thread decode security profile)

**Source:** Q585, Q588 — Improvements item 10.

**Problem:** AI Worker exists for latency, not isolation; no CSP, no
structured-clone enforcement, no error-boundary policy.

**Impact:** Decoders run on the main thread; a Worker crash has no recovery
contract.

**Solution:** Worker security profile shared by AI worker, image-decode
worker, and audio-decode worklet.

**New Files:** `docs/architecture/worker-csp.md`.

**Content sections:**
- One CSP per Worker type (script-src 'self', no 'unsafe-eval').
- Structured-clone-only message bus; typed message contracts cite their
  schema by ID.
- `worker.onerror` → restart-with-last-known-good policy.
- 2-second responsiveness timeout (existing AI rule); separate per-Worker
  CPU budget.

**Files to Update:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
  — adopt `worker-csp.md`.
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md)
  — add Worker decode acceptance criterion.

**Dependencies:** asset-loading.md.

**Complexity:** M.

---

#### Issue: No `pack-scripting.md` placeholder + capability enum gate

**Source:** Q592 — Improvements item 12.

**Problem:** Future scripting capabilities would inherit no Worker isolation
contract, no CSP profile, no message-bus contract, no CPU/memory budget.

**Impact:** A drive-by addition of `scripts.lua` / `scripts.wasm` would ship
without any of the above.

**Solution:** Reserve the slot with a "no scripts ship until this doc
exists" gate.

**New Files:** `docs/architecture/pack-scripting.md` (stub: "intentionally
empty — no scripting capability is in scope").

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  — capability validation: any `scripts.*` token other than `scripts.none`
  fails CI unless `pack-scripting.md` declares the token in a versioned
  enum.
- `scripts/validation/lint-tasks.ts` (existing repo lint runner) — add a
  rule: capabilities outside `scripts.none` reject without
  `pack-scripting.md` enumeration.

**Dependencies:** sandbox-model.md.

**Complexity:** S.

---

### Schemas

#### Issue: No per-asset hash on `asset-index.schema.json`

**Source:** Q577 — Improvements item 3 (also closes audit 27 Q558).

**Problem:** `manifest.contentHash` is the aggregate JSON-record digest;
asset bytes have no per-file digest. Loader cannot verify before decode.

**Impact:** Decoder is the first byte-touching surface — full CVE class
exposure.

**Solution:** Add `sha256: string` to each asset-index entry; require
loader to verify before handing bytes to a decoder.

**Files to Update:**
- [content-schema/schemas/asset-index.schema.json](../../../content-schema/schemas/asset-index.schema.json)
  — add `sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }` (required).
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) —
  Asset Rule: cite per-asset hash.
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md)
  — acceptance criterion: hash check precedes decode; mismatch → `Result.err`.
- [tasks/phase-2/05-mod-system/02-pack-content-hash-verification-canonical-json-sha256.md](../../../tasks/phase-2/05-mod-system/02-pack-content-hash-verification-canonical-json-sha256.md)
  (if present) or its closest sibling — extend to per-asset.

**Implementation Steps:**
1. Schema edit + canonical-example update.
2. `npm run validate:contracts`.
3. Update task 02b/05 acceptance text.
4. Add a security-test fixture: pack with mismatched `sha256` must fail
   load.

**Dependencies:** asset-loading.md (cites the pre-flight pipeline).

**Complexity:** S.

---

#### Issue: `sound-set.schema.json` carries no audio decode caps

**Source:** Q569.

**Problem:** No `maxDurationMs`, `maxChannels`, `maxSampleRate` on the
schema; loader has nothing to pre-check.

**Impact:** A 10-minute, 8-channel, 384 kHz OGG can balloon to GB of PCM
before duration is exposed.

**Solution:** Pin caps centrally in `asset-loading.md`; schema-level
constraint keeps each `sound-set` entry within those caps via numeric
maximum on optional metadata fields.

**Files to Update:**
- [content-schema/schemas/sound-set.schema.json](../../../content-schema/schemas/sound-set.schema.json)
  — optional `durationMs: integer`, `channels: 1 | 2`,
  `sampleRate: 22050 | 44100 | 48000`. When present, schema bounds them;
  when absent, loader rejects audio whose decoded properties exceed
  `asset-loading.md` caps.

**Dependencies:** asset-loading.md.

**Complexity:** S.

---

#### Issue: `manifest.schema.json` — `baseUrl` scheme constraint missing

**Source:** Q573, Q579, Q586 — Improvements item 6.

**Problem:** `AssetRegistry.registerPack(packId, baseUrl, manifest)` accepts
any URL string. CSP and pack jail can be subverted by a tampered baseUrl.

**Impact:** Sandboxed packs effectively get outbound network reach.

**Solution:** Constrain `baseUrl` to `blob:`, same-origin, or the new
virtual `pack://<id>/` scheme (in-memory archive root). Reject `http:`,
`https:`, `file:`, `data:`, and any cross-origin URL.

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  — `baseUrl` pattern: `^(blob:|pack://|/)`.
- [tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md](../../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md)
  — `registerPack` rejects disallowed schemes.

**Dependencies:** sandbox-model.md (defines tiers; canonical packs may use
same-origin, sandboxed must use `pack://`).

**Complexity:** S.

---

### Tasks

#### Issue: ZIP loader has no traversal / size / ratio caps

**Source:** Q566, Q578 — Improvements item 4.

**Problem:** `tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md`
has no `maxCompressedBytes`, `maxUncompressedBytes`, `maxRatio`, no
traversal sanitizer.

**Impact:** Zip-bomb DoS; `../../../../config.json` extraction.

**Solution:** Acceptance-criteria addendum to the task.

**Files to Update:**
- [tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md](../../../tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md)
  — add:
  - `sanitizeArchiveEntry(path)` rejects entries containing `..`, leading
    `/`, backslashes, NULs, or symlink flags.
  - `maxCompressedBytes: 64 MB`, `maxUncompressedBytes: 512 MB`,
    `maxDecompressionRatio: 200:1`, `maxEntries: 20_000`.
  - Verify acceptance: a `security-tests/escape-vectors/zip-bomb.hrmod`
    fixture rejects.
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) —
  Archive Rule cites these caps.

**Dependencies:** security-tests corpus task.

**Complexity:** M.

---

#### Issue: Asset loader has no MIME content-sniff / `nosniff` rule

**Source:** Q567.

**Problem:** Bytes are handed to `new Image()` / `decodeAudioData` based on
declared `kind` only.

**Impact:** Polyglot/malformed payloads slip past extension-based dispatch.

**Solution:** Magic-byte check before decode.

**Files to Update:**
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md)
  — acceptance: per-kind magic-byte table (PNG `89 50 4E 47`, OGG `4F 67
  67 53`, WebP `52 49 46 46 …5745 4250`, JSON `{` after BOM strip);
  mismatch → `Result.err("mime-mismatch", { expected, observed })`.
  Pack-server response handling sets `X-Content-Type-Options: nosniff`
  when applicable; `pack://` virtual fetcher synthesizes the header.

**Dependencies:** asset-loading.md.

**Complexity:** S.

---

#### Issue: No image / audio dimension and duration pre-flight

**Source:** Q568, Q569.

**Problem:** Decoder runs without dim or duration cap.

**Impact:** 30000×30000 PNG (~3.6 GB RGBA), or 10-minute 8-channel OGG
(GB-scale PCM) crashes the tab.

**Solution:** Pre-flight via cheap header parse before decode.

**Files to Update:**
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md)
  — acceptance:
  - Image: parse PNG IHDR / WebP VP8X width+height before
    `createImageBitmap`; reject if any cap exceeded.
  - Audio: parse OGG Vorbis identification header for sample rate +
    channels; reject before `decodeAudioData`. Duration verified after
    decode-into-Worker; reject and free the buffer if cap exceeded.

**Dependencies:** asset-loading.md.

**Complexity:** M.

---

#### Issue: No per-pack fetch rate / concurrency cap

**Source:** Q575 — Improvements item 1.

**Problem:** `AssetLoader` describes preload phases only.

**Impact:** A pack with a 100 000-entry asset index triggers 100 000
in-flight `fetch()` calls.

**Solution:** Per-pack token bucket on the loader.

**Files to Update:**
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md)
  — `maxConcurrentFetches: 8`, `maxFetchesPerSecondPerPack: 32`. Excess
  requests queue with FIFO ordering.

**Dependencies:** asset-loading.md.

**Complexity:** S.

---

#### Issue: No per-pack memory budget / accounting

**Source:** Q576, Q589.

**Problem:** Cache strategy is global tiers; one pack can monopolize.

**Impact:** A pack pins 4 GB worth of "current hero / town / UI" into the
Pinned tier and eviction never fires.

**Solution:** Per-pack residency accounting bucket; eviction policy tested
against per-pack cap before global pressure.

**Files to Update:**
- [docs/architecture/diagrams/17-cache-strategy.md](../../architecture/diagrams/17-cache-strategy.md)
  — add per-pack bucket lane.
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md)
  — acceptance: `maxResidentBytesPerPack: 64 MB`; LRU within pack first,
  then global.
- [tasks/mvp/06-renderer/](../../../tasks/mvp/06-renderer/) — atlas tracker
  attributes bytes to owning pack via `packId`.

**Dependencies:** asset-loading.md.

**Complexity:** M.

---

#### Issue: No native-target asset jail policy

**Source:** Q579.

**Problem:** Future Tauri/Electron wrapper would inherit unconstrained
`baseUrl`.

**Impact:** `file:///` traversal once a desktop wrapper exists.

**Solution:** Pin the rule now even though no native target exists.

**Files to Update:**
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) —
  add "Native-Target Jail Rule": any future wrapper MUST resolve assets
  through the same `pack://` virtual scheme; raw `file://` reads forbidden.

**Dependencies:** sandbox-model.md, manifest baseUrl-scheme constraint.

**Complexity:** S.

---

#### Issue: No CSP shipped with the host HTML

**Source:** Q574, Q582 — Improvements item 5.

**Problem:** No `Content-Security-Policy` header / meta anywhere.

**Impact:** Every "no eval / no remote fetch / no inline script" rule is
intent-only.

**Solution:** Ship a CSP via meta tag on the canonical HTML, and as an HTTP
header from any future static-host config; add a Trusted Types policy.

**Files to Update / New Files:**
- New: `docs/architecture/csp.md` describing the policy and exceptions.
- New: `tasks/mvp/00-foundation/03-shipped-csp-and-trusted-types.md`
  (task) — owns the meta tag in the host HTML, the Trusted Types policy
  registration, and the CI assertion that no `<script>` inline / no
  `unsafe-eval` slip in.
- [tasks/mvp/00-foundation/](../../../tasks/mvp/00-foundation/) — index this
  new task in the directory's table-of-contents file (if present).

**Policy text (minimum):**
```
default-src 'self';
script-src 'self';
connect-src 'self' wss://signaling.* https://ai-gateway.*;
img-src 'self' blob: data:;
media-src 'self' blob:;
font-src 'self';
frame-ancestors 'none';
object-src 'none';
base-uri 'none';
require-trusted-types-for 'script';
trusted-types canonical-policy;
```

**Dependencies:** none (can land first).

**Complexity:** M.

---

#### Issue: Per-pack IndexedDB / localStorage partitioning

**Source:** Q590 — Improvements item 8.

**Problem:** `tasks/mvp/08-persistence/01-indexeddb-wrapper.md` has three
flat stores.

**Impact:** Moot today (no pack-supplied storage surface) but pins the gap
closed before a scripting capability lands.

**Solution:** Key-prefix policy `pack:<id>:…`; cross-prefix reads from
pack-supplied surfaces refused.

**Files to Update:**
- [tasks/mvp/08-persistence/01-indexeddb-wrapper.md](../../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
  — add "Pack Partition" acceptance: any key written on behalf of pack
  `<id>` MUST be prefixed `pack:<id>:`; any read from a pack-supplied
  surface MUST be filtered to that prefix.

**Dependencies:** sandbox-model.md.

**Complexity:** S.

---

#### Issue: No security-fuzz / escape-vector corpus

**Source:** Q587 — Improvements item 11.

**Problem:** Existing fuzz harness covers determinism only.

**Impact:** No CI gate prevents regression of any of the loader rules
above.

**Solution:** New `security-tests/escape-vectors/` directory + CI hookup.

**New Files:**
- `security-tests/escape-vectors/README.md` — catalogue of payload
  classes.
- `security-tests/escape-vectors/zip-traversal.hrmod`,
  `zip-bomb.hrmod`, `proto-pollution.json`, `bigint-confusion.json`,
  `malformed-png.png`, `oversized-png.png`, `oog-channel-bomb.ogg`,
  `icu-injection.json`, `mime-polyglot.bin`.
- `security-tests/run.ts` — driver that loads each fixture through the
  real loader and asserts `Result.err` with a stable error code.

**Files to Update:**
- `package.json` — script `"test:security": "tsx security-tests/run.ts"`.
- CI config (whatever runs `npm run validate`) — add `npm run
  test:security` after validate.

**Dependencies:** at least one of the loader-cap acceptance criteria above
must land before fixtures can be asserted against real behavior; the
corpus itself is content and can land first as TODO-only fixtures.

**Complexity:** L.

---

#### Issue: No Worker-crash recovery / top-level error boundary

**Source:** Q588.

**Problem:** Worker timeouts exist for responsiveness, not crashes.

**Impact:** A decoder Worker that throws kills the load and there is no
documented recovery.

**Solution:** Standard `worker.onerror → restart with last-known-good
state` documented in `worker-csp.md`; React error boundary at the top of
`src/ui/` documented in the renderer task.

**Files to Update:**
- `docs/architecture/worker-csp.md` (new — see above).
- [tasks/mvp/06-renderer/](../../../tasks/mvp/06-renderer/) — add top-level
  React error-boundary acceptance criterion.

**Dependencies:** worker-csp.md.

**Complexity:** S.

---

#### Issue: No "no general templating engine" rule

**Source:** Q583.

**Problem:** Localization is safe by construction; no rule forbids
Mustache/Handlebars/EJS etc. for description / readme / story text.

**Impact:** A drive-by inclusion of `handlebars` (which compiles strings
into JS) reopens the eval class.

**Solution:** One-line policy in `pack-contract.md` and an ESLint rule.

**Files to Update:**
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) —
  "Templating Rule": only ICU `{var}` placeholders are evaluated. Any
  other syntax is rendered as literal text.
- ESLint config — `no-restricted-imports` for `handlebars`, `mustache`,
  `ejs`, `pug`, `eta`.

**Dependencies:** none.

**Complexity:** S.

---

## 4. Suggested Task Breakdown

- [ ] **T28-01** Author `docs/architecture/asset-loading.md` (decoder
  caps, per-pack budgets, fetch-rate policy, pre-flight pipeline).
- [ ] **T28-02** Author `docs/architecture/asset-policy.md` + close
  `asset-index.schema.json` `kind` enum.
- [ ] **T28-03** Author `docs/architecture/sandbox-model.md` + add
  `manifest.trustTier` enum.
- [ ] **T28-04** Author `docs/architecture/worker-csp.md` (Worker
  security profile + crash-recovery contract).
- [ ] **T28-05** Author `docs/architecture/pack-scripting.md` stub +
  capability-enum CI gate.
- [ ] **T28-06** Author `docs/architecture/csp.md` and ship CSP as
  `tasks/mvp/00-foundation/03-shipped-csp-and-trusted-types.md`.
- [ ] **T28-07** Add per-asset `sha256` to
  `asset-index.schema.json`; loader verifies before decode.
- [ ] **T28-08** Add audio metadata caps to `sound-set.schema.json`.
- [ ] **T28-09** Constrain `manifest.baseUrl` to `blob:`, same-origin, or
  `pack://`; refuse other schemes in `registerPack`.
- [ ] **T28-10** Extend the ZIP loader task with traversal sanitizer +
  size + ratio + entry-count caps.
- [ ] **T28-11** Add MIME magic-byte gate to the asset loader.
- [ ] **T28-12** Add image dim + audio sample-rate / channel pre-flight
  to the asset loader.
- [ ] **T28-13** Add per-pack fetch concurrency + rate cap to the asset
  loader.
- [ ] **T28-14** Add per-pack residency budget + accounting to the cache
  strategy and renderer atlas tracker.
- [ ] **T28-15** Pin native-target jail rule in `pack-contract.md`.
- [ ] **T28-16** Add per-pack `pack:<id>:` IndexedDB key-prefix policy.
- [ ] **T28-17** Add tier-aware override-precedence rule (sandboxed
  packs MAY NOT override canonical records).
- [ ] **T28-18** Move image decode to a Worker
  (`createImageBitmap`/`OffscreenCanvas`) and audio decode to an
  `AudioWorklet`, both under `worker-csp.md`.
- [ ] **T28-19** Build `security-tests/escape-vectors/` corpus + CI
  driver; wire into `npm run validate` predecessor.
- [ ] **T28-20** Add ESLint `no-restricted-imports` for general-purpose
  templating engines + pin Templating Rule in `pack-contract.md`.

---

## 5. Execution Order

Order is chosen so each step can land independently and so design docs
exist before tasks reference them.

1. **T28-06** — CSP first; everything else inherits it.
2. **T28-01** — `asset-loading.md` (caps that other tasks reference).
3. **T28-02** — `asset-policy.md` + asset-kind enum close.
4. **T28-03** — `sandbox-model.md` + `trustTier` enum.
5. **T28-04** — `worker-csp.md`.
6. **T28-05** — `pack-scripting.md` stub + capability-enum gate.
7. **T28-07** — per-asset `sha256` schema field.
8. **T28-08** — audio metadata caps schema field.
9. **T28-09** — `baseUrl` scheme constraint.
10. **T28-10** — ZIP loader caps + sanitizer.
11. **T28-11** — MIME magic-byte gate.
12. **T28-12** — image/audio pre-flight.
13. **T28-13** — fetch concurrency + rate cap.
14. **T28-14** — per-pack residency budget.
15. **T28-15** — native-target jail rule.
16. **T28-16** — IndexedDB partition prefix.
17. **T28-17** — tier-aware override precedence.
18. **T28-18** — Worker decode migration.
19. **T28-19** — security-tests corpus + CI.
20. **T28-20** — templating-engine ESLint ban.

---

## 6. Risks if Not Implemented

- **Decoder DoS remains wide open.** Image, audio, font, hypothetical
  SVG/video — all trigger CVEs from a single malformed file.
- **Decompression-bomb DoS.** A 1 MB `.hrmod` ZIP that expands to 100 GB
  OOMs the page; the gzipped save format inherits the gap.
- **Path traversal at extraction.** `../../../../config.json` entries are
  not rejected.
- **CSP-shaped hole.** Without a shipped CSP, every other defense
  (no-eval, no-fetch, no-remote-asset) is enforced by intent; one
  regression subverts the whole model.
- **Sandbox is a name, not a boundary.** `sandboxed: true` is a flag with
  no enforcement on decoders, fetches, storage, or override precedence.
- **Per-pack accounting is absent.** Eviction is global LRU; one pack
  monopolizes `Pinned` tier and never gets evicted.
- **Cross-pack reads / overrides.** A `sandboxed: true` pack can override
  canonical records by load order alone.
- **Future scripting inherits no policy.** Adding a `scripts.*` token
  later means inventing every defense at the same time the feature ships.

---

## 7. AI Implementation Readiness

**Score after this plan executes: 7/10.**

**Reason:** Closing T28-01 through T28-12 turns the strongest defenses in
the audit (closed effect interpreter, structured formula AST) into one of
several layered defenses instead of the only ones. The decoder pre-flight
pipeline, per-asset hash, ZIP sanitizer, baseUrl constraint, shipped CSP,
and trust-tier matrix together address the audit's "decoder DoS / CSP /
sandbox-is-a-name" risk cluster. The remaining 3 points are absorbed by:
(a) actually wiring the security-tests corpus into CI (T28-19) and
keeping it green; (b) shipping the Worker decode migration (T28-18) under
the `worker-csp.md` profile; (c) keeping `pack-scripting.md` as a hard
gate for any future capability beyond `scripts.none`. Until T28-06 and
T28-07 land in particular, third-party / AI-generated packs should
remain refuse-load on every shipping client where decoder/parser CVEs
matter.
