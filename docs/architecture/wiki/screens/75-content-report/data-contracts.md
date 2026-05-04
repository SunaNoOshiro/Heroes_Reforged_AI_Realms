# Screen 75: Content Report
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `content-report.schema.json` | Outbound report record. | `content-schema/schemas/content-report.schema.json` |
| `manifest.schema.json` | Target pack identity (id, contentHash, aiProvenance). | `content-schema/schemas/manifest.schema.json` |
| `localization.schema.json` | UI labels, reason copy, error messages. | `content-schema/schemas/localization.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `target` | `state.ui.contentReport.target` | Pre-filled `{ targetType, targetId, contentHash? }`. |
| `reason` | `state.ui.contentReport.reason` | Closed enum. |
| `notes` | `state.ui.contentReport.notes` | Free-text; sanitized via `safeUserText`. |
| `screenshotAssetId` | `state.ui.contentReport.screenshotAssetId` | Optional. |
| `queue` | `selectors.privacy.outboundReportQueue` | Read-only count display. |

### Commands And Events
- `OPEN_CONTENT_REPORT` from `contentReport.open`: Mount the modal.
- `REPORT_PACK` (alias of `OPEN_CONTENT_REPORT`) from any UGC
  info-card affordance.
- `SET_CONTENT_REPORT_REASON` from `contentReport.setReason`: Set
  the reason enum.
- `EDIT_CONTENT_REPORT_NOTES` from `contentReport.editNotes`: Update
  the notes textarea.
- `ATTACH_CONTENT_REPORT_SCREENSHOT` from
  `contentReport.attachScreenshot`: Attach a pack-relative asset id.
- `SUBMIT_CONTENT_REPORT` from `contentReport.submit`: Validate and
  enqueue.
- `CANCEL_CONTENT_REPORT` from `contentReport.cancel`: Drop the
  staged report.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`

### Localization Keys
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
- Persisted to IndexedDB `hr-profile.reports` per
  [`persistence.md`](../../../persistence.md); not embedded in any
  save record.

### Validation And Fallback
- Submission MUST validate against `content-report.schema.json`.
- Notes longer than 1000 chars are truncated client-side.
- All copy follows
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys).
