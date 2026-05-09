# 21. USER-GENERATED CONTENT & PERSONAL DATA STORAGE

> **Audit context.** This repo is design-first / schema-first; no runtime
> exists. UGC plumbing today consists of: (a) the **Map Editor** screen
> package (`#65-map-editor`) which mutates `state.editor.currentDocument`
> against `scenario.schema.json` + related schemas, and (b) the
> **AI-generation pipeline** (`docs/architecture/ai-generation-pipeline.md`)
> which materializes `sandboxed: true` packs from prompts. There is **no
> third-party pack-import surface, no UGC sharing/marketplace, no
> account/identity layer, no telemetry layer, and no privacy/data-inventory
> document**. As a result, the personal-data side of this audit is almost
> entirely ❌ UNKNOWN — only `playerName`/`displayName` and a high-score
> profile slice are referenced in any spec.

---

### Q: 386. Can users author maps, scenarios, factions, or units that other users will load?

**Status:** ⚠ Partial

**Answer:**
**Authoring is partially specified; sharing is not.**
- **Maps / scenarios:** Yes — the **Map Editor** screen package authors a `scenario.schema.json` document (`state.editor.currentDocument`) and emits `SAVE_EDITOR_SCENARIO`. The output is a scenario record that another runtime *could* load.
- **Factions / heroes / units / buildings / abilities / spells:** Yes via the **AI-generation pipeline** (`GeneratedFaction` → materialized as a `sandboxed: true` pack). No human-facing editor for these record kinds is specified yet.
- **Sharing path between users:** **Not specified.** No marketplace, share link, file picker, URL-import flow, or pack registry surface exists. Audit 20 already flagged the lack of a save-import / pack-install screen package. So while the *authoring* and *pack* primitives exist, the *"other users will load it"* loop is missing.

**Evidence:**
- [docs/architecture/wiki/screens/65-map-editor/spec.md](../../architecture/wiki/screens/65-map-editor/spec.md)
- [docs/architecture/wiki/screens/65-map-editor/data-contracts.md](../../architecture/wiki/screens/65-map-editor/data-contracts.md) — `SAVE_EDITOR_SCENARIO`, scenario schema bound
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) — Stage 6 pack materialize
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — `.hrmod` archive rule
- [docs/archive/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) Q374, Q380 — no pack-install / pack-picker screen

---

### Q: 387. Is user-generated content scanned for unsafe scripts, embedded executables, or oversized assets before being shareable?

**Status:** ❌ UNKNOWN

**Answer:**
**No scan / size policy is documented for shareable UGC.**
- The pack contract requires `capabilities` to be a closed enum and explicitly forbids made-up permissions, and `scripts.none` is a defined capability — i.e. the *contract intent* is "no scripts," but no scanner, validator stage, or "executable-bytes" detector is specified for `.hrmod` archives.
- No size cap, decompression-ratio guard, or oversized-asset rule is documented for either `.hrmod` packs (audit 20/Q367) or AI-generated assets (audit 14/Q239).
- Pre-publication moderation exists *only* in the AI generation pipeline (text-only — names/lore + hard caps; image moderation explicitly not wired — audit 14/Q238).

**Evidence:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json) — `capabilities` closed enum incl. `scripts.none`
- [docs/architecture/pack-contract.md:62-66](../../architecture/pack-contract.md#L62)
- [docs/archive/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) Q367 — no size cap / decompression-ratio guard
- [docs/archive/readiness-audit/14-ai-generated-content-pipeline.md](14-ai-generated-content-pipeline.md) Q238–Q239 — image moderation + asset normalization gaps

---

### Q: 388. Are user-supplied strings (unit names, map descriptions, hero biographies) sanitized before rendering in the UI?

**Status:** ❌ UNKNOWN

**Answer:**
**No sanitization policy is documented for any user-supplied string.**
The runtime stack (`src/ui/` in React per `CLAUDE.md`) implicitly text-escapes via JSX, but this is **not formalized** anywhere — there is no "all UGC text rendered as text-only / no `dangerouslySetInnerHTML` / markdown disallowed" rule in `docs/architecture/`. The same gap was logged for chat in audit 19/Q337. Hero biographies, scenario descriptions, unit names, and AI-generated faction `notes` are all rendered through unspecified components.

**Evidence:**
- `CLAUDE.md` — React stack assumed; no sanitization rule
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) Q337 — same gap for chat
- No `sanitize` / `escape` / `xss` rule in [docs/architecture/](../../architecture/)
- [content-schema/schemas/scenario.schema.json](../../../content-schema/schemas/scenario.schema.json) — text fields not constrained beyond JSON string

