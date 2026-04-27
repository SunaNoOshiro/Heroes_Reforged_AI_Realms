# Implementation Plan: 23 — Unsafe Actions UX & Consent

> Source audit: [docs/readiness-audit/23-unsafe-actions-ux-and-consent.md](../readiness-audit/23-unsafe-actions-ux-and-consent.md)
> Audit AI-Readiness score at time of writing: **1.5 / 10** — target after this plan: **8 / 10**.
> The original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic and Risk item from Q436–Q460 into
> concrete, executable work items grounded in existing artifacts:
> [`docs/architecture/wiki/screens/60-confirmation-dialog/`](../architecture/wiki/screens/60-confirmation-dialog/),
> [`docs/architecture/wiki/screens/55-save-load/`](../architecture/wiki/screens/55-save-load/),
> [`docs/architecture/wiki/screens/56-options/`](../architecture/wiki/screens/56-options/),
> [`docs/architecture/wiki/screens/62-multiplayer-setup/`](../architecture/wiki/screens/62-multiplayer-setup/),
> [`docs/architecture/wiki/screens/64-network-lobby/`](../architecture/wiki/screens/64-network-lobby/),
> [`docs/architecture/wiki/screens/01-main-menu/`](../architecture/wiki/screens/01-main-menu/),
> [`docs/architecture/wiki/screens/05-intro-cinematic/`](../architecture/wiki/screens/05-intro-cinematic/),
> [`docs/architecture/wiki/screens/index.json`](../architecture/wiki/screens/index.json),
> [`docs/architecture/command-schema.md`](../architecture/command-schema.md),
> [`docs/architecture/pack-contract.md`](../architecture/pack-contract.md),
> [`docs/architecture/ai-generation-pipeline.md`](../architecture/ai-generation-pipeline.md),
> [`content-schema/schemas/manifest.schema.json`](../../content-schema/schemas/manifest.schema.json),
> [`content-schema/schemas/generated-faction.schema.json`](../../content-schema/schemas/generated-faction.schema.json),
> [`content-schema/schemas/localization.schema.json`](../../content-schema/schemas/localization.schema.json),
> and adjacent plans **18** (room codes), **19** (chat safety), **20**
> (pack trust), **21** (UGC + personal data), and **22** (privacy /
> retention / error leaks).

---

## 1. Overview

Audit 23 evaluated 25 questions on destructive-action UX, consent
capture, OS-permission etiquette, age handling, dev-mode surfaces, and
deep-link safety. **22 of 25 resolved to ❌ UNKNOWN, 3 to ⚠ Partial, 0
to fully ✔ Defined.** The repository today has exactly one positive
artifact in this domain — screen `60-confirmation-dialog` — and three
incidental safe-by-omission states (no public lobby browser, no mic /
camera / notification capability, no telemetry pipeline).

What is missing is the **entire consent layer**, the **entire
permission-rationale layer**, the **dev-mode safety layer**, the
**undo / grace-period layer**, and the **age / minor handling layer**.
A naive autonomous implementer asked to "wire the consent UI" would
have to invent a schema, a screen, a command family, a localization
namespace, an audit-log shape, and a degradation matrix. That violates
the project's schema-first / contract-first rule.

This plan formalizes:

1. A **canonical consent schema** (`consent.schema.json`) +
   **consent audit log schema** (`consent-audit-log.schema.json`),
   plus a `state.profile.consent.*` slice and a typed
   `consentScope` enum.
2. A **first-run onboarding screen** (`61b-onboarding-consent`) that
   captures tiered consent before any network, AI, telemetry, or
   crash-report surface becomes reachable.
3. A **Privacy / Consent tab** addition to `56-options` providing
   per-scope inspect / revoke / view-history.
4. **Hardening of `60-confirmation-dialog`**: a `confirmDelayMs`
   field, severity-tier defaults, an optional `requireType` text
   challenge, and a documented "Confirm-disabled-during-pop-in" rule.
5. An **undo / soft-delete model** (`state.ui.lastDestructive`,
   `UNDO_LAST_DESTRUCTIVE` command, 5-second toast contract).
6. **Confirmation routing for currently-unprotected destructive
   actions**: `Leave Network Lobby` (mid-game), `Cancel Options Edit`
   (when dirty), and the future `Uninstall Pack` flow.
7. A **canonical permissions doctrine**
   (`docs/architecture/permissions.md`) — JIT prompts, contextual
   rationales, graceful-degradation matrix, capability allow/deny list.
8. A **canonical autoplay policy**
   (`docs/architecture/autoplay-policy.md`) — first-gesture unlock,
   muted-by-default, `prefers-reduced-motion`.
9. A **canonical URL / deep-link contract**
   (`docs/architecture/url-routing.md`) — every state-changing URL
   handler routes through `60-confirmation-dialog`.
10. A **developer-mode surface** behind chord-unlock + double-confirm
    (`docs/architecture/developer-mode.md`, `config.dev.*` keys),
    session-only by default, persistent banner.
11. A **peer trust-tier display** in `64-network-lobby` reusing a new
    `state.profile.knownPeers` ring buffer (aligns audit 19 / Plan 19).
12. An **unsigned-pack consent gate** for casual lobbies, extending
    the lobby `ContentCompatibilityPanel` to show signed/unsigned
    state and demanding a per-peer ack when any pack is unsigned.
13. A **moderation-status carrier** on `generated-faction.schema.json`
    + a "AI content not yet reviewed" banner contract.
14. An **age gate** (`config.player.ageGate`) wiring under-13 defaults
    to disable AI generation, multiplayer chat, and any future public
    surfaces — aligning audit 21 / Q397 and audit 22 / Q420.
15. A **safe-defaults manifest** (`docs/architecture/new-install-defaults.md`)
    enumerating the off-by-default state for every optional feature.

This plan **only formalizes missing artifacts** — no gameplay rules
are invented. Where audits 18 / 19 / 20 / 21 / 22 already produced
plans, this plan **defers** to those artifacts and adds only the UX /
consent surface that connects them.

---

## 2. Critical Fixes (Must Do First)

These are the four items that have *active risk surface* today
(misclick, IP exposure, drive-by load, dev-mode escape) and gate every
other item in this plan. Land them in the order shown.

### Critical Fix 1 — Harden `60-confirmation-dialog`

**Source:** Q437, Risk "Reflexive confirm clicks"

**Problem:** `Confirm` mounts immediately clickable. `severity` is
documented as "warning styling only" and does not gate input. Any
keystroke / click landing inside the modal hitbox during pop-in
commits the destructive action.

**Impact:** A `severity: critical` action (delete save, return to main
menu mid-game) commits on the first stray click. There is no
documented countermeasure today.

**Solution:** Promote `severity` from styling-only to an input gate.
Add three new optional fields and a default table:

| `severity`   | default `confirmDelayMs` | optional `requireType`   |
|--------------|--------------------------|--------------------------|
| `info`       | `0`                      | unsupported              |
| `warning`    | `750`                    | `false`                  |
| `critical`   | `1500`                   | `'CONFIRM'` (opt-in)     |

`Confirm` is `disabled` while `now() - openedAt < confirmDelayMs` OR
the pop-in animation has not completed (whichever is longer). When
`requireType` is set, `Confirm` is also disabled until the user types
the literal string.

