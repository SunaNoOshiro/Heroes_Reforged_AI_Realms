# 28. ASSET LOADING SECURITY & SANDBOXING UNTRUSTED CONTENT

> **Audit context.** Heroes Reforged is design-first / schema-first; no
> runtime exists yet. The asset surface is described by:
> `tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md`
> (id-based resolution) and `…/05-async-asset-loader-with-caching.md`
> (only point that calls `fetch()` / `new Image()`); the pack surface
> by `docs/architecture/pack-contract.md` and
> `content-schema/schemas/manifest.schema.json`. Untrusted-content
> handling is named only by two flags — `manifest.sandboxed: boolean`
> and `manifest.capabilities: ["formulas.ast", "spells.custom-kind",
> "abilities.custom-kind", "assets.binary", "scripts.none"]` — and by
> the deferred phase-2 task `tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md`,
> which only enforces *gameplay* caps (HP ≤ 500, ATK ≤ 50, ≤ 5
> abilities), not asset/decoder/sandbox caps. Determinism forbids `eval`
> and `new Function` *inside the deterministic engine path*
> (`docs/architecture/determinism.md`), but the project does not yet
> document a process/Worker/iframe sandbox for pack code or asset
> decoders. Almost every question below therefore resolves to ❌ UNKNOWN
> or ⚠ Partial.

---

### Q: 566. Are asset paths resolved through a registry that prevents path traversal (`../`) escapes?

**Status:** ⚠ Partial

**Answer:**
**Resolution goes through `AssetRegistry` by stable ID, not by path — but `../` sanitization at extraction time is not specified.** `tasks/mvp/02b-asset-pipeline/04-…` mandates that the engine *never references a file path directly*; renderer/UI ask for `"sprite:emberwild/ash-hound"` and the registry returns a URL based on the loaded pack's `baseUrl`. An ESLint rule is required to ban relative imports of asset files inside `src/renderer/` and `src/ui/`. So *engine-originated* path traversal is structurally impossible by contract. The remaining gap is the **archive-extraction side**: `.hrmod` is a ZIP (`pack-contract.md` Archive Rule, `tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md`) and audit 20 Q368 explicitly notes "no path-traversal protection rule is documented for ZIP extraction." A malicious pack could include an entry like `../../../config.json`; today no rule rejects it. The registry would not *resolve* such a path, but JSZip extraction onto disk (in a future desktop wrapper) or onto a virtual file tree would still write the entry.

**Evidence:**
- [tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md) — id-based resolution, ESLint rule
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — Archive Rule (ZIP, no traversal rule)
- [docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) Q368 — confirms missing ZIP path-traversal rule
- Missing: `sanitizeArchiveEntry(path)` step in `tasks/phase-2/05-mod-system/01-…`

---

### Q: 567. Are asset MIME types validated by content sniffing, not just by file extension?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `asset-index.schema.json` declares each asset's `kind` (free-form `string`) and `path` only. No magic-byte / content-sniff step appears in any task. `AssetLoader.loadTexture(id)` (task 02b/05) is described at the API level only ("the single point where `fetch()` or `new Image()` is called"); it has no documented "verify file signature matches declared kind" gate. A pack could ship `ash-hound.png` whose bytes are actually a malformed JPEG, an SVG (with executable content — see Q570), or a polyglot file that browsers content-sniff into a different MIME than the server `Content-Type` header suggests. A canonical mitigation (`X-Content-Type-Options: nosniff` HTTP header on pack serving + per-file magic-byte check before handing to a decoder) is not documented anywhere.

**Evidence:**
- [content-schema/schemas/asset-index.schema.json](../../content-schema/schemas/asset-index.schema.json) — `kind` is free-form `string`; no MIME contract
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md) — no MIME validation step
- Missing: `nosniff`/magic-byte rule in `pack-contract.md`

---

### Q: 568. Are image decoders run with size limits (max width, height, total pixels) before allocation?

**Status:** ❌ UNKNOWN

**Answer:**
**No image-size budget exists.** The renderer choice (`docs/architecture/renderer-technology-choice.md`) names a tile atlas at 512×512 with 32×32 hex tiles, and the cache strategy (`diagrams/17-cache-strategy.md`) tracks pinned/hot/warm/cold tiers — but neither documents a per-image `maxWidth`, `maxHeight`, or `maxPixels` cap before the browser's `Image()`/`createImageBitmap` decoder runs. Browsers will happily decode a 30000×30000 PNG (which allocates ~3.6 GB RGBA), tab-crashing the page or OOM-killing the worker. There is no "reject if `naturalWidth > 4096` before upload to GPU" rule in `tasks/mvp/06-renderer.md` or in `tasks/mvp/02b-asset-pipeline/`, and no dimension field on the manifest that a pre-flight could check.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md) — atlas dims fixed for *engine* tiles; no per-asset cap rule
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md) — no size-cap acceptance criterion
- Missing: `maxImageWidth`, `maxImageHeight`, `maxImagePixels` policy

