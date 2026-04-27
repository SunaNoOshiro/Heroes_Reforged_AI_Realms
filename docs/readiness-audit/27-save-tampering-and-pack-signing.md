# 27. SAVE FILE TAMPERING & MOD/PACK SIGNING

### Q: 540. Are save files signed or HMAC'd, or treated as fully untrusted input?

**Status:** ⚠ Partial

**Answer:**
**Neither signed nor HMAC'd. Treated as integrity-checked-but-untrusted.** A `SaveRecord` carries an `xxh64` `stateHash` (computed over the canonical post-replay state) plus per-pack `contentPackHashes`. xxh64 is **non-keyed** — fast and good for accidental-corruption detection, useless against an adversary who can recompute it after editing the log. There is no HMAC, no Ed25519/ECDSA signature on the save envelope, and no per-installation secret. The implicit threat model is therefore "treat saves as fully untrusted; rely on the deterministic replay to surface any logically invalid log." The only doc that names this gap explicitly is the persistence audit (Q158).

**Evidence:**
- `tasks/mvp/08-persistence/02-log-only-save-format.md` (`SaveRecord` shape — no `signature`/`mac` field)
- `docs/architecture/determinism.md` ("Canonical serializer + state hash … xxh64 over canonical bytes")
- `docs/readiness-audit/08-persistence-save-system.md` Q158 ("Cryptographic signature: no … xxh64 is fast but not cryptographic")
- `docs/architecture/diagrams/24-save-flow.md` (`stateHash` only)

---

### Q: 541. Is the threat model for saves explicitly "user can edit anything, runtime must reject invalid states"?

**Status:** ❌ UNKNOWN

**Answer:**
**Implied but never written down.** The fail-loud gates in the load flow (format gate → pack-hash gate → replay-hash gate) and the determinism contract together *enforce* the "user can edit but the replay catches it" stance, but no doc states this as a threat model. There is no `docs/architecture/security-model.md`, no "Save Threat Model" section in `pack-contract.md` or `state-flow.md`, and no acceptance criterion phrased as "loader must assume hostile input." Q367 of audit 20 also flags the missing decompression-bomb / oversized-file rule, which a written threat model would cover.

**Evidence:**
- `docs/architecture/diagrams/25-load-flow.md` (gates exist but no rationale)
- `docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md` Q367 (no oversize/zip-bomb rule)
- No `docs/architecture/security-model.md` in repo

---

### Q: 542. Does the save loader validate every numeric field against schema bounds (no negative HP, no overflow)?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified, and impossible to fully validate today** because no `save.schema.json` exists. Save shape lives only in a TypeScript `SaveRecord` declaration and a Mermaid example. `commandLog: Command[]` *does* have a schema (`content-schema/schemas/command.schema.json`), but there is no documented per-command numeric-bound check at load time — and saves are log-only so "HP" never appears in the file directly; HP is *recomputed* by the reducer. The reducer is expected to enforce its own invariants (no negative HP, no overflow), but no acceptance criterion ties save loading to "every command's numeric arguments are bounds-checked before dispatch."

**Evidence:**
- `tasks/mvp/08-persistence/02-log-only-save-format.md` (TS shape only)
- `content-schema/schemas/command.schema.json` (per-command schema; no save envelope)
- Audit 20 Q363 + repo: missing `content-schema/schemas/save.schema.json`
- No `validateBounds` step in `docs/architecture/diagrams/25-load-flow.md`

---

### Q: 543. Are referenced IDs (units, spells, factions) checked against the active pack registry before being applied to state?

**Status:** ⚠ Partial

**Answer:**
**Yes by contract, no explicit save-loader pass.** The pack-contract assigns "pack registry assembly" to `src/content-runtime/`, and the data-contracts file for the Save/Load screen states "Missing gameplay records, invalid commands, and unresolved content IDs **fail loudly** before controls become enabled." The reducer will throw on an unknown `unitId`/`spellId`/`factionId` because lookups go through the registry. What is **not** documented:
- A pre-replay sweep that walks the entire `commandLog` and rejects unresolved IDs *before* the reducer starts running, so the failure surfaces with full context rather than mid-replay.
- A rule for "save references a pack that is loaded but a record inside that pack has been removed in a later pack version."

