# Screen 75: Content Report

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Player-facing intake for unsafe / infringing **content** (pack,
scenario, hero, unit, AI-faction). Distinct from `REPORT_PEER`
(chat-safety), which targets player behavior. Submission validates
against
[`content-report.schema.json`](../../../../../content-schema/schemas/content-report.schema.json)
and appends to `state.privacy.outboundReports[]`. No network call at
v1; the local queue is shaped so a future moderation backend can
dequeue once it lands.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- System group: `system`. Archetype: `system-form-modal`. Curation:
  `curated-pass-1`.
- Modal mounted over the dimmed caller (any UGC info-card,
  [`71-pack-manager`](../71-pack-manager/),
  [`74-ai-provenance-detail`](../74-ai-provenance-detail/)).
- `mockup.html` carries visible UI only. Logic, transitions, and
  copy strings live in the Markdown sibling files.

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `target` | `state.ui.contentReport.target` | `{ targetType, targetId, contentHash? }` pre-filled by the caller. `targetType ∈ pack \| scenario \| hero \| unit \| ai-faction`. |
| `reason` | `state.ui.contentReport.reason` | Closed enum: `infringement \| harassment \| mature-without-rating \| malware \| other`. |
| `notes` | `state.ui.contentReport.notes` | Free-text, max 1000 chars; sanitized via `safeUserText(1000)`. |
| `screenshotAssetId` | `state.ui.contentReport.screenshotAssetId` | Optional pack-relative asset ID; no upload at v1. |
| `queue` | `selectors.privacy.outboundReportQueue` | Read-only count display ("queued: N"). |

### Mechanics Mapping
- The screen reads only the staged report draft and the outbound
  queue. It cannot dispatch any deterministic gameplay command.
- Submission MUST validate against the schema; a failure surfaces a
  modal error keyed by `error.content-report.invalid.body` and
  preserves the form draft so the user can retry.
- Notes are sanitized via the `safeUserText(1000)` helper per
  [`ugc-safety.md` § 3 Text Sanitization Contract](../../../ugc-safety.md#3-text-sanitization-contract).
- Outbound queue persists in IndexedDB store `hr-profile.reports`
  per [`persistence.md` § 1](../../../persistence.md#1-per-slice-mapping).

### Animation Contract
- Modal drops in over the dimmed caller; on successful submit, the
  modal transitions to a brief ack state, then closes. Reduced-motion
  preserves visible state changes with static highlights and
  localized feedback per
  [`animation-contract.md`](../../../animation-contract.md).

### Acceptance Criteria
- Mockup shows the target identity, reason picker, notes textarea,
  optional screenshot-attach affordance, queued-count display, and
  the two primary actions (submit, cancel).
- Spec lists every visible region and the authoritative state
  bindings above.
- Interactions cover open, set-reason, edit-notes, attach-screenshot,
  submit, cancel, validation error, and storage error.
- Architecture diagrams mirror the actions in `interactions.md`
  rather than inventing new behavior.
- Data contracts identify the schema, config keys, localization
  keys, and assets required.

### AI Implementation Notes
- Screen slug: `content-report`; system group: `system`; curation
  marker: `curated-pass-1`.
- Localization keys live under `ui.report.*` per
  [`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys).
- Errors render through `formatUserError(err, locale)` per
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.
- Owning task:
  [`tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md`](../../../../../tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md).

---

## 🔍 Sync Check

- **UI: ✔** — Static regions, state bindings, and copy keys match
  `mockup.html` (`data-screen="75-content-report"`,
  `data-archetype="system-form-modal"`,
  `data-i18n="ui.report.*"`); behavior contract aligns with sibling
  [`interactions.md`](./interactions.md) (actions and error
  surfaces) and [`architecture.md`](./architecture.md) (state
  inputs and submit-flow diagram).
- **Schema: ✔** — `reason`, `targetType`, `notes` (`maxLength 1000`),
  `screenshotAssetId`, and `contentHash` shapes match
  [`content-report.schema.json`](../../../../../content-schema/schemas/content-report.schema.json);
  the `ContentReport` row is registered in
  [`schema-matrix.md`](../../../schema-matrix.md). Persistence target
  `hr-profile.reports` matches
  [`persistence.md` § 1](../../../persistence.md#1-per-slice-mapping)
  and inventory row "outbound content reports" in
  [`data-inventory.md` § 1](../../../data-inventory.md#1-inventory).
- **Tasks: ✔** — Owning task
  [`tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md`](../../../../../tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md)
  Reads First this screen folder and reserves the runtime entry
  (`src/content-runtime/content-report-intake.ts`) and the screen
  component (`src/ui/screens/content-report-screen.tsx`).

## ⚠ Issues

- **`screen-command-coverage.json` lists only two of the screen's
  commands.** Sibling [`data-contracts.md`](./data-contracts.md)
  and [`interactions.md`](./interactions.md) declare six command
  tokens (`OPEN_CONTENT_REPORT`, `SET_CONTENT_REPORT_REASON`,
  `EDIT_CONTENT_REPORT_NOTES`, `ATTACH_CONTENT_REPORT_SCREENSHOT`,
  `SUBMIT_CONTENT_REPORT`, `CANCEL_CONTENT_REPORT`) plus the
  `REPORT_PACK` alias.
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  currently registers only `SUBMIT_CONTENT_REPORT` and
  `ATTACH_CONTENT_REPORT_SCREENSHOT`. Per
  [`command-schema.md` § Contract](../../../command-schema.md), the
  coverage file is the gate `npm run validate:commands` consults.
  Owner: `phase-2.05-mod-system.12-content-report-intake-and-local-queue`
  adds the four missing tokens as local-ui entries. Skill did not
  edit the coverage file (Hard Prohibition D).