---

### Q: 569. Are audio decoders limited in duration and channel count to prevent decoder DoS?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** `AssetLoader.loadAudio(id): Promise<AudioBuffer>` is the only documented audio path; no duration, sample-rate, or channel cap is named. A malicious pack could ship a 10-minute, 8-channel, 384 kHz OGG payload that explodes a single `AudioBuffer` to several gigabytes of PCM in memory (browsers may decode the full file before exposing duration). `sound-set.schema.json` is referenced by the registry but is not documented as carrying a `maxDurationMs` field that the loader could pre-check. Audit 26 also names no audio-decoder DoS mitigation.

**Evidence:**
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md) — `loadAudio` API only
- [content-schema/schemas/sound-set.schema.json](../../content-schema/schemas/sound-set.schema.json) — no duration/channel cap field
- Missing: `maxAudioDurationMs`, `maxAudioChannels`, `maxAudioSampleRate` policy

---

### Q: 570. Are SVG assets sanitized to strip `<script>`, `<foreignObject>`, and event handlers before render?

**Status:** ✔ Defined (by omission)

**Answer:**
**No SVG asset path is in scope.** `asset-index.schema.json` lists no SVG kind, the renderer is WebGL2 over PNG sprite atlases (`renderer-technology-choice.md`: "Tile atlas: PNG sprite sheet"), and the only SVG usage in the repo is *mockup HTML* under `docs/architecture/wiki/screens/*/mockup.html` — design artifacts, not pack-loadable content. So SVG sanitization is moot **today**. **But** there is also no rule that *forbids* a future pack from adding an `svg` asset kind; if it is added, sanitization (DOMPurify with `USE_PROFILES: { svg: true }`, no `<script>`, no `<foreignObject>`, no `on*=` attributes, no remote `<image>` references) becomes mandatory and is currently undocumented. Audit 28 should pin the "no SVG in asset packs" rule explicitly in `pack-contract.md`.

**Evidence:**
- [content-schema/schemas/asset-index.schema.json](../../content-schema/schemas/asset-index.schema.json) — no `svg` kind enumerated (kind is open string, but no canonical use)
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md) — PNG-only sprite path
- Repo grep: SVG only in `docs/architecture/wiki/screens/*/mockup.html` (design)
- Missing: explicit "SVG forbidden in pack assets" rule in `pack-contract.md`

---

### Q: 571. Are font files loaded only from canonical packs, or can any pack inject custom fonts that exploit the OS font engine?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No task in `tasks/mvp/02b-asset-pipeline/` enumerates `font` as an asset kind and no `@font-face`/`FontFace` API rule is documented. The mockups use OS fonts (Georgia / system serif), so the canonical UI path does not require pack-supplied fonts. Whether a third-party pack *may* register a custom font (which would expose the platform's OpenType/TrueType parser to attacker bytes — historically a reliable RCE surface on every OS) is undefined. A canonical mitigation (whitelist of font sources to canonical packs only, font subset audit in CI, deny `font/*` from `sandboxed: true` packs) is not documented.

**Evidence:**
- [content-schema/schemas/asset-index.schema.json](../../content-schema/schemas/asset-index.schema.json) — no `font` kind enumerated
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md), wiki mockups — OS-font reliance
- Missing: font policy in `pack-contract.md`

---

### Q: 572. Are video assets disabled in untrusted packs, given the codec attack surface?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `asset-index.schema.json` does not enumerate video kinds. The intro-cinematic screen package (`docs/architecture/wiki/screens/05-intro-cinematic/spec.md`) implies a cinematic surface but its asset format is undocumented. There is no "untrusted packs MAY NOT include `video/*` assets" rule, and the `manifest.capabilities` enum has no `assets.video` token to grant or refuse video. Browser codec parsers (H.264/HEVC/VP9) have a long CVE history; without an explicit deny for `sandboxed: true` packs, a malicious pack could ship a malformed `.mp4`/`.webm` that triggers a decoder bug.

**Evidence:**
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — `capabilities` enum has no `assets.video`
- [docs/architecture/wiki/screens/05-intro-cinematic/spec.md](../architecture/wiki/screens/05-intro-cinematic/spec.md) — cinematic surface; format unspecified
- Missing: video-disable rule for `sandboxed: true`

---

### Q: 573. Are remote asset URLs allowed at all, or are all assets required to be local-bundled?

**Status:** ⚠ Partial