---

### Q: 389. Are user-supplied images validated (MIME type, dimensions, decoder safety) before being rendered?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No MIME allowlist, magic-byte check, max-dimension rule, decoder-sandbox policy, or "decode-off-thread" rule exists for user-supplied or AI-generated images. The asset-normalization pipeline for AI output is itself an open gap (audit 14/Q239), and there is no UGC image-import flow at all today.

**Evidence:**
- [docs/archive/readiness-audit/14-ai-generated-content-pipeline.md](14-ai-generated-content-pipeline.md) Q239 — no normalization pipeline
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — `assets/index.json` only owns ID-to-path, no validator
- No image-validator rule in [docs/architecture/](../../architecture/)

---

### Q: 390. Can user-supplied sprites or audio reference URLs that exfiltrate the loader's IP via DNS/HTTP?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Pack `assets/index.json` is the asset-ID-to-path map per pack contract, but the **path scheme** (relative-only vs. absolute URLs vs. `http(s)://` allowed) is not constrained anywhere. There is no documented rule like "all asset paths must be relative to the pack root" or "external URLs are forbidden." A malicious pack could declare `https://attacker.example/probe.png` and the loader would fetch it on render — leaking IP/Referer/UA. Audit 28 (asset loading & sandboxing) is the natural home for this rule and currently has it as an open question.

**Evidence:**
- [docs/architecture/pack-contract.md:93-95](../../architecture/pack-contract.md#L93) — `assets/index.json owns path-to-asset-id mapping` (no scheme rule)
- [docs/archive/readiness-audit/28-asset-loading-and-sandboxing.md](28-asset-loading-and-sandboxing.md)
- No CSP / `connect-src` / `img-src` policy in [docs/architecture/](../../architecture/)

---

### Q: 391. Are user-supplied fonts disallowed, sandboxed, or rendered through a hardened loader?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Fonts are not enumerated in the asset-index schema as a distinct type, and no "fonts must be from a trusted system list" or `font-src` CSP rule is documented. UGC fonts are neither explicitly allowed nor explicitly forbidden.

**Evidence:**
- [content-schema/schemas/asset-index.schema.json](../../../content-schema/schemas/asset-index.schema.json)
- No font policy in [docs/architecture/](../../architecture/)

---

### Q: 392. Is there a content-policy disclaimer the author must accept before publishing UGC?

**Status:** ❌ UNKNOWN

**Answer:**
No publication flow exists, therefore no disclaimer step exists. The Map Editor `SAVE_EDITOR_SCENARIO` writes locally with validation only; no "publish/share/upload" command exists in any screen package. The AI-generation pipeline writes packs to disk with `sandboxed: true` and does not surface a content-policy modal.

**Evidence:**
- [docs/architecture/wiki/screens/65-map-editor/interactions.md](../../architecture/wiki/screens/65-map-editor/interactions.md) — local save only
- No publish/share command in [docs/architecture/](../../architecture/)
- [docs/archive/readiness-audit/23-unsafe-actions-ux-and-consent.md](23-unsafe-actions-ux-and-consent.md) — consent UX gaps

---

### Q: 393. Is there a take-down / report flow specifically for unsafe UGC, and is it routed differently from player-behavior reports?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** Audit 14/Q246 confirmed there is no post-hoc takedown / revocation path for shared generated content; audit 19/Q358 confirmed there is no separate flow for unsafe AI content vs. player behavior. The only "report" surface in the entire spec is the **desync diagnostic** (engine-bug report), not a moderation pathway.

**Evidence:**
- [docs/archive/readiness-audit/14-ai-generated-content-pipeline.md](14-ai-generated-content-pipeline.md) Q246 — no takedown
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) Q349, Q358

---