**Files to Update:**
- [docs/architecture/wiki/screens/60-confirmation-dialog/spec.md](../architecture/wiki/screens/60-confirmation-dialog/spec.md)
- [docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md](../architecture/wiki/screens/60-confirmation-dialog/interactions.md)
- [docs/architecture/wiki/screens/60-confirmation-dialog/data-contracts.md](../architecture/wiki/screens/60-confirmation-dialog/data-contracts.md)
- [docs/architecture/wiki/screens/60-confirmation-dialog/architecture.md](../architecture/wiki/screens/60-confirmation-dialog/architecture.md)
- [docs/architecture/command-schema.md](../architecture/command-schema.md)
  — extend `REQUEST_CONFIRMATION` payload schema

**New Files:** none (pure spec extension).

**Implementation Steps:**
1. Add `confirmDelayMs?: number`, `requireType?: string`, and
   `severity: 'info' | 'warning' | 'critical'` (now load-bearing) to
   the `state.ui.confirmation` shape in `data-contracts.md`.
2. Document the default table above in `spec.md` under a new
   `Click-Through Resistance` section.
3. In `interactions.md`, add a `ConfirmEnabled` predicate:
   `pendingAction != null && now() - openedAt >= confirmDelayMs &&
   animation.popIn.complete && (requireType == null ||
   typedConfirmText === requireType)`.
4. Add a new owning task entry under
   `tasks/phase-1/<ui-tasks>/` (or extend the existing
   `60-confirmation-dialog` task — see §6) covering the new fields.
5. Add CI lint: any code dispatching `REQUEST_CONFIRMATION` with
   `severity: 'critical'` and no `confirmDelayMs` MUST inherit the
   default; this is enforced in `src/ui/confirmation/` builder.

**Dependencies:** none (extends existing screen package).

**Complexity:** **S**

---

### Critical Fix 2 — Author First-Run Onboarding & Consent Schema

**Source:** Q439, Q445, Q452, Q453, Q454, Q455, Q458, Q460. Risks
"Silent IP exposure on first multiplayer use", "Hidden telemetry
default", "Off-device AI-prompt transmission without disclosure",
"Stale consent never re-prompts", "No audit trail", "All-or-nothing
consent".

**Problem:** No first-run flow exists. Consent is therefore implicit /
absent for multiplayer (IP exposure), AI generation (off-device prompt
transmission), telemetry, crash reports. There is no `consentVersion`
field, no audit log, and no required-vs-optional taxonomy.

**Impact:** The first multiplayer or AI use ships without disclosure
or opt-in. A future policy change cannot re-prompt because no version
is stored. A regulator request "show me when user X consented and to
what" cannot be answered.

