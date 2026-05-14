# Screen 56: Options

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Options screen for audio, animation speed, combat settings, autosave,
language, accessibility, renderer scale, privacy, consent, and age gate.
Edits a local draft; Apply persists allowed settings, dirty Cancel
routes through [`60-confirmation-dialog`](../60-confirmation-dialog/),
consent revoke routes through `60-confirmation-dialog`, and re-grant
routes through [`76-onboarding-consent`](../76-onboarding-consent/).

### Visual Direction
Original internal UI contract. Do not use third-party captures, copied
franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Tabbed settings parchment with sliders, toggles, segmented buttons,
  key/action rows, Apply/Cancel defaults, and no gameplay explanation
  text.
- Dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold
  frame, red/brown/stone panels, compact icon slots, right-click detail
  affordances, bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- OptionsScreen
  - OptionsTabs
  - SliderRows
  - ToggleRows
  - SegmentedControls
  - PrivacyPane
    - ConsentRowList
    - AgeGateRow
    - ConsentHistoryPanel
  - PrivacyDisclosureModal
  - ApplyCancelButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `optionsDraft` | `state.ui.options.draft` | Local editable settings copy. |
| `audioConfig` | `config.audio` | Music/SFX/voice values. |
| `uiConfig` | `config.ui` | Locale, animation speed, reduced motion, scale. |
| `gameplayLocks` | `selectors.options.gameplayConfigLocks` | Settings locked during active game. |
| `dirty` | `selectors.options.hasUnsavedChanges` | Apply enabled state. |
| `privacyOptions` | `state.privacy.options` | Per [`privacy-options.schema.json`](../../../../../content-schema/schemas/privacy-options.schema.json): `displayNameMode`, `analyticsOptIn`, `allowMatureContent`, `saltFingerprint`. |
| `saltFingerprint` | `selectors.privacy.saltFingerprint` | First 4 hex chars of the local salt; user-visible verification. |
| `disclosureSeen` | `state.privacy.disclosureSeenVersion` | Version of the privacy disclosure the user has acknowledged. When `<` `state.privacy.currentDisclosureVersion`, the `PrivacyDisclosureModal` opens before any analytics or reporting surface activates. See [`privacy.md`](../../../privacy.md) and [`state-flow.md` § Privacy Slice](../../../state-flow.md#privacy-slice). |
| `consentRecords` | `state.profile.consent` | One [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json) record per `ConsentScope`. Surfaced as `ConsentRowList` rows; revocable except for `tier: required` rows. |
| `consentAuditLog` | `state.profile.consentAuditLog` | [`consent-audit-log.schema.json`](../../../../../content-schema/schemas/consent-audit-log.schema.json) ring buffer rendered by `ConsentHistoryPanel`. |
| `ageGate` | `config.player.ageGate` | `'unknown' \| 'under13' \| 'over13'` per [`age-gate.md`](../../../age-gate.md). Editable from `AgeGateRow` inside the `Privacy` tab. |

### Privacy Tab
The `Privacy` tab sits to the right of `Accessibility` and to the left
of `Renderer`. Contents:

- `AgeGateRow` — segmented control for `config.player.ageGate`.
  Changing this re-evaluates the consent matrix per
  [`age-gate.md`](../../../age-gate.md); switching to `under13` forces
  every optional-tier consent to `denied`.
- `ConsentRowList` — one row per `ConsentScope`. Each row shows the
  `state` badge, `acceptedAt` (when granted), `policyVersion`, and a
  `Revoke` button. Rows whose `tier === 'required'` (i.e. `storage`)
  render `Revoke` disabled with the localized rationale
  `consent.storage.revokeRequiresWipe`.
- `Forget me on this device` — pre-existing entry, retained.
- `View consent history` link — opens `ConsentHistoryPanel`.
- `ConsentHistoryPanel` — read-only list of the latest N
  `ConsentAuditLogEntry` rows from
  [`consent-audit-log.schema.json`](../../../../../content-schema/schemas/consent-audit-log.schema.json).
  Each row displays `timestamp`, `scope`, `fromState → toState`,
  `policyVersion`, `method`.
- Existing display-name / analytics / mature-content / salt rows
  remain underneath the consent block.

`Revoke` always opens
[`60-confirmation-dialog`](../60-confirmation-dialog/) with
`severity: 'critical'` and `requireType: 'REVOKE'`. On confirm, the
flow dispatches `REVOKE_CONSENT(scope)` and, if any data exists for
that scope, `REQUEST_DATA_ERASURE(scope)` (reuses the existing erasure
pipeline).

### Mechanics Mapping
- Apply validates config values, persists presentation settings, and
  only changes gameplay-affecting options at allowed setup boundaries.
- UI previews stay local until a listed command or route guard accepts
  them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas, not hardcoded
  view logic.

### Animation Contract
- Tab pages slide, slider knobs tick, toggles flip, Apply seal glows,
  and Cancel restores previous values.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `options`; system group: `system`; curation marker:
  `curated-pass-6`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and Privacy-tab description match sibling [`interactions.md`](./interactions.md), [`data-contracts.md`](./data-contracts.md), and [`architecture.md`](./architecture.md).
- **Schema: ✔** — All schemas referenced in State Bindings and Privacy Tab (`privacy-options.schema.json`, `consent.schema.json`, `consent-audit-log.schema.json`) exist; enum and field names (`displayNameMode`, `ConsentScope`, `tier`, `state`, `method`) match the schemas verbatim.
- **Tasks: ✔** — Owning task [`tasks/mvp/07-ui-shell/22-privacy-pane-in-options.md`](../../../../../tasks/mvp/07-ui-shell/22-privacy-pane-in-options.md) lists this file in Read First; Privacy-tab additions are scoped to that task's `Owned Paths (shared)` extension contract on `src/ui/options/options-screen.tsx`.

## ⚠ Issues

- **Developer tab not enumerated in this spec.** [`command-schema.md`](../../../command-schema.md) registers `REVEAL_DEVELOPER_TAB` as a `56-options` token (chord-unlock per [`developer-mode.md`](../../../developer-mode.md)); sibling [`data-contracts.md`](./data-contracts.md) lists `config.dev.placeholderSprites` / `config.dev.enableDebugOverlay` and sibling [`interactions.md`](./interactions.md) flags the missing action row. The Developer tab is therefore implied but unenumerated in this Component Tree / State Bindings. Per Hard Prohibition B (do not invent features), the tab is not added in this audit. Owner of the developer-mode chord-unlock surface task should add a `Developer` row to Component Tree and a matching `developerFlags` binding to State Bindings.