### Q: 394. Are UGC localization strings checked for injection (format-string, template-injection) at runtime?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The localization schema is the canonical source for UI strings, but no rule constrains UGC-supplied translations or scenario descriptions against format-string (`%s`, `{{...}}`, ICU MessageFormat injection) abuse. There is no "interpolation-only at trusted boundaries" / "no `eval` of message tokens" rule, and no escape contract for embedded localized values.

**Evidence:**
- [content-schema/schemas/localization.schema.json](../../../content-schema/schemas/localization.schema.json)
- No format-string / template-injection rule in [docs/architecture/](../../architecture/)

---

### Q: 395. Can UGC override or shadow canonical asset IDs, and is that override visible to the player before load?

**Status:** ⚠ Partial

**Answer:**
- **Shadowing is structurally possible.** `manifest.json` declares `provides[]` (record kinds the pack contributes) and `dependencies[]`; the pack-contract gives `src/content-runtime/` ownership of "dependency resolution" and "pack registry assembly." Override semantics (last-wins vs. first-wins vs. namespacing) are **not documented** in `pack-contract.md` or `content-platform.md`.
- **Player visibility:** Not specified. Audit 20/Q380 confirmed there is no pack-picker / pack-manager screen, and audit 20/Q379 confirmed there is no "modded mode" indicator in any screen spec.

**Evidence:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json) — `provides`, `dependencies`
- [docs/architecture/pack-contract.md:118-127](../../architecture/pack-contract.md#L118)
- [docs/archive/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) Q379, Q380

---

### Q: 396. Are AI-generated assets within UGC labeled with provenance metadata that the user can inspect?

**Status:** ⚠ Partial

**Answer:**
- **Backend metadata exists.** `GeneratedFaction.notes` carries `providerId`, `promptHash`, `modelHint`, `tokenCount`. Materialized packs are written with `sandboxed: true`. The pack manifest carries `contentHash`.
- **User-inspectable surface does not.** No screen package displays AI provenance to a player. There is no "AI-generated" badge, no "view prompt / model / seed" affordance, and no localization key for it. Audit 14/Q247 noted there is no first-class generator-version pin either.

**Evidence:**
- [content-schema/schemas/generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json) — `notes` block
- [docs/archive/readiness-audit/14-ai-generated-content-pipeline.md](14-ai-generated-content-pipeline.md) Q247
- No AI-provenance UI in [docs/architecture/wiki/screens/](../../architecture/wiki/screens/)

---

### Q: 397. Is there an age-gate or content-rating system surfaced before mature UGC is shown?

**Status:** ❌ UNKNOWN

**Answer:**
**No content-rating system exists.** Audit 20/Q385 confirmed `manifest.schema.json` has no `contentRating` field, no rating taxonomy, and no install-time disclosure UI. There is no age gate at app launch, no "mature content" toggle in `config.ui.*`, and no per-pack rating display in the (nonexistent) pack picker.

**Evidence:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json) — no rating field
- [docs/archive/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) Q385

---

### Q: 398. What personal data is stored locally (display name, avatar, email, account ID, peer ID)?

**Status:** ⚠ Partial

**Answer:**
Only **two PII-adjacent surfaces** appear anywhere in the spec:
1. **`displayName`** — `state.players.byId[next].displayName` (used in `63-hotseat-turn-handoff/data-contracts.md`) and `metadata.playerName` in the save format (`docs/architecture/diagrams/24-save-flow.md`).
2. **High-score profile** — `state.profile.highScores` and `selectors.profile.sortedHighScores` (screen `57-high-scores`), implicitly per-user records.

**Not specified anywhere:** avatar, email, account ID, OAuth token, password, payment data, real name, address. There is also no documented **peerId** persistence (audit 18/Q314: identity is "whoever holds the room code"; lobby chat uses an in-flight `senderId`). Multiplayer setup screen `62-multiplayer-setup` does not declare any persistent player record.