**Answer:**
**Local-only by convention; no explicit rule.** `AssetRegistry.registerPack(packId, baseUrl, manifest)` takes a `baseUrl` per pack — that is *intended* to be the local pack directory or an `IndexedDB`-backed virtual root — but the API signature does not constrain the URL scheme. The pack-contract treats packs as local archives (`.hrmod` ZIP), and audit 27 Q549 confirms saves cannot embed remote URLs. There is no documented prohibition that says `baseUrl` MUST be `blob:` / same-origin / `file://`-relative; an attacker who can craft a pack manifest and tampered registry could in principle steer asset fetches at an `http://attacker/` host. A canonical mitigation (CSP `img-src 'self' blob: data:`, refuse `http(s):` schemes for pack `baseUrl`) is not specified.

**Evidence:**
- [tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md) — `baseUrl: string` (unconstrained)
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — local archives implied
- Missing: `baseUrl` scheme constraint, CSP policy

---

### Q: 574. If remote assets are allowed, is there an allowlist of hosts and a CSP that enforces it?

**Status:** ❌ UNKNOWN

**Answer:**
**No CSP policy in the repo.** `grep -ri "content-security-policy\|csp\|Content-Security-Policy" docs/ tasks/` returns nothing relevant (only "csp" inside Mermaid file names). There is no documented CSP header, no `<meta http-equiv="Content-Security-Policy">` rule for the shipped HTML, and no `connect-src` / `img-src` / `media-src` allowlist. The signaling-server doc is the only "remote endpoint" mentioned and it is for WebRTC, not asset fetch. If remote assets are ever permitted (Q573), there is no enforcement layer.

**Evidence:**
- Repo grep: no `Content-Security-Policy` artifact in `docs/` or `tasks/`
- Missing: shipped-HTML CSP, per-pack `connect-src` allowlist

---

### Q: 575. Are asset fetches rate-limited so a malicious pack cannot DoS the asset CDN?

**Status:** ❌ UNKNOWN

**Answer:**
**No rate-limit at the asset layer.** `AssetLoader` describes preload phases (install / battle-start / town-enter) but no per-second / per-pack request cap. There is no token bucket, no concurrency cap (`maxConcurrentFetches`), no per-pack budget. Audit 29 Q593–Q605 raises rate-limit policy as a project-wide gap; the asset path is one of the surfaces affected. A pack with a 100 000-entry `assets/index.json` could trigger 100 000 in-flight `fetch()` calls when preloaded.

**Evidence:**
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md) — preload phases only; no rate cap
- [docs/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q593–Q605 — repo-wide rate-limit gap
- Missing: `maxConcurrentFetches`, `maxFetchesPerSecond` per-pack budget

---

### Q: 576. Is there a per-pack memory cap on resident assets to prevent OOM exploits via huge sprite atlases?

**Status:** ❌ UNKNOWN

**Answer:**
**No per-pack budget.** The cache strategy diagram (`17-cache-strategy.md`) describes *global* tiers (Pinned/Hot/Warm/Cold) and global eviction thresholds (70%/90% of "memory"), but does not name a per-pack cap (e.g., `maxResidentBytesPerPack: 64 MB`) or a per-pack accounting bucket. A single pack could pin a 4 GB atlas via `Pinned: Current hero / town / UI` once it loads; eviction would only fire at global pressure. The phase-2 sandbox task (`05-mod-system/03-…`) caps gameplay (HP, ATK, ability count) but not asset memory.

**Evidence:**
- [docs/architecture/diagrams/17-cache-strategy.md](../architecture/diagrams/17-cache-strategy.md) — global tiers, no per-pack cap
- [tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md](../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md) — gameplay caps only
- Missing: `maxResidentBytesPerPack` policy

---

### Q: 577. Are assets verified by hash from the manifest before being handed to decoders, not after?

**Status:** ❌ UNKNOWN

**Answer:**
**No per-asset hash exists, so verification is structurally impossible.** Audit 27 Q558 already established this: `manifest.contentHash` is the *aggregate* canonical-JSON digest of all *records* (gameplay JSON), not a per-asset binary digest. `pack-contract.md` explicitly disclaims a separate `manifest.files[]` inventory. Because `asset-index.schema.json` carries `id`, `kind`, `path` but no `sha256`/`hash` field, the loader has nothing to compare bytes against before decoding. So the decoder is the *first* thing that touches asset bytes — bug-class for image/audio/font CVEs is fully exposed.

**Evidence:**
- [docs/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md) Q558 — `contentHash` covers JSON records only
- [content-schema/schemas/asset-index.schema.json](../../content-schema/schemas/asset-index.schema.json) — no per-asset hash field
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — no per-asset hash list

---

### Q: 578. Are decompression bombs (zip, gzip) detected by enforcing maximum uncompressed size and ratio?

**Status:** ❌ UNKNOWN

**Answer:**
**No decompression caps.** Audit 20 Q367 confirms: "no size cap, decompression-ratio guard, or ZIP path-traversal rule for `.hrmod` archives." `tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md` accepts an `ArrayBuffer` and returns `Promise<Result<RawModPack, ModLoadError>>` with no `maxCompressedBytes`, `maxUncompressedBytes`, or `maxRatio` acceptance criteria. The save-flow (`24-save-flow.md`) is gzip + JSON and inherits the same gap (audit 27 Q546). A 1 MB ZIP that expands to 100 GB (classic zip-bomb) would silently OOM the tab.

**Evidence:**
- [docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) Q367 — explicit gap
- [tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md](../../tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md) — no cap acceptance
- Missing: `maxCompressedBytes`, `maxUncompressedBytes`, `maxDecompressionRatio` policy

---

### Q: 579. Are assets loaded from the file system on native targets restricted to the pack's own directory?

**Status:** ❌ UNKNOWN

**Answer:**
**No native target documented.** The MVP target is the browser (`renderer-technology-choice.md`: "Run in modern browsers (desktop + tablet)"); there is no Tauri/Electron/Node-runtime task in `tasks/mvp/`. A future desktop wrapper is not ruled out (audit 20 alludes to it), but no rule says "asset reads MUST be confined to the pack root." Since `AssetRegistry.baseUrl` is a free-form string (Q573), a desktop wrapper that accepts `file:///` URLs would have no jail.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md) — browser-only MVP
- [tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md) — `baseUrl: string` (unconstrained)
- Missing: native-wrapper jail policy

