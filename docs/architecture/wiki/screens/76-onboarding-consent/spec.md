# Screen 61b: Onboarding & Consent

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
First-run onboarding screen that captures the age gate and tiered
consent (`storage`, `multiplayer`, `aiGeneration`, `telemetry`,
`crashReports`, `analytics`) before any network, AI, telemetry, or
crash-report surface becomes reachable. Per
[`docs/architecture/onboarding.md`](../../../onboarding.md). Re-prompts
when a scope is `unset`, when `policyVersion` is bumped, when a save
import carries a `ConsentSnapshot`, or when the user revoked the scope
from the Privacy tab in [`56-options`](../56-options/).

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-1`.
- Z-Layer: 100 per [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Vertically stacked tiered list inside the standard 800x600 frame:
  age-gate row at top, required-tier row, then one optional-tier row
  per scope with `Accept` / `Decline` toggles. Footer holds `Continue`.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate
  gold frame, red/brown/stone panels, compact icon slots, right-click
  detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in Markdown package files.

### Component Tree
- OnboardingConsentScreen
  - AgeGateRow
  - RequiredTierGroup
    - ConsentRow
  - OptionalTierGroup
  - DisclosureCallouts
  - ContinueButton

The runtime instantiates one `ConsentRow` per `ConsentScope` declared
in [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json):
`storage` lives under `RequiredTierGroup`; `multiplayer`,
`aiGeneration`, `telemetry`, `crashReports`, `analytics` live under
`OptionalTierGroup`.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `ageGateDraft` | `state.ui.onboarding.ageGateDraft` | Local draft until `Continue`; persisted to `config.player.ageGate`. |
| `consentDraft` | `state.ui.onboarding.consentDraft` | One row per `ConsentScope`; merged into `state.profile.consent` on `Continue`. |
| `policyVersion` | `selectors.onboarding.policyVersion` | Mirrors the `policyVersion` constant in [`onboarding.md`](../../../onboarding.md). |
| `pendingScope` | `state.ui.onboarding.pendingScope` | Set when re-prompted from a single guarded surface; null on first-run. |
| `importedSnapshot` | `state.ui.onboarding.importedSnapshot` | Set when entered via `IMPORT_CONSENT_SNAPSHOT`; used to pre-fill rows with `method: 'import'`. |

### Mechanics Mapping
- Captures consent before gated surfaces activate; never mutates
  deterministic gameplay state.
- UI previews stay local until `Continue` dispatches the consent
  commands.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries/content schemas, not hardcoded
  view logic.

### Animation Contract
- Rows slide in sequentially, toggles flip, the disclosure callouts
  fade on focus, and `Continue` glows once the required-tier row is
  accepted.
- Animation consumes reducer or route results; it never decides
  consent outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay
  fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `onboarding-consent`; system group: `system`; curation marker: `curated-pass-1`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests;
  deterministic gameplay commands use stable IDs and scalar values.
