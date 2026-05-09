# 23. UNSAFE ACTIONS UX & CONSENT

> **Audit context.** This repo is design-first / schema-first; no runtime
> exists. The only confirmation surface specified is screen
> `60-confirmation-dialog` (a generic Confirm/Cancel modal) and the
> `system-menu` / `save-load` routes that hand off to it. There is **no**
> first-run onboarding flow, **no** privacy notice, **no** consent
> schema, **no** OS-permission policy, **no** allow-list / trust model
> for peers, **no** developer-mode toggle, **no** unsigned-pack warning
> UX, **no** moderation-fallback UI, **no** age gate, and **no**
> telemetry/analytics surface (audits 21–22). Almost every question
> below therefore resolves to ❌ UNKNOWN by design — the planning phase
> has not yet specified an unsafe-actions / consent posture.

---

### Q: 436. Are destructive actions (delete save, uninstall pack, leave match) confirmed with an explicit modal?

**Status:** ⚠ Partial

**Answer:**
- **Defined for some flows.** Screen `60-confirmation-dialog` is the canonical destructive-action gate (`CONFIRM_PENDING_ACTION` / `CANCEL_PENDING_CONFIRMATION`). Three documented routes use it: **delete save** (`saveLoad.delete` → `REQUEST_DELETE_SAVE_SLOT` → `60-confirmation-dialog`), **return to main menu / quit** (`system.mainMenu` → `REQUEST_RETURN_TO_MAIN_MENU`, `mainMenu.quit` → `REQUEST_QUIT_CONFIRMATION`), and **save overwrite** (overwrite guard in `55-save-load`).
- **NOT defined.** **Uninstall pack** has no UX at all (no pack-manager screen exists in `index.json`; pack install/uninstall is undocumented — see audit 20 / 28). **Leave match** is wired as a plain navigation (`network.leave` → `LEAVE_NETWORK_LOBBY`) with **no confirmation step** despite leaving an in-progress multiplayer game being destructive to the opponent's session. **Cancel options** (`options.cancel`) discards the draft without confirmation.