**Evidence:**
- [docs/architecture/wiki/screens/63-hotseat-turn-handoff/data-contracts.md:27](../../architecture/wiki/screens/63-hotseat-turn-handoff/data-contracts.md#L27) — `state.players.byId[next].displayName`
- [docs/architecture/diagrams/24-save-flow.md:43-46](../../architecture/diagrams/24-save-flow.md#L43) — `metadata.playerName`
- [docs/architecture/wiki/screens/57-high-scores/data-contracts.md](../../architecture/wiki/screens/57-high-scores/data-contracts.md) — `state.profile.highScores`
- [docs/archive/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q314

---

### Q: 399. Where is that data stored (localStorage, IndexedDB, OS keychain, plain file), and is each store appropriate to the sensitivity?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** The save format is documented as a gzip-compressed JSON file (audit 20/Q367), but the actual *medium* — `File System Access API`, `IndexedDB`, `localStorage`, in-memory only, an Electron-wrapped FS path — is **never named** in any architecture doc or screen package. `state.profile.highScores` and `state.ui.options` similarly have no stated persistence backend. Without a chosen store there is no way to evaluate sensitivity-appropriateness.

**Evidence:**
- [docs/architecture/diagrams/24-save-flow.md:21](../../architecture/diagrams/24-save-flow.md#L21) — "Write to disk" (medium not named)
- No `persistence.md` / storage-strategy doc in [docs/architecture/](../../architecture/)
- [docs/architecture/wiki/screens/55-save-load/](../../architecture/wiki/screens/55-save-load/) — no medium specified

---

### Q: 400. Are any tokens or secrets stored in localStorage where any same-origin script can read them?

**Status:** ❌ UNKNOWN

**Answer:**
**No tokens or secrets are documented at all.** There is no auth model, no signed-in user, no API token, and no signaling-server credential persistence specified. Audit 25 (TURN credentials and signaling-server abuse) and audit 29 (rate-limiting & secret management) both flag credential storage as open. Until an auth surface lands, this question has no concrete answer; the *risk* however is non-zero because the eventual default of "stash JWT in localStorage" must be ruled out by policy now.

**Evidence:**
- [docs/archive/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md)
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md)
- No `auth.md` or token-storage doc in [docs/architecture/](../../architecture/)

---

### Q: 401. Is there a "log out / forget me" flow that clears all locally stored personal data?

**Status:** ❌ UNKNOWN

**Answer:**
**No "forget me" flow is specified.** The `54-system-menu` and `56-options` screen packages have no "delete profile / wipe local data" affordance. The high-score screen mentions "clearing/importing through confirmed profile actions" but defines no command for full wipe. There is no `WIPE_LOCAL_DATA` / `FORGET_ME` / `DELETE_PROFILE` command in any screen.

**Evidence:**
- [docs/architecture/wiki/screens/54-system-menu/](../../architecture/wiki/screens/54-system-menu/)
- [docs/architecture/wiki/screens/56-options/data-contracts.md](../../architecture/wiki/screens/56-options/data-contracts.md) — no wipe command
- [docs/architecture/wiki/screens/57-high-scores/spec.md](../../architecture/wiki/screens/57-high-scores/spec.md)
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) Q345 — chat history not in any "forget me" flow

---

### Q: 402. Is the storage encrypted at rest, and if so, where is the key managed?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** Saves are explicitly described as gzip-compressed JSON ("Compress gzip → Write to disk") with no encryption layer. No KMS, OS-keychain hook, WebCrypto-derived key, or per-user passphrase is documented. Encryption at rest is an open policy decision.

**Evidence:**
- [docs/architecture/diagrams/24-save-flow.md:18-22](../../architecture/diagrams/24-save-flow.md#L18) — gzip only
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md)

---

### Q: 403. Does the application persist any analytics identifiers, and can the user view/reset them?

**Status:** ❌ UNKNOWN

**Answer:**
**No analytics layer exists.** The only mention of "telemetry" in the architecture docs is a *negative* one: "Live games never rewrite pack records based on telemetry" (`ai-generation-pipeline.md`). No analytics SDK, no client-id generation, no opt-in/opt-out toggle in `config.*`, and no "reset analytics ID" command is specified.

**Evidence:**
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) — telemetry only mentioned to forbid runtime mutation
- No analytics doc / config key in [docs/architecture/](../../architecture/)

---

### Q: 404. Are crash dumps or telemetry events written to disk in cleartext, and do they contain PII?

**Status:** ❌ UNKNOWN

**Answer:**
**No crash-dump or telemetry pipeline is specified.** Audit 19/Q351 noted there is no crash-report destination, and audit 29 lists "crash report" rate-limits as open (Q593, Q603). The desync-diagnostic report (`tasks/phase-3/01-multiplayer/04` and `05`) captures purely engine state (`commandIndex`, hashes, last-N commands) and contains no documented PII — but its persistence/transport is also unspecified.

**Evidence:**
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) Q351
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q593, Q603
- [tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md](../../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)

