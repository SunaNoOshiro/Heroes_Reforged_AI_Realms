# Screen 75: Content Report
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used for | Canonical source |
| --- | --- | --- |
| `content-report.schema.json` | Outbound report envelope (validated at submit). | [`content-schema/schemas/content-report.schema.json`](../../../../../content-schema/schemas/content-report.schema.json) |
| `manifest.schema.json` | Target pack identity (`id`, `contentHash`, `aiProvenance`). | [`content-schema/schemas/manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json) |
| `localization.schema.json` | UI labels, reason copy, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

### Runtime State Selectors
| UI element | Selector | Notes |
| --- | --- | --- |
| `target` | `state.ui.contentReport.target` | Pre-filled `{ targetType, targetId, contentHash? }`. |
| `reason` | `state.ui.contentReport.reason` | Closed enum: `infringement \| harassment \| mature-without-rating \| malware \| other`. |
| `notes` | `state.ui.contentReport.notes` | Free-text; sanitized via `safeUserText(1000)`. |
| `screenshotAssetId` | `state.ui.contentReport.screenshotAssetId` | Optional pack-relative asset ID. |
| `queue` | `selectors.privacy.outboundReportQueue` | Read-only count of `state.privacy.outboundReports[]`. |

### Commands And Events
All tokens below are local-ui / persistence-side; none enter the
deterministic engine command log. The canonical definitions are
listed in
[`command-schema.md` § UGC, Privacy & Content-Report Commands](../../../command-schema.md#ugc-privacy--content-report-commands).

| Command | Action ID | Behavior |
| --- | --- | --- |
| `OPEN_CONTENT_REPORT` | `contentReport.open` | Mount the modal with `target` pre-filled. |
| `REPORT_PACK` | `contentReport.open` | Alias of `OPEN_CONTENT_REPORT` exposed by every UGC info-card affordance. |
| `SET_CONTENT_REPORT_REASON` | `contentReport.setReason` | Set the reason enum. |
| `EDIT_CONTENT_REPORT_NOTES` | `contentReport.editNotes` | Update the notes textarea (debounced 100 ms). |
| `ATTACH_CONTENT_REPORT_SCREENSHOT` | `contentReport.attachScreenshot` | Set an optional pack-relative asset ID. |
| `SUBMIT_CONTENT_REPORT` | `contentReport.submit` | Sanitize, validate, enqueue. |
| `CANCEL_CONTENT_REPORT` | `contentReport.cancel` | Drop the staged report. |

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`

### Localization Keys
All copy lives under the `ui.report.*` namespace reserved by
[`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys).

- `ui.report.title`
- `ui.report.target.title`
- `ui.report.reason.title`
- `ui.report.reason.infringement`
- `ui.report.reason.harassment`
- `ui.report.reason.mature-without-rating`
- `ui.report.reason.malware`
- `ui.report.reason.other`
- `ui.report.notes.label`
- `ui.report.notes.limit`
- `ui.report.screenshot.attach`
- `ui.report.queue.count`
- `ui.report.submit-button`
- `ui.report.cancel-button`
- `ui.report.ack.body`
- `error.content-report.invalid.body`
- `error.storage.rejected.body`
- `ui.common.ok`, `ui.common.cancel`

### Asset, Sound, And VFX IDs
- `ui.report.background`
- `ui.report.frame`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.error`

### Save And Replay Fields
- This screen never writes save state.
- Outbound reports persist to IndexedDB store `hr-profile.reports`
  per [`persistence.md` § 1](../../../persistence.md#1-per-slice-mapping);
  registered as row "outbound content reports" in
  [`data-inventory.md` § 1](../../../data-inventory.md#1-inventory).
  Never embedded in any save record.

### Validation And Fallback
- Submission MUST validate against
  [`content-report.schema.json`](../../../../../content-schema/schemas/content-report.schema.json);
  the schema pins `reason`, `targetType`, and the `notes`
  `maxLength: 1000`.
- Notes are truncated client-side at 1000 chars before sanitization
  so the schema check never sees an over-long payload.
- All copy follows
  [`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys).

---

## 🔍 Sync Check

- **UI: ✔** — Every `data-i18n` token in `mockup.html`
  (`ui.report.title`, `ui.report.target.title`,
  `ui.report.reason.*`, `ui.report.notes.*`,
  `ui.report.screenshot.attach`, `ui.report.queue.count`,
  `ui.report.submit-button`, `ui.report.cancel-button`) is present
  in the Localization Keys list above; commands and selectors
  match sibling [`spec.md`](./spec.md) § State Bindings and
  [`interactions.md`](./interactions.md) § Actions.
- **Schema: ✔** — `reason`, `targetType`, `contentHash`, `notes`
  shape, and the `maxLength: 1000` rule match
  [`content-report.schema.json`](../../../../../content-schema/schemas/content-report.schema.json);
  `ContentReport`, `Manifest`, and `Localization` rows are present
  in [`schema-matrix.md`](../../../schema-matrix.md).
- **Tasks: ✔** — Schema + queue wiring matches the Outputs of
  [`tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md`](../../../../../tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md);
  upstream dependencies on `mvp.02-content-schemas.34-content-report-schema`
  and `mvp.08-persistence.15-content-report-queue` resolve.

## ⚠ Issues

- **Four local-ui commands missing from
  `screen-command-coverage.json`.**
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  currently registers `SUBMIT_CONTENT_REPORT` and
  `ATTACH_CONTENT_REPORT_SCREENSHOT` only.
  `OPEN_CONTENT_REPORT`, `SET_CONTENT_REPORT_REASON`,
  `EDIT_CONTENT_REPORT_NOTES`, `CANCEL_CONTENT_REPORT`, and the
  `REPORT_PACK` alias are surfaced by this screen but absent from
  the coverage map. Per
  [`command-schema.md` § Contract](../../../command-schema.md), the
  coverage file is the gate for `npm run validate:commands`. Owner:
  `phase-2.05-mod-system.12-content-report-intake-and-local-queue`
  adds the five missing tokens as local-ui entries. Suggested
  values: `"<TOKEN>": "phase-2.05-mod-system.12-content-report-intake-and-local-queue owns the local-ui <token-purpose> per docs/architecture/wiki/screens/75-content-report/."`.
  Skill did not edit the coverage file (Hard Prohibition D — never
  edit cross-checked files).