**Evidence:**
- `docs/architecture/pack-contract.md` (registry assembly in `content-runtime/`)
- `docs/architecture/wiki/screens/55-save-load/data-contracts.md` ("unresolved content IDs fail loudly")
- `docs/architecture/diagrams/25-load-flow.md` (no pre-replay ID sweep)

---

### Q: 544. Are array sizes bounded so a hand-edited save cannot allocate millions of entities?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** Neither `SaveRecord` nor any pack-schema mentions array maxima for `commandLog`, `checkpoints`, `contentPackHashes`, or per-command arguments. Audit 08 Q163 confirms replays are "effectively unbounded by design." A hand-crafted save with `commandLog.length === 10_000_000` would be parsed and replayed until it OOM'd or hit the GC. The only soft guards are:
- IndexedDB browser quota (~50 MB+ depending on platform)
- Manifest-only inspection on the Save/Load screen, which avoids hydrating the array on the list page
Neither is a pre-parse cap.

**Evidence:**
- `docs/readiness-audit/08-persistence-save-system.md` Q163 ("effectively unbounded by design")
- `tasks/mvp/08-persistence/02-log-only-save-format.md` (no bounds)
- `docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md` Q367 (no size cap / decompression-ratio guard)

---

### Q: 545. Does the save loader run the schema validator before any reducer call so invariants cannot be violated post-load?

**Status:** ⚠ Partial

**Answer:**
**Intent yes, validator artifact missing.** The Save/Load data-contracts say "Loading validates schema version, content hashes, pack compatibility, ruleset version, and migration availability **before hydrating state**," and the diagram orders `Decompress → Valid format? → Check pack hashes → Load packs → Restore initial state → Replay`. So the **format/version/hash gates run before the reducer**. What is **not** in place:
- A `save.schema.json` (audit 20 Q363) — without it, "valid format" is whatever an ad-hoc parser accepts.
- A *per-command* validator pass over `commandLog` against `command.schema.json` before the reducer runs (today, the reducer is the first thing that touches commands).

**Evidence:**
- `docs/architecture/wiki/screens/55-save-load/data-contracts.md` ("validates … before hydrating state")
- `docs/architecture/diagrams/25-load-flow.md` (gates D, G precede reducer)
- Missing: `content-schema/schemas/save.schema.json`

---

### Q: 546. Is the loader resistant to YAML/JSON parser exploits (billion-laughs, alias bombs)?

**Status:** ✔ Defined (by omission of YAML)

**Answer:**
**No YAML in scope.** Saves are **JSON-only** (gzip + JSON, per `24-save-flow.md` and `02-log-only-save-format.md`). JSON has no aliases or entity expansion, so "billion-laughs" / "alias bomb" classes do not apply. The remaining JSON-parser concerns (extreme nesting depth, very large numeric literals, oversized strings) are **not** capped — there is no documented `maxDepth`, `maxStringLength`, `maxArrayLength`, or `maxObjectKeys` on the save parser, and the standard browser `JSON.parse` will accept arbitrarily deep input until it stack-overflows. Pack manifests are also JSON. No YAML loader exists anywhere in the repo (the only `*.yaml` mentions are CI lockfile references, not data-loading paths).

**Evidence:**
- `tasks/mvp/08-persistence/02-log-only-save-format.md` (JSON-only)
- `docs/architecture/diagrams/24-save-flow.md` ("Compress gzip" of canonical JSON)
- Repo grep: no YAML loader; only `pnpm-lock.yaml` / CI references
- Missing: parser-hardening guards (depth/string/array caps)

---

### Q: 547. Are floating-point values from saves quantized through fixed-point conversion before reducer use, to preserve determinism?

**Status:** ✔ Defined (by construction)

**Answer:**
**Yes — by construction, no floats reach the reducer.** Determinism rules forbid JavaScript floats in gameplay math; damage / HP / resources are integers, ratios are stored as paired numerator/denominator integers, and the canonical serializer rejects `NaN`/`Infinity`/exponents. So a save's command-log payload has **no float fields** to quantize in the first place. The only float-shaped values that can appear in a save are the wall-clock `createdAt`/`savedAt` integer epoch milliseconds (metadata, not reducer input). If a tampered save inserted a JSON `number` like `1.5` into a command argument, the canonical-serialization round-trip plus reducer-side type checking would reject it — but **no explicit test or schema rule** is documented to catch this; it is currently a property of the canonical serializer, not a separately-enforced gate.