**Solution:** Add a `consent.schema.json` + `consent-audit-log.schema.json`,
introduce a new screen `61b-onboarding-consent` (numbered between
`61-credits` and any future `62-multiplayer-setup`-adjacent screens
per the wiki's grouping rules), and enumerate the consent scopes.

**Files to Update:**
- [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json)
  — add `61b-onboarding-consent` entry; update group ordering note
- [docs/architecture/wiki/screens/01-main-menu/interactions.md](../architecture/wiki/screens/01-main-menu/interactions.md)
  — gate first reachable action behind onboarding-completed predicate
- [docs/architecture/wiki/screens/62-multiplayer-setup/interactions.md](../architecture/wiki/screens/62-multiplayer-setup/interactions.md)
  — gate `Host` / `Join` behind `consent.multiplayer === 'granted'`
- [docs/architecture/wiki/screens/02-new-game-setup/interactions.md](../architecture/wiki/screens/02-new-game-setup/interactions.md)
  — gate `AI faction generation` behind `consent.aiGeneration === 'granted'`
- [docs/architecture/command-schema.md](../architecture/command-schema.md)
  — register `GRANT_CONSENT`, `REVOKE_CONSENT`, `REQUEST_CONSENT_PROMPT`,
  `RECORD_CONSENT_AUDIT`
- [content-schema/schemas/localization.schema.json](../../content-schema/schemas/localization.schema.json)
  — add `consent.<scope>.title`, `.body`, `.acceptCta`, `.declineCta`,
  `.requiredBadge`, `.optionalBadge` namespace

**New Files:**
- `content-schema/schemas/consent.schema.json`
- `content-schema/schemas/consent-audit-log.schema.json`
- `docs/architecture/wiki/screens/61b-onboarding-consent/mockup.html`
- `docs/architecture/wiki/screens/61b-onboarding-consent/spec.md`
- `docs/architecture/wiki/screens/61b-onboarding-consent/interactions.md`
- `docs/architecture/wiki/screens/61b-onboarding-consent/data-contracts.md`
- `docs/architecture/wiki/screens/61b-onboarding-consent/architecture.md`
- `docs/architecture/onboarding.md` (canonical narrative)
- `docs/architecture/diagrams/30-onboarding-consent.md` (Mermaid)
- `tasks/phase-1/<ui-onboarding>/onboarding-consent-screen.md`
- `tasks/phase-1/<schema>/consent-schema.md`

**Implementation Steps:**
1. Define `consent.schema.json` keys: `scope` (enum:
   `storage`, `multiplayer`, `aiGeneration`, `telemetry`,
   `crashReports`, `analytics`, `unsignedPacks`), `state`
   (`unset` / `granted` / `revoked` / `denied`), `acceptedAt`
   (ISO 8601), `revokedAt?`, `policyVersion` (semver),
   `method` (`explicit` / `import` / `legacy`), `tier`
   (`required` / `optional`).
2. Define `consent-audit-log.schema.json`: append-only ring buffer of
   `(timestamp, scope, fromState, toState, policyVersion, method)`
   with a fixed cap (e.g., 256 most recent events).
3. Add `state.profile.consent: Record<ConsentScope, ConsentRecord>`
   slice; document in `data-contracts.md` of `61b-onboarding-consent`.
4. Author screen package per the standard 5-file rule (mockup,
   spec, interactions, data-contracts, architecture).
5. Onboarding flow:
   a. `01-main-menu` checks `consent.storage.state`. If `unset`,
      route immediately to `61b-onboarding-consent`.
   b. Onboarding shows tiered UI: `Required (storage)` always
      pre-accepted with explanation; `Optional` rows for
      `multiplayer`, `aiGeneration`, `telemetry`, `crashReports`
      default OFF.
   c. `Continue` dispatches `GRANT_CONSENT(scope)` for each toggle,
      writes `acceptedAt`, `policyVersion`, `method: 'explicit'`,
      and an audit-log row.
6. Wire each guarded surface (`Host`, `Join`, AI generation, AI
   gateway calls, telemetry uploads if any) to a selector
   `selectConsent(scope) === 'granted'`. If not granted, dispatch
   `REQUEST_CONSENT_PROMPT(scope)` and route through onboarding.
7. Add `policyVersion` constant to `docs/architecture/onboarding.md`;
   any bump invalidates `state === 'granted'` and re-routes through
   onboarding for the affected scopes.
8. Add registry-test fixtures: a save with `policyVersion:
   '0.0.0'` must trigger re-prompt; a save with current version
   must not.

**Dependencies:** Plan 21 (already declared `state.profile.*`
namespace), Plan 22 (already declared `policyVersion` artifact in
`privacy.md`). Coordinate `policyVersion` to a single canonical value.

**Complexity:** **L**

---

### Critical Fix 3 — IP-Exposure Disclosure on First Multiplayer Host/Join

**Source:** Q439, Q454. Risk "Silent IP exposure on first multiplayer use".

**Problem:** `Host` and `Join` proceed directly to `64-network-lobby`
with no IP-exposure disclosure. WebRTC ICE candidates carry public/
private IPs (audit 18 / Q326–Q327, audit 24 / Q470). No copy in the
spec warns the user.

**Impact:** A casual user clicks `Host`, the WebRTC handshake
completes, and the joiner sees their IP. No notice was given.

**Solution:** Block `HOST_MULTIPLAYER_SESSION` /
`JOIN_MULTIPLAYER_SESSION` until the user has granted
`consent.multiplayer` via Critical Fix 2. The onboarding screen and
the `56-options` Privacy tab (Critical Fix 4) both expose this
toggle. The disclosure copy must specifically name "your public IP
may be visible to peers" and link to a 1-paragraph explainer.

**Files to Update:**
- [docs/architecture/wiki/screens/62-multiplayer-setup/interactions.md](../architecture/wiki/screens/62-multiplayer-setup/interactions.md)
  — wrap `mpSetup.host` and `mpSetup.join` in a
  `consent.multiplayer === 'granted'` guard
- [docs/architecture/wiki/screens/62-multiplayer-setup/spec.md](../architecture/wiki/screens/62-multiplayer-setup/spec.md)
  — note the consent precondition
- [docs/architecture/wiki/screens/61b-onboarding-consent/data-contracts.md](../architecture/wiki/screens/61b-onboarding-consent/data-contracts.md)
  — add `consent.multiplayer` localization keys with IP-exposure copy
- [content-schema/schemas/localization.schema.json](../../content-schema/schemas/localization.schema.json)
  — add `consent.multiplayer.ipDisclosure` slot

**New Files:** none (reuses Critical Fix 2 surface).

**Implementation Steps:**
1. Add a `MultiplayerConsentGate` precondition documented in
   `62-multiplayer-setup/interactions.md`.
2. If consent state is `unset`, dispatch
   `REQUEST_CONSENT_PROMPT('multiplayer')`; on grant, retry the
   originating action.
3. The disclosure copy lives in the localization namespace, not in
   the screen markup, so it can be translated.
4. Add a `playtest checklist` entry: clicking `Host` on a fresh
   profile MUST present the disclosure modal before any
   `RTCPeerConnection` is created.

**Dependencies:** Critical Fix 2.

**Complexity:** **S** (after Critical Fix 2).

---

### Critical Fix 4 — Add Privacy / Consent Tab to `56-options`

**Source:** Q456, Q457, Q458, Q460. Risks "No revocation path", "No audit trail", "All-or-nothing consent".

**Problem:** `56-options` exposes audio, animation speed, autosave,
language, accessibility, renderer scale — but no Privacy / Consent
tab. There is no per-consent toggle, no view of the audit log, no
`Revoke` affordance.

**Impact:** Once the user clicks through onboarding, they cannot
inspect or undo the choice from inside the app. GDPR Art. 7(3) says
withdrawal must be as easy as giving consent — this gap blocks
that.

**Solution:** Add a `Privacy` tab to `56-options`. One row per
consent scope showing: `state`, `acceptedAt` (date string), `policyVersion`,
`Revoke` button. A footer link opens a `View consent history` view
that reads from `consent-audit-log.schema.json`.

**Files to Update:**
- [docs/architecture/wiki/screens/56-options/spec.md](../architecture/wiki/screens/56-options/spec.md)
  — add `Privacy` tab and consent-row component
- [docs/architecture/wiki/screens/56-options/interactions.md](../architecture/wiki/screens/56-options/interactions.md)
  — `options.privacy.revoke(scope)` →
  `60-confirmation-dialog (severity: critical)` →
  `REVOKE_CONSENT(scope)` → `RECORD_CONSENT_AUDIT(...)`
- [docs/architecture/wiki/screens/56-options/data-contracts.md](../architecture/wiki/screens/56-options/data-contracts.md)
  — add `state.profile.consent.*` and `consentAuditLog` selectors
- [docs/architecture/wiki/screens/56-options/mockup.html](../architecture/wiki/screens/56-options/mockup.html)
  — extend mockup with the new tab

**New Files:** none.

**Implementation Steps:**
1. Add tab `Privacy` to the existing tab list in `spec.md` (right of
   `Accessibility`, left of `Renderer` to match other privacy-adjacent
   patterns).
2. For each `ConsentScope`, render `ConsentRow`: title, status badge,
   accepted-at, policy-version, `Revoke` button (disabled when
   `tier === 'required'`).
3. `Revoke` opens `60-confirmation-dialog` with `severity: 'critical'`
   and `requireType: 'REVOKE'`. On confirm, dispatch
   `REVOKE_CONSENT(scope)` and, if any data exists,
   `REQUEST_DATA_ERASURE(scope)` (reuses Plan 21 / 22 erasure pipe).
4. `View consent history` opens an inline panel that lists the latest
   N audit entries (read-only).

**Dependencies:** Critical Fixes 1 and 2.

**Complexity:** **M**

---

## 3. System Improvements

### 3.1 UI / Screens

#### Issue: Leave Network Lobby has no confirmation

**Source:** Q436. Risk "Leave-mid-game without confirmation".

**Problem:** `network.leave` → `LEAVE_NETWORK_LOBBY` is plain
navigation. Mid-game, this forfeits the match for both peers.

**Impact:** A misclick on the lobby `Leave` button forfeits the
match. There is no documented rejoin path (audit 12 alignment).

**Solution:** Route `network.leave` through `60-confirmation-dialog`
when `state.net.lobby.session.phase === 'in-game'` (or any
mid-session indicator). Use `severity: 'warning'` for waiting-room
leave, `severity: 'critical'` for in-game leave.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../architecture/wiki/screens/64-network-lobby/interactions.md)
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../architecture/wiki/screens/64-network-lobby/data-contracts.md)
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — register `LEAVE_NETWORK_LOBBY_CONFIRMED`

**New Files:** none.

**Implementation Steps:**
1. Document the new chain `network.leave` →
   `REQUEST_CONFIRMATION({severity, pendingAction:
   LEAVE_NETWORK_LOBBY_CONFIRMED})` →
   `LEAVE_NETWORK_LOBBY_CONFIRMED`.
2. Severity selector: `phase === 'in-game' ? 'critical' :
   'warning'`.
3. Add a "Forfeit penalty" copy line to localization for in-game
   case.

**Dependencies:** Critical Fix 1.

**Complexity:** **S**

---

#### Issue: Options-Cancel discards draft without confirmation when dirty

**Source:** Q436.

**Problem:** `options.cancel` discards an unsaved options draft with
no confirmation. Users who unintentionally hit `Cancel` lose changes.

**Impact:** Minor data loss / friction; not destructive, but easily
mitigated.

**Solution:** When the draft is dirty (`state.ui.options.dirty ===
true`), route `Cancel` through `60-confirmation-dialog` with
`severity: 'info'` (no delay).

**Files to Update:**
- [docs/architecture/wiki/screens/56-options/interactions.md](../architecture/wiki/screens/56-options/interactions.md)
- [docs/architecture/wiki/screens/56-options/data-contracts.md](../architecture/wiki/screens/56-options/data-contracts.md)

**New Files:** none.

**Implementation Steps:**
1. Add `selectOptionsDirty` selector contract.
2. Wrap `options.cancel` in a dirty-check; clean state proceeds
   directly.
3. Add localization `options.cancel.confirmTitle` /
   `options.cancel.confirmBody`.

**Dependencies:** Critical Fix 1.

**Complexity:** **S**

---

#### Issue: No pack-manager screen, so uninstall is unprotected