---

### Q: 580. Is there a true sandbox (separate process, Worker, iframe with `sandbox` attribute) for executing untrusted pack logic?

**Status:** ⚠ Partial

**Answer:**
**Workers exist for AI compute and (implicitly) decode, but not as a *security* boundary for untrusted packs.** `tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md` puts the heuristic AI in a Web Worker for *latency*, not isolation. There is no documented Worker / iframe / process sandbox for pack data interpretation, and "pack logic" is *intended* to be data-only (Q581) so the question of "sandbox for pack code" partly resolves to "no code to sandbox by design." But the enforcement that pack data *cannot escalate to code* is not backed by a runtime boundary — it relies entirely on declarative-only effect schemas plus `manifest.capabilities` excluding `scripts.*` (only `scripts.none` is enumerated). Cross-origin isolation (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`), iframe `sandbox` attributes for any cinematic / mockup surface, and process-level isolation are all undocumented.

**Evidence:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) — latency Worker, not security
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — `capabilities` enum includes `scripts.none`
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — `sandboxed: boolean` flag, no runtime boundary spec
- Missing: COOP/COEP, iframe-sandbox policy, process-isolation rule

---

### Q: 581. If pack logic is data-only (declarative effects), is the effect interpreter formally limited to a known opcode set?

**Status:** ✔ Defined

**Answer:**
**Yes — closed `kind` enum + closed effect registry + closed formula opcode set.** `effect.schema.json` uses a discriminated union over a closed `oneOf` of effect kinds documented in [docs/architecture/effect-registry.md](../architecture/effect-registry.md): `damage`, `heal`, `status`, `modify_stat`, `modify_primary_stat`, `summon`, `dispel`, `resource_bonus`, `grant_spell`, `grant_ability`, `unlock_unit`, `unlock_building`. Adding a new kind requires (1) a new `$defs` subschema, (2) a registered runtime handler under `src/rules/effects/`, (3) a doc update — *and* `additionalProperties: false` is enforced. Numeric scaling is a `formula.schema.json` AST whose `op` field is the closed enum `add | sub | mul | divFloor | ratio | min | max | clamp | neg | abs`. So the interpreter surface is statically enumerable: ~12 effect kinds × ~10 formula ops, with no string-evaluator escape. This is the strongest single defense in this audit and earns the only ✔ here.

**Evidence:**
- [content-schema/schemas/effect.schema.json](../../content-schema/schemas/effect.schema.json) — closed `oneOf`, `additionalProperties: false`
- [docs/architecture/effect-registry.md](../architecture/effect-registry.md) — explicit opcode set + change protocol
- [content-schema/schemas/formula.schema.json](../../content-schema/schemas/formula.schema.json) — closed `op` enum
- [docs/architecture/determinism.md](../architecture/determinism.md) — "no eval, no new Function"

---

### Q: 582. Can an untrusted pack invoke `eval`, `Function`, dynamic `import()`, or otherwise escape its declarative box?

**Status:** ⚠ Partial

**Answer:**
**Not by data; not formally blocked by runtime.** `determinism.md` lists `eval` and `new Function(...)` as *forbidden in deterministic paths*, and `formula.schema.json` is a structured AST (no string formulas). So data-driven evaluation cannot reach a JS evaluator *if the engine respects the contract*. What is **not** present:
- A CSP `script-src 'self'` (Q574) that would block runtime `eval` even if a future engine bug allowed it.
- A `Trusted Types` policy.
- A test that asserts `formula.schema.json` validation rejects string ASTs.
- A rule against dynamic `import()` of untrusted URLs (relevant if a future engine attempts hot-reload of pack code).
- Enforcement that `manifest.capabilities` MUST include `scripts.none` and MUST NOT include any future `scripts.*` token (the enum reserves the slot but no policy says canonical packs must elect it).

**Evidence:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — forbidden list
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — `capabilities` includes `scripts.none` (only one script token defined)
- Missing: CSP `script-src`, Trusted Types policy, "must elect `scripts.none`" rule

---

### Q: 583. Are template strings within pack data evaluated by a safe templating engine (no code execution)?

**Status:** ⚠ Partial

**Answer:**
**Localization uses ICU MessageFormat-style placeholders (no code).** `localization.schema.json` and the screen `data-contracts.md` files describe `{var}`-style interpolation backed by the deterministic string-resolution diagram (`18-string-resolution.md`); no `{{ js-expression }}` engine is referenced. So the templating surface is safe by construction *for localization*. What is **not** specified is a project-wide rule that bans Mustache/Handlebars/EJS/etc. for any other surface (manifest description fields, pack readme display, scenario story text). A canonical mitigation ("only `{var}` ICU placeholders are evaluated; any other syntax is rendered as literal text") is not written down.

**Evidence:**
- [content-schema/schemas/localization.schema.json](../../content-schema/schemas/localization.schema.json) — ICU-style only
- [docs/architecture/diagrams/18-string-resolution.md](../architecture/diagrams/18-string-resolution.md) — placeholder substitution
- Missing: "no general-purpose templating engine" rule

---

### Q: 584. Are pack-supplied formulas constrained to a math-only DSL, not arbitrary JS?

**Status:** ✔ Defined

**Answer:**
**Yes.** Already covered by Q581. `formula.schema.json` is a structured AST with closed opcode enum (`add | sub | mul | divFloor | ratio | min | max | clamp | neg | abs`), integer-only literals, and `additionalProperties: false`. `determinism.md` forbids "runtime-parsed formula strings." `effect-registry.md`'s anti-pattern list includes "❌ Storing formulas as strings — breaks determinism." This is the cleanest answer in the audit.

**Evidence:**
- [content-schema/schemas/formula.schema.json](../../content-schema/schemas/formula.schema.json)
- [docs/architecture/determinism.md](../architecture/determinism.md)
- [docs/architecture/effect-registry.md](../architecture/effect-registry.md)

---

### Q: 585. Are Workers used for asset decoding, and do they have CSP and structured-clone-only message contracts?

**Status:** ❌ UNKNOWN

**Answer:**
**Not documented.** `AssetLoader` is described as having `loadTexture` / `loadAudio` / `loadAnimation` methods on the main thread; no off-main-thread decode (`OffscreenCanvas`, `createImageBitmap` in a Worker, `decodeAudioData` in an `AudioWorklet`) is named. The AI Worker (Q580) uses a typed message contract (`{ type: "COMPUTE_MOVE", state, difficulty }` → `{ type: "MOVE_RESULT", command }`) but no CSP and no structured-clone enforcement is specified. There is no shared "Worker security profile" doc.

**Evidence:**
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md) — main-thread API
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) — typed message, no CSP
- Missing: `worker-csp.md`, `OffscreenCanvas` decode policy

---

### Q: 586. Can an untrusted pack access the network from inside the sandbox, and is `fetch` blocked at the sandbox boundary?

**Status:** ❌ UNKNOWN

**Answer:**
**No sandbox boundary exists (Q580), and no network policy is documented.** Pack data is interpreted by the engine on the main thread; there is no per-pack `fetch` proxy and no CSP `connect-src` allowlist (Q574). Because pack logic is data-only by design (Q581), a pack cannot *itself* call `fetch` — but the engine acting on pack data may (e.g., loading a referenced asset URL via `AssetLoader`), and `AssetRegistry.baseUrl` is unconstrained (Q573), so a tampered local registry could effectively grant a pack outbound network access.

**Evidence:**
- [tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md) — `baseUrl` unconstrained
- Missing: per-pack `fetch` proxy, CSP `connect-src` allowlist

---

### Q: 587. Is the sandbox tested against escape vectors (postMessage abuse, prototype pollution, structured-clone shenanigans)?

**Status:** ❌ UNKNOWN

**Answer:**
**No sandbox to test, no escape-vector test corpus.** `tasks/` contains no security-fuzz / escape-test task. The fuzz harness named in `determinism.md` ("N random commands replayed bit-identically") is a *determinism* fuzzer, not a *security* fuzzer; it does not exercise prototype-pollution payloads, message-port confusion, or structured-clone edge cases (e.g., `__proto__` keys, `BigInt` vs `Number` confusion, `Date` injection into command args). A canonical mitigation (a `security-tests/` corpus with known-bad inputs that must be rejected at every loader boundary) is not documented.

**Evidence:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — fuzz harness for determinism only
- Missing: `security-tests/escape-vectors/` corpus

---

### Q: 588. Are sandbox crashes contained so they don't take down the host page?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** The AI Worker (Q580) names a 2-second timeout that returns the best move so far instead of hanging — that is a *responsiveness* guard, not a *crash* guard. There is no documented "if a Worker throws / dies, restart with the previous good state" policy, no `worker.onerror` contract, and no parent-page recovery rule. For pack-data interpretation on the main thread, an uncaught exception in the reducer would simply propagate; the load flow (`25-load-flow.md`) talks about "fail loudly" but does not say *how loudly* to the user vs. the host page.

**Evidence:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) — timeout only
- Missing: Worker-restart policy, top-level error boundary doc

---

### Q: 589. Is there a memory and CPU budget per untrusted pack enforced from outside the sandbox?

**Status:** ❌ UNKNOWN

**Answer:**
**Not enforced.** No per-pack memory budget (Q576), no per-pack CPU budget (the AI Worker's 2 s timeout is not pack-scoped), no `performance.measureUserAgentSpecificMemory()` accounting per pack. The phase-2 sandbox task (`05-mod-system/03-…`) caps *gameplay* values, not resource consumption.

**Evidence:**
- [tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md](../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md) — gameplay caps only
- [docs/architecture/diagrams/17-cache-strategy.md](../architecture/diagrams/17-cache-strategy.md) — global cache, no per-pack budget
- Missing: per-pack memory + CPU budget

---

### Q: 590. Are localStorage / IndexedDB partitioned per pack to prevent cross-pack data exfiltration?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `tasks/mvp/08-persistence/01-indexeddb-wrapper.md` uses three object stores (`saves`, `scenarios`, `content`) — none of them per-pack-keyed. Packs do not have their own local-storage namespace because, by Q581/Q584, packs are not supposed to *own* runtime storage; they are loaded into the registry. **However**, if any pack-supplied surface (e.g., a future scripting capability) could read browser storage, there is no partitioning rule. The browser's same-origin policy treats all packs as "the application," not as separate origins; this would have to be re-implemented in user-space (e.g., per-`packId` key prefixing) and is undocumented.

**Evidence:**
- [tasks/mvp/08-persistence/01-indexeddb-wrapper.md](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md) — three flat stores
- Missing: per-pack key-prefix policy

---

### Q: 591. Can an untrusted pack read another pack's assets or save data?

**Status:** ⚠ Partial

**Answer:**
**Yes, by design.** All loaded packs share one `AssetRegistry` and one `PackRegistry`; resolution is by ID with a documented fallback chain (faction pack → shared pack → placeholder). Override precedence is explicit (audit-23-style "explicit and predictable" — `content-platform.md`), so a sandboxed pack *can* override a canonical pack's records if loaded later. Reading another pack's *assets* is structurally allowed (anything in the registry is queryable), and reading *saves* is moot today because saves are not pack-scoped (single global save store). What is **not** documented:
- Whether `sandboxed: true` packs are blocked from overriding records owned by canonical packs.
- Whether registry queries from a pack-supplied surface are scoped to "your own pack only" (currently no such surface exists — Q581 — but no rule pins the gap closed).

**Evidence:**
- [tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md) — single shared registry, fallback chain
- [docs/architecture/content-platform.md](../architecture/content-platform.md) — "Overrides must be explicit and predictable" (no canonical-vs-sandboxed override rule)
- Missing: "sandboxed packs MAY NOT override canonical records" rule

---

### Q: 592. Are pack-supplied scripts (if any) executed only inside Workers with `--no-eval` equivalents and a strict CSP?

**Status:** ✔ Defined (by omission)

**Answer:**
**No pack-supplied scripts are in scope.** `manifest.capabilities` has `scripts.none` as the only enumerated `scripts.*` token; no `scripts.allowed` / `scripts.lua` / `scripts.wasm` token exists. `determinism.md` forbids `eval` and `new Function`. `effect.schema.json` and `formula.schema.json` are closed ASTs (Q581/Q584). So there is no script-execution surface to guard. **But** if a future capability adds scripting (Lua sandbox, WASM module), the runtime policy (Worker isolation, CSP `script-src 'wasm-unsafe-eval'` carefully scoped, no DOM access, no `fetch`, no `postMessage` to main, structured-clone-only message bus, CPU/memory budget) is entirely undocumented and would need a dedicated `pack-scripting.md` design.

**Evidence:**
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — `capabilities` enum has only `scripts.none`
- [docs/architecture/determinism.md](../architecture/determinism.md) — `eval`/`new Function` forbidden
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — closed-enum capability rule
- Missing: future `pack-scripting.md` for any capability that adds a script surface

---

## 🔍 Summary

### Missing Logic
- **No ZIP path-traversal sanitizer** for `.hrmod` extraction (Q566) — repeats audit 20 Q368.
- **No MIME content-sniffing / `nosniff` rule** for asset bytes (Q567).
- **No image dimension caps** (`maxWidth`, `maxHeight`, `maxPixels`) before decode (Q568).
- **No audio decoder caps** (`maxDurationMs`, `maxChannels`, `maxSampleRate`) (Q569).
- **No "SVG forbidden in pack assets"** rule pinned in `pack-contract.md` (Q570).
- **No font-source policy** — any pack could in principle inject a custom font (Q571).
- **No video-disable rule** for `sandboxed: true` packs (Q572).
- **No `baseUrl` scheme constraint** on `AssetRegistry.registerPack(packId, baseUrl, …)` (Q573).
- **No CSP** at all (no `Content-Security-Policy` header / meta, no `connect-src` / `img-src` / `media-src` allowlist) (Q574).
- **No asset-fetch rate limit / concurrency cap** per pack (Q575).
- **No per-pack memory budget**; only global cache tiers (Q576).
- **No per-asset binary hash** in `asset-index.schema.json` — repeats audit 27 Q558 (Q577).
- **No decompression caps** (`maxCompressedBytes`, `maxUncompressedBytes`, `maxRatio`) — repeats audit 20 Q367 (Q578).
- **No native-target asset jail** for any future desktop wrapper (Q579).
- **No security-grade sandbox boundary** (process / Worker-as-trust-boundary / `sandbox=` iframe); existing Workers are for latency, not isolation (Q580, Q585).
- **No CSP `script-src 'self'` / Trusted Types** policy backing the "no eval / no Function" rule (Q582).
- **No project-wide "no general templating engine"** rule beyond ICU localization (Q583).
- **No security-fuzz / escape-vector corpus** under `security-tests/` (Q587).
- **No Worker-crash-recovery / top-level-error-boundary** policy (Q588).
- **No per-pack CPU / memory budget** (Q589).
- **No per-pack storage partitioning** (key prefixes) for `IndexedDB` / `localStorage` (Q590).
- **No "sandboxed packs MAY NOT override canonical records"** rule (Q591).
- **No `pack-scripting.md`** for any future capability that adds a script surface (Q592).

### Risks
- **Decoder DoS is wide open.** Every decoder path (image, audio, font, hypothetical SVG/video) accepts attacker-controlled bytes with no pre-flight cap. A single malformed PNG, OGG, or font file from a `sandboxed: true` pack can crash the tab or trigger an OS-level codec CVE.
- **Decompression-bomb DoS.** A 1 MB `.hrmod` ZIP that expands to 100 GB will OOM the page; same for the gzip save format.
- **Path-traversal at extraction.** A pack with entries like `../../../config.json` is not rejected by any documented step.
- **CSP-shaped hole.** Without a shipped CSP, every other defense (no-eval, no-fetch, no-remote-asset) is enforced only by *intent* — a single regression in engine code or a tampered registry can subvert the entire model.
- **Sandbox is a name, not a boundary.** `sandboxed: true` is a *flag* read by the renderer (badge) and the gameplay-cap validator; it does not gate asset decoders, asset fetches, storage scope, or override precedence. Packs with the flag still share `AssetRegistry`, `PackRegistry`, `IndexedDB`, and the main-thread event loop with canonical content.
- **Per-pack accounting is absent.** No per-pack memory/CPU/fetch budget; one pack can monopolize global resources and the eviction strategy is global pressure-based (LRU), so a malicious pack can pin enough "current hero / town" assets to never get evicted.
- **Cross-pack reads.** All packs share the registry. A `sandboxed: true` pack can override canonical records if loaded later (override precedence is explicit but not trust-tier-aware).
- **Future scripting will inherit no policy.** If `manifest.capabilities` grows a `scripts.*` token, there is no Worker-isolation contract, no CSP `script-src` profile, no message-bus contract, and no CPU/memory budget waiting for it — every defense would have to be invented at the same time the feature ships.

### Improvements
1. **Author `docs/architecture/asset-loading.md`** with these caps, then reference from every relevant task:
   - `maxImageWidth: 4096`, `maxImageHeight: 4096`, `maxImagePixels: 16_777_216`.
   - `maxAudioDurationMs: 60_000`, `maxAudioChannels: 2`, `maxAudioSampleRate: 48_000`.
   - `maxAssetBytes: 32 MB`, `maxAssetsPerPack: 10_000`, `maxResidentBytesPerPack: 64 MB`.
   - `maxConcurrentFetches: 8`, `maxFetchesPerSecondPerPack: 32`.
2. **Author `docs/architecture/asset-policy.md`** that enumerates the *allowed* asset kinds (PNG, OGG, WebP, JSON) and explicitly forbids SVG, custom fonts, video, and HTML in pack assets — pin in `pack-contract.md`.
3. **Add a per-asset hash field** to `asset-index.schema.json` (`{ id, kind, path, sha256 }`) and require the loader to verify before handing bytes to a decoder. Closes Q577 and audit 27 Q558 in one stroke.
4. **Add a ZIP sanitizer step** to `tasks/phase-2/05-mod-system/01-…`: reject entries containing `..`, absolute paths, or backslashes; reject symlinks; cap entry count and total uncompressed size; cap decompression ratio at 200:1.
5. **Author and ship a CSP**:
   - `default-src 'self'`
   - `script-src 'self'` (no `'unsafe-eval'`, no `'unsafe-inline'`)
   - `connect-src 'self' wss://signaling.* https://ai-gateway.*` (named hosts only)
   - `img-src 'self' blob: data:`
   - `media-src 'self' blob:`
   - `font-src 'self'`
   - `frame-ancestors 'none'`
   - Add `Trusted Types` with a single canonical policy.
6. **Constrain `AssetRegistry.registerPack` `baseUrl`** to `blob:`, same-origin, or `pack://` (a virtual scheme backed by the in-memory pack archive). Refuse `http(s):` and `file:`.
7. **Author `docs/architecture/sandbox-model.md`** that names the trust tiers (canonical / community-signed / sandboxed) and what each tier may do per surface (asset decode, override, IndexedDB key namespace, network reach, signing requirement). Today `sandboxed` is a one-bit flag without a matrix.
8. **Per-pack storage prefix**: `IndexedDB` keys for any pack-owned data must be `pack:<id>:…`; refuse cross-prefix reads from any pack-supplied surface. Today moot; pin before any scripting capability lands.
9. **Disallow trust-tier downgrade in override**: a `sandboxed: true` pack MUST NOT override a record owned by a canonical/community-signed pack. Add to `content-platform.md` and to the override-precedence task.
10. **Move asset decode off the main thread**: `createImageBitmap` in a Worker, `decodeAudioData` in an `AudioWorklet`. Both with the documented caps from #1, structured-clone-only message bus, typed message contract, `worker.onerror` → restart-with-known-good policy.
11. **Add a security-fuzz corpus** at `security-tests/escape-vectors/`: prototype-pollution payloads (`__proto__`, `constructor`), large-int / `BigInt` confusion, malformed PNG / OGG headers, zip-bombs, deeply nested JSON, ICU placeholder injection. CI must run it on every loader change.
12. **Reserve `pack-scripting.md` slot**: no scripting capability ships until that doc exists; codify by gating the `scripts.*` capability enum on a "spec exists" CI check.

### AI-Readiness
**Score: 2/10**

**Reason:** Two specific defenses are in good shape — the **closed effect interpreter** (Q581) and the **structured formula AST** (Q584) — and they earn the only ✔ ratings in the audit. They cover the "no arbitrary code in pack data" half of the threat model surprisingly well. *Everything else* — decoder caps, MIME sniffing, decompression caps, ZIP traversal, asset hashing, CSP, sandbox boundary, per-pack budgets, storage partitioning, override-precedence trust rules, font/video/SVG policy, native-target jail — is undocumented or partial. An AI implementer asked to "harden the asset-loading and untrusted-content surface" would have to invent ~6 design docs (`asset-loading.md`, `asset-policy.md`, `sandbox-model.md`, `pack-scripting.md`, a shipped CSP, and a per-tier capability matrix) and a handful of schema additions (per-asset hash, decompression caps, baseUrl scheme constraint) before writing a single decoder line. Closing the items in **Improvements** — especially the CSP, the per-asset hash, decoder caps, ZIP sanitizer, and a real sandbox boundary — would lift this to 7/10. Until then, **AI-generated and third-party packs should be treated as untrusted code and refused load on any client where decoder/parser CVEs matter** (i.e., every shipping client). The phase-2 sandbox flag exists; the phase-2 sandbox does not.
