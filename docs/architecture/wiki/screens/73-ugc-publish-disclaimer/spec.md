# Screen 73: UGC Publish Disclaimer

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Per-pack content-policy modal shown before any user-generated or
AI-generated pack is exported to disk. Records a per-pack ack
(timestamp + policy-version hash) into a `signed-acks/<contentHash>.json`
companion file inside the `.hrmod`. No network upload — local export
only at v1, per [`ugc-safety.md`](../../../ugc-safety.md).

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-disclosure modal over the dimmed Map Editor or AI-pipeline
  Stage 6 caller.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in Markdown package files.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| pack | selectors.publish.candidatePack | `{ id, version, contentHash, source: "map-editor" \| "ai-stage-6" }`. |
| policyVersion | selectors.publish.policyVersion | Hash of the active content-policy doc; written into the ack. |
| acks | state.ui.publish.acks | `{ rights: boolean, policy: boolean }` checkbox state. |
| destination | state.ui.publish.destination | OS file-picker result (FS-Access-API or download blob). |

### Mechanics Mapping
- Reads only the candidate pack. Cannot mutate any deterministic
  gameplay state.
- Both checkboxes MUST be true before `ACCEPT_PUBLISH_DISCLAIMER`
  enables; the export button is disabled otherwise.
- Per-pack acceptance, never per-session; the ack file lives inside
  the exported archive.

### Animation Contract
- Modal drops in over the dimmed caller; ack rows highlight on
  toggle. Reduced-motion mode preserves visible state changes with
  static highlights and localized feedback.

### Acceptance Criteria
- Mockup shows the policy bullets, two ack checkboxes, the export
  affordance, and the cancel affordance.
- Spec lists all visible regions and authoritative state bindings.
- Interactions cover ack toggle, accept, cancel, and the
  disabled-export case.
- Architecture file contains screen-specific diagrams.
- Data contracts identify schema/config/localization fields required.

### AI Implementation Notes
- Screen slug: `ugc-publish-disclaimer`; system group: `system`;
  curation marker: `curated-pass-1`.
- Localization keys live under `ui.publish.policy.*` per
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys).
- Owning task:
  [`tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md).