**Source:** Q436, Q440.

**Problem:** No pack-manager screen exists in `index.json`. Pack
install / uninstall flows are undocumented. A future implementer can
land an uninstall without a confirmation gate.

**Impact:** Users could lose pack data with no warning. Cross-cuts
audit 20 (pack trust) and audit 28 (registry).

**Solution:** Author a new screen `58-pack-manager` (number reserved
adjacent to `56-options` / `57-keybindings` per the wiki's grouping
note). Mandate that `Uninstall` always routes through
`60-confirmation-dialog (severity: critical, requireType: 'UNINSTALL')`.

**Files to Update:**
- [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json)
  — add `58-pack-manager` entry
- [docs/architecture/wiki/screens/54-system-menu/interactions.md](../architecture/wiki/screens/54-system-menu/interactions.md)
  — add `system.openPackManager` route

**New Files:**
- `docs/architecture/wiki/screens/58-pack-manager/mockup.html`
- `docs/architecture/wiki/screens/58-pack-manager/spec.md`
- `docs/architecture/wiki/screens/58-pack-manager/interactions.md`
- `docs/architecture/wiki/screens/58-pack-manager/data-contracts.md`
- `docs/architecture/wiki/screens/58-pack-manager/architecture.md`
- `tasks/phase-2/<pack-manager>/pack-manager-screen.md`

**Implementation Steps:**
1. Author the screen package per the 5-file standard.
2. List columns: `Pack ID`, `Version`, `Source` (local / imported /
   network), `Signed?` (link to Plan 20 trust state),
   `Installed At`, `Actions` (`Uninstall`, `View Manifest`).
3. `Uninstall` action chain: `pack.uninstall(packId)` →
   `60-confirmation-dialog` → `UNINSTALL_PACK_CONFIRMED(packId)`.
4. Verify with `npm run validate:tasks` that the new screen has an
   owning UI task and that a screen-package linkage exists in the
   wiki sidebar.

**Dependencies:** Plan 20 (pack trust); Plan 13 (content system).

**Complexity:** **M**

---

#### Issue: No undo / grace period after destructive commit

**Source:** Q438. Risk "No undo on destructive commit".

**Problem:** Once `CONFIRM_PENDING_ACTION` fires the underlying
command (e.g., `DELETE_SAVE_SLOT`), the reducer mutates immediately.
There is no `pendingDestructive` queue, no `UNDO_LAST_DESTRUCTIVE`
command, no soft-delete / trash-bin model.

**Impact:** Save deletion is permanent the moment Confirm fires.
Industry-standard "Undo (5s)" toast is absent.

**Solution:** Add a minimal soft-delete + undo model scoped to two
flows initially: `DELETE_SAVE_SLOT` and `OVERWRITE_SAVE_SLOT`.

**Files to Update:**
- [docs/architecture/wiki/screens/55-save-load/interactions.md](../architecture/wiki/screens/55-save-load/interactions.md)
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../architecture/wiki/screens/55-save-load/data-contracts.md)
- [docs/architecture/command-schema.md](../architecture/command-schema.md)
  — register `UNDO_LAST_DESTRUCTIVE`, `EXPIRE_LAST_DESTRUCTIVE`
- [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md)
  — add the soft-delete TTL branch

**New Files:**
- `docs/architecture/undo-policy.md`
- `tasks/phase-1/<persistence>/undo-soft-delete.md`

**Implementation Steps:**
1. `state.ui.lastDestructive`:
   ```
   {
     scope: 'saveSlot' | 'profileWipe' | ...,
     payload: <command>,
     expiresAt: number  // wallclock ms
   }
   ```
   The render of `55-save-load` shows a toast with `Undo` while
   `now() < expiresAt`.
2. `DELETE_SAVE_SLOT` reducer marks the slot `softDeleted: true,
   tombstoneExpiresAt`; the slot is hidden from the UI but still on
   disk.
3. A scheduled effect dispatches `EXPIRE_LAST_DESTRUCTIVE` at TTL,
   which calls the underlying file-system delete and clears
   `state.ui.lastDestructive`.
4. `UNDO_LAST_DESTRUCTIVE` clears the tombstone fields, the slot
   reappears.
5. Default TTL: 5 seconds. Configurable in `docs/architecture/undo-policy.md`.

**Dependencies:** Plan 08 (persistence).

**Complexity:** **M**

---

#### Issue: No "AI content not yet reviewed" banner

**Source:** Q441.

**Problem:** Audit 14 confirmed there is no moderation step in the
AI generation pipeline. There is also no `moderationStatus` field on
`generated-faction.schema.json`, and no banner contract.

**Impact:** Generated factions reach the screen indistinguishable
from packaged content. Combined with no age gate (Q459), offensive /
IP-violating output can render to minors with no warning.

**Solution:** Add a `moderation` block to
`generated-faction.schema.json`. Define a banner contract that any
screen surfacing a record where `moderation.status !== 'passed'`
MUST render an "AI content not yet reviewed" banner.

**Files to Update:**
- [content-schema/schemas/generated-faction.schema.json](../../content-schema/schemas/generated-faction.schema.json)
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md)
  — extend `CoherenceReport` to carry a moderation summary
- [docs/architecture/wiki/screens/02-new-game-setup/spec.md](../architecture/wiki/screens/02-new-game-setup/spec.md)
  — banner placement in the AI faction picker

**New Files:**
- `docs/architecture/ai-moderation-contract.md` (placeholder
  describing the `moderation` block; the actual moderation logic is
  out of scope and tracked in audit 14).

**Implementation Steps:**
1. Add `moderation` to the schema:
   ```json
   "moderation": {
     "type": "object",
     "required": ["status"],
     "properties": {
       "status": {
         "enum": ["pending", "passed", "failed", "skipped"]
       },
       "flaggedReasons": {
         "type": "array",
         "items": { "type": "string" }
       },
       "reviewedBy": { "type": "string" }
     }
   }
   ```
2. Document banner copy in localization
   (`ai.moderation.banner.unreviewed` / `.flagged` / `.skipped`).
3. Add a CI rule: any UI that renders a `GeneratedFaction` MUST
   import `selectModerationBanner` and render it when status is not
   `passed`.

**Dependencies:** audit 14 plan (AI pipeline) — banner contract is
independent and can land first.

**Complexity:** **M**

---

#### Issue: No friend / allowlist / trust-tier display in lobby

**Source:** Q447. Aligns audit 19 / Q358.

**Problem:** `PlayerSlotList` in `64-network-lobby` shows peers from
`state.net.lobby.players` with no trust signal. There is no
`state.profile.knownPeers`, no `peer.trustLevel`, no UI badge
distinguishing first contact from a recurring peer.

**Impact:** Users cannot tell whether the peer is a known associate
or a stranger. Combined with no ICE / IP disclosure, this conceals
the threat model.

**Solution:** Add a `state.profile.knownPeers` ring buffer and a
`trustLevel` derivation rule: `friend` (explicit allowlist),
`recent` (seen in last 30 days), `unknown` (otherwise). Render as a
compact badge in `PlayerSlotList`. Allowlist add / remove lives in
the new pack-manager-style screen or a small popover.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../architecture/wiki/screens/64-network-lobby/spec.md)
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../architecture/wiki/screens/64-network-lobby/data-contracts.md)
- [docs/architecture/command-schema.md](../architecture/command-schema.md)
  — register `ADD_PEER_TO_ALLOWLIST`, `REMOVE_PEER_FROM_ALLOWLIST`,
  `RECORD_PEER_CONTACT`