**Evidence:**
- `docs/architecture/determinism.md` ("Forbidden in deterministic paths: JavaScript floats")
- `docs/architecture/determinism.md` ("All state numbers serialize as integer JSON literals. No exponents, no `Infinity`, no `NaN`.")
- `tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md`
- No "reject non-integer numerics in command args" gate documented separately

---

### Q: 548. Are save migrations idempotent and version-stamped so a tampered version field cannot skip security checks?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified — no migration scripts exist yet.** Audit 08 Q155/Q156 confirm: `saveVersion: 1` is stamped on every save, the Save/Load screen exposes a "Schema migration: none" indicator, and the load flow gates on "migration available?", but **no migrator is authored, no migrator-authoring contract exists, and no idempotency rule is written.** A tampered `saveVersion` field would steer the loader into:
- An unsupported version → format gate would refuse (`saveVersion === 999` ⇒ "no migration available" ⇒ reject).
- A *lower* version than authored → migrator chain re-runs; without an idempotency contract, double-application is undefined behavior.
- A version that bypasses a security-relevant migration → currently impossible to reason about because no migration is security-relevant *yet*.
The "tampered version skips security checks" failure mode is **realistic for the future** but not addressable today.

**Evidence:**
- `docs/readiness-audit/08-persistence-save-system.md` Q155, Q156 (gates exist; migrators do not)
- `docs/architecture/wiki/screens/55-save-load/mockup.html` ("Schema migration: none")
- No `src/persistence/migrations/` and no `docs/architecture/save-migration.md`

---

### Q: 549. Can a save file embed references to remote URLs that the loader will fetch before user consent?

**Status:** ✔ Defined (by omission)

**Answer:**
**No.** The save format is `{ id, name, createdAt, savedAt, seed, rulesetId, contentPackHashes, turnNumber, commandLog, checkpoints }` — none of these fields is documented as a URL or fetchable reference. `contentPackHashes` are just hash strings, not download locations; pack-resolution is performed *only* against packs already present in the local pack registry. The MVP architecture has no remote-asset fetch path at all (`src/content-runtime/` is local-pack-only; there is no network adapter). Audit 20 Q365 confirms: "current load flow assumes packs already exist locally; a 'missing pack → fetch and install' path is not modeled." So the answer is "structurally impossible today," **but** if a future "fetch missing packs" feature is added without consent gating, this answer must be revisited.

**Evidence:**
- `tasks/mvp/08-persistence/02-log-only-save-format.md` (no URL fields)
- `docs/architecture/pack-contract.md` (local-only registry)
- `docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md` Q365 ("packs already exist locally")

---

### Q: 550. Are save files distinguishable from replay files, and are they validated through different code paths?

**Status:** ❌ UNKNOWN

**Answer:**
**Not distinguishable, not separately validated.** Audit 08 Q152 confirms: "Effectively the same. The save *is* the replay artifact: the command log + seed + content/engine hashes are exactly what `replay(seed, log)` consumes." There is no `intent: "save" | "replay"` discriminator, no separate `*.replay` extension or schema, and no separate validator code path. A future spectator/bug-report flow would need an envelope distinction (Q526 of audit 26) but none is specified.

**Evidence:**
- `docs/readiness-audit/08-persistence-save-system.md` Q152 ("Effectively the same")
- `docs/architecture/diagrams/25-load-flow.md` ("load == replay")
- No `replay-format.md` or `*.replay` schema in the repo

---

### Q: 551. For multiplayer saves, are both peers required to have the same hash, with mismatch failing closed?

**Status:** ❌ UNKNOWN

**Answer:**
**MP + persistence interaction is undocumented.** The single-player load gate enforces `stateHash` and per-pack `contentHash` equality with the saved values, and the multiplayer per-turn `exchangeHashes()` enforces equality between peers during a live match — but **there is no documented protocol for "load a save into a multiplayer session,"** and no rule that says "before resuming, both peers must produce the same `stateHash` from the loaded save's command log." Audit 08 lists "MP / persistence interaction" as a known gap. So mismatch handling is undefined: it is unclear whether a mismatch fails closed (refuse to start the resumed match) or proceeds (and then trips the first-turn hash exchange).