---

### Q: 405. Are saved games associated with a player identity, and is that identity hashed before being written into the save file?

**Status:** ⚠ Partial

**Answer:**
- **Association exists**, in the form of `metadata.playerName` written into the save file.
- **It is stored cleartext** — the save flow describes "Canonicalize JSON → Compute state hash → … → Compress gzip → Write to disk." There is no field-level hashing of `playerName` and no `metadata.playerHash` field in the documented format. The `stateHash` is over the canonicalized JSON (i.e., it covers `playerName` for integrity, not for confidentiality).

**Evidence:**
- [docs/architecture/diagrams/24-save-flow.md:30-48](../../architecture/diagrams/24-save-flow.md#L30)
- No save-PII-hashing rule in [docs/architecture/](../../architecture/)

---

### Q: 406. Is multiplayer chat history persisted locally, and is it included in the "forget me" flow?

**Status:** ❌ UNKNOWN

**Answer:**
- **Persistence:** Lobby chat lives in `state.net.lobby.chat` (transient store); no durable persistence is documented. Whether it survives a session refresh, a reconnect, or app restart is not stated.
- **"Forget me" coverage:** N/A — no "forget me" flow exists (Q401). Audit 19/Q345 reached the same conclusion.

**Evidence:**
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md:26](../../architecture/wiki/screens/64-network-lobby/data-contracts.md#L26)
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) Q345

---

### Q: 407. Does the application read OS-level personal data (contacts, clipboard, mic, camera) that is not strictly needed?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No screen package declares clipboard / mic / camera / contacts / notification / geolocation usage. Browser permission prompts are not mentioned anywhere. Two latent surfaces exist that *could* trigger OS prompts but are not yet wired:
- **Clipboard:** audit 19/Q348 noted no `EXPORT_CHAT` / `COPY_CHAT_LOG` command exists.
- **Microphone/camera:** WebRTC is in scope for game commands only (DataChannel; no media tracks). No voice-chat is specified.

The conservative reading is: nothing OS-personal is read today *because nothing is implemented*; the policy surface is undefined.

**Evidence:**
- No `permissions.md` or device-API rule in [docs/architecture/](../../architecture/)
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — DataChannel only
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) Q348

---

### Q: 408. Are friend lists, recent-players lists, or block lists synced anywhere off-device?

**Status:** ❌ UNKNOWN

**Answer:**
**None of the three exist.**
- **Friend list:** No `FriendList` schema, no `state.social.*` slice, no friends-related command in any screen package.
- **Recent-players list:** Not specified. With no stable peer identity (audit 18/Q314), a meaningful recent-players list is also not constructible.
- **Block list:** Audit 19/Q340 and Q360 confirmed there is no `MUTE_PEER` / `BLOCK_PEER` / `BLOCKLIST_*` schema or command.

Off-device sync is therefore moot — there is nothing to sync. No backend is documented in `services/` for social state either.

**Evidence:**
- [docs/archive/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q314
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) Q340, Q360
- No `social/` or `friends/` schema in [content-schema/schemas/](../../../content-schema/schemas/)

---

### Q: 409. Is there a documented data inventory (what is stored, where, and why) accessible to the user?

**Status:** ❌ UNKNOWN

**Answer:**
**No data inventory exists**, neither developer-facing (a `docs/architecture/data-inventory.md` or DPIA) nor user-facing (a settings screen listing every stored field with a delete affordance). Without it there is no way for a user to exercise GDPR/CCPA-style "right to know" or "right to erasure," and no way for the team to verify that audits 21–22 are answered consistently.

**Evidence:**
- No `data-inventory.md` / `privacy.md` / DPIA artifact in [docs/](../) or [docs/architecture/](../../architecture/)
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md)

---

## 🔍 Summary