**New Files:**
- `content-schema/schemas/peer-allowlist.schema.json`
- `docs/architecture/peer-trust.md`
- `tasks/phase-3/01-multiplayer/<peer-trust>/peer-trust-display.md`

**Implementation Steps:**
1. Define `peer-allowlist.schema.json`:
   `{ peers: [{ peerId, displayNameAtAdd, addedAt, lastSeenAt }] }`,
   capped at e.g. 256 entries (LRU).
2. Add `state.profile.knownPeers` slice referencing the schema.
3. Compute `trustLevel(peerId)` in a selector; add to lobby
   `PlayerSlotList`.
4. Add `Add to friends` / `Remove from friends` actions in the
   per-row context menu.
5. Document `RECORD_PEER_CONTACT` is dispatched on every successful
   handshake to keep `lastSeenAt` fresh.

**Dependencies:** Critical Fix 2 (consent for storing peer data).

**Complexity:** **M**

---

#### Issue: Unsigned-pack lobby gate

**Source:** Q440. Risk "Unsigned-pack drive-by".

**Problem:** The lobby `compatibility` selector covers hash/version
match but not signature trust. Casual lobbies have no "this pack is
unsigned, refuse?" gate (ranked already excludes unsigned via
`tasks/phase-3/04-polish/03-ranked-play-elo-ladder-plus-ai-pack-sandbox.md`).

**Impact:** A save or invite that depends on a third-party pack pulls
and loads it through the runtime with no warning.

**Solution:** Extend the `ContentCompatibilityPanel` data contract
with a `trustState` summary. When any pack is unsigned in a casual
lobby, gate `Launch` behind a per-peer ack with copy "This session
uses unsigned packs."

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../architecture/wiki/screens/64-network-lobby/spec.md)
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../architecture/wiki/screens/64-network-lobby/data-contracts.md)
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md)
  — note the runtime emits `trustState` per pack

**New Files:** none (this extension reuses Plan 20's trust schema).

**Implementation Steps:**
1. Add `trustState: 'signed' | 'unsigned' | 'invalid-signature'` to
   the per-pack record exposed by the lobby selector.
2. Aggregate into `lobby.compatibility.signatureGate` with a flag
   `requiresAck`.
3. Render a checklist: each peer must check "I accept unsigned packs
   for this session" before `Launch` is enabled.
4. The ack itself is logged into the consent audit log under scope
   `unsignedPacks` with `tier: 'optional'`, `method: 'session'`.

**Dependencies:** Plan 20 (pack trust signature surface).

**Complexity:** **M**

---

### 3.2 Data Contracts

#### Issue: Localization namespace gaps for consent / permission rationales / banners

**Source:** Q450, Q441, Q452-Q454.

**Problem:** No localization keys for permission rationales, consent
copy, AI moderation banners, or unsigned-pack ack.

**Impact:** Strings will land hard-coded in a single locale; the
project's "schema-first" rule is violated.

**Solution:** Extend `localization.schema.json` with the namespaces
declared throughout this plan.

**Files to Update:**
- [content-schema/schemas/localization.schema.json](../../content-schema/schemas/localization.schema.json)

**New Files:** none.

**Implementation Steps:**
1. Add namespaces:
   - `consent.<scope>.{title,body,acceptCta,declineCta,requiredBadge,optionalBadge,revokeCta}`
   - `permission.<browserScope>.{prompt,rationale,deniedFallback}` for `storage`, `notifications`, `clipboardWrite`
   - `ai.moderation.banner.{unreviewed,flagged,skipped}`
   - `pack.trust.{signed,unsigned,invalidSignature,ackSession}`
   - `multiplayer.disclosure.{ipExposure,leaveForfeit}`
   - `confirm.severity.{critical.requireTypeHint,warning.delayHint}`
   - `developer.banner.{active,session,onlyVisibleHere}`
2. Each namespace includes only the keys used by spec-level docs.

**Dependencies:** none.

**Complexity:** **S**

---

#### Issue: Save format does not carry consent state

**Source:** Q455.

**Problem:** Save files don't carry the user's consent snapshot;
import on a different device cannot replay consents.

**Impact:** Re-prompt fires on import even if the user already
consented on the source device — friction. Or worse, a save imports
"silently" with consents inherited that the user didn't give on this
device.

**Solution:** Save format exports `consentSnapshot` (current state);
import dispatches `IMPORT_CONSENT_SNAPSHOT` which routes through
onboarding (treats the import as `method: 'import'`, requiring
confirmation per scope).

**Files to Update:**
- [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md)
- `content-schema/schemas/save.schema.json` (when the save schema
  formalizes — currently undefined; this plan only reserves the slot)

**New Files:** none.

**Implementation Steps:**
1. Document the `consentSnapshot` field in `consent.schema.json`
   under a separate definition (`ConsentSnapshot`).
2. On import, audit-log records `method: 'import'` for each scope
   confirmed by the user during the import-consent prompt.
3. Imports never auto-grant consent; they only suggest.

**Dependencies:** Critical Fix 2; Plan 20 (save imports).

**Complexity:** **M**

---

### 3.3 Schemas

#### Issue: Missing `consent.schema.json` and `consent-audit-log.schema.json`

Already covered in Critical Fix 2. Listed here for tracking.

#### Issue: `manifest.schema.json` lacks `contentRating`

**Source:** Q459.

**Problem:** No `contentRating` field on the pack manifest; the runtime
cannot block packs above a configured maturity threshold.

**Impact:** Age-gating cannot be enforced even after the player
declares an age, because pack records carry no rating.

**Solution:** Add an optional `contentRating` field with a closed
enum.

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json)

**New Files:** none.

**Implementation Steps:**
1. Add `"contentRating": { "enum": ["everyone", "teen", "mature"] }`,
   default `"everyone"`. Optional on read for backwards compat;
   missing maps to `"everyone"`.
2. Document in `docs/architecture/pack-contract.md`.
3. Wire to `config.player.ageGate` so packs above the gate are
   filtered from the pack picker.

**Dependencies:** age-gate config (below).

**Complexity:** **S**

---

#### Issue: `config.player.ageGate` and minor-strict defaults

**Source:** Q459.

**Problem:** No age gate exists. Audit 21 / Q397 and audit 22 / Q420
flagged the same. COPPA-conservative defaults are not committed to
in writing.

**Impact:** Minors may use chat / AI / multiplayer without age-strict
defaults. Compliance posture is undefined.

**Solution:** Add `config.player.ageGate` with values `unknown`,
`under13`, `over13`. Onboarding asks once, before the consent tier.
`under13` shape forces:

| Scope                | Forced state |
|----------------------|--------------|
| `multiplayer`        | `denied`     |
| `aiGeneration`       | `denied`     |
| `telemetry`          | `denied`     |
| `crashReports`       | `denied`     |
| Chat (Plan 19)       | disabled     |
| Public lobbies       | disabled (none exist anyway) |
| `contentRating > everyone` packs | filtered from picker |

`unknown` is treated as `under13` for safety until the user picks.

**Files to Update:**
- [content-schema/schemas/localization.schema.json](../../content-schema/schemas/localization.schema.json)
  — add age-gate prompt copy
- [docs/architecture/wiki/screens/61b-onboarding-consent/interactions.md](../architecture/wiki/screens/61b-onboarding-consent/interactions.md)
  — first step is age-gate, then consent tiers

