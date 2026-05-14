# Screen 75: Content Report
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Player-facing intake for content-targeting reports. Each submission
validates against
[`content-report.schema.json`](../../../../../content-schema/schemas/content-report.schema.json)
and appends to `state.privacy.outboundReports[]` (persisted to
IndexedDB store `hr-profile.reports`). No network call at v1.

### Actions
| UI element | Action ID | Type | Next screen | Command / Event | Data updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open content report | `contentReport.open` | navigation | Current screen | `OPEN_CONTENT_REPORT` (alias `REPORT_PACK` from UGC info-cards) | Mounts the modal with `state.ui.contentReport.target` pre-filled. | Modal drops in over dimmed caller. |
| Set reason | `contentReport.setReason` | local-ui | Current screen | `SET_CONTENT_REPORT_REASON` | `state.ui.contentReport.reason` updates. | Radio group highlights selection. |
| Edit notes | `contentReport.editNotes` | local-ui | Current screen | `EDIT_CONTENT_REPORT_NOTES` | `state.ui.contentReport.notes` updates after each keystroke (debounced 100 ms). | Counter updates. |
| Attach screenshot | `contentReport.attachScreenshot` | local-ui | Current screen | `ATTACH_CONTENT_REPORT_SCREENSHOT` | `state.ui.contentReport.screenshotAssetId` updates. | Picker opens. |
| Submit | `contentReport.submit` | command | Caller | `SUBMIT_CONTENT_REPORT` | Sanitizes notes via `safeUserText(1000)`, validates against schema, then appends to `state.privacy.outboundReports[]`. | Modal transitions to ack state, then closes. |
| Cancel | `contentReport.cancel` | local-ui | Caller | `CANCEL_CONTENT_REPORT` | Drops the staged report. | Modal fades. |

### State Changes
- `state.ui.contentReport.*` updates per local action.
- `state.privacy.outboundReports[]` appends a validated record on
  successful submit; persisted to IndexedDB store
  `hr-profile.reports`.
- Hover, focus, and animation frame stay outside deterministic
  gameplay state.

### Navigation Outcomes
- Submit routes back to the caller after the queue write resolves.
- Cancel routes back to the caller with no write.

### Disabled And Error Cases
- Submit is disabled until `state.ui.contentReport.reason` is set
  (mockup button shows the `SUBMIT (NEEDS REASON)` state).
- Notes longer than 1000 chars are truncated client-side; the
  textarea displays the limit (`0 / 1000` → `1000 / 1000`).
- Schema-validation failure surfaces a modal error keyed by
  `error.content-report.invalid.body`; the form draft is preserved
  so the user can retry.
- IndexedDB write failure surfaces a modal error keyed by
  `error.storage.rejected.body`; the staged report stays in
  `state.ui.contentReport.*` until cancel or successful retry.
- `targetType = ai-faction` requires the target pack's manifest
  `aiProvenance.present === true`. If the caller cannot satisfy
  this, the affordance opens the report with `targetType = pack`
  instead (no separate failure state on this screen).

### Error Formatter
- Errors are produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions rather than
  introducing new behavior.
- All copy follows
  [`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys).

## Error Surfaces

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Submit | `STORAGE_REJECTED` | modal | `error.storage.rejected.body` | Queue-write failure; default per [`error-ux.md` § 2](../../../error-ux.md#2-code--surface-mapping) `STORAGE_*` prefix. |
| Submit | `VALIDATION_REJECTED` | modal | `error.content-report.invalid.body` | Schema-validation failure; form draft preserved. |

---

## 🔍 Sync Check

- **UI: ✔** — Actions row "Open content report" matches
  `mockup.html` body markers and the action handles
  (`data-action="contentReport.submit"`,
  `data-action="contentReport.cancel"`); the disabled-submit state
  matches the mockup's `class="button-disabled"` group. Error
  surfaces follow the prefix rule in
  [`error-ux.md` § 2](../../../error-ux.md#2-code--surface-mapping)
  and the formatter rule in
  [`error-formatter.md`](../../../error-formatter.md).
- **Schema: ✔** — Sanitize → validate → enqueue chain matches
  [`content-report.schema.json`](../../../../../content-schema/schemas/content-report.schema.json)
  and `safeUserText(1000)` per
  [`ugc-safety.md` § 3](../../../ugc-safety.md#3-text-sanitization-contract);
  `state.privacy.outboundReports[]` is row "outbound content
  reports" in
  [`data-inventory.md` § 1](../../../data-inventory.md#1-inventory).
- **Tasks: ✔** — Acceptance criteria of
  [`tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md`](../../../../../tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md)
  enumerate the same six actions and the validation-failure draft
  preservation; upstream task
  `mvp.02-content-schemas.32-safe-user-text-helper-and-jsx-lint`
  owns the `safeUserText` helper.

## ⚠ Issues

- **`ai-faction` route fallback has no upstream documentation.**
  This file specifies that `targetType = ai-faction` requires the
  target manifest's `aiProvenance.present === true` and otherwise
  silently falls back to `targetType = pack`. The schema enum in
  [`content-report.schema.json`](../../../../../content-schema/schemas/content-report.schema.json)
  permits `ai-faction` unconditionally, and the caller screens
  ([`74-ai-provenance-detail/`](../74-ai-provenance-detail/),
  [`71-pack-manager/`](../71-pack-manager/), and the UGC info-cards)
  do not document the fallback rule. The audit preserved the rule
  here (Hard Prohibition A — never change meaning) but the gate
  has no canonical owner. Owner:
  `phase-2.05-mod-system.13-ai-provenance-detail-screen` (or the
  owning task above) records the fallback rule either in
  [`ugc-safety.md`](../../../ugc-safety.md) (UGC affordance policy)
  or in the caller screens' `interactions.md`. Skill did not edit
  the upstream files (Hard Prohibition D).
- **Coverage map missing the screen's local-ui commands.** See
  sibling [`data-contracts.md`](./data-contracts.md) § ⚠ Issues —
  the same gap is flagged once at the canonical surface.
