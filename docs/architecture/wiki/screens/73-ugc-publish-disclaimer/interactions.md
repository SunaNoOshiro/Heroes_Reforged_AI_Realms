# Screen 73: UGC Publish Disclaimer
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Per-pack content-policy ack before any local `.hrmod` export. No
network upload at v1. Writes the ack into the archive itself.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open disclaimer | `publish.open` | navigation | Current screen | `OPEN_PUBLISH_DISCLAIMER` | Mounts the modal with the candidate pack. | Modal drops in over dimmed caller. |
| Toggle rights ack | `publish.toggleRights` | local-ui | Current screen | `TOGGLE_PUBLISH_RIGHTS_ACK` | `state.ui.publish.acks.rights` updates. | Row highlights. |
| Toggle policy ack | `publish.togglePolicy` | local-ui | Current screen | `TOGGLE_PUBLISH_POLICY_ACK` | `state.ui.publish.acks.policy` updates. | Row highlights. |
| Accept and export | `publish.accept` | command | Caller (65 or AI Stage 6) | `ACCEPT_PUBLISH_DISCLAIMER` then `EXPORT_SCENARIO_AS_PACK` | Writes `signed-acks/<contentHash>.json`; OS file-picker opens. | Modal fades; pack export progress shown. |
| Cancel | `publish.cancel` | local-ui | Caller | `CLOSE_PUBLISH_DISCLAIMER` | Drops the candidate pack from staging. | Modal fades. |

### State Changes
- `state.ui.publish.acks` updates on each checkbox toggle.
- `state.ui.publish.candidatePack` cleared on cancel; preserved
  through accept until the OS file-picker resolves.
- UI-only hover, focus, and animation frame stay outside
  deterministic gameplay state.

### Navigation Outcomes
- Accept can route back to the Map Editor (screen 65) or the
  AI-generation Stage 6 caller after the export resolves.
- Cancel routes back to the caller without writing an ack.

### Disabled And Error Cases
- Both ack checkboxes MUST be true; otherwise the export button is
  disabled (not hidden) and the modal shows
  `ui.publish.policy.required-checks`.
- File-picker rejection (user cancel) drops the staged pack but
  preserves the modal open state so the user can retry.
- Storage-quota or write failure surfaces as a modal error; copy
  follows
  [`error-ux.md`](../../../error-ux.md).


### Error Formatter

- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

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
| Accept and export | STORAGE_REJECTED | modal | `error.storage.rejected.body` | Default per `error-ux.md` § 2 STORAGE_*; export-write failure surfaces as modal. |
