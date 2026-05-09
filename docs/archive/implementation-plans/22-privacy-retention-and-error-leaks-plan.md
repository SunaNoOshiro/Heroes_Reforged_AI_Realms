# Implementation Plan: 22 — Privacy, Data Retention & Error-Message Information Leaks

> Source audit: [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](../readiness-audit/22-privacy-retention-and-error-leaks.md)
> Audit AI-Readiness score at time of writing: **1.0 / 10** — target after this plan: **8 / 10**.
> The original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic and Risk item from Q410–Q435 into
> concrete work items grounded in existing artifacts:
> [`services/signaling/README.md`](../../../services/signaling/README.md),
> [`services/ai-gateway/README.md`](../../../services/ai-gateway/README.md),
> [`docs/architecture/ai-integration.md`](../../architecture/ai-integration.md),
> [`docs/architecture/ai-generation-pipeline.md`](../../architecture/ai-generation-pipeline.md),
> [`docs/architecture/pack-contract.md`](../../architecture/pack-contract.md),
> [`docs/architecture/diagrams/24-save-flow.md`](../../architecture/diagrams/24-save-flow.md),
> [`docs/architecture/command-schema.md`](../../architecture/command-schema.md),
> [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json),
> [`content-schema/schemas/generated-faction.schema.json`](../../../content-schema/schemas/generated-faction.schema.json),
> [`content-schema/schemas/localization.schema.json`](../../../content-schema/schemas/localization.schema.json),
> the multiplayer scaffolding from Plan 07, Plan 18 (room codes), Plan 19
> (chat safety), Plan 20 (pack trust), Plan 21 (UGC + personal data),
> and the AI-pipeline scaffolding from Plan 14.

---

## 1. Overview

The audit found that **every privacy, retention, compliance, and
error-leak decision point in the repo is undefined**. Of 26 questions,
**22 resolve to ❌ UNKNOWN** and **4 to ⚠ Partial**. There are no fully
✔ Defined items.

Existing primitives the plan can build on:

- The **save format** (see [diagrams/24-save-flow.md](../../architecture/diagrams/24-save-flow.md))
  which already names `metadata.playerName` and `state.players.byId.*.displayName`
  as the only PII-adjacent fields; Plan 21 added a `playerHash` /
  `displayNameMode` option that this plan binds to a redaction step.