**Evidence:**
- `docs/readiness-audit/08-persistence-save-system.md` Risks section ("MP / persistence interaction … all undocumented")
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md` (in-match only)
- No "load save into MP" task in `tasks/phase-3/01-multiplayer/`

---

### Q: 552. Is a tampered save able to claim multiplayer-completion credit/achievements through any audit hook?

**Status:** ✔ Defined (by omission)

**Answer:**
**No achievement / credit system exists.** There is no leaderboard task, no achievements schema, no MMR / ranking / progression system in `tasks/mvp/`, `tasks/phase-2/`, or `tasks/phase-3/`. No back-end ingests completed matches; the signaling server is explicitly stateless and "does NOT store game state" (audit 26 Q533). There is therefore no credit a tampered save could claim. **But** if and when a credit system is added, the current save format (no signature, xxh64-only, no audit pipeline — see audit 26 Q539) would not support trusted attribution.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` ("Server does NOT store game state")
- No achievements / leaderboard schema in `content-schema/schemas/`
- `docs/readiness-audit/26-replay-tampering-and-simulation-cheating.md` Q539 (no audit pipeline)

---

### Q: 553. Is there a digital signature scheme for packs (Ed25519, ECDSA, X.509), and is the algorithm specified?

**Status:** ⚠ Partial

**Answer:**
**Algorithm specified, scheme not enforced.** `manifest.schema.json` defines an **optional** `signature` object with `scheme` constrained to the closed enum `["ed25519"]`, plus `keyId` and `value`. So the algorithm is pinned (Ed25519, no ECDSA, no X.509, no RSA). What is **not** specified:
- The canonical message that gets signed (whole archive bytes? manifest only? manifest + per-asset hash list?). See Q557.
- The verification algorithm location or task (no `signatureVerifier` task exists).
- Mandatory enforcement (today `signature` is `optional` in the schema; `sandboxed: true` is the only adjacent trust signal).

**Evidence:**
- `content-schema/schemas/manifest.schema.json` (`signature.scheme: { enum: ["ed25519"] }`)
- `docs/architecture/pack-contract.md` ("Trust Fields … `signature` — optional object with `scheme`, `keyId`, and `value`.")
- No verifier task in `tasks/`

---

### Q: 554. Where does the public key set come from, and how are root keys distributed and rotated?

**Status:** ❌ UNKNOWN

**Answer:**
**No public-key distribution model.** `signature.keyId` is a free-form `string`, but there is no:
- Trusted-key registry schema (e.g., `content-schema/schemas/publisher-registry.schema.json`).
- Bundled root-key set in `resources/` or in the engine.
- Documented rotation policy (signed key-update? hardcoded build constant?).
- Authority hierarchy ("Heroes Reforged Project key signs publisher keys, publishers sign packs").
Audit 20 Q375 explicitly flags this: "no documented publisher registry / known-key list, and no prompt distinguishing the three trust tiers exists."

**Evidence:**
- `content-schema/schemas/manifest.schema.json` (`keyId: { type: "string" }` — opaque)
- `docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md` Q375
- No `publisher-registry.schema.json` or root-key file in repo

---

### Q: 555. Is signature verification mandatory for canonical packs and optional/promptable for third-party packs?

**Status:** ❌ UNKNOWN

**Answer:**
**Mandatory/optional split is not defined.** The schema makes `signature` *optional for every pack type*, and `sandboxed: true` is documented as the marker for "AI-generated or otherwise restricted content that cannot participate in ranked or trusted flows" — but there is no rule that says:
- Canonical first-party packs MUST be signed.
- Third-party packs MAY be unsigned and require a trust prompt.
- Multiplayer ranked play MUST refuse unsigned packs.
Audit 20 Q374 confirms there is no trust-prompt UI either, so even if a "promptable for third-party" rule existed, no surface would render it. Audit 26 Q535 also flags missing multiplayer-side signature enforcement.

**Evidence:**
- `content-schema/schemas/manifest.schema.json` (`signature` optional)
- `docs/architecture/pack-contract.md` (no mandatory/optional split)
- `docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md` Q374
- `docs/readiness-audit/26-replay-tampering-and-simulation-cheating.md` Q535

---

### Q: 556. Does the loader check signatures BEFORE schema parsing, BEFORE asset extraction, or only after?

**Status:** ❌ UNKNOWN

