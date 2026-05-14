# Screen 73: UGC Publish Disclaimer

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Per-pack content-policy modal shown before any user- or AI-generated
pack is exported to disk. On accept, writes
`signed-acks/<contentHash>.json` (timestamp + `policyVersion` hash)
inside the `.hrmod` archive. No network upload at v1 — local export
only, per [`ugc-safety.md`](../../../ugc-safety.md).

### Visual Direction
Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-disclosure modal over the dimmed Map Editor (screen 65) or
  AI-pipeline Stage 6 caller.
- `mockup.html` carries the visible UI only; logic, transitions, and
  implementation notes live in the other markdown files of this
  package.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| pack | `selectors.publish.candidatePack` | `{ id, version, contentHash, source: "map-editor" \| "ai-stage-6" }`. |
| policyVersion | `selectors.publish.policyVersion` | Hex hash of the active content-policy doc; written into the ack. |
| acks | `state.ui.publish.acks` | `{ rights: boolean, policy: boolean }`. |
| destination | `state.ui.publish.destination` | OS file-picker result (FS-Access-API handle or download blob). |

### Mechanics Mapping
- Reads only the candidate pack; cannot mutate deterministic gameplay
  state.
- Both checkboxes MUST be true before `ACCEPT_PUBLISH_DISCLAIMER`
  enables; the export button is disabled (not hidden) otherwise.
- Acceptance is per-pack, never per-session: the ack file lives
  inside the exported archive, not in the trust store or any save
  record.

### Animation Contract
- Modal drops in over the dimmed caller; ack rows highlight on
  toggle. Reduced-motion mode preserves visible state changes with
  static highlights and localized feedback.

### Acceptance Criteria
- Mockup renders policy bullets, two ack checkboxes, the export
  affordance, and the cancel affordance.
- Spec enumerates every visible region and authoritative state
  binding.
- Interactions cover ack toggle, accept, cancel, and the
  disabled-export case.
- Architecture diagrams describe the same flow as interactions, with
  no new behavior.
- Data contracts identify every schema, config, and localization
  field the screen consumes.

### AI Implementation Notes
- Screen slug: `ugc-publish-disclaimer`; system group: `system`;
  curation marker: `curated-pass-1`.
- Localization keys live under `ui.publish.policy.*` per
  [`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys).
- Owning task:
  [`tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md).

---

## 🔍 Sync Check

- **UI: ✔** — Visible regions, state bindings, and reduced-motion
  behavior match sibling
  [`interactions.md`](./interactions.md),
  [`architecture.md`](./architecture.md), and the SVG mockup at
  [`mockup.html`](./mockup.html).
- **Schema: ✔** — `selectors.publish.candidatePack` shape consumes
  [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json)
  (`id`, `version`, `aiProvenance`); copy resolves through
  [`localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json)
  per [`ugc-safety.md` § 7](../../../ugc-safety.md#7-localization-keys);
  the `signed-acks/<contentHash>.json` row is registered in
  [`data-inventory.md`](../../../data-inventory.md) (`signed publish
  ack`).
- **Tasks: ✔** — Owning task
  [`tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md)
  reads first this screen package and
  [`ugc-safety.md`](../../../ugc-safety.md); registered in
  `tasks/task-registry.json` with the matching `readFirst` list.

## ⚠ Issues

_None._
