# Screen 75: Content Report
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Player-facing intake for content-targeting reports. Validates
against `content-report.schema.json`; persists to
`state.privacy.outboundReports[]`.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open content report | `contentReport.open` | navigation | Current screen | `OPEN_CONTENT_REPORT` | Mounts the modal with `target` pre-filled. | Modal drops in over dimmed caller. |
| Set reason | `contentReport.setReason` | local-ui | Current screen | `SET_CONTENT_REPORT_REASON` | `state.ui.contentReport.reason` updates. | Radio group highlights selection. |
| Edit notes | `contentReport.editNotes` | local-ui | Current screen | `EDIT_CONTENT_REPORT_NOTES` | `state.ui.contentReport.notes` updates after each keystroke (debounced 100 ms). | Counter updates. |
| Attach screenshot | `contentReport.attachScreenshot` | local-ui | Current screen | `ATTACH_CONTENT_REPORT_SCREENSHOT` | `state.ui.contentReport.screenshotAssetId` updates. | Picker opens. |
| Submit | `contentReport.submit` | command | Caller | `SUBMIT_CONTENT_REPORT` | Validates against schema; pushes onto `state.privacy.outboundReports[]`. | Modal transitions to ack state, then closes. |
| Cancel | `contentReport.cancel` | local-ui | Caller | `CANCEL_CONTENT_REPORT` | Drops the staged report. | Modal fades. |

### State Changes
- `state.ui.contentReport.*` updates per local action.
- `state.privacy.outboundReports[]` appends a validated record on
  successful submit; persisted to IndexedDB
  `hr-profile.reports`.
- UI-only hover, focus, and animation frame stay outside
  deterministic gameplay state.

### Navigation Outcomes
- Submit can route back to the caller after the queue write
  resolves.
- Cancel routes back to the caller with no write.

### Disabled And Error Cases
- Submit is disabled until `reason` is set.
- Notes longer than 1000 chars are truncated client-side; the
  textarea displays the limit.
- Schema-validation failure surfaces as a modal error (`error.content-report.invalid`).
- IndexedDB write failure surfaces as a modal error
  (`error.storage.rejected`).
- The `targetType = ai-faction` route requires the target's pack
  manifest to declare `aiProvenance.present === true`; otherwise the
  route falls back to `targetType = pack`.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.
- All copy follows
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys).

## Error surfaces

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Submit | STORAGE_REJECTED | modal | `error.storage.rejected.body` | Default per `error-ux.md` § 2 STORAGE_*; queue-write failure surfaces as modal. |
| Submit | VALIDATION_REJECTED | modal | `error.content-report.invalid.body` | Schema validation failure. |