**New Files:**
- `docs/architecture/age-gate.md`
- `tasks/phase-1/<onboarding>/age-gate.md`

**Implementation Steps:**
1. Add `config.player.ageGate` to player config schema.
2. Document the matrix above in `docs/architecture/age-gate.md`.
3. Wire `selectFeatureAvailability(scope, ageGate, consent)` as a
   single canonical selector used by every guarded surface.
4. The age-gate value is itself stored under `config.player`, not
   under consent; revoking is via the same Privacy tab.

**Dependencies:** Critical Fix 2; Plan 19 (chat).

**Complexity:** **M**

---

### 3.4 Architecture

#### Issue: No permissions doctrine

**Source:** Q448, Q449, Q450, Q451.

**Problem:** No canonical permissions document. No JIT rule, no
rationale rule, no degradation matrix, no allow / deny list of
browser capabilities.

**Impact:** A future contributor can call `Notification.requestPermission()`
on `01-main-menu` mount, train users to deny everything, then ship
no fallback.

**Solution:** Author `docs/architecture/permissions.md`.

**Files to Update:**
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md)
  — link the new doctrine
- [README.md](../../README.md) — top-of-file architecture map

**New Files:**
- `docs/architecture/permissions.md`
- `docs/architecture/storage-contract.md`
- `tasks/phase-1/<permissions>/permissions-doctrine.md`

**Implementation Steps:**
1. `permissions.md` enumerates:
   a. **Used permissions:** storage (IndexedDB / OPFS),
      `navigator.storage.persist()` (JIT after first save),
      network (WebRTC + WS — no prompt).
   b. **Forbidden capabilities** (do not call): mic, camera,
      notifications, clipboard read, Bluetooth, USB, MIDI,
      Geolocation, Sensors. Any future use requires this doc to
      change.
   c. **JIT rule:** every `navigator.*permission*.request()` MUST
      be preceded by an in-app rationale modal whose copy comes
      from the localization namespace `permission.<scope>.rationale`.
   d. **Degradation matrix:**
      | Permission | Denied → Behavior |
      |-----------|-------------------|
      | `storage.persist`  | session-only mode; banner |
      | `notifications`    | feature off, no error |
      | (any other)        | feature off, link to settings |
2. `storage-contract.md` pins the storage transport (IndexedDB
   primary, OPFS optional) so future code aligns.
3. CI lint: `grep` for `navigator.permissions.request`,
   `Notification.requestPermission`, `navigator.storage.persist` —
   each call site must import the rationale modal helper.

**Dependencies:** Plan 08 (persistence).

**Complexity:** **M**

---

#### Issue: No autoplay policy

**Source:** Q444. Risk "Autoplay surprise".

**Problem:** No rule pins first audio / cinematic behind a user gesture.
Browsers will mute or block by default; an unmuted intro can fail
silently or surprise the user.

**Impact:** Inconsistent first-load experience across browsers; on
mobile Safari the cinematic may not play at all.

**Solution:** Author `docs/architecture/autoplay-policy.md`.

**Files to Update:**
- [docs/architecture/wiki/screens/01-main-menu/interactions.md](../architecture/wiki/screens/01-main-menu/interactions.md)
- [docs/architecture/wiki/screens/05-intro-cinematic/interactions.md](../architecture/wiki/screens/05-intro-cinematic/interactions.md)

**New Files:**
- `docs/architecture/autoplay-policy.md`

**Implementation Steps:**
1. Rule: until the first user gesture (any pointerdown / keydown /
   touchstart) on `01-main-menu`, all media loads `muted` and
   animations honor `prefers-reduced-motion`.
2. The first gesture dispatches `UNLOCK_MEDIA_AUTOPLAY` which
   transitions `state.runtime.media.unlocked = true`.
3. The cinematic asset MUST tolerate muted first-frame (no critical
   audio cues in the first second).

**Dependencies:** Plan 04 (animation system).

**Complexity:** **S**

---

#### Issue: No URL / deep-link contract

**Source:** Q443. Risk "Deep-link state changes".

**Problem:** No `?join=…`, `?import=…`, `web+heroes://…` contract.
Future implementers can route directly into sensitive state from a
URL.

**Impact:** One-click malicious links can join sessions, install
packs, load saves with no confirmation.

**Solution:** Author `docs/architecture/url-routing.md`.

**Files to Update:**
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md)

**New Files:**
- `docs/architecture/url-routing.md`
- `tasks/phase-1/<routing>/url-routing-contract.md`

**Implementation Steps:**
1. Enumerate accepted query params and their state-changing
   commands. Each pairs with a confirmation severity:
   | Param         | Command                           | Severity   | requireType |
   |---------------|-----------------------------------|------------|-------------|
   | `?lobby=CODE` | `JOIN_MULTIPLAYER_SESSION`        | warning    | none        |
   | `?campaign=`  | `LOAD_CAMPAIGN_FROM_URL`          | warning    | none        |
   | `?packId=`    | `INSTALL_PACK_FROM_URL`           | critical   | `'INSTALL'` |
   | `?import=`    | `IMPORT_SAVE_FROM_URL`            | critical   | `'IMPORT'`  |
2. Every URL handler dispatches `REQUEST_CONFIRMATION(...)` first;
   the underlying command never fires from URL parse alone.
3. Unknown params are dropped silently with a single console warning.
4. No `registerProtocolHandler` calls without explicit user opt-in
   from `56-options`.

**Dependencies:** Critical Fix 1.

**Complexity:** **M**

---

#### Issue: No file-picker contract

**Source:** Q442.

**Problem:** No `filePicker.md` / `storage-contract.md`. Future save-
import or pack-install picker may use over-broad scopes.

**Impact:** A naive `<input type="file" webkitdirectory>` exposes a
directory tree. `showDirectoryPicker()` without restrictions exposes
arbitrary user content.

**Solution:** Add a section to `docs/architecture/storage-contract.md`
(authored above). Pin all pickers to `showOpenFilePicker({ types:
[...], excludeAcceptAllOption: true, multiple: false })` with
explicit MIME types per use case.

**Files to Update:**
- `docs/architecture/storage-contract.md` (created above)

**New Files:** none.

**Implementation Steps:**
1. `Save import`: `types: [{ description: 'Heroes save', accept:
   { 'application/x-heroes-save': ['.heroessave'] } }]`,
   `excludeAcceptAllOption: true`.
2. `Pack import`: `types: [{ accept: { 'application/zip':
   ['.heroespack', '.zip'] } }]`.
3. Forbid `showDirectoryPicker()` and
   `<input type="file" webkitdirectory>` in `src/ui/`. Add CI lint.

**Dependencies:** Plan 20 (save imports).

**Complexity:** **S**

---

#### Issue: No new-install safe-defaults declaration

**Source:** Q445. Risk "Hidden telemetry default".

**Problem:** With no canonical "new install starts in safe mode"
document, a contributor can ship a feature on-by-default.

**Impact:** Silent privacy regressions.

**Solution:** Author `docs/architecture/new-install-defaults.md`
listing every optional feature and its default state.

**Files to Update:** none initially.

**New Files:**
- `docs/architecture/new-install-defaults.md`

**Implementation Steps:**
1. Enumerate defaults:
   | Feature              | Default          | Source of truth |
   |---------------------|-------------------|----------------|
   | Storage              | granted (required) | onboarding |
   | Multiplayer          | unset → must opt in | onboarding |
   | AI generation        | unset → must opt in | onboarding |
   | Telemetry            | denied (off-by-default) | onboarding |
   | Crash reports        | denied             | onboarding |
   | Analytics            | denied             | onboarding |
   | Public lobby browser | not implemented    | audit 18 |
   | Signature checks     | enabled            | dev mode toggle |
   | Pack hash check      | enabled            | dev mode toggle |
   | Developer mode       | off                | chord-unlock only |
   | Age gate             | unknown → treat as under13 | audit 23 |
