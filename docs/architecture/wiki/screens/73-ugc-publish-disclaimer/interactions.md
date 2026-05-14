# Screen 73: UGC Publish Disclaimer
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Per-pack content-policy ack before any local `.hrmod` export. Writes
the ack into the archive itself. No network upload at v1.

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
- `state.ui.publish.candidatePack` is cleared on cancel and preserved
  through accept until the OS file-picker resolves.
- Hover, focus, and animation frame stay outside deterministic
  gameplay state.

### Navigation Outcomes
- **Accept** routes back to the Map Editor (screen 65) or the AI-
  pipeline Stage 6 caller after the export resolves.
- **Cancel** routes back to the caller without writing an ack.

### Disabled And Error Cases
- Both ack checkboxes MUST be true; otherwise the export button is
  disabled (not hidden) and the modal renders
  `ui.publish.policy.required-checks`.
- File-picker rejection (user cancel from the OS dialog) drops the
  staged pack but preserves the modal open state so the user can
  retry.
- Storage-quota or write failure surfaces as a modal error per
  [`error-ux.md`](../../../error-ux.md) (see § Error surfaces below).

### Error Formatter
- Errors are produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than invent new behavior.
- All copy follows
  [`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys).

## Error surfaces

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Accept and export | STORAGE_REJECTED | modal | `error.storage.rejected.body` | Default per [`error-ux.md` § 2](../../../error-ux.md#2-code--surface-mapping) `STORAGE_*` prefix; export-write failure surfaces as a modal so the user can retry. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, next-screen routing, disabled-export rule,
  and reduced-motion feedback match sibling
  [`spec.md`](./spec.md),
  [`architecture.md`](./architecture.md), and the SVG mockup at
  [`mockup.html`](./mockup.html) (`data-action="publish.toggleRights
  | publish.togglePolicy | publish.accept | publish.cancel"`).
- **Schema: ✔** — Error code `STORAGE_REJECTED` follows the
  `STORAGE_*` prefix convention in
  [`error-ux.md` § 2](../../../error-ux.md#2-code--surface-mapping);
  localization key `error.storage.rejected.body` follows § 3
  (`error.<domain>.<code>.<part>`); `formatUserError` is owned by
  [`error-formatter.md` § 1](../../../error-formatter.md#1-api).
- **Tasks: ⚠** — Owning task
  [`tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md)
  reads first this package, but
  `docs/architecture/screen-command-coverage.json` registers only
  `ACCEPT_PUBLISH_DISCLAIMER` and `EXPORT_SCENARIO_AS_PACK` under
  this task. `TOGGLE_PUBLISH_RIGHTS_ACK`, `TOGGLE_PUBLISH_POLICY_ACK`,
  and `CLOSE_PUBLISH_DISCLAIMER` are UI-local and not catalogued.
  See `## ⚠ Issues`.

## ⚠ Issues

- **UI-local toggle tokens not catalogued in
  [`command-schema.md`](../../../command-schema.md) § UGC, Privacy &
  Content-Report Commands.** `TOGGLE_PUBLISH_RIGHTS_ACK`,
  `TOGGLE_PUBLISH_POLICY_ACK`, and `CLOSE_PUBLISH_DISCLAIMER` are
  used here but appear in neither
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  nor `screen-command-coverage.json`. Per
  [`command-schema.md` § Contract](../../../command-schema.md#contract)
  ("A token must be a schema command, an alias to one, UI-local, or
  explicitly out of scope with an owning task"), they should be
  added to the UGC section of `command-schema.md` as `local-ui`
  tokens owned by
  [`tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md),
  matching the pattern used for `OPEN_PUBLISH_DISCLAIMER`.
  Suggested entries: `TOGGLE_PUBLISH_RIGHTS_ACK` — toggles
  `state.ui.publish.acks.rights`. local-ui;
  `TOGGLE_PUBLISH_POLICY_ACK` — toggles
  `state.ui.publish.acks.policy`. local-ui;
  `CLOSE_PUBLISH_DISCLAIMER` — drops `selectors.publish.candidatePack`.
  local-ui. The audit did not edit `command-schema.md` (Hard
  Prohibition D).
