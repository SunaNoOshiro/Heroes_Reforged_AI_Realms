# Screen 56: Options
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Options screen for audio, animation speed, combat settings, autosave, language, accessibility, and renderer scale.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Change tab | `options.tab` | local-ui | Current screen | `SET_OPTIONS_TAB` | Changes visible category. | Tab pages slide, slider knobs tick, toggles flip, Apply seal glows, and Cancel restores previous values. |
| Adjust slider | `options.slider` | local-ui | Current screen | `SET_OPTIONS_DRAFT_VALUE` | Updates draft value. | Tab pages slide, slider knobs tick, toggles flip, Apply seal glows, and Cancel restores previous values. |
| Apply | `options.apply` | command | Current screen | `APPLY_OPTIONS` | Persists allowed settings. | Tab pages slide, slider knobs tick, toggles flip, Apply seal glows, and Cancel restores previous values. |
| Cancel | `options.cancel` | navigation | Caller screen | `CANCEL_OPTIONS` | Discards draft. | Tab pages slide, slider knobs tick, toggles flip, Apply seal glows, and Cancel restores previous values. |
| Toggle hashed display name | `options.toggleHashedDisplayName` | command | Current screen | `TOGGLE_HASHED_DISPLAY_NAME` | Flips `state.privacy.options.displayNameMode` between `hashed` and `clear`. | Toggle flips; salt-fingerprint row updates. |
| Toggle analytics opt-in | `options.toggleAnalyticsOptIn` | command | Current screen | `TOGGLE_ANALYTICS_OPT_IN` | Flips `state.privacy.options.analyticsOptIn`. v1 loads no SDK; toggle declares the default. | Toggle flips. |
| Toggle mature-content gate | `options.toggleMatureContentGate` | command | Current screen | `TOGGLE_MATURE_CONTENT_GATE` | Flips `state.privacy.options.allowMatureContent`. Binds the same key Plan 20 uses for its `contentRating` gate. | Toggle flips; pack-trust prompts re-evaluate. |
| Reset analytics ID | `options.resetAnalyticsId` | command | Current screen | `RESET_ANALYTICS_ID` | Regenerates `state.privacy.options.analyticsClientId` if present (no-op until a future analytics integration lands). | Row text replaces with new fingerprint. |
| Forget me on this device | `options.forgetMe` | navigation | `60-confirmation-dialog` | `WIPE_LOCAL_DATA` | Routes through screen 54-system-menu's confirmation per [`data-inventory.md` § Wipe-Scope Policy](../../../data-inventory.md#3-wipe-scope-policy). | Confirmation modal mounts. |
| Acknowledge privacy disclosure | `options.acknowledgePrivacyDisclosure` | local-ui | Current screen | `ACKNOWLEDGE_PRIVACY_DISCLOSURE` | Sets `state.privacy.disclosureSeenVersion = state.privacy.currentDisclosureVersion`; closes the modal. | Modal fade-out. |
| Open privacy policy | `options.openPrivacyPolicy` | local-ui | _(modal)_ | `OPEN_PRIVACY_POLICY` | Opens an in-app modal rendering [`docs/architecture/privacy.md`](../../../privacy.md). Reused affordance from screen 01 footer. | Modal fade-in. |

### State Changes
- `state.ui.options.draft` refreshes `optionsDraft` after the owning reducer or local UI draft changes.
- `config.audio` refreshes `audioConfig` after the owning reducer or local UI draft changes.
- `config.ui` refreshes `uiConfig` after the owning reducer or local UI draft changes.
- `selectors.options.gameplayConfigLocks` refreshes `gameplayLocks` after the owning reducer or local UI draft changes.
- `selectors.options.hasUnsavedChanges` refreshes `dirty` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Cancel can route to Caller screen after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### Privacy disclosure modal

- The `PrivacyDisclosureModal` opens automatically when
  `state.privacy.disclosureSeenVersion < state.privacy.currentDisclosureVersion`.
- The modal lists every row of [`docs/architecture/data-inventory.md`](../../../data-inventory.md)
  (medium, sensitivity tier, retention, wipe coverage) and links
  to [`docs/architecture/privacy.md`](../../../privacy.md).
- No analytics SDK loads while
  `state.privacy.options.analyticsOptIn === false`; this is the
  build-mode rule from [`production-build.md` rule 3](../../../production-build.md#3-formatusererror-is-the-only-ui-error-sink).
- Acknowledging the modal records a
  [`POLICY_ACCEPTED`](../../../../../content-schema/schemas/audit-log-entry.schema.json)
  audit-log entry with `policyVersion`.

### Locale Swap
- Switching `language` is **presentation-only** — never a deterministic command, never a command-log entry.
- Apply triggers a `LOCALE_CHANGED` UI event on a side-channel observable. All subscribed selectors re-render.
- Open transient surfaces (tooltips, popovers, hover cards) are dismissed; modals that require a player choice re-render in-place with new strings.
- The body element's `dir` attribute toggles for RTL locales; layout uses logical CSS properties (`margin-inline-start` etc.) so no renderer reset is required.
- Save metadata captures `localeAtSave`; loading under a different locale shows no warning (display strings re-resolve normally). See [`docs/architecture/edge-cases-policy.md` § 10](../../../edge-cases-policy.md#10-locale-swap-mid-game-q214).

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below
maps each action whose `Type` column is `command` to its default
surface for this screen's dominant error domain. A row whose Notes
column reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Apply (`APPLY_OPTIONS`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