2. CI lint: any `config.privacy.*` / `config.dev.*` field MUST have
   a default declared in this document; deviations fail
   `npm run validate`.

**Dependencies:** Critical Fix 2.

**Complexity:** **S**

---

#### Issue: No developer-mode surface

**Source:** Q446. Aligns audit 27 / Q546–Q547.

**Problem:** `config.dev.*` keys do not exist. There is no chord
unlock, no double-confirm, no banner.

**Impact:** When dev toggles do land, a single click can disable
signature checks or expose state inspectors with no friction.

**Solution:** Author `docs/architecture/developer-mode.md`. Reserve
`config.dev.*` keys; specify chord-unlock UX; require double-confirm.

**Files to Update:**
- [docs/architecture/wiki/screens/56-options/spec.md](../architecture/wiki/screens/56-options/spec.md)
  — note the chord (e.g., 5x click on the version string in the
  options footer) and the `Developer` tab visibility rule.

**New Files:**
- `docs/architecture/developer-mode.md`
- `tasks/phase-2/<developer-mode>/developer-mode-surface.md`

**Implementation Steps:**
1. Define `config.dev.*` keys (session-only, never persisted in
   stable saves):
   - `disableSignatureCheck`
   - `allowUnsignedPacks`
   - `exposeStateInspector`
   - `skipMigrations`
   - `disableHashCheck`
   - `forceDesync` (test-only)
2. Chord-unlock: 5 sequential clicks on the version string within 3
   seconds dispatches `REVEAL_DEVELOPER_TAB`.
3. Each toggle requires `60-confirmation-dialog (severity: critical,
   requireType: 'DEV')` *twice* (re-arm on the second confirm).
4. While any dev key is on, render a persistent top-of-screen
   banner with localization key `developer.banner.active`. The
   banner is undismissible.
5. Reset all dev keys on app reload (session-only).

**Dependencies:** Critical Fix 1.

**Complexity:** **M**

---

### 3.5 Tasks

#### Issue: Task system has no owning task for any item in this plan

**Problem:** Today no task in `tasks/` owns: onboarding screen,
consent schema, Privacy tab in `56-options`, undo policy,
permissions doctrine, autoplay policy, URL routing, developer
mode, age gate, peer trust display, pack manager screen.

**Impact:** `npm run validate:tasks` will fail "every screen has an
owning UI task" once the new screens land. The autonomous
implementer has no `tasks:next` candidate to pick up.

**Solution:** Add owning tasks for each new artifact. Use the
existing phase / family conventions.

**Files to Update:**
- [tasks/task-registry.json](../../tasks/task-registry.json)
  (regenerated, not hand-edited)

**New Files (task markdown — exact paths to be confirmed against
existing phase folders):**
- `tasks/phase-1/<ui-onboarding>/onboarding-consent-screen.md`
- `tasks/phase-1/<ui-onboarding>/age-gate.md`
- `tasks/phase-1/<schema>/consent-schema.md`
- `tasks/phase-1/<schema>/consent-audit-log-schema.md`
- `tasks/phase-1/<persistence>/undo-soft-delete.md`
- `tasks/phase-1/<routing>/url-routing-contract.md`
- `tasks/phase-1/<permissions>/permissions-doctrine.md`
- `tasks/phase-1/<animation>/autoplay-policy.md`
- `tasks/phase-1/<ui-confirmation>/confirmation-dialog-hardening.md`
- `tasks/phase-1/<ui-options>/options-privacy-tab.md`
- `tasks/phase-2/<pack-manager>/pack-manager-screen.md`
- `tasks/phase-2/<developer-mode>/developer-mode-surface.md`
- `tasks/phase-3/01-multiplayer/<peer-trust>/peer-trust-display.md`
- `tasks/phase-3/01-multiplayer/<consent>/multiplayer-consent-gate.md`
- `tasks/phase-3/01-multiplayer/<unsigned-packs>/unsigned-pack-ack.md`

**Implementation Steps:**
1. For each task file, follow the existing template
   (`Owned Paths`, `Owned Paths (shared)`, `Dependencies`,
   `Verify Commands`, `Acceptance Criteria`).
2. `Owned Paths` should be the new files this plan creates; do not
   claim shared paths owned by adjacent plans.
3. `Dependencies` reflect the §5 execution order.
4. `Verify Commands` MUST run `npm run validate:tasks` and a JSON-
   schema check (`npm run test:schema -- consent`) at minimum.
5. After authoring, run `npm run generate:task-registry` and
   `npm run validate:tasks` so the registry stays consistent.

**Dependencies:** all of §3 above.

**Complexity:** **M** (mechanical).

---

## 4. Suggested Task Breakdown

The following list maps directly to the new task files in §3.5. Use
this as the punchlist for `npm run tasks:next` once registered.

- [ ] T-23-A · Harden `60-confirmation-dialog` with
  `confirmDelayMs`, severity-tiered defaults, and optional
  `requireType` (Critical Fix 1).
- [ ] T-23-B · Author `consent.schema.json` and
  `consent-audit-log.schema.json` (Critical Fix 2).
- [ ] T-23-C · Author screen package
  `61b-onboarding-consent` (mockup, spec, interactions,
  data-contracts, architecture) and the corresponding
  diagram `30-onboarding-consent.md` (Critical Fix 2).
- [ ] T-23-D · Add `Privacy` tab to `56-options`
  (Critical Fix 4).
- [ ] T-23-E · Multiplayer consent gate at `Host` / `Join` with
  IP-exposure disclosure (Critical Fix 3).
- [ ] T-23-F · Route `Leave Network Lobby` through
  `60-confirmation-dialog` with severity by phase.
- [ ] T-23-G · Route dirty `options.cancel` through
  `60-confirmation-dialog (info)`.
- [ ] T-23-H · Author `58-pack-manager` screen and route
  `Uninstall` through `critical + requireType`.
- [ ] T-23-I · Soft-delete + undo model for save delete /
  overwrite; `state.ui.lastDestructive` + 5s toast.
- [ ] T-23-J · Add `moderation` block to
  `generated-faction.schema.json` and the "AI content not yet
  reviewed" banner contract.
- [ ] T-23-K · `peer-allowlist.schema.json` +
  `state.profile.knownPeers` + lobby trust badges.
- [ ] T-23-L · Extend lobby `ContentCompatibilityPanel` with
  signed/unsigned trust state and per-peer ack for unsigned packs
  in casual lobbies.
- [ ] T-23-M · Localization namespaces for consent / permission
  rationales / AI banner / pack trust / multiplayer disclosure /
  confirmation hints / developer banner.
- [ ] T-23-N · Save format: `consentSnapshot` and import flow
  routes through onboarding with `method: 'import'`.
- [ ] T-23-O · `manifest.schema.json` `contentRating` field.
- [ ] T-23-P · `config.player.ageGate` + minor-strict feature
  matrix; doc `age-gate.md`.
- [ ] T-23-Q · `permissions.md` + `storage-contract.md`; CI lint
  for raw `navigator.*` calls.