### Missing Logic
- **No third-party UGC sharing surface.** Map Editor saves locally; AI-generation writes packs locally. No publish, share-link, marketplace, or pack-import flow. (Q386)
- **No UGC scanner / size cap / decompression-ratio guard / path-traversal sanitizer** for `.hrmod` packs. `scripts.none` is a *capability claim*, not an enforced bytecode/script scanner. (Q387)
- **No formal text-sanitization contract** for any user-supplied string (unit names, hero biographies, scenario descriptions, AI `notes`, chat). React JSX implicit escape is the only defense. (Q388, Q394)
- **No image / audio / font validator** (MIME, magic bytes, dimensions, decoder isolation). (Q389, Q391)
- **No URL-scheme constraint** on `assets/index.json` paths — external URLs are not explicitly forbidden, enabling potential IP/Referer exfiltration. (Q390)
- **No content-policy disclaimer at publish** because no publish flow exists. (Q392)
- **No UGC takedown / report flow**, distinct or otherwise, from player-behavior reports. (Q393)
- **No override-precedence rule** between packs, no "modded" indicator, and no pack-picker UI to make shadowing visible to the player. (Q395)
- **No user-inspectable AI-provenance surface**, despite backend metadata existing in `GeneratedFaction.notes`. (Q396)
- **No content-rating taxonomy or age-gate.** (Q397)
- **No persistent-storage strategy doc.** Save medium (IndexedDB / FS Access / Electron path) is unspecified; profile/options/chat persistence are unspecified. (Q399)
- **No auth/token model**, so `localStorage`-token risk is latent rather than chosen. (Q400)
- **No "log out / forget me" command** in any screen, no delete-profile action, no chat-history wipe. (Q401, Q406)
- **No encryption-at-rest policy.** Saves are gzip-only cleartext. (Q402)
- **No analytics identifier model**, no opt-in/opt-out toggle, no reset action. (Q403)
- **No crash-dump / telemetry pipeline** specified — destination, format, PII redaction all undefined. (Q404)
- **No hashing of `playerName`** in save metadata; cleartext only. (Q405)
- **No friend / recent-players / block list** of any kind. (Q408)
- **No data inventory or DPIA** — neither developer doc nor user-visible disclosure. (Q409)

### Risks
- **Silent IP exfiltration via UGC asset URLs** (Q390): a malicious pack can declare `https://attacker.example/track.png`; the loader fetches it on render, leaking IP, Referer, and User-Agent — without any user-visible signal.
- **XSS through unsanitized UGC text** (Q388, Q394): unit names, hero biographies, scenario descriptions, and AI-generated `notes` are rendered through React-but-unspecified components. Any future component that switches to `dangerouslySetInnerHTML` (markdown previews, rich tooltips) reopens the hole because no contract forbids it.
- **Decompression bombs / path traversal in `.hrmod`** (Q387, audit 20/Q367–Q368): no size cap, ratio guard, or `..` sanitizer is documented for the ZIP-based pack archive.
- **Cleartext `playerName` in saves** (Q405): saves are not field-hashed; sharing a save file shares the player's display name. Combined with no encryption-at-rest (Q402), a multi-user device exposes profiles to other accounts.
- **`scripts.none` capability is a contract, not an enforcer** (Q387): a malicious pack that *omits* the capability declaration but smuggles executable bytes via an asset MIME-coerce trick is not blocked by any documented scanner.
- **Override / shadowing without visibility** (Q395): a UGC pack can shadow canonical IDs without an HUD indicator, harming competitive integrity and complicating support.
- **No takedown / revocation propagation** (Q393, audit 14/Q246): once a malicious or infringing pack ships, there is no mechanism to invalidate it on user devices or to refuse it in saves/replays.
- **No "forget me" + cleartext local data** (Q401, Q402): GDPR/CCPA "right to erasure" cannot be honored, and a shared device exposes saves and high-scores to other users.
- **Latent OS-permission creep** (Q407): with no permissions policy, future contributors can wire clipboard or media access ad-hoc; the absence of an allowlist is a governance risk more than a runtime risk today.
- **No data inventory** (Q409): inconsistencies between audits 21, 22, and 27 (save tampering) become inevitable, and the legal team has nothing to review.