- The **`signature` block** on
  [manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  (`scheme`, `keyId`, `value`) — a natural surface for a closed
  signature-error vocabulary.
- The **`notes` provenance block** on
  [generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json)
  (`promptHash`, `providerId`, `modelHint`) — already commits the
  pipeline to hashing prompts; this plan extends the rule to the
  *failure path* logger.
- The **two service stubs** (`services/signaling/`, `services/ai-gateway/`)
  with one-paragraph READMEs — empty containers that this plan fills
  with retention, scrubbing, and error-vocabulary rules.
- The **command-schema** ([`docs/architecture/command-schema.md`](../../architecture/command-schema.md))
  and the new commands declared by Plan 21 (`WIPE_LOCAL_DATA`,
  `TOGGLE_ANALYTICS_OPT_IN`) — this plan extends them with
  erasure-receipt semantics rather than redefining them.
- The **localization schema**
  ([localization.schema.json](../../../content-schema/schemas/localization.schema.json))
  which already has an "error messages" slot — the natural binding
  point for a centralized error-formatter.
- The **desync diagnostic** payload declared in
  [tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md](../../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
  and [05-auto-bisect-on-hash-mismatch.md](../../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
  — the natural insertion point for a redaction taxonomy.

What is missing is **every retention TTL, scrubbing rule, error
vocabulary, formatter contract, build-mode policy, compliance posture,
and erasure pathway** that turns those primitives into a defensible
privacy/leak posture.

This plan formalizes:

1. A **canonical privacy artifact** ([`docs/architecture/privacy.md`](../../architecture/privacy.md))
   versioned, linked from `01-main-menu` footer and `54-system-menu`,
   acting as the in-app privacy policy and the single source of truth
   for retention TTLs.
2. **Two service-side observability/retention docs**:
   [`services/signaling/observability.md`](../../../services/signaling/observability.md)
   and
   [`services/ai-gateway/retention.md`](../../../services/ai-gateway/retention.md)
   declaring per-surface TTL, scrubbing, and "no upload without
   processor list" rules.
3. A **closed signaling error vocabulary** that returns a uniform
   `JOIN_FAILED` from the wire, with reasons surfaced only to room
   owners through a separate channel.
4. A **closed pack-signature error vocabulary** + a constant-time
   compare rule via a new `docs/architecture/crypto-rules.md`.
5. A **centralized error-formatter contract**
   ([`docs/architecture/error-formatter.md`](../../architecture/error-formatter.md))
   plus a `src/errors/format.ts` API and a CI lint banning raw
   `err.message`/`err.stack` in `src/ui/` and `src/services/*`.
6. A **production-build error policy**
   ([`docs/architecture/production-build.md`](../../architecture/production-build.md))
   committing to source-map stripping, `__DEV__` removal, and
   "user-grade-only" toasts in production bundles.
7. A **desync-redaction taxonomy** that tags each command field
   `public` / `hidden` and rebuilds desync reports through a redactor
   before display.
8. A **peer-failure UI contract** in screen `64-network-lobby` that
   bans peer IPs / ICE addresses from any user-visible surface.
9. A **third-party processor list and DPA checklist**
   ([`docs/legal/processors.md`](../../legal/processors.md),
   [`docs/legal/dpa-checklist.md`](../../legal/dpa-checklist.md))
   gating any new vendor.
10. A **compliance posture doc** ([`docs/legal/compliance.md`](../../legal/compliance.md))
    naming GDPR/CCPA/COPPA scope, the age-gate hookup, and the
    erasure pathway.
11. **Schema additions**: closed `signalingErrorCode` and
    `signatureErrorCode` enums; `auditLogEntry` schema for erasure
    receipts; `commandFieldVisibility` field on the command-schema.
12. **One new command** in `command-schema.md`: `REQUEST_ERASURE_RECEIPT`
    (consumed by `54-system-menu`; complements Plan 21's
    `WIPE_LOCAL_DATA`).
13. **Edits to existing screens**: `01-main-menu` (Privacy footer
    link), `54-system-menu` (erasure receipt + processor list
    link), `56-options` (privacy pane disclosure modal),
    `64-network-lobby` (peer-failure error contract).
14. **Edits to the desync tasks** (Plan 07 territory) to consume the
    new redaction taxonomy without duplicating the multiplayer plan.
15. **New tasks** under
    [`tasks/mvp/01-foundations/`](../../../tasks/mvp/01-foundations/)
    (error-formatter, build-mode rule, crypto-rules),
    [`tasks/mvp/02-content-schemas/`](../../../tasks/mvp/02-content-schemas/)
    (error-code enums, audit-log schema, field-visibility tag),
    [`tasks/mvp/07-ui-shell/`](../../../tasks/mvp/07-ui-shell/) (privacy
    pane + erasure receipt UX), and
    [`tasks/phase-3/01-multiplayer/`](../../../tasks/phase-3/01-multiplayer/)
    (desync redactor, peer-failure UI contract, signaling error
    vocabulary).

**Sibling plan boundaries.**

- **Plan 14** ([14-ai-generated-content-pipeline-plan.md](./14-ai-generated-content-pipeline-plan.md))
  owns the AI-generation pipeline, including the `notes.promptHash`
  field. This plan adds the **failure-path logger contract**
  (`services/ai-gateway/retention.md`) that bans raw prompt bodies
  from error logs; it does not redesign the pipeline.
- **Plan 18** ([18-room-codes-and-lobby-discovery-plan.md](./18-room-codes-and-lobby-discovery-plan.md))
  owns room-code keyspace + rate limit. This plan adds the **uniform
  `JOIN_FAILED` signaling error vocabulary** that closes the
  enumeration vector even if a future change weakens the rate limit.
- **Plan 19** ([19-chat-safety-and-user-reporting-plan.md](./19-chat-safety-and-user-reporting-plan.md))
  owns chat sanitization and `REPORT_PEER`. This plan adds the
  **error-formatter** that chat error toasts must route through; it
  does not redesign the chat flow.
- **Plan 20** ([20-save-imports-and-pack-trust-prompts-plan.md](./20-save-imports-and-pack-trust-prompts-plan.md))
  owns the pack-trust prompt and `contentRating` field. This plan
  adds the **save-import error UX rule** (user-grade vs.
  developer-grade error split) that any future save-import flow
  consumes.
- **Plan 21** ([21-user-generated-content-and-personal-data-plan.md](./21-user-generated-content-and-personal-data-plan.md))
  owns `WIPE_LOCAL_DATA`, the data-inventory doc, the privacy pane
  in screen 56, and `playerHash` / `displayNameMode` on the save
  schema. This plan **extends** that scaffolding with retention TTLs
  per inventory row, an erasure-receipt schema, a server-side
  erasure pathway stub, and a save/replay export sanitizer that
  consumes `displayNameMode`.
- **Plan 25** (TURN credentials & signaling-server abuse) — when
  authored, will inherit the constant-time-compare rule, the
  uniform error vocabulary, and the processor-list gate from this
  plan.
- **Plan 27** (save tampering & pack signing) — when authored, will
  inherit the closed `signatureErrorCode` enum and the
  constant-time-compare rule.
- **Plan 30** (build pipeline) — when authored, will own the build
  toolchain. This plan declares the **production-mode error policy**
  Plan 30 must satisfy without redesigning the toolchain.

**In scope:**

- New architecture docs:
  [`docs/architecture/privacy.md`](../../architecture/privacy.md),
  [`docs/architecture/error-formatter.md`](../../architecture/error-formatter.md),
  [`docs/architecture/production-build.md`](../../architecture/production-build.md),
  [`docs/architecture/crypto-rules.md`](../../architecture/crypto-rules.md),
  [`docs/architecture/error-codes.md`](../../architecture/error-codes.md),
  [`docs/architecture/desync-redaction.md`](../../architecture/desync-redaction.md).
- New legal docs:
  [`docs/legal/compliance.md`](../../legal/compliance.md),
  [`docs/legal/processors.md`](../../legal/processors.md),
  [`docs/legal/dpa-checklist.md`](../../legal/dpa-checklist.md),
  [`docs/legal/erasure-process.md`](../../legal/erasure-process.md).
- New service docs:
  [`services/signaling/observability.md`](../../../services/signaling/observability.md),
  [`services/signaling/error-codes.md`](../../../services/signaling/error-codes.md),
  [`services/ai-gateway/retention.md`](../../../services/ai-gateway/retention.md),
  [`services/ai-gateway/error-codes.md`](../../../services/ai-gateway/error-codes.md).
- New schemas:
  [`content-schema/schemas/audit-log-entry.schema.json`](../../../content-schema/schemas/audit-log-entry.schema.json),
  [`content-schema/schemas/signaling-error.schema.json`](../../../content-schema/schemas/signaling-error.schema.json),
  [`content-schema/schemas/signature-error.schema.json`](../../../content-schema/schemas/signature-error.schema.json),
  [`content-schema/schemas/erasure-receipt.schema.json`](../../../content-schema/schemas/erasure-receipt.schema.json).
- Schema edits:
  - [`localization.schema.json`](../../../content-schema/schemas/localization.schema.json)
    — closed `errors.*` namespace registering every user-grade
    error key emitted by `formatUserError`.
  - [`manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)
    — additive `signature.errorVocabulary: "uniform"` doc-only field
    making the uniformity contract explicit at the manifest level.
  - Save metadata (codified in `save.schema.json` from Plan 20) —
    additive `replayShareConsent: { playerHashOnly | playerNameCleartext }`
    field that the save/replay export sanitizer consults.
- Edits to:
  [`docs/architecture/command-schema.md`](../../architecture/command-schema.md)
  (`fieldVisibility`, `REQUEST_ERASURE_RECEIPT`),
  [`docs/architecture/pack-contract.md`](../../architecture/pack-contract.md)
  (signature error rule + crypto-rules cross-ref),
  [`docs/architecture/state-flow.md`](../../architecture/state-flow.md)
  (error-formatter sink + `state.privacy.acceptedPolicyVersion`),
  [`docs/architecture/diagrams/24-save-flow.md`](../../architecture/diagrams/24-save-flow.md)
  (replay-export sanitization step),
  [`docs/architecture/wiki/screens/01-main-menu/`](../../architecture/wiki/screens/01-main-menu/)
  (privacy footer link),
  [`docs/architecture/wiki/screens/54-system-menu/`](../../architecture/wiki/screens/54-system-menu/)
  (erasure receipt entry, processor list link),
  [`docs/architecture/wiki/screens/56-options/`](../../architecture/wiki/screens/56-options/)
  (privacy pane disclosure modal),
  [`docs/architecture/wiki/screens/64-network-lobby/`](../../architecture/wiki/screens/64-network-lobby/)
  (peer-failure error contract),
  [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  (uniform error vocabulary acceptance),
  [`tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`](../../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
  + [`05-auto-bisect-on-hash-mismatch.md`](../../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
  (consume desync redaction taxonomy).

**Explicitly out of scope (deferred or owned elsewhere):**

- **Auth model and credential storage** — owned by Plan 25. This
  plan prescribes the rule (constant-time-compare,
  no `localStorage` for tokens) but does not design auth.
- **`contentRating` taxonomy and age-gate copy** — declared in
  Plan 20. This plan binds the privacy pane to the resulting
  flag and adds COPPA scope language to `docs/legal/compliance.md`,
  but does not redesign the taxonomy.
- **Build toolchain implementation (Vite/esbuild config, source-map
  upload)** — owned by Plan 30. This plan defines the
  production-build *contract*, not the toolchain.
- **Server-side moderation backend for erasure requests** — out of
  MVP scope; this plan defines the **client envelope and local
  audit-log entry**, plus a documented manual fallback in
  `docs/legal/erasure-process.md`.
- **Lint rule implementation in the project's chosen lint tool** —
  this plan declares the rule (`no-raw-error-message-in-ui`) and
  the test fixture; the lint integration lives with the build
  pipeline task.
- **Crash-report SDK selection** — this plan forbids automatic
  upload, defines the on-device redaction step, and writes the
  "user clicks Send after seeing redacted preview" UX; choosing a
  specific SDK (Sentry, Bugsnag, custom) is left to Plan 30.

---

## 2. Critical Fixes (Must Do First)

These four items unblock everything else; without them the rest of the
plan cannot be enforced consistently.

### Issue: Centralized error-formatter and lint contract

**Source:** Q425, Q428, Q434, Q435 (and supports Q424, Q426, Q431, Q432).

**Problem:** No `src/errors/` module, no `formatUserError` API, no
required contract that UI/services route through a sanitizer, no lint
banning raw `err.message` / `err.stack` in user-visible sinks. Every
screen's `interactions.md` says "show localized error text" but does
not name the function that produces that text from a thrown `Error`.

**Impact:** The default React unhandled-error path surfaces stack
traces; ad-hoc `toast(err.message)` leaks file paths, env values, and
schema internals. AI-prompt failures, pack-signature failures, save-
import failures, and peer-connection failures all become information-
disclosure surfaces. Without the formatter, every other fix in this
plan is bypassable.

**Solution:** Author
[`docs/architecture/error-formatter.md`](../../architecture/error-formatter.md)
as the contract: `formatUserError(err, locale): { messageKey: string,
params: Record<string,string>, errorId: string, severity: 'info' |
'warn' | 'fatal' }`. The function returns a localization key resolved
through `localization.schema.json#errors.*`, never raw text. Add a
matching `formatDevError(err): { errorId, redactedMessage, redactedStack
}` for *developer* sinks (browser console in dev builds, on-device
crash log file). Both functions:

1. strip `Error.stack`,
2. drop the `Error.cause` chain in production builds,
3. replace any value matching the redaction allowlist patterns
   (file paths under `node_modules`, absolute filesystem paths,
   IP addresses, base64 payloads ≥32 chars, anything tagged
   `redact:true` on a structured error) with `[redacted]`,
4. attach an `errorId` (UUID v4) so a user-grade toast can say
   "Error abc-123" while the dev sink keeps the full context.

Add a CI lint rule `no-raw-error-message-in-ui` that bans raw
`err.message`, `err.stack`, `String(err)`, `${err}`, and
`JSON.stringify(err)` in `src/ui/` and `src/services/*` outside the
`src/errors/` directory. Provide a test fixture
`tests/lint/no-raw-error-message-in-ui.test.ts`.

**Files to Update:**
- [docs/architecture/state-flow.md](../../architecture/state-flow.md)
  — name the formatter as the only error sink to UI.
- [docs/architecture/wiki/screens/01-main-menu/interactions.md](../../architecture/wiki/screens/01-main-menu/interactions.md)
  (and the other 70+ screens that share the boilerplate "show
  localized error text") — append the rule "errors are produced by
  `formatUserError(err, locale)`; never construct error toast text
  inline."
- [content-schema/schemas/localization.schema.json](../../../content-schema/schemas/localization.schema.json)
  — add closed `errors.*` namespace.

**New Files:**
- [docs/architecture/error-formatter.md](../../architecture/error-formatter.md)
- `src/errors/format.ts` (reserved path; specified by task)
- `src/errors/redact.ts` (reserved path; specified by task)
- `tests/lint/no-raw-error-message-in-ui.test.ts` (reserved path)

**Implementation Steps:**
1. Author `docs/architecture/error-formatter.md` covering: API,
   redaction patterns, `errorId` generation, locale resolution,
   prod/dev branching.
2. Add the closed `errors.*` namespace to
   `localization.schema.json` with at least: `errors.generic`,
   `errors.network.joinFailed`, `errors.signature.invalid`,
   `errors.import.invalid`, `errors.ai.generationFailed`,
   `errors.peer.failed`, `errors.desync.detected`.
3. Update the 70+ screen `interactions.md` boilerplate via a single
   appended paragraph naming `formatUserError`.
4. Reserve `src/errors/` in a new MVP foundation task with
   `verifyCommands` that run the lint test fixture.
5. Cross-link the formatter from `state-flow.md` as the only sink
   that crosses the ui boundary for errors.

**Dependencies:**
- Plan 21's localization schema already exists; this plan only adds
  to its namespace.

**Complexity:** L (touches every screen file via boilerplate edit;
new doc + schema + task + lint fixture).

---

### Issue: Closed signaling error vocabulary (uniform JOIN_FAILED)

**Source:** Q424, Q429 (and amplifies Q426; complements Plan 18).

**Problem:** `tasks/phase-3/01-multiplayer/01-…` lists wire messages
(`CREATE_ROOM`, `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`,
`PEER_CONNECTED`, `PEER_DISCONNECTED`) but defines no error vocabulary.
Distinguishable errors (`ROOM_NOT_FOUND` vs. `ROOM_FULL` vs.
`INVALID_CODE`) make room-code enumeration trivial even when Plan 18's
rate limit holds.

**Impact:** A 6-character / 30-symbol room-code keyspace with
distinguishable errors is enumerable in seconds; combined with the
audit's documented absence of WAF or Cloudflare in front of the
signaling service, an attacker can map the active lobby set and target
rooms by occupancy. The same pattern applies to the AI gateway
(401/403/404 leakage of auth state).

**Solution:** Define a closed `signalingErrorCode` enum (in a new
[`content-schema/schemas/signaling-error.schema.json`](../../../content-schema/schemas/signaling-error.schema.json))
whose **wire-visible** values are exactly:

```
JOIN_FAILED   // any of: wrong code, full, expired, banned, rate-limited
RATE_LIMITED  // distinct only because rate-limit response carries a Retry-After header
SERVER_ERROR  // generic 500
```

The room owner receives a richer reason on a separately authenticated
channel (`OWNER_NOTICE` event) — never the joiner. Author
[`services/signaling/error-codes.md`](../../../services/signaling/error-codes.md)
locking the mapping. Mirror the rule in
[`services/ai-gateway/error-codes.md`](../../../services/ai-gateway/error-codes.md):
404 for both "not found" and "exists but forbidden", 401 only on
missing/malformed token, 429 with `Retry-After`, 500 with no `cause`
in body.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add acceptance criterion: "join failures return uniform
  `JOIN_FAILED`; reasons surfaced only via `OWNER_NOTICE`."
- [services/signaling/README.md](../../../services/signaling/README.md)
  — link to new `error-codes.md` and `observability.md`.
- [services/ai-gateway/README.md](../../../services/ai-gateway/README.md)
  — link to new `retention.md` and `error-codes.md`.
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  — *no* edit required here; signaling errors are not pack data.

**New Files:**
- [content-schema/schemas/signaling-error.schema.json](../../../content-schema/schemas/signaling-error.schema.json)
- [services/signaling/error-codes.md](../../../services/signaling/error-codes.md)
- [services/ai-gateway/error-codes.md](../../../services/ai-gateway/error-codes.md)
- [docs/architecture/error-codes.md](../../architecture/error-codes.md)
  — single index doc cross-referencing both service tables.

**Implementation Steps:**
1. Draft the `signaling-error.schema.json` with the three-value
   wire enum and a richer `OwnerNotice` payload schema (used only
   on the owner's authenticated channel).
2. Author `services/signaling/error-codes.md` locking the mapping
   from internal cause → wire code, with examples and a "never
   carry a `cause` to the wire" rule.
3. Mirror in `services/ai-gateway/error-codes.md`.
4. Add the index doc `docs/architecture/error-codes.md`.
5. Update the multiplayer task acceptance criteria.

**Dependencies:**
- Plan 18 (rate limit) — both rules together close the
  enumeration surface.

**Complexity:** M (new schema, three new docs, one task edit).

---

### Issue: Crypto-rules + constant-time compare

**Source:** Q433 (and supports Q431; locks rule for Plan 25 + Plan 27).

**Problem:** No `crypto-rules.md` exists. No guidance to use
`crypto.timingSafeEqual` or constant-time-compare for pack
signatures, TURN credentials, save-file MACs, or future auth tokens.
With no auth surface yet the *risk* is latent; the *rule* must be
written before the first credential check ships.

**Impact:** A timing oracle on signature/MAC/token compare leaks
ground truth bit-by-bit; a malicious pack can enumerate the
keychain or distinguish "wrong key" from "no such key." Once
shipped, retrofitting constant-time-compare is invasive.

**Solution:** Author
[`docs/architecture/crypto-rules.md`](../../architecture/crypto-rules.md)
with three mandatory rules:

1. **Compare** — every secret comparison uses
   `crypto.timingSafeEqual` (Node) or
   `crypto.subtle.timingSafeEqual` polyfill (browser); raw `===`
   on secrets is a CI lint failure.
2. **Throw** — secret-compare failures throw a uniform error tagged
   `redact: true` and *never* carry the attempted value or
   `keyId` in the message.
3. **Log** — secret-compare failures are logged at
   `severity: 'warn'` with `errorId` only; `formatDevError` strips
   the secret from `cause` chain.

Add a CI lint rule `no-raw-eq-on-secret` keyed off `redact: true`
type tags.

**Files to Update:**
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
  — § Signature checks: cross-link `crypto-rules.md` and add
  "`signatureErrorCode` is uniform."

**New Files:**
- [docs/architecture/crypto-rules.md](../../architecture/crypto-rules.md)
- [content-schema/schemas/signature-error.schema.json](../../../content-schema/schemas/signature-error.schema.json)
  — closed enum: `INVALID_SIGNATURE` only (and `SIGNATURE_DISABLED`
  as an explicit "feature off" state for clarity).

**Implementation Steps:**
1. Author `crypto-rules.md` with the three rules + examples.
2. Define `signature-error.schema.json` with the two-value enum.
3. Update `pack-contract.md` § signature.
4. Reserve a Phase-2 task slot for the lint rule
   `no-raw-eq-on-secret`.

**Dependencies:**
- Error-formatter (must be authored first so `redact: true` tags
  are honored).

**Complexity:** S (one architecture doc + one schema + one
pack-contract edit).

---

### Issue: Production-build error policy

**Source:** Q425, Q432, Q435.

**Problem:** No build-mode rule documented. No `__DEV__` flag, no
source-map stripping, no "errors are user-grade in prod, developer-
grade in dev" contract. The first contributor wiring the build
pipeline can default `process.env.NODE_ENV !== 'production'` and
silently ship dev errors.

**Impact:** Stack traces, file paths, and source-map references
reach end users in prod toasts and console; this is exactly the
pattern audit Q425 is guarding against.

**Solution:** Author
[`docs/architecture/production-build.md`](../../architecture/production-build.md)
naming five rules the build-pipeline (Plan 30) must satisfy:

1. `process.env.NODE_ENV === 'production'` is set; `__DEV__` is
   `false`.
2. Source maps are *not* shipped in the public bundle. They may be
   uploaded to a private store (e.g., for crash mapping) but the
   bundle's `//# sourceMappingURL=` comment is stripped.
3. `formatUserError` is the only error sink in production; the
   formatter's prod branch drops `Error.cause` chains.
4. Console error sinks in `src/ui/` route through `formatDevError`
   even in prod (so a dev with the console open does not see PII)
   — the only way to get raw stacks is the on-device crash log
   file, which never auto-uploads.
5. A bundle-size CI check fails if a known dev-only constant
   (e.g., `__SOURCE_PATHS__`) appears in the artifact.

**Files to Update:**
- [docs/architecture/state-flow.md](../../architecture/state-flow.md)
  — link to production-build.md.

**New Files:**
- [docs/architecture/production-build.md](../../architecture/production-build.md)

**Implementation Steps:**
1. Author the doc.
2. Cross-link from `state-flow.md`, `error-formatter.md`,
   `crypto-rules.md`.
3. Reserve the bundle-size CI check as a Plan 30 task acceptance
   criterion.

**Dependencies:**
- Error-formatter doc (rule 3 references it).

**Complexity:** S (one architecture doc).

---

## 3. System Improvements

### UI / Screens

#### Issue: Privacy footer link on main menu

**Source:** Q410.

**Problem:** No privacy artifact and no in-app link. No screen
package declares a "Privacy" footer item or modal.

**Impact:** Users cannot read what data the app handles before they
play; compliance posture has no visible artifact.

**Solution:** Add a footer-row "Privacy" link to
[`01-main-menu`](../../architecture/wiki/screens/01-main-menu/) that
opens an in-app modal rendering
[`docs/architecture/privacy.md`](../../architecture/privacy.md). Same
link reused on
[`54-system-menu`](../../architecture/wiki/screens/54-system-menu/)
and the about screen if/when added.

**Files to Update:**
- [docs/architecture/wiki/screens/01-main-menu/spec.md](../../architecture/wiki/screens/01-main-menu/spec.md)
- [docs/architecture/wiki/screens/01-main-menu/mockup.html](../../architecture/wiki/screens/01-main-menu/mockup.html)
- [docs/architecture/wiki/screens/01-main-menu/interactions.md](../../architecture/wiki/screens/01-main-menu/interactions.md)
- [docs/architecture/wiki/screens/01-main-menu/data-contracts.md](../../architecture/wiki/screens/01-main-menu/data-contracts.md)
  — bind `OPEN_PRIVACY_POLICY` command.
- [docs/architecture/wiki/screens/54-system-menu/](../../architecture/wiki/screens/54-system-menu/)
  (all five files) — add same entry under "Account & Data."

**New Files:**
- None (the privacy modal reuses the existing localization sink and
  modal frame from screen 56).

**Implementation Steps:**
1. Add `OPEN_PRIVACY_POLICY` to `command-schema.md`.
2. Update screen 01 mockup with a footer row containing
   "Privacy · Credits · Version" and bind the privacy link.
3. Mirror the entry in screen 54.
4. Add a localization key
   `screens.mainMenu.footer.privacy` in the
   `screens.*` localization namespace.

**Dependencies:**
- `docs/architecture/privacy.md` (Issue: Privacy artifact below).

**Complexity:** S.

---

#### Issue: Erasure-receipt UX on system menu

**Source:** Q415, Q416 (extends Plan 21's `WIPE_LOCAL_DATA`).

**Problem:** Plan 21 ships `WIPE_LOCAL_DATA` but does not specify
the *receipt* the user gets after erasure (timestamp, scope, hash
of cleared data) nor whether/how a server-side erasure request
travels.

**Impact:** A "delete my data" flow that produces no auditable
record fails the "verifiable" half of GDPR Art. 17 / CCPA §1798.105;
support cannot answer "did it actually happen?"

**Solution:** Add a `REQUEST_ERASURE_RECEIPT` command that:
1. Writes an entry to a local
   [`audit-log-entry.schema.json`](../../../content-schema/schemas/audit-log-entry.schema.json)
   journal with `{ type: 'ERASURE', erasureRequestId: uuid,
   scope: ['saves', 'profile', 'options', 'chat',
   'pendingGenerationCache'], performedAt: ISO8601, contentHash:
   sha256 }`.
2. Renders a receipt modal in
   [`54-system-menu`](../../architecture/wiki/screens/54-system-menu/)
   showing the receipt JSON and a "Copy to clipboard" button.
3. If the user is in an active multiplayer session, the receipt
   also carries `signalingSessionId` and the user is offered a
   second affordance "Request server-side erasure" that envelopes
   the receipt and queues it on the local outbound `erasure-queue`
   (delivered when the moderation backend lands; see
   [`docs/legal/erasure-process.md`](../../legal/erasure-process.md)
   for the manual fallback).

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md)
  — add `REQUEST_ERASURE_RECEIPT`.
- [docs/architecture/wiki/screens/54-system-menu/data-contracts.md](../../architecture/wiki/screens/54-system-menu/data-contracts.md),
  [interactions.md](../../architecture/wiki/screens/54-system-menu/interactions.md),
  [spec.md](../../architecture/wiki/screens/54-system-menu/spec.md)
  — bind the new command and modal.

**New Files:**
- [content-schema/schemas/audit-log-entry.schema.json](../../../content-schema/schemas/audit-log-entry.schema.json)
- [content-schema/schemas/erasure-receipt.schema.json](../../../content-schema/schemas/erasure-receipt.schema.json)
- [docs/legal/erasure-process.md](../../legal/erasure-process.md)
  — manual fallback (email contact, response SLA, scope statement)
  for the period before a server-side erasure intake exists.

**Implementation Steps:**
1. Author the two schemas with strict `additionalProperties: false`.
2. Add the command to `command-schema.md` under "Profile & Data."
3. Update screen 54.
4. Author `docs/legal/erasure-process.md`.

**Dependencies:**
- Plan 21's `WIPE_LOCAL_DATA` (this issue extends it).

**Complexity:** M.

---

#### Issue: Privacy disclosure modal in options pane

**Source:** Q422, Q423 (extends Plan 21's privacy pane).

**Problem:** Plan 21 declared `config.privacy.allowAnalytics` and a
matching state slice, but did not specify the **first-run "What we
collect" disclosure modal** nor the contract that no analytics SDK
loads until the toggle is on.

**Impact:** Without the modal + load-gate, a future contributor can
silently wire telemetry that loads on first paint — violating the
conservative off-by-default posture.

**Solution:** Add a `PrivacyDisclosure` modal to screen
[`56-options`](../../architecture/wiki/screens/56-options/) that opens
on first run if `state.privacy.disclosureSeenVersion !==
state.privacy.currentDisclosureVersion`. The modal lists every row
of [`docs/architecture/data-inventory.md`](../../architecture/data-inventory.md)
(authored by Plan 21) with retention TTL and "what could be
shared." Default `allowAnalytics: false`. The runtime contract
declared in `production-build.md` rule 3 forbids any analytics
SDK from being loaded before `state.privacy.allowAnalytics ===
true`.

**Files to Update:**
- [docs/architecture/wiki/screens/56-options/spec.md](../../architecture/wiki/screens/56-options/spec.md)
- [docs/architecture/wiki/screens/56-options/interactions.md](../../architecture/wiki/screens/56-options/interactions.md)
- [docs/architecture/wiki/screens/56-options/data-contracts.md](../../architecture/wiki/screens/56-options/data-contracts.md)
  — add `state.privacy.disclosureSeenVersion`.
- [docs/architecture/state-flow.md](../../architecture/state-flow.md)
  — declare the `state.privacy.*` slice.

**Implementation Steps:**
1. Add `state.privacy.disclosureSeenVersion: integer` and
   `state.privacy.currentDisclosureVersion: integer` (compile-
   time constant) to the privacy slice.
2. Update screen 56 with the modal and the localized strings
   (`screens.options.privacy.disclosure.*`).
3. Document the load-gate rule in `production-build.md`.

**Dependencies:**
- Plan 21 (privacy pane).
- `data-inventory.md` (must list rows the modal renders).

**Complexity:** S.

---

#### Issue: Peer-failure UI contract on network lobby

**Source:** Q426.

**Problem:** Screen `64-network-lobby` defines no error-payload
schema for a failed peer connection; nothing prevents a future
contributor from rendering "Could not reach 203.0.113.5:51234"
verbatim.

**Impact:** WebRTC ICE candidates inherently carry IP:port tuples;
surfacing them in user-facing error toasts or local crash logs
exposes both peers' network locations.

**Solution:** Add a peer-failure error contract section to
[`docs/architecture/wiki/screens/64-network-lobby/`](../../architecture/wiki/screens/64-network-lobby/).
The contract:

1. The only fields rendered to UI on a peer-failure are
   `peerLabel` (the display-name string the user already saw)
   and a generic reason code from the closed enum
   `peerFailureReason: 'TIMEOUT' | 'REFUSED' | 'NETWORK_ERROR'
   | 'PROTOCOL_MISMATCH'`.
2. Peer IPs / ICE addresses *never* appear in any user-visible
   string and *never* appear in the on-device crash log file
   (the redactor strips them via the IP-pattern allowlist
   declared in `error-formatter.md`).
3. A dev-only debug screen (gated by `__DEV__`) may render the
   raw ICE candidate list — but only when the build flag is on.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md)
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  — add acceptance criterion: "peer connection failures throw
  a structured error tagged `redact: true` carrying only
  `{ peerLabel, peerFailureReason }`."

**Implementation Steps:**
1. Add the closed `peerFailureReason` enum to the network-lobby
   data-contracts.
2. Append the contract to the screen's `interactions.md`.
3. Update task 02 acceptance.
4. Add the IP-pattern allowlist case to `error-formatter.md`'s
   redactor list.

**Dependencies:**
- Error-formatter (carries the redactor).

**Complexity:** S.

---

### Data Contracts

#### Issue: Save / replay export sanitization

**Source:** Q421 (extends Plan 21's `playerHash` / `displayNameMode`).

**Problem:** Plan 21 added `playerHash` and `displayNameMode` to
the save metadata, but did not specify the **sanitizer that runs at
export time** when a save crosses a peer/account boundary, nor the
confirmation modal listing every PII field that travels.

**Impact:** If a replay-export flow ships without the sanitizer, both
peers' display names travel with the file; with no sanitizer,
`displayNameMode: 'hash'` is moot at the export boundary because the
exporter could still bypass it.

**Solution:** Update
[`docs/architecture/diagrams/24-save-flow.md`](../../architecture/diagrams/24-save-flow.md)
to insert a **export-sanitize** step after the existing serialize
step. The sanitizer:

1. Reads `state.privacy.replayShareConsent` (default
   `playerHashOnly`).
2. Replaces `metadata.playerName` and every
   `state.players.byId.*.displayName` with the corresponding
   `playerHash` if `playerHashOnly`.
3. Surfaces a confirmation modal listing every PII field that
   *will* travel and a per-field "include / redact" toggle. The
   user must explicitly choose `playerNameCleartext` to ship raw
   names.
4. Writes a `audit-log-entry.schema.json` row tagged
   `type: 'REPLAY_EXPORT'` with the chosen mode and a digest of
   the exported file.

The save-import side (Plan 20) does **not** un-redact; once a
hash leaves, it stays a hash.

**Files to Update:**
- [docs/architecture/diagrams/24-save-flow.md](../../architecture/diagrams/24-save-flow.md)
- Save schema (declared by Plan 20) — additive
  `replayShareConsent: { mode: 'playerHashOnly' |
  'playerNameCleartext', exportedAt: ISO8601 }`.

**Implementation Steps:**
1. Author the sanitizer step in the save-flow diagram.
2. Add the additive schema field.
3. Reference the audit-log entry type in
   `audit-log-entry.schema.json`.

**Dependencies:**
- Plan 21 (`playerHash`, `displayNameMode`).
- Plan 20 (save schema location).

**Complexity:** M.

---

#### Issue: Command-schema field-visibility tag

**Source:** Q427.

**Problem:** No "hidden-state taxonomy" exists; the desync-report
builder has no way to know which command parameters are
public-by-design vs. hidden-information.

**Impact:** The last-10-commands desync report can carry hero
loadouts, spell choices, fog-of-war movement intentions; combined
with auto-bisect (task 05) the same hidden-information-bearing
commands are re-materialized on every bisect round. A desync
becomes a one-shot intel leak in competitive play.

**Solution:** Extend
[`docs/architecture/command-schema.md`](../../architecture/command-schema.md)
with a per-field `visibility: 'public' | 'hidden'` tag (default
`public` for backwards compatibility). Author
[`docs/architecture/desync-redaction.md`](../../architecture/desync-redaction.md)
declaring:

1. The desync report builder copies `public` fields verbatim.
2. `hidden` fields are replaced with `sha256(canonical(field))`
   truncated to 12 hex chars + length-class
   (`<8` / `<32` / `<128` / `>=128`).
3. Replay export uses the same redactor when
   `displayNameMode: 'hash'` is set on a command-bearing replay.

Update the desync tasks to consume the redactor.

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md)
- [tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md](../../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
- [tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md](../../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)

**New Files:**
- [docs/architecture/desync-redaction.md](../../architecture/desync-redaction.md)

**Implementation Steps:**
1. Author the redaction doc.
2. Edit `command-schema.md` to add the tag and a worked example
   for `BATTLE_ATTACK` (`targetHeroId: public`,
   `attackerSpellChoice: hidden`).
3. Update task 04 acceptance: "desync report passes through the
   redactor before any UI / log sink."
4. Update task 05 acceptance: "each bisect round re-runs the
   redactor; intermediate `expected: bigint` hashes are public
   but the underlying commands are not."

**Dependencies:**
- Error-formatter (the redactor reuses the redaction contract).

**Complexity:** L (touches the command-schema and two multiplayer
tasks; requires worked examples for ≥6 command kinds).

---

#### Issue: Save-import error UX (user-grade vs. developer-grade)

**Source:** Q428.

**Problem:** When Plan 20's save-import flow lands, it has no
contract that distinguishes user-grade fix advice ("This save was
made with an older version; upgrade and try again.") from
developer-grade schema dumps (`/state/players/byId/p1/heroes/2/spells:
required field 'manaCost' missing`).

**Impact:** A future import-error UI that echoes JSON-Pointer paths
and constraint names hands a forger a recipe; conversely, a too-
generic "import failed" message blocks legitimate users.

**Solution:** Add a section to
[`docs/architecture/error-formatter.md`](../../architecture/error-formatter.md)
declaring the rule for *every* schema-validation surface:

1. `formatUserError(validationErrors)` returns one of a closed
   set of localization keys: `errors.import.versionMismatch`,
   `errors.import.corrupted`, `errors.import.unsupportedPack`,
   `errors.import.tooOld`, `errors.import.unknown`. The mapping
   is in `src/errors/import-classifier.ts` (reserved path).
2. `formatDevError(validationErrors)` returns the full Ajv
   error path — only ever shown in the dev console.

**Files to Update:**
- [docs/architecture/error-formatter.md](../../architecture/error-formatter.md)
  — add § Schema-validation errors.
- Plan 20's save-import task (when it lands) — acceptance
  criterion to consume this contract.

**Implementation Steps:**
1. Add the section to `error-formatter.md`.
2. Add the closed key set under
   `localization.schema.json#errors.import.*`.
3. Cross-link from Plan 20's task list.

**Dependencies:**
- Error-formatter.
- Plan 20 (save-import flow).

**Complexity:** S.

---

### Schemas

#### Issue: Closed signaling-error / signature-error / audit-log / erasure-receipt schemas

**Source:** Q424, Q427, Q431, Q415, Q416.

**Problem:** Four schemas this plan needs do not exist.

**Impact:** Each missing schema is an unenforced contract: validators
cannot reject ill-formed errors, audit logs, or erasure receipts;
contributors invent shapes; field drift is silent.

**Solution:** Add four schemas, each with `additionalProperties:
false` and a closed enum where applicable.

1. [`signaling-error.schema.json`](../../../content-schema/schemas/signaling-error.schema.json)
   — closed wire enum `JOIN_FAILED | RATE_LIMITED | SERVER_ERROR`,
   plus internal `OwnerNotice` payload (richer reasons, only on
   authenticated owner channel).
2. [`signature-error.schema.json`](../../../content-schema/schemas/signature-error.schema.json)
   — closed enum `INVALID_SIGNATURE | SIGNATURE_DISABLED`.
3. [`audit-log-entry.schema.json`](../../../content-schema/schemas/audit-log-entry.schema.json)
   — `{ type: 'ERASURE' | 'REPLAY_EXPORT' | 'POLICY_ACCEPTED'
   | 'OPT_IN_TOGGLED', timestamp, errorId?, scope?,
   contentHash?, mode? }`.
4. [`erasure-receipt.schema.json`](../../../content-schema/schemas/erasure-receipt.schema.json)
   — `{ erasureRequestId, scope[], performedAt, contentHash,
   policyVersion, signalingSessionId? }`.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md)
  — list four new schemas.
- [content-schema/README.md](../../../content-schema/README.md)
  — add four new schema rows.

**New Files:**
- The four schemas above (canonical examples co-located in
  `content-schema/examples/`).

**Implementation Steps:**
1. Draft each schema with `$schema`, `$id`, `title`, `description`,
   strict `additionalProperties: false`.
2. Add canonical example fixture per schema under
   `content-schema/examples/`.
3. Wire into `scripts/check-repo-contracts.mjs` if present.
4. Update `schema-matrix.md` and the `content-schema/README.md`
   index.

**Dependencies:**
- None (these are pure schema additions).

**Complexity:** M.

---

#### Issue: Localization `errors.*` namespace

**Source:** Q425, Q428, Q435.

**Problem:** `localization.schema.json` already has an "error
messages" slot but no closed enumeration of which keys must be
present. Without one, a contributor can ship a code path whose
error key is unlocalized → fallback prints raw cause.

**Impact:** Unlocalized error keys fall back to dev text or `[object
Object]` which leaks internals.

**Solution:** Add a closed `errors.*` namespace with the minimum
key set:

```
errors.generic
errors.network.joinFailed
errors.network.rateLimited
errors.network.serverError
errors.peer.failed
errors.signature.invalid
errors.signature.disabled
errors.import.versionMismatch
errors.import.corrupted
errors.import.unsupportedPack
errors.import.tooOld
errors.import.unknown
errors.ai.generationFailed
errors.ai.providerUnavailable
errors.desync.detected
errors.policy.notAccepted
```

A CI lint asserts that **every** `formatUserError` return key has
a matching localization key in *every* shipped locale (or
explicitly in the fallback locale only, with a doc-only marker
`@fallbackOnly`).

**Files to Update:**
- [content-schema/schemas/localization.schema.json](../../../content-schema/schemas/localization.schema.json)

**Implementation Steps:**
1. Add the closed key set under a new
   `properties.errors.properties.*` block with `required` list.
2. Update canonical localization fixture under
   `content-schema/examples/` to populate every key.
3. Add CI lint integration.

**Dependencies:**
- Error-formatter (defines the keys).

**Complexity:** S.

---

### Architecture

#### Issue: Privacy artifact (single source of truth)

**Source:** Q410, Q411, Q412, Q413, Q414, Q417, Q418, Q420, Q422,
Q423, Q430.

**Problem:** No `PRIVACY.md`, no `docs/legal/`, no `privacy.html`,
and no in-app surface. Every retention/scrubbing/compliance question
above is unanswered because the canonical artifact does not exist.

**Impact:** No single document a reviewer, auditor, or legal team
can read end-to-end; every question is answered by hunting through
service stubs.

**Solution:** Author
[`docs/architecture/privacy.md`](../../architecture/privacy.md)
versioned (top-of-file `policyVersion: 1`) with sections:

1. **Data inventory** — link to Plan 21's
   `docs/architecture/data-inventory.md`. Per row: medium,
   retention TTL, sensitivity tier, "Forget me" coverage,
   shareability.
2. **Retention TTL matrix** — per surface (signaling logs, AI
   gateway prompts, AI gateway responses, crash log on-device,
   audit log on-device, save metadata).
3. **Scrubbing rules** — IP/ICE redaction, prompt-body redaction,
   `cause` chain stripping in production.
4. **Third parties** — link to `docs/legal/processors.md`.
5. **Compliance posture** — link to `docs/legal/compliance.md`.
6. **Erasure pathway** — link to
   `docs/legal/erasure-process.md`.
7. **Telemetry posture** — off-by-default, opt-in via
   `config.privacy.allowAnalytics`, no SDK loads before consent.
8. **Versioning** — top-of-file version + matching
   `state.privacy.acceptedPolicyVersion` field; `state.privacy.
   currentDisclosureVersion` increments when section text
   changes materially.

**Files to Update:**
- [docs/architecture/state-flow.md](../../architecture/state-flow.md)
  — declare `state.privacy.acceptedPolicyVersion`.

**New Files:**
- [docs/architecture/privacy.md](../../architecture/privacy.md)
- [docs/legal/compliance.md](../../legal/compliance.md)
- [docs/legal/processors.md](../../legal/processors.md)
- [docs/legal/dpa-checklist.md](../../legal/dpa-checklist.md)
- [docs/legal/erasure-process.md](../../legal/erasure-process.md)
  (also referenced by Issue: Erasure-receipt UX above).

**Implementation Steps:**
1. Author `privacy.md` with placeholders for the four legal docs.
2. Author each legal doc with the minimum content listed below.
3. Add `state.privacy.acceptedPolicyVersion` and the
   matching gating to first-run flow (consume Plan 21 privacy
   pane + this plan's disclosure modal).
4. Add the privacy footer link binding (Issue: Privacy footer
   link).

**Dependencies:**
- Plan 21 (data-inventory.md must exist).

**Complexity:** L (one anchor doc + four legal docs + state-flow
edit + footer link).

---

#### Issue: Service-side observability + retention docs

**Source:** Q411, Q412, Q413, Q414, Q430, Q434.

**Problem:** Both service stubs are README-only paragraphs. No
`logging.md`, no `retention.md`, no `observability.md`. A standard
`ws` / Express deploy will log client IPs and SDP/ICE payloads by
default unless explicitly disabled.

**Impact:** "We don't store anything" is an unenforced assertion;
a future deploy on Fly.io / Railway inherits the platform's default
log retention (30+ days) and silently retains identifying data.

**Solution:** Author two docs:

1. [`services/signaling/observability.md`](../../../services/signaling/observability.md)
   — declares: in-memory state cleared on room empty (already
   stated); structured logs scrub `req.ip` and
   `X-Forwarded-For`; access logs disabled or short-TTL
   (≤24h on the platform side); no SDP / ICE payload bodies in
   logs (only counts and event types); no upload to a third-party
   APM unless listed in
   [`docs/legal/processors.md`](../../legal/processors.md).
2. [`services/ai-gateway/retention.md`](../../../services/ai-gateway/retention.md)
   — declares: prompts logged only as `promptHash` (already
   stated as the *intent* in Plan 14; this enforces it on the
   gateway boundary); raw responses retained ≤24h for debugging
   then purged; failure-path logger uses the formatter's
   redactor to strip the prompt body before any sink; no
   per-user identifiers persisted because no auth surface
   exists.

Both docs cross-link to `docs/architecture/privacy.md`.

**Files to Update:**
- [services/signaling/README.md](../../../services/signaling/README.md)
  — link new docs.
- [services/ai-gateway/README.md](../../../services/ai-gateway/README.md)
  — link new docs.
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add acceptance criterion: "deploy step disables platform
  access-log persistence beyond 24h."

**New Files:**
- [services/signaling/observability.md](../../../services/signaling/observability.md)
- [services/ai-gateway/retention.md](../../../services/ai-gateway/retention.md)

**Implementation Steps:**
1. Author each doc with explicit "do not log" / "log as hash" /
   "TTL" rows.
2. Add the platform-config acceptance to task 01.
3. Cross-link from `privacy.md`.

**Dependencies:**
- `docs/architecture/privacy.md`.

**Complexity:** M.

---

### Tasks

#### Issue: New tasks under MVP foundations

**Source:** every issue above that requires an implementer.

**Problem:** None of these contracts have an owning task today;
without tasks they cannot be picked by `npm run tasks:next`.

**Impact:** Plan 22 stays paper without scheduling.

**Solution:** Add four tasks under
[`tasks/mvp/01-foundations/`](../../../tasks/mvp/01-foundations/), one
under [`tasks/mvp/02-content-schemas/`](../../../tasks/mvp/02-content-schemas/),
two under [`tasks/mvp/07-ui-shell/`](../../../tasks/mvp/07-ui-shell/),
and three under
[`tasks/phase-3/01-multiplayer/`](../../../tasks/phase-3/01-multiplayer/).
See § 4 for the full breakdown.

**Files to Update:**
- [tasks/task-registry.json](../../../tasks/task-registry.json) —
  regenerated by `npm run generate:task-registry`.
- [docs/planning/implementation-log.md](../../planning/implementation-log.md)
  — append plan-22 row.

**Dependencies:**
- All architecture docs above.

**Complexity:** L.

---

## 4. Suggested Task Breakdown

The tasks below are sized so each is a single PR-sized unit and each
can be verified by a `verifyCommands` block.

### MVP — Foundations

- [ ] **22-01** Author `docs/architecture/error-formatter.md` and the
      closed `errors.*` namespace on `localization.schema.json`. Add
      `src/errors/format.ts` and `src/errors/redact.ts` as reserved
      paths (declared, not yet implemented; the lint rule blocks
      shipping a UI without them).
      `Owned Paths`: `docs/architecture/error-formatter.md`,
      `content-schema/schemas/localization.schema.json` (additive),
      `tests/lint/no-raw-error-message-in-ui.test.ts`.
- [ ] **22-02** Author
      `docs/architecture/production-build.md`. Cross-link from
      `state-flow.md`, `error-formatter.md`. Reserve the
      bundle-size CI check as a Plan 30 acceptance criterion.
      `Owned Paths`: `docs/architecture/production-build.md`.
- [ ] **22-03** Author `docs/architecture/crypto-rules.md` and add
      `signature-error.schema.json`. Update `pack-contract.md` §
      Signature checks to cross-link.
      `Owned Paths`: `docs/architecture/crypto-rules.md`,
      `content-schema/schemas/signature-error.schema.json`,
      `docs/architecture/pack-contract.md` (shared edit; primary
      ownership stays with the contract task, this task adds the
      cross-link line).
- [ ] **22-04** Author `docs/architecture/privacy.md`,
      `docs/legal/compliance.md`, `docs/legal/processors.md`,
      `docs/legal/dpa-checklist.md`,
      `docs/legal/erasure-process.md`. Add
      `state.privacy.acceptedPolicyVersion` to `state-flow.md`.
      `Owned Paths`: those five docs.

### MVP — Content schemas

- [ ] **22-05** Add the four schemas
      (`audit-log-entry.schema.json`,
      `erasure-receipt.schema.json`,
      `signaling-error.schema.json`,
      `signature-error.schema.json` if not done in 22-03), canonical
      examples, and updates to `schema-matrix.md` /
      `content-schema/README.md`.
      `Owned Paths`: those schemas + their canonical examples.
- [ ] **22-06** Add `fieldVisibility: 'public' | 'hidden'` tag to
      `command-schema.md` with worked examples for `BATTLE_ATTACK`,
      `MOVE_HERO`, `CAST_SPELL`, `TRANSFER_ARTIFACT`, `RECRUIT_UNIT`,
      `SET_GUARD`. Author
      `docs/architecture/desync-redaction.md`.
      `Owned Paths`: `docs/architecture/command-schema.md` (shared
      edit), `docs/architecture/desync-redaction.md`.

### MVP — UI shell

- [ ] **22-07** Add the privacy footer link binding to
      `01-main-menu`. Add the privacy disclosure modal to
      `56-options` (extends Plan 21's privacy pane). Add the
      `OPEN_PRIVACY_POLICY` command to `command-schema.md`.
      `Owned Paths`: `docs/architecture/wiki/screens/01-main-menu/`
      (additive), `docs/architecture/wiki/screens/56-options/`
      (shared with Plan 21; this task adds disclosure modal only).
- [ ] **22-08** Add `REQUEST_ERASURE_RECEIPT` command and the
      receipt modal in `54-system-menu`. Bind
      `audit-log-entry.schema.json` and
      `erasure-receipt.schema.json` to the screen's
      `data-contracts.md`.
      `Owned Paths`: `docs/architecture/wiki/screens/54-system-menu/`
      (shared with Plan 21; this task adds receipt modal only),
      `docs/architecture/command-schema.md` (shared).

### Phase 3 — Multiplayer

- [ ] **22-09** Author
      `services/signaling/observability.md` and
      `services/signaling/error-codes.md`. Add the closed
      `signalingErrorCode` enum acceptance criterion to task 01
      (shared edit). Author
      `docs/architecture/error-codes.md` index doc.
      `Owned Paths`: `services/signaling/observability.md`,
      `services/signaling/error-codes.md`,
      `docs/architecture/error-codes.md`.
- [ ] **22-10** Add the peer-failure UI contract to screen
      `64-network-lobby` and to task 02 acceptance.
      `Owned Paths`: `docs/architecture/wiki/screens/64-network-lobby/`
      (shared with Plan 07; this task adds error contract only).
- [ ] **22-11** Update tasks 04 + 05 (desync detection + auto-bisect)
      with the redaction acceptance: every report and every
      bisect round routes through the redactor declared in
      `desync-redaction.md`.
      `Owned Paths`: `tasks/phase-3/01-multiplayer/04-…` and
      `…/05-…` (shared edits with Plan 07; this task adds the
      redaction acceptance criterion only).

### AI gateway

- [ ] **22-12** Author `services/ai-gateway/retention.md` and
      `services/ai-gateway/error-codes.md`. Cross-link from
      `ai-integration.md` and `ai-generation-pipeline.md`.
      `Owned Paths`: `services/ai-gateway/retention.md`,
      `services/ai-gateway/error-codes.md`.

---

## 5. Execution Order

Strict dependencies first; each step unblocks the next.

1. **22-04** — Privacy artifact + legal docs (gate every later
   ID/visibility decision).
2. **22-01** — Error-formatter contract + `errors.*` namespace
   (every other UI error rule cites this).
3. **22-02** — Production-build policy (rules referenced by
   22-01's prod branch).
4. **22-03** — Crypto rules + signature error vocabulary
   (referenced by 22-09 and Plan 27).
5. **22-05** — Schema additions (parallel-safe with 22-06; both
   land before any UI work).
6. **22-06** — Field-visibility tag + desync redaction doc
   (parallel-safe with 22-05).
7. **22-07** — Privacy footer + disclosure modal (depends on
   22-04 and 22-01).
8. **22-08** — Erasure receipt UX (depends on 22-04 and 22-05).
9. **22-09** — Signaling observability + error codes + index doc
   (depends on 22-01, 22-04).
10. **22-12** — AI gateway retention + error codes (depends on
    22-01, 22-04).
11. **22-10** — Peer-failure UI contract (depends on 22-01,
    22-09).
12. **22-11** — Desync redaction acceptance on tasks 04 + 05
    (depends on 22-06).

Plans 25 (TURN credentials), 27 (save tampering & pack signing),
and 30 (build pipeline) inherit and consume the contracts above;
they do not need to ship before this plan's tasks complete.

---

## 6. Risks if Not Implemented

- **Default IP and SDP capture in production.** Standard `ws` /
  Express + Fly.io / Railway access logs persist client IPs and
  ICE payloads for the platform default (often 30 days). Without
  `services/signaling/observability.md`, a routine deploy
  silently retains identifying data. (Q411, Q413)
- **AI-prompt leakage on failure path.** A `GenerationProvider`
  call that re-throws the prompt in the error message lands in
  the gateway's observability layer; combined with no retention
  rule, prompts persist for 30+ days on an external service.
  (Q412, Q434)
- **Replay-share leaks both peers' display names.** If a future
  replay-export flow ships before the export sanitizer, every
  shared replay carries `metadata.playerName` and every
  `state.players.byId.*.displayName` cleartext. (Q421)
- **Room-code enumeration via distinguishable errors.** A
  6-character / 30-symbol keyspace + the audit's documented
  rate-limit gap + a `ROOM_FULL` vs. `ROOM_NOT_FOUND`
  distinction = the active lobby set is mappable in seconds.
  (Q424)
- **Stack traces / file paths reach end users.** No formatter,
  no production gate, no lint — the React unhandled-error path
  surfaces raw stacks in toasts; ad-hoc `toast(err.message)` is
  the natural shortcut for every contributor. (Q425, Q432, Q435)
- **Signature key enumeration.** Without uniform
  `INVALID_SIGNATURE` and constant-time compare, a malicious
  pack distinguishes "wrong key" from "no such key." (Q431,
  Q433)
- **Hidden-state leak in desync reports.** The last-10-commands
  payload carries hero loadouts, spell choices, fog-of-war
  movement intentions; auto-bisect re-materializes them on every
  round. A desync becomes a one-shot intel leak in competitive
  play. (Q427)
- **Unsanctioned compliance surface.** AI generation + lobby
  chat + cross-region multiplayer trigger GDPR/CCPA/COPPA
  exposure; without a posture doc, processor list, age gate, or
  data inventory, legal review has no artifact and the
  implementer has no checklist. (Q418, Q419, Q420)
- **First-run telemetry on by default.** Without a written
  off-by-default rule and a load-gate, the first contributor to
  wire telemetry ships it on by default. (Q422, Q423)
- **No verifiable erasure pathway.** Without an erasure receipt
  schema and a manual-fallback process doc, "delete my data"
  fails the auditability half of GDPR Art. 17. (Q415, Q416)
- **No DPA before vendor selection.** AI provider + hosting
  platform are both unbound; without
  `docs/legal/dpa-checklist.md`, a procurement decision can be
  made in a single PR with no legal sign-off. (Q419)

---

## 7. AI Implementation Readiness

**Score: 8 / 10** (after this plan executes)

**Reason:** The plan converts every ❌ UNKNOWN and ⚠ Partial in the
audit into either a new doc/schema/screen-edit/task **or** an
explicit deferral handed to a sibling plan (Plan 25, Plan 27,
Plan 30). After execution:

- Every privacy decision has a written artifact under
  `docs/architecture/privacy.md` and `docs/legal/`.
- Every retention TTL is named per surface in
  `services/signaling/observability.md` /
  `services/ai-gateway/retention.md`.
- Every UI error path is gated by `formatUserError` and a CI lint;
  every signature/secret comparison is gated by
  `crypto-rules.md`; every signaling error path is gated by
  the closed wire enum.
- Every desync report is gated by the field-visibility tag and
  the redactor.
- Every erasure request produces a receipt routed through a
  closed schema.

The remaining 2 points cover surfaces this plan intentionally
defers: (a) the actual auth model and credential storage (Plan
25), which the constant-time-compare rule prepares for but
cannot fully validate; (b) the build toolchain (Plan 30) which
must satisfy the production-build contract but is out of scope
here. Both are explicit deferrals; neither blocks an autonomous
implementer from executing § 4 in order.

The strongest remaining risk is **scope creep across screen
boilerplate**: the error-formatter rule must be appended to ~70
existing screen `interactions.md` files. Task 22-01 marks this as
a single sweeping edit with a verify command (`grep -L
"formatUserError" docs/architecture/wiki/screens/*/interactions.md
| wc -l` must equal `0`) so the work is mechanical rather than
judgment-bound; an AI agent can complete it without ambiguity.
