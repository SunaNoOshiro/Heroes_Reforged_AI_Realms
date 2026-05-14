# Screen 73: UGC Publish Disclaimer
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `manifest.schema.json` | Candidate pack identity (`id`, `version`) + `aiProvenance` when source is AI-pipeline Stage 6. | [`content-schema/schemas/manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json) |
| `localization.schema.json` | UI labels, policy bullets, error messages under `ui.publish.policy.*` and `errors.*`. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

Both schemas are registered in
[`schema-matrix.md`](../../../schema-matrix.md) as `Manifest` and
`Localization`.

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `pack` | `selectors.publish.candidatePack` | Candidate pack being exported. |
| `policyVersion` | `selectors.publish.policyVersion` | Hex hash of the active content-policy doc; written into the ack. |
| `acks` | `state.ui.publish.acks` | Per-checkbox boolean state `{ rights, policy }`. |
| `destination` | `state.ui.publish.destination` | OS file-picker result (FS-Access-API handle or download blob). |

### Commands And Events
Catalogued in
[`command-schema.md` § UGC, Privacy & Content-Report Commands](../../../command-schema.md#ugc-privacy--content-report-commands).
All entries are dispatched against the persistence / content-runtime
adapter, not the deterministic engine reducer.

- `OPEN_PUBLISH_DISCLAIMER` (from `publish.open`) — mounts the modal.
  local-ui.
- `TOGGLE_PUBLISH_RIGHTS_ACK` (from `publish.toggleRights`) — toggles
  the rights checkbox. local-ui.
- `TOGGLE_PUBLISH_POLICY_ACK` (from `publish.togglePolicy`) — toggles
  the policy checkbox. local-ui.
- `ACCEPT_PUBLISH_DISCLAIMER` (from `publish.accept`) — writes
  `signed-acks/<contentHash>.json` into the staged archive; chained
  to `EXPORT_SCENARIO_AS_PACK`. Owned by
  [`tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md).
- `EXPORT_SCENARIO_AS_PACK` (from `publish.accept`) — triggers the OS
  file-picker for the destination path. Owned by the same task.
- `CLOSE_PUBLISH_DISCLAIMER` (from `publish.cancel`) — drops the
  candidate pack from staging. local-ui.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`

### Localization Keys
- `ui.publish.policy.title`
- `ui.publish.policy.body`
- `ui.publish.policy.bullet.no-infringement`
- `ui.publish.policy.bullet.no-minors-sexual`
- `ui.publish.policy.bullet.no-targeted-harassment`
- `ui.publish.policy.bullet.no-illegal`
- `ui.publish.policy.ack.rights`
- `ui.publish.policy.ack.policy`
- `ui.publish.policy.required-checks`
- `ui.publish.policy.export-button`
- `ui.publish.policy.cancel-button`
- `ui.publish.policy.local-only-notice`
- `ui.common.ok`, `ui.common.cancel`
- `error.storage.rejected.body` — modal copy for export-write failure
  (see sibling [`interactions.md`](./interactions.md) § Error
  surfaces).

### Asset, Sound, And VFX IDs
- `ui.publish.background`
- `ui.publish.frame`
- `audio.ui.hover`, `audio.ui.click`

### Save And Replay Fields
- This screen never writes save state.
- The per-pack ack file is written inside the exported `.hrmod` at
  `signed-acks/<contentHash>.json`; not embedded in any save record.
  Registered as `signed publish ack` in
  [`data-inventory.md`](../../../data-inventory.md) (in-pack file,
  bound to pack lifetime).

### Validation And Fallback
- Both ack checkboxes MUST be true before export enables (sibling
  [`interactions.md`](./interactions.md)).
- All policy and ack copy follows the
  [`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys)
  namespace rule.

---

## 🔍 Sync Check

- **UI: ✔** — Selector list, command tokens, and copy keys match
  sibling [`spec.md`](./spec.md), [`interactions.md`](./interactions.md),
  and [`architecture.md`](./architecture.md); SVG mockup
  [`mockup.html`](./mockup.html) carries the same `data-i18n` keys
  (`ui.publish.policy.*`) and `data-action` IDs (`publish.toggle*`,
  `publish.accept`, `publish.cancel`).
- **Schema: ✔** — `Manifest` (`aiProvenance`, `capabilities`,
  identity) and `Localization` (`errors.*`, per-key `interpolation`
  block) rows are registered in
  [`schema-matrix.md`](../../../schema-matrix.md); reserved
  namespace `ui.publish.policy.*` matches
  [`ugc-safety.md` § 7](../../../ugc-safety.md#7-localization-keys).
- **Tasks: ✔** — `ACCEPT_PUBLISH_DISCLAIMER` and
  `EXPORT_SCENARIO_AS_PACK` are registered to
  [`tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md)
  in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json);
  the `signed publish ack` row in
  [`data-inventory.md`](../../../data-inventory.md) covers the
  in-pack file produced by accept.

## ⚠ Issues

- **UI-local toggle tokens missing from
  [`command-schema.md`](../../../command-schema.md) § UGC, Privacy &
  Content-Report Commands.** `TOGGLE_PUBLISH_RIGHTS_ACK`,
  `TOGGLE_PUBLISH_POLICY_ACK`, and `CLOSE_PUBLISH_DISCLAIMER` are
  consumed here and in sibling
  [`interactions.md`](./interactions.md) but are not catalogued in
  the canonical command list or in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
  Per
  [`command-schema.md` § Contract](../../../command-schema.md#contract),
  every screen interaction token must be a schema command, an alias,
  UI-local, or explicitly out of scope with an owning task. Owner:
  [`tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md)
  — add three `local-ui` rows mirroring `OPEN_PUBLISH_DISCLAIMER`.
  The audit did not edit `command-schema.md` or the coverage map
  (Hard Prohibition D); see sibling
  [`interactions.md`](./interactions.md#-issues) for the same flag.
