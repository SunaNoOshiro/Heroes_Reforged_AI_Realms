# Screen 75: Content Report

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Player-facing intake for unsafe / infringing UGC. Distinct from
`REPORT_PEER` (chat-safety), which targets player
behavior; this screen targets **content** (pack, scenario, hero,
unit, AI-faction). Validates against
[`content-report.schema.json`](../../../../../content-schema/schemas/content-report.schema.json)
and persists to `state.privacy.outboundReports[]` with retry. No
network call at v1; the queue is shaped so the moderation
backend can dequeue once it lands.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-form modal over the dimmed caller (info-card,
  pack-manager, AI-provenance detail).
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in Markdown package files.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| target | state.ui.contentReport.target | `{ targetType, targetId, contentHash? }` pre-filled from the caller. |
| reason | state.ui.contentReport.reason | Closed enum: `infringement \| harassment \| mature-without-rating \| malware \| other`. |
| notes | state.ui.contentReport.notes | Free-text, max 1000 chars; sanitized via `safeUserText`. |
| screenshotAssetId | state.ui.contentReport.screenshotAssetId | Optional pack-relative ID; v1 has no upload. |
| queue | selectors.privacy.outboundReportQueue | Read-only count display ("queued: N"). |

### Mechanics Mapping
- Reads only the staged report and queue. Cannot dispatch any
  gameplay command.
- Submission MUST validate against the schema; failure surfaces a
  modal error (`error.content-report.invalid`).
- Outbound queue persists in IndexedDB `hr-profile.reports` per
  [`persistence.md`](../../../persistence.md).

### Animation Contract
- Modal drops in over the dimmed caller; submit transitions to a
  brief acknowledgment state. Reduced-motion mode preserves visible
  state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup shows the target identity, reason picker, notes textarea,
  optional screenshot attach affordance, queued-count display, and
  the two primary actions (submit, cancel).
- Spec lists all visible regions and authoritative state bindings.
- Interactions cover open, submit, cancel, validation error, and
  the queued state.
- Architecture file contains screen-specific diagrams.
- Data contracts identify schema/config/localization fields required.

### AI Implementation Notes
- Screen slug: `content-report`; system group: `system`; curation
  marker: `curated-pass-1`.
- Localization keys live under `ui.report.*` per
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys).
- Owning task:
  [`tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md`](../../../../../tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md).