- [ ] T-23-R · `autoplay-policy.md` and gesture-unlock rule.
- [ ] T-23-S · `url-routing.md` with deep-link confirmation map.
- [ ] T-23-T · `new-install-defaults.md` with full safe-default
  table and CI lint.
- [ ] T-23-U · `developer-mode.md` + `config.dev.*` keys +
  chord-unlock + double-confirm + persistent banner.
- [ ] T-23-V · Run `npm run validate` end-to-end; resolve any
  task-registry drift.

---

## 5. Execution Order

Land items in the following order. Each step produces a passing
`npm run validate:tasks` and `npm run validate` before the next
starts.

1. **T-23-A** Harden `60-confirmation-dialog` (Critical Fix 1) —
   no other consent surface is meaningful without click-through
   resistance.
2. **T-23-B** + **T-23-C** Consent + audit-log schemas + onboarding
   screen package (Critical Fix 2). These create the
   `state.profile.consent.*` slice and the new screen.
3. **T-23-M** Localization namespaces — strings used everywhere
   downstream.
4. **T-23-D** Privacy tab in `56-options` (Critical Fix 4) —
   inspect / revoke surface for the consents now captured in step 2.
5. **T-23-E** Multiplayer consent gate (Critical Fix 3).
6. **T-23-F** + **T-23-G** Confirmation routing for unprotected
   destructive actions.
7. **T-23-I** Soft-delete + undo model.
8. **T-23-O** + **T-23-P** `contentRating` and `ageGate` —
   minor-strict defaults.
9. **T-23-Q** Permissions doctrine + storage contract.
10. **T-23-R** Autoplay policy.
11. **T-23-S** URL routing contract.
12. **T-23-T** New-install defaults manifest + CI lint.
13. **T-23-J** AI moderation status + banner.
14. **T-23-H** Pack manager screen.
15. **T-23-L** Unsigned-pack ack in casual lobbies.
16. **T-23-K** Peer trust display.
17. **T-23-N** Consent snapshot in save format.
18. **T-23-U** Developer mode surface.
19. **T-23-V** Final validation pass; regenerate task registry and
    architecture wiki.

Steps 1–4 are the **MVP for "consent + safe destructive UX"** and
together raise AI-readiness from 1.5 to ~5. Steps 5–11 raise it to
~7. Steps 12–19 raise it to the 8 target.

---

## 6. Risks if Not Implemented

| If skipped                 | Consequence                                         |
|----------------------------|-----------------------------------------------------|
| Critical Fix 1             | Reflexive confirms commit destructive actions; user trust loss; review-blocker for any "delete account" feature. |
| Critical Fix 2             | No consent capture means GDPR Art. 7 breach on first multiplayer / AI use; no audit trail for regulators. |
| Critical Fix 3             | First multiplayer host silently exposes IP — privacy incident in audit 24's threat model. |
| Critical Fix 4             | Users cannot revoke consent (GDPR Art. 7(3) breach). |
| Undo / soft-delete         | Save deletion is irreversible; one of the most common UX complaints. |
| Confirmation routing for `Leave network lobby` | Misclick = forfeit; review-blocker for ranked play. |
| AI moderation banner       | Generated content reaches minors with no warning; combined with no age gate, content-safety incident is one bad prompt away. |
| Permissions doctrine       | Wall-of-prompts on launch trains users to deny everything; no fallback. |
| Autoplay policy            | Inconsistent first-load; mute / block on Safari mobile. |
| URL routing contract       | One-click malicious links can join sessions / install packs. |
| Developer mode             | A landed `config.dev.*` toggle without doctrine becomes a backdoor. |
| Age gate                   | COPPA / PEGI / ESRB exposure unbounded; chat / AI / multiplayer all run with no minor-strict default. |
| Peer trust display         | Users can't tell stranger from friend; combined with no chat moderation (audit 19), a vector for harassment with no UI signal. |
| Unsigned-pack ack          | Casual sessions silently load third-party packs (audit 20 escape). |
| New-install defaults manifest | A future contributor ships a feature on-by-default; silent privacy regression. |
| Consent snapshot in save   | Re-prompt every device, or worse, silent inheritance. |
| Localization namespaces    | Hard-coded English strings; project's schema-first rule breached. |
| `contentRating` on manifest | Age gate cannot filter packs even after declaration. |
| Pack manager screen        | Future uninstall lands without any confirmation gate. |

---

## 7. AI Implementation Readiness

**Score after this plan: 8 / 10.**

What this plan produces (artifact inventory):

- **2 new schemas** — `consent.schema.json`,
  `consent-audit-log.schema.json`.
- **3 schema extensions** — `manifest.schema.json (+contentRating)`,
  `generated-faction.schema.json (+moderation)`,
  `localization.schema.json (+7 namespaces)`.
- **2 new screen packages** — `61b-onboarding-consent`,
  `58-pack-manager` (5 files each).
- **1 new screen tab** — `Privacy` in `56-options`.
- **1 new diagram** — `docs/architecture/diagrams/30-onboarding-consent.md`.
- **8 new architecture docs** — `onboarding.md`, `permissions.md`,
  `storage-contract.md`, `autoplay-policy.md`, `url-routing.md`,
  `new-install-defaults.md`, `developer-mode.md`, `peer-trust.md`,
  `age-gate.md`, `undo-policy.md`, `ai-moderation-contract.md`.
- **~14 command-schema entries** — `GRANT_CONSENT`,
  `REVOKE_CONSENT`, `REQUEST_CONSENT_PROMPT`, `RECORD_CONSENT_AUDIT`,
  `LEAVE_NETWORK_LOBBY_CONFIRMED`, `UNINSTALL_PACK_CONFIRMED`,
  `UNDO_LAST_DESTRUCTIVE`, `EXPIRE_LAST_DESTRUCTIVE`,
  `IMPORT_CONSENT_SNAPSHOT`, `ADD_PEER_TO_ALLOWLIST`,
  `REMOVE_PEER_FROM_ALLOWLIST`, `RECORD_PEER_CONTACT`,
  `UNLOCK_MEDIA_AUTOPLAY`, `REVEAL_DEVELOPER_TAB`.
- **20+ task entries** (T-23-A through T-23-V).
- **Multiple CI lint rules** banning raw `navigator.*` calls,
  `<input type="file" webkitdirectory>`, undeclared
  `config.privacy.*` / `config.dev.*` defaults, and unhardened
  `severity: critical` confirmations.

**Why 8 and not 10:** Two residual unknowns remain even after the
plan lands.

1. The **moderation logic itself** (audit 14) is out of scope here —
   this plan only carries the *status field* and the banner. Real
   moderation (provider, prompt-pre-screen, post-screen, human
   review) is a separate plan.
2. **Cryptographic-key management** for pack signatures (audit 24 /
   Plan 20) and **server-side erasure correlation** for telemetry
   (Plan 22) are referenced but not redefined; their downstream
   compliance is owned there.

After T-23-A through T-23-V land:
- A new install **cannot** open a multiplayer connection, call the
  AI gateway, or send telemetry without explicit, audited consent.
- A user **can** revoke any consent from `56-options`.
- A regulator request is answerable via the audit log.
- A misclick on a destructive action is recoverable for 5 seconds.
- Minors are protected by default-deny on the optional surfaces.
- A developer toggle is a session-only, double-confirmed,
  banner-marked operation.
- An autonomous implementer asked to "wire the consent UI" has a
  schema, a screen package, a localization namespace, a command
  vocabulary, an audit-log shape, and a degradation matrix — i.e.
  **enough contracts to execute without inventing gameplay**.