**Answer:**
**Order is undefined.** `src/content-runtime/` is documented as owning "manifest loading, archive import, dependency resolution, signature checks, sandbox policy, pack registry assembly, canonical-json serialization + `contentHash` computation," but the **ordering of these steps inside the runtime is not specified**. A safe order would be `archive integrity (e.g., ZIP CRC) → signature verify on manifest+contentHash bytes → schema parse → asset extraction (only if signature is valid)`, but no task or doc commits to this. With unsafe ordering, a tampered manifest could trigger schema-parser bugs or asset-extraction path-traversal (audit 20 Q368) before the signature check ever fires.

**Evidence:**
- `docs/architecture/pack-contract.md` ("Runtime Ownership" lists steps without ordering)
- `docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md` Q368 (no path-traversal protection on `.hrmod`)
- No content-runtime task with a "verify-then-parse-then-extract" acceptance criterion

---

### Q: 557. Is the signed payload the entire pack archive, or only the manifest plus per-asset hashes?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `signature.value` is just a base64/hex string in the schema; the canonical message that produces it is undocumented. Two reasonable schemes exist:
- **Whole-archive signing**: sign the `.hrmod` ZIP bytes (forces the ZIP to be deterministic).
- **Manifest-plus-asset-digest signing**: sign a canonical-JSON object `{ manifest, contentHash, assetDigests: { id → hash } }`. This is more flexible (asset re-packing is allowed if hashes match) but requires per-asset hashing.
Pack-contract.md explicitly disclaims a separate `manifest files[]` inventory ("Do not add a separate manifest `files[]` inventory unless the schema is explicitly revised to require it"), which implicitly favors whole-archive signing — but no doc states this.

**Evidence:**
- `content-schema/schemas/manifest.schema.json` (`signature.value: string`)
- `docs/architecture/pack-contract.md` (Archive Rule disallows files[] inventory; canonical message undefined)
- No "what gets signed" doc in repo

---

### Q: 558. Are individual assets within a pack independently hash-verified at load time, not only at install?

**Status:** ❌ UNKNOWN

**Answer:**
**No per-asset hash list is defined.** `assets/index.json` "owns path-to-asset-id mapping" but its schema (`asset-index.schema.json`) is not analyzed for a per-asset content hash field — and the pack-contract explicitly forbids a `manifest.files[]` inventory. `contentHash` is the **aggregate** canonical-JSON digest of all records, not a per-asset list. Therefore:
- An attacker who swaps a binary asset (sound, sprite) inside an extracted pack folder would not be detected by `contentHash` (which covers JSON records, not binaries).
- Per-asset binary integrity at *load time* is unenforced by design.

**Evidence:**
- `docs/architecture/pack-contract.md` (no per-asset hash list)
- `content-schema/schemas/manifest.schema.json` (`contentHash` = aggregate JSON digest)
- `content-schema/schemas/asset-index.schema.json` (path/id mapping; per-asset hash not analyzed in any task)

---

### Q: 559. Is there protection against signature stripping or downgrade to "unsigned mode" by a tampered manifest?

**Status:** ❌ UNKNOWN

**Answer:**
**No stripping protection.** Because `signature` is `optional` in the schema and there is no "this pack must be signed" pin anywhere (no signed-by-publisher list, no per-pack policy), a peer with a tampered local manifest can simply remove the `signature` field and present the pack as legitimately unsigned. Combined with audit 20 Q379's missing "Modded" badge, the user would have no visual signal that the pack used to be signed and is no longer. A canonical mitigation (e.g., "if `keyId` resolves to a known publisher in the local registry, the loader requires a valid signature even if the manifest omits one") is not specified.

**Evidence:**
- `content-schema/schemas/manifest.schema.json` (`signature` optional)
- `docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md` Q374, Q379
- No "expected-to-be-signed" registry in repo

---

### Q: 560. Are signatures bound to a specific pack ID and version to prevent reuse across packs?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** Whether `signature.value` covers `id` + `version` + `contentHash` (preventing reuse) or just `contentHash` (allowing a `contentHash`-collision or a relabel attack) is undocumented. Without a written canonical-message specification (Q557), this question cannot be answered. A safe design would sign a canonical JSON of `{ id, version, contentHash, engineHash, dependencies, capabilities }` — i.e., enough of the manifest that any field-relabeling invalidates the signature.