**Evidence:**
- [docs/architecture/wiki/screens/60-confirmation-dialog/spec.md](../../architecture/wiki/screens/60-confirmation-dialog/spec.md), [interactions.md](../../architecture/wiki/screens/60-confirmation-dialog/interactions.md)
- [docs/architecture/wiki/screens/55-save-load/interactions.md:19](../../architecture/wiki/screens/55-save-load/interactions.md#L19) — delete routed via confirmation dialog
- [docs/architecture/wiki/screens/54-system-menu/interactions.md:19](../../architecture/wiki/screens/54-system-menu/interactions.md#L19) — main-menu return routed via confirmation
- [docs/architecture/wiki/screens/01-main-menu/interactions.md:20](../../architecture/wiki/screens/01-main-menu/interactions.md#L20) — quit routed via confirmation
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md:20](../../architecture/wiki/screens/64-network-lobby/interactions.md#L20) — `Leave` is plain navigation, no confirmation
- No pack-manager / pack-uninstall screen in [docs/architecture/wiki/screens/index.json](../../architecture/wiki/screens/index.json)

---

### Q: 437. Are confirmation modals for unsafe actions resistant to "click-through" (e.g., disabled briefly to prevent reflexive clicks)?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `60-confirmation-dialog` defines `Confirm` and `Cancel` buttons but **no enable-after-delay rule, no countdown, no "type CONFIRM to proceed", and no severity-tiered defaults** (e.g., `severity` selector exists in `state.ui.confirmation.severity` but is documented as "warning styling only" — it does not gate input). The `Animation Contract` notes "Modal pops in, warning icon pulses, Confirm button depresses" but does not state Confirm is disabled during the pop-in animation. By default the React render path will mount Confirm in an immediately-clickable state.

**Evidence:**
- [docs/architecture/wiki/screens/60-confirmation-dialog/spec.md:31-37](../../architecture/wiki/screens/60-confirmation-dialog/spec.md#L31) — `severity` is "warning styling only"
- [docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md](../../architecture/wiki/screens/60-confirmation-dialog/interactions.md) — no debounce/disable rule
- No `confirmDelayMs` / `requireExplicitText` field in any schema or screen

---

### Q: 438. Is there a "cancel" path within N seconds for destructive operations?

**Status:** ❌ UNKNOWN

**Answer:**
**No undo / grace-period model is specified.** Once `CONFIRM_PENDING_ACTION` dispatches the caller-provided command (e.g., `DELETE_SAVE_SLOT`), the reducer mutates immediately; there is no documented `pendingDestructive` queue, no `UNDO_LAST_DESTRUCTIVE` command, no toast with a "Undo (5s)" affordance, and no soft-delete / trash-bin model in the persistence task family. The only "cancel" affordance is **before** confirmation, via the `Cancel` button in the modal — not **after** the action commits.

**Evidence:**
- [docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md:17](../../architecture/wiki/screens/60-confirmation-dialog/interactions.md#L17) — Cancel only clears pending; no post-confirm undo
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../../architecture/wiki/screens/55-save-load/data-contracts.md) — no soft-delete / trash slot
- No `undo` / `trash` / `recycle` schema in [content-schema/schemas/](../../../content-schema/schemas/)

---

### Q: 439. Are network-mode actions (host public lobby, accept join) gated by a clear privacy notice on first use?

**Status:** ❌ UNKNOWN

**Answer:**
**No privacy notice exists** (audit 22/Q410) and **no first-use disclosure step is specified** for `Host` (`mpSetup.host` → `HOST_MULTIPLAYER_SESSION`) or `Join` (`mpSetup.join` → `JOIN_MULTIPLAYER_SESSION`). Hosting opens a WebRTC peer connection that exposes the host's IP via ICE candidates (audit 18/Q326–Q327, audit 24); no copy in `62-multiplayer-setup` or `64-network-lobby` warns the user of this. There is also no explicit "accept join" gate — the lobby description states "Lobby state mirrors authoritative host/session messages," implying joiners enter the lobby on `JOIN_ROOM` success without host approval.

**Evidence:**
- [docs/architecture/wiki/screens/62-multiplayer-setup/interactions.md](../../architecture/wiki/screens/62-multiplayer-setup/interactions.md) — no privacy modal step
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md) — no `ACCEPT_JOIN_REQUEST` / `KICK_PEER` action
- [docs/archive/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q326, Q327
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q410

---

### Q: 440. Is the user warned when entering a session that uses unsigned packs, with the option to refuse?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `manifest.schema.json` allows an optional `signature` block, and `pack-contract.md` lists "signature checks" as a `src/content-runtime/` responsibility, but **no UX is defined** for "this pack is unsigned, do you accept?". The lobby shows a `compatibility` selector for hash/version match — not a `signed/unsigned` flag — and offers no `Refuse` route. Audit 20/Q371–Q373 confirmed no save-import / pack-trust prompt exists either. Ranked play is the *only* documented place where unsigned packs are excluded (`tasks/phase-3/04-polish/03-…`); for casual sessions there is no warning.

**Evidence:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json) — `signature` is optional, no `trustState` field
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — signature is a runtime check, no UX
- [docs/architecture/wiki/screens/64-network-lobby/spec.md:38](../../architecture/wiki/screens/64-network-lobby/spec.md#L38) — `compatibility` selector covers hash/version, not signature
- [docs/archive/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) Q371–Q373
- [tasks/phase-3/04-polish/03-ranked-play-elo-ladder-plus-ai-pack-sandbox.md](../../../tasks/phase-3/04-polish/03-ranked-play-elo-ladder-plus-ai-pack-sandbox.md)

---

### Q: 441. Is the user warned before AI-generated content reaches the screen if a moderation step failed or was skipped?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** Audit 14 confirmed there is **no moderation step at all** in the AI generation pipeline — no toxicity classifier, no IP-leak filter, no human-review gate. With no moderation step to "fail" or "skip," there is no contract for warning the user. The pipeline emits a `CoherenceReport` (balance/coherence only) and `GeneratedFaction.notes` (provider id, prompt hash) — neither carries a `moderationStatus`, `flaggedReasons`, or `requiresUserReview` field, and no screen has a "AI content not yet reviewed" banner.

**Evidence:**
- [docs/archive/readiness-audit/14-ai-generated-content-pipeline.md](14-ai-generated-content-pipeline.md) — moderation gap
- [content-schema/schemas/generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json) — no `moderation` field
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) — `CoherenceReport` is described as a prose-only stage return; no moderation fields
- No AI-content review screen in [docs/architecture/wiki/screens/index.json](../../architecture/wiki/screens/index.json)

---

### Q: 442. Are file-system pickers scoped to safe directories (no full-disk access by default)?

**Status:** ❌ UNKNOWN

**Answer:**
**No file-picker contract exists.** The persistence model is undefined at the storage layer — saves are described as "persistence" without an explicit transport (IndexedDB / OPFS / `<input type="file">` / File System Access API). There is **no save-import flow** (audit 20/Q374), so no picker is wired today; if/when it lands, no rule constrains it to `showOpenFilePicker({ types, excludeAcceptAllOption: true })` or similar safe-directory scoping. A naive `<input type="file" webkitdirectory>` could land trivially.

**Evidence:**
- [docs/archive/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) Q374 — no import flow
- [docs/architecture/diagrams/24-save-flow.md](../../architecture/diagrams/24-save-flow.md) — flow described, transport not pinned
- No `filePicker.md` / `storage-contract.md` in [docs/architecture/](../../architecture/)

---

### Q: 443. Are URL-handlers (deep links into the app) explicitly user-confirmed before changing application state?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No deep-link / URL-handler contract is documented. The `ROUTING.md`-style screen-routing graph shown across `interactions.md` files is intra-app only; there is no `?join=ROOM_CODE`, `?import=...`, `web+heroes://...` registration, or `URLPattern` matcher in the spec. Without a contract, a future implementer adding `window.addEventListener('popstate', …)` could route directly into a sensitive state (`JOIN_MULTIPLAYER_SESSION`, `LOAD_GAME_SLOT`, `INSTALL_PACK_FROM_URL`) without a confirmation gate.

**Evidence:**
- No `deeplinks.md` / `url-routing.md` in [docs/architecture/](../../architecture/)
- [docs/architecture/wiki/screens/](../../architecture/wiki/screens/) — `interactions.md` files cover screen-to-screen routing, never URL→state
- No `register*Protocol*Handler` / URL parser in [services/](../../../services/)

---

### Q: 444. Is autoplay of any embedded media (audio, video, animation) gated by a user gesture?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `01-main-menu` and `05-intro-cinematic` describe ambient audio / cinematic playback, and `04-animation-system.md` confirms an animation system is planned, but **no rule pins the first sound/animation behind a user gesture** to satisfy the browser autoplay policy. Reduced-motion is honored (`config.ui.reducedMotion`), and audio toggles exist (`config.audio.enabled`, `audio.uiVolume`), but the *first-frame autoplay* policy is undefined. The default browser behavior (Chrome / Safari muted-autoplay) will *function*, but there is no documented "press any key / click to enter" splash, and an unmuted intro could fail silently on first load.

**Evidence:**
- [docs/architecture/wiki/screens/01-main-menu/data-contracts.md](../../architecture/wiki/screens/01-main-menu/data-contracts.md), [05-intro-cinematic/spec.md](../../architecture/wiki/screens/05-intro-cinematic/spec.md) — audio/cinematic mentioned, no gesture-gating rule
- [docs/archive/readiness-audit/04-animation-system.md](04-animation-system.md) — animation system audit
- No `autoplay-policy.md` in [docs/architecture/](../../architecture/)

---

### Q: 445. Are unsafe defaults (e.g., "share my lobby publicly") avoided in the new-install state?

**Status:** ⚠ Partial

**Answer:**
- **Implicitly safe** for *lobby discovery*: the multiplayer model is **invite-only via room code**; there is **no public lobby browser** at all (audit 18/Q310). A new install therefore *cannot* host a "publicly listed" lobby — the unsafe default is unavailable by virtue of the missing feature, not by an explicit rule.
- **Unsafe-default risk surfaces that *do* exist:** AI generation (no opt-in toggle — see audit 21/Q396), telemetry default (undefined — audit 22/Q422–Q423), hash-disable / signature-disable dev toggles (Q446 below — undefined), and `metadata.playerName` cleartext in saves (audit 21/Q405). None has a documented "new install starts in safe mode" rule.

**Evidence:**
- [docs/archive/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q310 — no public browser
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q396, Q405
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q422–Q423
- No `new-install-defaults.md` in [docs/architecture/](../../architecture/)

---

### Q: 446. Are dangerous developer-mode toggles (e.g., disable signature checks) hidden behind multiple confirmations?

**Status:** ❌ UNKNOWN

**Answer:**
**No developer-mode surface is specified.** `56-options` exposes audio, animation speed, autosave, language, accessibility, renderer scale — **no developer / debug / unsafe section**. There is no `config.dev.disableSignatureCheck`, `config.dev.allowUnsignedPacks`, `config.dev.skipMigrations`, `config.dev.exposeStateInspector`, no chord-unlock (e.g., 5×click on version string), and no double-confirmation pattern. If/when a dev mode lands, no rule mandates a multi-confirm gate, a session-only flag, or a banner indicating "dev mode active".

**Evidence:**
- [docs/architecture/wiki/screens/56-options/spec.md](../../architecture/wiki/screens/56-options/spec.md), [data-contracts.md](../../architecture/wiki/screens/56-options/data-contracts.md) — no dev toggles
- No `developer-mode.md` in [docs/architecture/](../../architecture/)
- No `config.dev.*` keys in any schema

---

### Q: 447. Does the UX for joining a friend's session clearly distinguish "trusted" (allowlisted) from "stranger" peers?

**Status:** ❌ UNKNOWN

**Answer:**
**No trust / allowlist / friends model exists.** There is no `state.profile.friends`, no `peer.trustLevel`, no allowlist schema, and no UI badge/icon distinguishing "known peer (last played 2026-04-12)" from "first contact". The `PlayerSlotList` in `64-network-lobby` shows `players` from `state.net.lobby.players` with no trust signal. Audit 18/Q314 already flagged the absence of a host-side join approval; this question extends that gap into the trust-display layer.

**Evidence:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md:33-39](../../architecture/wiki/screens/64-network-lobby/spec.md#L33) — no trust column
- No `friends` / `allowlist` schema in [content-schema/schemas/](../../../content-schema/schemas/)
- [docs/archive/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q314 — no host-side approval

---

### Q: 448. What OS-level permissions does the app request (network, mic, camera, storage, clipboard, notifications)?

**Status:** ⚠ Partial

**Answer:**
- **Implicitly required** by the documented runtime (browser-distributable game):
  - **Network** — required for multiplayer (WebRTC + WebSocket signaling) and AI gateway calls. Always-on; no permission prompt in browsers.
  - **Storage** — required for saves and profile (likely IndexedDB / OPFS). In browsers this falls under origin storage; persistent storage promotion (`navigator.storage.persist()`) is undocumented.
- **Documented as NOT used:** mic (no voice chat — audit 19), camera, notifications, clipboard.
- **NOT documented:** which storage transport is used, whether `navigator.storage.persist()` is requested, whether `navigator.locks` / `BroadcastChannel` / Service Worker registration are used, and whether any optional capabilities (Bluetooth, USB, MIDI, Geolocation) are *forbidden* by policy.

**Evidence:**
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) — chat is text-only, no mic
- [tasks/phase-3/01-multiplayer/](../../../tasks/phase-3/01-multiplayer/) — WebRTC + WS
- No `permissions.md` / `storage-contract.md` / `runtime-environment.md` in [docs/architecture/](../../architecture/)

---

### Q: 449. Are permissions requested just-in-time at the point of use, not at install/launch?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No permission-request flow is documented anywhere. There is no rule that "`navigator.storage.persist()` is requested only after the first save attempt" or "notifications are requested only after the user enables turn alarms in Options." The conservative pattern (just-in-time, contextual) is not committed to in writing; an early implementer could front-load all permission requests on `01-main-menu` mount.

**Evidence:**
- No `permissions.md` rule in [docs/architecture/](../../architecture/)
- [docs/architecture/wiki/screens/01-main-menu/interactions.md](../../architecture/wiki/screens/01-main-menu/interactions.md) — no permission gate at boot

---

### Q: 450. Is each permission request paired with a human-readable rationale?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No localization keys in `localization.schema.json` or any screen `data-contracts.md` cover "we ask for X because Y" copy. There is no `ui.permissions.<scope>.rationale.*` key family, no pre-prompt modal pattern, and no contract that "every browser permission API call must be preceded by an in-app explanation modal".

**Evidence:**
- [content-schema/schemas/localization.schema.json](../../../content-schema/schemas/localization.schema.json) — no permission rationale namespace
- No `permission-rationales.md` in [docs/architecture/](../../architecture/)

---

### Q: 451. Can the user proceed with reduced functionality if they deny a permission, or is denial blocking?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No graceful-degradation contract exists. For storage-denial in particular (the most likely browser refusal), there is no fallback to "in-memory only, no save", no banner explaining the limitation, and no rule that the game still launches in single-session mode. For network failure, the offline-mode contract is undefined (audit 12 — edge cases).

**Evidence:**
- [docs/archive/readiness-audit/12-edge-cases.md](12-edge-cases.md) — adjacent gap
- No `degraded-mode.md` in [docs/architecture/](../../architecture/)
- No `state.runtime.permissions.*` slice in any schema

---

### Q: 452. Is consent for telemetry, analytics, and crash reporting requested separately from gameplay permissions?

**Status:** ❌ UNKNOWN

**Answer:**
**N/A — no telemetry/analytics/crash layer exists** (audit 22/Q414, Q422–Q423; audit 21/Q403–Q404). Therefore there is also no consent surface to be "separate from" gameplay permissions. The conservative default — separate, opt-in, off-by-default — is not committed to in writing.

**Evidence:**
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q414, Q422–Q423
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q403–Q404
- No `config.privacy.allowTelemetry` / `allowCrashReports` / `allowAnalytics` in any schema

---

### Q: 453. Is consent for AI-generated content (which may transmit prompts off-device) requested explicitly?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** AI generation transmits user prompts (faction concept, balance dials, optional creative direction) to a remote `GenerationProvider` via `services/ai-gateway/`. **No consent dialog, no first-use modal, no `config.privacy.allowRemoteAI` toggle, and no `state.profile.consent.aiGeneration` field is documented.** `02-new-game-setup` and the (planned) faction-generation screen offer the AI flow as just another option, with no off-device-transmission disclosure.

**Evidence:**
- [services/ai-gateway/README.md](../../../services/ai-gateway/README.md), [docs/architecture/ai-integration.md](../../architecture/ai-integration.md) — provider boundary, no consent step
- [content-schema/schemas/generation-request.schema.json](../../../content-schema/schemas/generation-request.schema.json) — payload, no consent field
- No `config.privacy.allowRemoteAI` / `state.profile.consent.*` in any schema

---

### Q: 454. Is consent for multiplayer (which exposes the user's IP to peers via WebRTC) requested explicitly?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `Host` and `Join` in `62-multiplayer-setup` proceed directly to `64-network-lobby` (or hotseat handoff) with no IP-exposure disclosure modal. ICE candidates carry public/private IPs (audit 18/Q326–Q327, audit 24/Q470), and TURN-only / `iceTransportPolicy: 'relay'` is not mandated as a pre-consent default (audit 18/Q327). There is no `state.profile.consent.multiplayer` field, no first-use "Your IP may be visible to peers" copy, and no per-session re-consent rule.

**Evidence:**
- [docs/architecture/wiki/screens/62-multiplayer-setup/interactions.md](../../architecture/wiki/screens/62-multiplayer-setup/interactions.md) — direct Host/Join, no consent
- [docs/archive/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q326–Q327
- [docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q470
- No `config.privacy.allowMultiplayer` / `state.profile.consent.*` in any schema

---

### Q: 455. Is the consent state versioned, so a policy change re-prompts the user?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No `consentVersion` / `acceptedPolicyVersion` / `acceptedTermsVersion` field exists in any save-format / profile / config schema. With no privacy policy artifact (audit 22/Q410) there is also no policy version to track. A future policy change has no mechanism to invalidate prior acceptance and re-prompt.

**Evidence:**
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q410
- No `consent` / `policyVersion` field in [content-schema/schemas/](../../../content-schema/schemas/)
- No `state.profile.consent.*` slice in any screen `data-contracts.md`

---

### Q: 456. Can the user view and revoke each consent independently from a settings screen?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `56-options` tabs (audio, animation speed, combat, autosave, language, accessibility, renderer) **do not include a Privacy / Consent tab**. There is no per-consent toggle row (`Multiplayer`, `AI Generation`, `Telemetry`, `Crash Reports`), no "view current consent state" affordance, and no `REVOKE_CONSENT` command. Audit 22/Q415 (no "delete my data" flow) compounds this gap — even if a user could revoke a consent, there is no path to undo data already collected under it.

**Evidence:**
- [docs/architecture/wiki/screens/56-options/spec.md](../../architecture/wiki/screens/56-options/spec.md), [interactions.md](../../architecture/wiki/screens/56-options/interactions.md), [data-contracts.md](../../architecture/wiki/screens/56-options/data-contracts.md) — no privacy/consent surface
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q415

---

### Q: 457. Is consent withdrawal honored retroactively (e.g., already-uploaded telemetry queued for deletion)?

**Status:** ❌ UNKNOWN

**Answer:**
**N/A — no consent surface exists** (Q456) and no upload pipeline exists (audit 22/Q414, Q430). Therefore there is also no retroactive-deletion mechanism, no queued-erasure command, no server-side correlation key for "delete everything tied to consent ID X", and no audit log proving deletion.

**Evidence:**
- Q456 above
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q414, Q415, Q430
- No `erasureQueue` / `consentRevocation` schema

---

### Q: 458. Is consent capture logged with a timestamp and policy version for auditability?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No `consent.acceptedAt` / `consent.policyVersion` / `consent.method` (e.g., `explicit-click`, `implicit`, `via-import`) audit record schema exists. With no consent surface (Q455–Q456), no log can be produced. For any future GDPR audit, "the user accepted on date X under policy version Y" cannot be answered from current state.

**Evidence:**
- No `consentAuditLog` schema in [content-schema/schemas/](../../../content-schema/schemas/)
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q418 — no compliance posture

---

### Q: 459. Are children/minor users handled with stricter defaults (no public lobbies, no chat, no AI generation)?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** Audit 22/Q420 and audit 21/Q397 confirmed there is no age gate, no minor detection, no parental-consent surface, and no `contentRating` field on `manifest.schema.json`. Multiplayer chat (audit 19), AI generation, and lobby discovery are all unrestricted by age in the current spec. The COPPA-conservative default for browser-distributable games — "if the experience is not age-gated, assume <13 may use it and disable chat/AI/multiplayer-public surfaces" — is not committed to in writing.

**Evidence:**
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q420
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q397
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) — chat unrestricted by age
- No `ageGate` / `parentalConsent` / `contentRating` field in [content-schema/schemas/](../../../content-schema/schemas/)

---

### Q: 460. Is there a clear distinction between "required for the game to function" and "optional features" in the consent UI?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** With no consent UI (Q452–Q456), there is also no "required vs. optional" taxonomy. The natural classification — *required:* local storage for saves; *optional:* multiplayer, AI generation, telemetry, crash reports — is not enumerated anywhere, and no `consentTier` enum exists in the schema layer.

**Evidence:**
- Q452–Q456 above
- No `consentTier` / `consentRequirement` enum in [content-schema/schemas/](../../../content-schema/schemas/)
- [docs/architecture/wiki/screens/56-options/](../../architecture/wiki/screens/56-options/) — no consent tier table

---

## 🔍 Summary

### Missing Logic
- **Confirmation coverage gaps**: `Leave network lobby` (mid-session), pack uninstall (no surface at all), and options-cancel discard are **not** routed through `60-confirmation-dialog` despite being destructive. (Q436)
- **No click-through resistance** on the confirmation dialog: no enable-after-delay, no countdown, no severity-tiered "type CONFIRM to proceed". (Q437)
- **No undo / grace period** after destructive commands commit (no `pendingDestructive` queue, no soft-delete / trash). (Q438)
- **No first-use privacy notice** before `Host` / `Join` exposes the user's IP via ICE. (Q439)
- **No unsigned-pack warning UX** — `manifest.signature` is optional and runtime-checked, but no "this pack is unsigned, refuse?" modal exists for casual play. (Q440)
- **No moderation-status carrier** in the AI generation pipeline (`GeneratedFaction.notes` carries `promptHash`/`provider` only, no `moderationStatus` / `flaggedReasons`). (Q441)
- **No file-picker scoping rule** (no save-import flow yet, but no contract pinning future picker to safe types / `excludeAcceptAllOption: true`). (Q442)
- **No deep-link / URL-handler contract**, no confirmation gate for state-changing URLs. (Q443)
- **No autoplay-policy rule** — no documented "press to enter" gesture gate before first audio/cinematic. (Q444)
- **No new-install safe-defaults declaration** — telemetry default, AI-generation default, signature-check default all undefined. (Q445)
- **No developer-mode surface, no multi-confirm pattern** for unsafe toggles, no session-only banner. (Q446)
- **No friend / allowlist / trust-tier model** in lobby UI. (Q447)
- **No OS-permission inventory** (storage transport unpinned, `navigator.storage.persist()` request undocumented, optional capabilities not explicitly forbidden). (Q448)
- **No just-in-time permission rule**, no contextual rationales. (Q449, Q450)
- **No graceful-degradation contract** when a permission is denied. (Q451)
- **No telemetry / analytics / crash-report consent surface** (none exists because the underlying layer doesn't exist). (Q452)
- **No AI-generation consent step** despite off-device prompt transmission. (Q453)
- **No multiplayer / WebRTC IP-exposure consent step**. (Q454)
- **No `consentVersion` field**, no policy-change re-prompt. (Q455)
- **No Privacy / Consent tab** in `56-options`, no per-consent revoke. (Q456)
- **No retroactive-erasure pipeline** when consent is revoked. (Q457)
- **No consent-capture audit log**. (Q458)
- **No age gate, no minor-strict defaults**. (Q459)
- **No required-vs-optional taxonomy** for consents. (Q460)

### Risks
- **Leave-mid-game without confirmation** (Q436): a misclick on `network.leave` exits an in-progress multiplayer game with no rejoin path documented (audit 12) — equivalent to a forfeit.
- **Reflexive confirm clicks** (Q437): an unbounced `60-confirmation-dialog` on a `severity: critical` action (delete save, return to main menu) commits on the first key/click that lands in the modal's hitbox during pop-in.
- **No undo on destructive commit** (Q438): hitting `Delete` on a save slot is permanent the moment Confirm fires; no "Undo (5s)" toast.
- **Silent IP exposure on first multiplayer use** (Q439, Q454): a casual user clicks `Host` and the WebRTC ICE flow exposes their public IP to the joiner without a single warning.
- **Unsigned-pack drive-by** (Q440): a save or invite that depends on a third-party pack will pull and load it through the runtime with no "this pack is unsigned, refuse?" gate (audit 20 alignment).
- **Unmoderated AI content reaching minors / public lobbies** (Q441, Q459): the pipeline has no moderation step to fail gracefully *to*; combined with no age gate, generated content can include offensive / IP-violating output and no warning.
- **Filesystem over-scope** (Q442): a future save-import implemented with `<input type="file" webkitdirectory>` (or unconstrained `showDirectoryPicker`) hands the page a directory tree; no contract prevents this.
- **Deep-link state changes** (Q443): a future `?join=ROOM_CODE` or `?import=...` handler that doesn't gate behind confirmation enables one-click malicious links.
- **Autoplay surprise** (Q444): unmuted audio on first cinematic blocks browser autoplay or, worse, loads with audio enabled — startling the user and degrading first impression; muted-only is not declared.
- **Front-loaded permission prompts** (Q449, Q450): a launch-time wall of permission requests trains the user to deny them all, which the spec then has no fallback for (Q451).
- **Hidden telemetry default** (Q452, Q445): with no documented "off-by-default" rule, the first contributor wiring telemetry can ship it on-by-default and silently violate the conservative posture (audit 22/Q423).
- **Off-device AI-prompt transmission without disclosure** (Q453): the user's prompts (potentially containing personal context) leave the device with no notice, in violation of GDPR transparency requirements (audit 22/Q418).
- **Stale consent never re-prompts** (Q455): a major policy change cannot invalidate prior implicit acceptance because no version exists to compare.
- **No revocation path** (Q456, Q457): once a user "consents" by virtue of clicking through, there is no UI to take it back.
- **No audit trail** (Q458): a regulator request "show me when user X consented and to what version" cannot be answered.
- **Open age surface** (Q459): the COPPA / PEGI / ESRB exposure is unbounded; chat, AI, and multiplayer all run with no minor-strict default.
- **All-or-nothing consent** (Q460): without a tier table, a user can't selectively opt out of optional features without losing the game.

### Improvements
1. **Extend `60-confirmation-dialog` with a `confirmDelayMs` and `severity` gate**: `state.ui.confirmation.severity` already exists — promote it from "warning styling only" to "input gate" by binding `Confirm` to `disabled until min(confirmDelayMs, animation.complete)`. Default 0 ms for `info`, 750 ms for `warning`, 1500 ms for `critical`. Add an optional `requireType: 'CONFIRM'` field for the most destructive flows (save delete, account wipe).
2. **Route `Leave Network Lobby` through `60-confirmation-dialog`** when the lobby is `state === 'in-game'`. Add a `LEAVE_NETWORK_LOBBY_CONFIRMED` chain. Same treatment for any future "Forfeit" / "Resign" controls.
3. **Add a `state.ui.lastDestructive` slot + `UNDO_LAST_DESTRUCTIVE` command** for save-delete and overwrite, with a 5-second toast affordance. Persist a soft-delete flag on `saveSlot` until the toast TTL elapses.
4. **Author `docs/architecture/onboarding.md`** describing a first-run flow that, before any network or AI feature is reachable, presents a tiered consent form: required (storage), optional-default-off (multiplayer, AI generation, telemetry, crash reports). Wire to a new `61b-onboarding-consent` screen.
5. **Define `state.profile.consent.*` and a `consent.schema.json`**: per-feature toggle + `acceptedAt` (ISO 8601) + `policyVersion` (semver) + `method` (`explicit` / `import` / `legacy`). Include a `revokedAt` field that, when set, gates the corresponding feature in selectors.
6. **Add a Privacy tab to `56-options`** with one row per consent. Each row has: status, accepted-at timestamp, policy version, `Revoke` button. `Revoke` dispatches `REVOKE_CONSENT(scope)` and (if any data exists) `REQUEST_DATA_ERASURE(scope)`.
7. **Add a `consentAuditLog.schema.json`** + an append-only ring buffer in storage for `(timestamp, scope, action, policyVersion)`; surface it on the same Privacy tab as a "View consent history" affordance.
8. **Add `manifest.signature.trustState` to the lobby compatibility selector**: the `ContentCompatibilityPanel` already exists; add a `signed/unsigned` column and gate Launch behind a per-peer ack when *any* loaded pack is unsigned in casual lobbies (already gated for ranked).
9. **Add a `moderation` block to `generated-faction.schema.json`**: `status` (`pending` / `passed` / `failed` / `skipped`), `flaggedReasons[]`, `reviewedBy?`. Render a "AI content not yet reviewed" banner on any screen surfacing a record where `status !== 'passed'`.
10. **Author `docs/architecture/permissions.md`**: enumerate browser permissions used (storage-persist, network); declare optional capabilities forbidden (Bluetooth, USB, MIDI, Geolocation, mic, camera, notifications, clipboard-read); require contextual modals before each `navigator.*` call; declare graceful-degradation matrix (storage denied → in-memory single-session mode, etc.).
11. **Author `docs/architecture/autoplay-policy.md`**: first user gesture (any click on `01-main-menu`) unlocks audio + cinematic; before the gesture, all media loads `muted` and animations honor `prefers-reduced-motion`.
12. **Author `docs/architecture/url-routing.md`**: enumerate accepted query params (`?lobby=…`, `?campaign=…`, `?packId=…`); every state-changing URL handler routes through `60-confirmation-dialog` with a localized rationale before mutating state.
13. **Add `ageGate` to `config.player.*` + `contentRating` to `manifest.schema.json`**: under-13 default shape disables AI generation, multiplayer chat, and (if a public browser ever lands) public lobbies. Aligns Q459 with audit 21/Q397 and audit 22/Q420.
14. **Add `config.dev.*` keys behind a chord-unlock and `60-confirmation-dialog × 2` (double-confirm)**: `disableSignatureCheck`, `allowUnsignedPacks`, `exposeStateInspector`, `skipMigrations`. All session-only by default; a persistent banner shows "Developer mode active" while any is on. Aligns Q446 with audit 27/Q546–Q547.
15. **Add a `peer.trustLevel` column to `64-network-lobby/PlayerSlotList`**: `unknown` / `recent` / `friend`, derived from a new `state.profile.knownPeers` ring buffer; aligns Q447 with audit 19/Q358.
16. **Add a "first multiplayer host" disclosure modal** on first `Host` (gated by `state.profile.consent.multiplayer.acceptedAt === null`): explains ICE, IP exposure, the absence of voice chat, and how to leave — before the WebRTC handshake starts.

### AI-Readiness
**Score: 1.5/10**

**Reason:** Of 25 questions, 22 resolve to ❌ UNKNOWN, 3 to ⚠ Partial, and 0 to fully ✔ Defined. The only positive footholds are (a) screen `60-confirmation-dialog` already exists as the canonical destructive-action gate and is wired into save-delete, save-overwrite, return-to-main-menu, and quit (Q436); (b) the multiplayer model is incidentally "private by default" because no public-lobby browser exists at all (Q445, audit 18/Q310); and (c) the OS-permission surface is *minimal* — no mic, no camera, no notifications — even though the inventory itself is undocumented (Q448). Everything else — first-run consent, consent versioning, consent revoke, retroactive erasure, age gate, AI consent, multiplayer consent, telemetry consent, deep-link gating, autoplay gesture, file-picker scoping, dev-mode toggles, undo / grace period, click-through resistance, friend / allowlist trust display, unsigned-pack warning, moderation-fallback warning, just-in-time permission prompts with rationales, graceful degradation on denial, required-vs-optional consent taxonomy — is undefined. An autonomous implementer asked to "implement the unsafe-actions UX and consent layer" would have to invent: a consent schema (`consent.schema.json`), an audit-log schema (`consentAuditLog.schema.json`), a Privacy tab in `56-options`, an onboarding screen (`61b-onboarding-consent`), a `confirmDelayMs` extension to `60-confirmation-dialog`, a soft-delete / undo model in persistence, an age gate, a developer-mode chord-unlock, a moderation-status carrier in the AI pipeline, an autoplay policy doc, a permissions inventory, a deep-link routing contract, and a friends/allowlist data structure. That far exceeds the project's "schema-first, contract-first" rule and means **none of the controls in audit 23 can be implemented today without a prior architecture pass** — likely the same pass that fixes audits 21 and 22 (privacy / personal-data / retention), since they share the same missing artifacts: privacy policy, consent state, age gate, erasure pathway, telemetry-toggle.