### Improvements
1. **Author `docs/architecture/data-inventory.md`** listing every persisted field, its medium, retention TTL, "forget me" coverage, and sensitivity tier. This becomes the single source of truth audits 21, 22, and the compliance team review against.
2. **Author `docs/architecture/persistence.md`** naming the storage medium for each slice (saves, options, profile/highscores, chat, future tokens) — recommend `IndexedDB` for saves/profile (FIDO-style isolation, async, large quota), reject `localStorage` for anything sensitive.
3. **Add a UGC sanitization contract** in `docs/architecture/` requiring all user-supplied/AI-generated strings to render as text-only (no `dangerouslySetInnerHTML`, no markdown unless explicitly schema-tagged + sanitized through DOMPurify). Add a CI lint that bans `dangerouslySetInnerHTML` in `src/ui/`.
4. **Constrain `assets/index.json` paths** to "relative-to-pack-root, no scheme, no `..`" in `pack-contract.md` and the `asset-index.schema.json`. Reject any absolute URL at pack-build / pack-load. Add a CSP `connect-src 'self'` baseline.
5. **Add a UGC scanner stage** to `content-runtime`: MIME magic-byte check on every binary asset, max-dimensions on images, max-duration on audio, and a `.hrmod` size + decompression-ratio guard. Document constants in `pack-contract.md`.
6. **Add a `contentRating` field** to `manifest.schema.json` (audit 20/Q385 alignment) with a closed taxonomy (violence, language, sexual, themes), an age-gate at app launch (`config.player.allowMatureContent`), and a per-pack rating display in a future pack-picker.
7. **Add a `REPORT_PACK` / `REPORT_UGC` command** distinct from `REPORT_PEER` (audit 19 alignment), routed to a separate intake. Define an evidence schema (`packId`, `contentHash`, `reason`, `notes`, `screenshotRef`).
8. **Add a "Modded" HUD badge + pack-picker screen** so override and shadowing are user-visible (audit 20/Q379–Q380 alignment).
9. **Add a `WIPE_LOCAL_DATA` command + `54-system-menu` action** that clears all profile state, save slots, options, chat history, and any future tokens. Document its scope so audits 21 + 22 stay aligned.
10. **Add a privacy-toggle pane to `56-options`**: "Use display name in saves" (default off → store hash + opaque local label), "Allow analytics" (default off; no SDK loaded until on), "Forget me on this device" (calls `WIPE_LOCAL_DATA`).
11. **Move `playerName` to a hashed/derived form** in save metadata (`metadata.playerHash` over a salted local `displayName`); keep cleartext only in transient `state.players.byId.*.displayName` for the active session.
12. **Specify an AI-provenance disclosure** for any pack with `sandboxed: true` and `notes.providerId` set: a "Created with AI" badge on hero/faction tooltips and a "View prompt + model" affordance for the player.
13. **Specify an OS-permissions policy** in `docs/architecture/permissions.md` listing the closed set of browser/OS APIs the app may use (DataChannel, IndexedDB, FS Access for save export only). Anything else requires an architecture amendment.
14. **Ban `localStorage` for tokens / secrets** in writing now, before an auth surface lands; prescribe HTTP-only cookies (signaling-server context) or non-extractable WebCrypto keys for any future identity scheme.

### AI-Readiness
**Score: 1.5/10**

**Reason:** Of 24 questions, 19 are ❌ UNKNOWN, 4 are ⚠ Partial, and 0 are fully ✔ Defined. The repo has *partial* primitives for UGC authoring (Map Editor + AI-generation pipeline + pack contract) but no sharing layer, no sanitization contract, no validation pipeline for user-supplied bytes, and no privacy / data-inventory artifact at all. An autonomous implementer asked to "implement UGC + personal-data storage" would have to invent: a sharing/import flow, a UGC scanner, a sanitization contract, a content-rating taxonomy, a publish-disclaimer modal, a takedown/report pipeline, a "modded" HUD, a pack-picker screen, a persistence-strategy doc, a "forget me" command, a hashing rule for `playerName`, an OS-permissions policy, and a data-inventory document. That far exceeds the project's "schema-first, contract-first" rule. The strongest available footholds are (a) the `sandboxed` flag + closed `capabilities` enum in `manifest.schema.json`, (b) the `GeneratedFaction.notes` provenance block, and (c) the existing high-score/profile state slice — these are the natural integration points for a future privacy + UGC governance pass.