**Evidence:**
- `content-schema/schemas/manifest.schema.json` (no canonical-message spec)
- `docs/architecture/pack-contract.md` (no signature-binding rule)

---

### Q: 561. Is there a revocation mechanism for compromised publisher keys, and how is the revocation list distributed?

**Status:** ❌ UNKNOWN

**Answer:**
**No revocation model.** Audit 20 Q378 already noted: "No trust-revocation flow is documented. There is no 'trusted packs' registry surface, no revocation command, and no propagation rule across save slots." No CRL-equivalent file is defined in `content-schema/schemas/`, no signed update channel for revocations is specified, and no "before signature-verify, consult revocation list" step exists in any task. This is a launch blocker for any model that distributes signing keys to third-party publishers.

**Evidence:**
- `docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md` Q378
- No `revocation-list.schema.json` in `content-schema/schemas/`
- No revocation command in `docs/architecture/command-schema.md`

---

### Q: 562. Are pack updates signed by the same key as the original install, or is key rotation per-pack supported?

**Status:** ❌ UNKNOWN

**Answer:**
**No update / key-rotation policy.** The schema has `id` and `version` fields but no `previousKeyId`, no `rotationProof`, and no doc that says "an update of pack `X` must be signed by the same `keyId` that signed v1, or by a key signed by it." There is also no "trust-on-first-use" rule (TOFU) recorded for installed packs. So in practice, `installedPack.keyId` and `updatedPack.keyId` could differ silently, and the loader has no way to detect a publisher-impersonation attack via update.

**Evidence:**
- `content-schema/schemas/manifest.schema.json` (no rotation fields)
- No update / install task in `tasks/`
- No pin/TOFU policy anywhere

---

### Q: 563. Does a pack downgrade (older version with weaker validation) get rejected by default?

**Status:** ❌ UNKNOWN

**Answer:**
**No downgrade protection.** The manifest's `version` is a free-form string (`"version": { "type": "string", "minLength": 1 }`) — not a SemVer-comparable type — and no doc states "if installed version > incoming version, refuse." A pack downgrade attack (substituting a known-vulnerable older version of a canonical pack) would not be caught. Audit 24 Q470 raises the same concern at the transport layer; the same gap exists for content packs.

**Evidence:**
- `content-schema/schemas/manifest.schema.json` (`version` is a string, no comparison rule)
- No "refuse downgrade" rule in `docs/architecture/pack-contract.md`
- `docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md` Q470 (analogous transport-layer gap)

---

### Q: 564. Are pack dependencies' signatures also verified, or only the top-level pack?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `manifest.dependencies: string[]` is resolved by `src/content-runtime/`, but no doc states whether dependency manifests are individually signature-verified, whether a top-level pack can "vouch" for an unsigned dependency, or whether a sandboxed dependency taints its parent. Audit 20 Q382 raises the related UX question (per-transitive-pack consent prompt) — also undefined. So a malicious dependency could inject untrusted records into a session whose top-level pack is signed and trusted.

**Evidence:**
- `content-schema/schemas/manifest.schema.json` (`dependencies: string[]`)
- `docs/architecture/pack-contract.md` (dependency resolution mentioned; signature propagation rule absent)
- `docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md` Q382

---

### Q: 565. Is there a build-reproducibility requirement for canonical packs so signatures can be re-verified by third parties?

**Status:** ⚠ Partial

**Answer:**
**For records yes, for archives no.** The canonical-JSON serializer is required to produce byte-identical output for identical input (sorted keys, no whitespace, integer literals only), so the **`contentHash` over the records is reproducible** by any party that runs the same serializer. What is **not** reproducible:
- The `.hrmod` ZIP bytes (compression level, file ordering, timestamp metadata in ZIP entries are not pinned — analogous to the gzip-determinism gap in audit 08 Q154).
- Binary asset bytes are not hashed at all (Q558).
- The signed canonical message is not specified (Q557), so a third party does not know what to re-sign / re-verify against.
So `contentHash` is reproducible; the **signature** is not third-party verifiable end-to-end without a written canonical-message spec and reproducible-archive contract.

**Evidence:**
- `docs/architecture/determinism.md` ("Canonical serializer + state hash (sorted keys, no whitespace)")
- `docs/readiness-audit/08-persistence-save-system.md` Q154 (gzip-determinism not pinned — same class for ZIP)
- No `reproducible-builds.md` or pinned ZIP-determinism rule in repo

