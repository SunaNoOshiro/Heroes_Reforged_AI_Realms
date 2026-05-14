# Screen 76: Onboarding & Consent

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`docs/architecture/onboarding.md`](../../../onboarding.md) — policy
  version, scope enumeration, flow.
- [`docs/architecture/age-gate.md`](../../../age-gate.md) —
  `config.player.ageGate` lifecycle and `under13` force-deny matrix.
- [`docs/architecture/privacy.md`](../../../privacy.md) — privacy-policy
  modal contents.

### Description
First-run screen that captures the age gate, the required `storage`
consent, and the optional-tier consents (`multiplayer`,
`aiGeneration`, `telemetry`, `crashReports`, `analytics`) before any
network, AI, telemetry, or crash-report surface becomes reachable.
The flow contract lives in
[`docs/architecture/onboarding.md`](../../../onboarding.md); this
package is the runtime contract.

Re-prompts when:
- a scope is `unset` and its gated surface is being entered;
- `policyVersion` is bumped (every `granted` record with a stale
  version is invalidated);
- the user revoked the scope from the Privacy tab in
  [`56-options`](../56-options/) and is now reaching the surface;
- a save import carries a `ConsentSnapshot`.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-1`.
- Z-Layer: 100 per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed 800×600 frame, vertically stacked tiered list:
  - top: `AgeGateRow` with two mutually exclusive options
    (`Under 13`, `13 or over`);
  - required-tier header → one `ConsentRow` for `storage`
    (pre-accepted, badge `Required`);
  - optional-tier header → one `ConsentRow` per optional scope
    (default OFF toggle, rationale subtitle);
  - footer: policy-version label, privacy-policy link, `Continue`.
- Dense classic-fantasy strategy UI: ornate gold frame, red/brown
  panels, compact toggle controls, bottom status feedback.
- `mockup.html` carries the visual reference only; logic, timing,
  and command routing live in the Markdown package files.

### Component Tree
- `OnboardingConsentScreen`
  - `AgeGateRow`
  - `RequiredTierGroup`
    - `ConsentRow` — `storage`
  - `OptionalTierGroup`
    - `ConsentRow` — one per optional `ConsentScope`
  - `DisclosureCallouts` — focus-revealed rationale for
    `multiplayer` and `aiGeneration`
  - `ContinueButton`

The runtime instantiates one `ConsentRow` per `ConsentScope` declared
in [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json),
minus `unsignedPacks` (session-only ack, surfaced by the lobby — see
`interactions.md` § Out-Of-Scope Scopes). `storage` lives under
`RequiredTierGroup`; `multiplayer`, `aiGeneration`, `telemetry`,
`crashReports`, `analytics` live under `OptionalTierGroup`.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `ageGateDraft` | `state.ui.onboarding.ageGateDraft` | Local draft; persists to `config.player.ageGate` on `Continue`. |
| `consentDraft` | `state.ui.onboarding.consentDraft` | `Record<ConsentScope, ConsentRecord>` local draft; merged into `state.profile.consent` on `Continue`. |
| `policyVersion` | `selectors.onboarding.policyVersion` | Mirrors the `policyVersion` constant in [`onboarding.md`](../../../onboarding.md). |
| `pendingScope` | `state.ui.onboarding.pendingScope` | `null` on first-run; set to one `ConsentScope` by `REQUEST_CONSENT_PROMPT`. |
| `importedSnapshot` | `state.ui.onboarding.importedSnapshot` | Optional `ConsentSnapshot` set by `IMPORT_CONSENT_SNAPSHOT`; pre-fills rows with `method: 'import'` but never auto-grants. |
| `featureAvailability` | `selectors.onboarding.featureAvailability` | Closed selector consumed by every gated surface; combines age-gate matrix and consent state per [`age-gate.md` § 3](../../../age-gate.md#3-canonical-selector). |

### Mechanics Mapping
- Captures consent before gated surfaces activate; never mutates
  deterministic gameplay state.
- The screen owns draft UI state only; commits happen on `Continue`
  through `GRANT_CONSENT` / `REVOKE_CONSENT` (and corresponding
  audit-log rows).
- All localized copy, icons, and audio cues resolve through
  registries and asset manifests, never hardcoded view logic.

### Animation Contract
- Rows enter sequentially (age gate → required → optional).
- Toggles flip; disclosure callouts (`multiplayer`, `aiGeneration`)
  fade in on focus.
- `ContinueButton` glows once the age gate is set.
- Animation consumes reducer or route results; it never decides
  consent outcomes.
- Under `prefers-reduced-motion`, transitions are replaced by static
  highlights; the mockup honors the media query.

### Acceptance Criteria
- Visible regions and state bindings match this file and the
  component tree above.
- Every primary control, next-screen target, state update,
  animation, disabled case, and error path is described in
  `interactions.md`.
- Diagrams in `architecture.md` mirror the interactions; no hidden
  behavior is introduced there.
- `data-contracts.md` identifies every schema, config, localization,
  asset, audio, VFX, save, and replay field required to implement
  the screen.
- `npm run validate:ui-components` recognizes every component named
  above (acceptance criterion of the owning task
  [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../../../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md)).

### AI Implementation Notes
- Screen slug: `onboarding-consent`; system group: `system`; curation
  marker: `curated-pass-1`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic-gameplay state is **untouched** by this screen.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree and state bindings match `mockup.html`
  (age-gate row, storage row, four toggle rows) and the
  cross-checked siblings `interactions.md`, `data-contracts.md`,
  `architecture.md`. The mockup omits the `analytics` row (see
  Issues).
- **Schema: ✔** —
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json)
  `ConsentScope` enum (`storage | multiplayer | aiGeneration |
  telemetry | crashReports | analytics | unsignedPacks`) matches the
  component-tree comment; `tier`, `state`, and `method` enums match
  the bindings above. `unsignedPacks` is correctly out-of-scope here
  per the schema's `method: session` description.
- **Tasks: ✔** — Owning task
  [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../../../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md)
  lists every package file under *Read First* and pins this screen
  as its primary `Owned Path`.

## ⚠ Issues

- **Mockup omits the `analytics` optional row.** Spec, schema,
  `interactions.md`, `data-contracts.md`, `onboarding.md` § 2, and
  [`age-gate.md` § 2](../../../age-gate.md#2-feature-matrix) all
  enumerate `analytics` as a tier-`optional` scope rendered on this
  screen, but `mockup.html` only draws four toggle rows
  (`multiplayer`, `aiGeneration`, `telemetry`, `crashReports`). Per
  CLAUDE.md root contract (closed enums, fail-loud), the contract
  is canonical; the mockup must add the fifth row. Owning task:
  [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../../../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md).
  Skill did not edit `mockup.html` (Hard Prohibition D and the
  reference-only contract).
- **Stale screen-number title `Screen 61b` was corrected to
  `Screen 76`.** The folder, HTML `data-screen`, `command-schema.md`,
  `onboarding.md`, and the owning task all use `76`; `61b` had no
  surviving canonical reference. The mockup HTML `<title>` still
  reads `61b. Onboarding & Consent` and must be updated by the
  owning task (skill cannot edit `mockup.html` — reference-only).
- **No `DENY_CONSENT` command exists; `Decline optional` audit
  transition `unset → denied` cannot land in
  `state.profile.consent[scope].state`.** Already tracked in
  [`onboarding.md` § ⚠ Issues](../../../onboarding.md). Surfaced
  here for visibility; sibling `interactions.md` preserves the
  `unset → denied` audit claim under the same flag.