---

## 🔍 Summary

### Missing Logic
- **No `save.schema.json`** (Q542, Q545) — the only artifact of "save format" is a TS type and a Mermaid example.
- **No save-envelope signature/HMAC** (Q540) — xxh64 detects accidental corruption only.
- **No written threat model** for saves or packs (Q541) — gates exist but rationale is implicit.
- **No parser-hardening guards**: nesting depth, max string length, max array length, max object keys (Q546).
- **No array-size caps** on `commandLog` / `checkpoints` / per-command argument arrays (Q544).
- **No pre-replay sweep** that validates every command's IDs against the registry before any reducer call (Q543).
- **No save-migration registry** (Q548) — gates and UI exist; no migrators authored.
- **No save vs. replay envelope distinction** (Q550) — same artifact, same code path.
- **No MP-load-resume protocol** — both peers' hashes are not required to match on resume (Q551).
- **No publisher-key registry / root-key bundle** (Q554).
- **No mandatory/optional signature split** between canonical and third-party packs (Q555).
- **No documented signature-verify ordering** in the content-runtime pipeline (Q556).
- **No canonical-message spec** for what `signature.value` actually covers (Q557, Q560).
- **No per-asset binary hash list** for non-JSON assets (Q558).
- **No signature-stripping protection** — `signature` is optional and removable (Q559).
- **No revocation list** schema or distribution channel (Q561).
- **No update / key-rotation / TOFU policy** for pack updates (Q562).
- **No downgrade-protection rule** — `version` is a free-form string (Q563).
- **No dependency-signature propagation rule** — top-level signed packs can pull in unsigned deps (Q564).
- **No reproducible-archive contract** for `.hrmod` ZIP bytes (Q565).

### Risks
- **Tamper detection is xxh64 only.** Any non-cryptographic checksum can be recomputed by an editor; saves are *integrity-checked but not authenticated*. Fine for single-player sandbox; insufficient the moment a leaderboard, cloud sync, or competitive mode is introduced.
- **Decompression / parse DoS.** Without size caps, depth caps, or array-length caps, a hand-crafted save can be a memory bomb (`commandLog.length === 10_000_000`) or a stack-overflow vector (deeply nested JSON). Audit 20 Q367 already raised the gzip side.
- **Pack signature is theatrical today.** The schema models Ed25519 with `keyId`, but there is no key registry, no canonical message, no verifier task, no revocation list, no enforcement, no signature-stripping defense, and no per-asset hashing. An attacker can present a tampered pack with a stripped (or even forged-but-unverified) signature and the runtime cannot tell.
- **Pack downgrade.** Free-form `version` string + no "refuse older" rule means a known-vulnerable older pack version can be substituted at install time.
- **Unsigned dependency injection.** A top-level signed pack with a tampered dependency carries the trust of the parent; the runtime has no rule that taints the parent.
- **MP load-resume mismatch.** No protocol pins both peers to the same loaded `stateHash` before resuming an in-progress match; mismatch handling is undefined.
- **Migration tampering.** Once migrators exist, a tampered `saveVersion` will steer the migrator chain. Without an idempotency contract and a "version is integrity-protected" rule, the migrator becomes an attack surface.
- **No pre-reducer validator pass.** The reducer is the first thing that touches command arguments; a malformed command surfaces mid-replay rather than at a clean rejection point. Hard to surface meaningful UX.
- **Reproducibility gap on `.hrmod`.** Even if a third party wants to re-verify a canonical pack, ZIP-byte determinism is not pinned — so they cannot reproduce the signing input.

### Improvements
1. **Author `content-schema/schemas/save.schema.json`** with `saveVersion` (integer, range-checked), `engineHash`, `contentPackHashes` (array of `{ id, contentHash }`), `commandLog` (`maxItems` cap, e.g., 100_000), `checkpoints` (`maxItems` cap), `seed`, `metadata`, plus per-command-argument bounds via `$ref` to `command.schema.json`.
2. **Document the save threat model** explicitly in a new `docs/architecture/security-model.md`: "Loader assumes hostile input. Determinism + replay-hash is the integrity backstop. xxh64 is *not* a signature."
3. **Add parser-hardening caps** to a new `src/persistence/parser.ts`: `maxDepth: 32`, `maxStringLength: 64KB`, `maxArrayLength: 100_000`, `maxObjectKeys: 4096`, `maxCompressedBytes: 4MB`, `maxUncompressedBytes: 64MB`, `maxDecompressionRatio: 200:1`. Reject before `JSON.parse`.
4. **Add a pre-replay command-validation pass**: walk `commandLog`, verify each entry against `command.schema.json`, resolve every `unitId`/`spellId`/`factionId`/`heroId` against the active registry, *then* enter the reducer loop. Surface the first invalid command with context.
5. **Author the migration contract**: `migrate(SaveRecord_vN) → SaveRecord_vN+1` is pure, idempotent (`migrate(migrate(x)) === migrate(x)` once at the target version), MAC-pinned to the source version. Document the support window.
6. **Adopt HMAC or Ed25519 on the save envelope** for any future "trusted" path (cloud sync, leaderboard, shared replay): canonical-JSON over `{ saveVersion, engineHash, contentPackHashes, seed, commandLog, stateHash }`, `mac = HMAC-SHA256(envelope, deviceKey)` or `sig = Ed25519(envelope, accountKey)`.
7. **Author `docs/architecture/pack-signing.md`** specifying:
   - Canonical-message format (sign `{ id, version, contentHash, engineHash, dependencies, capabilities, sandboxed }`).
   - Pre-parse, pre-extract verification order ("verify → parse → extract").
   - Whole-archive signing **and** per-asset hash list (close Q558 and Q557 together).
   - Mandatory signing for canonical packs; trust-prompt for third-party; no signature ⇒ `sandboxed: true` forced.
   - Stripping-protection rule (TOFU on `keyId` once installed; refuse downgrade-to-unsigned).
   - Dependency signature propagation rule (any unsigned/sandboxed dependency taints the parent's trust tier).
8. **Add `content-schema/schemas/publisher-registry.schema.json`** and bundle a root-key set with the engine. Include rotation rules (signed key-update record).
9. **Add `content-schema/schemas/revocation-list.schema.json`** with a signed update channel; loader consults it before signature verification.
10. **Adopt SemVer-comparable `version`** in `manifest.schema.json` (`pattern: "^\\d+\\.\\d+\\.\\d+(-[a-z0-9.-]+)?$"`) and a "no-downgrade-by-default" rule.
11. **Pin `.hrmod` ZIP determinism**: fixed entry order (alphabetical), zero timestamps, fixed compression level. Document in `pack-contract.md` and gate via a CI test.
12. **Distinguish save vs. replay envelopes**: add `intent: "save" | "replay" | "fixture"` discriminator; strip player-identifying metadata from `intent !== "save"`.
13. **Document MP-load-resume**: both peers commit to the same loaded `stateHash` before the first resumed turn; mismatch refuses to resume.
14. **Add a `signedBuild` reproducibility manifest** for canonical pack releases: a third party can re-build, re-canonicalize, re-hash, re-verify against the pinned `keyId`.

### AI-Readiness
**Score: 2/10**

**Reason:** Of every readiness audit so far, this is **the most under-defined**. The schema sketches the right primitives (`signature` with Ed25519, `sandboxed`, `capabilities` closed enum, `contentHash`, `engineHash`, `stateHash`), and the determinism contract gives the project a foundation that *makes* tamper detection mostly free. But the security-relevant operational surface — save schema, save threat model, parser hardening, pack-signing canonical message, signature ordering, key registry, revocation list, downgrade protection, dependency propagation, reproducible builds — is essentially absent. An AI implementer asked to "implement save tampering protection and pack signing" would have to invent ~10 schemas/docs (`save.schema.json`, `security-model.md`, `pack-signing.md`, `publisher-registry.schema.json`, `revocation-list.schema.json`, parser-hardening rules, MP-load-resume protocol, migration contract, reproducible-archive contract, save-vs-replay envelope) before writing code. That is far more invention than the project's contract-first rules permit. Closing the items in **Improvements** — especially `save.schema.json`, `security-model.md`, `pack-signing.md`, parser hardening, revocation list, and SemVer/downgrade rule — would lift this to 7/10. Until then, **packs and saves should be treated as single-player-sandbox-only**, and any feature that depends on cryptographic trust (cloud sync, leaderboards, shared replays, ranked play, AI-generated-content distribution) is not ready to be designed against.
