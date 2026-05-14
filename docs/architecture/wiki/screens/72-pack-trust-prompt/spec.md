# Screen 72: Pack Trust Prompt

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`pack-trust.md`](../../../pack-trust.md) — anchors
  [§ 4 Trust Anchors](../../../pack-trust.md#4-trust-anchors),
  [§ 5 Safe Mode](../../../pack-trust.md#5-safe-mode),
  [§ 6 Modded Indicator](../../../pack-trust.md#6-modded-indicator),
  [§ 7 Trust & Safety Phrasing](../../../pack-trust.md#7-trust--safety-phrasing),
  [§ 8 Content Rating](../../../pack-trust.md#8-content-rating),
  [§ 10 Error Codes](../../../pack-trust.md#10-error-codes).
- Owning task:
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md).

### Description
Per-pack trust review. Renders identity, signature-tier ribbon,
capability disclosure, author-declared content rating, transitive-
dependency consent rows, and persistence-scope picker. Writes a
[`trust-store.schema.json`](../../../../../content-schema/schemas/trust-store.schema.json)
entry on confirm. Decisions key on `(packId, contentHash)` — a content
change re-prompts.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-trust dialog over the dimmed caller (screen 70 or 71).
- `mockup.html` is the visible-UI reference only; logic and timing
  live in `interactions.md` and `architecture.md`.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `pack` | `selectors.packs.pendingTrustRequest` | `{ id, version, author, contentHash, capabilities, signature, contentRating }`. |
| `tier` | `selectors.packs.signatureTier` | `signed-known \| signed-unknown \| unsigned \| signature-failed`. |
| `transitive` | `selectors.packs.pendingTransitive` | Per-dependency rows; per-pack consent required. |
| `scope` | `state.ui.packTrust.scope` | `session \| save \| global` (default `session`). |
| `trustStore` | `selectors.packs.trustStore` | Read-only; consulted to skip prior decisions. |

### Mechanics Mapping
- Tier is computed per
  [`pack-trust.md` § Trust-tier ribbon](../../../pack-trust.md#trust-tier-ribbon):
  `signed-known` requires a `publisher-registry` hit on
  `manifest.signature.keyId`; otherwise the ribbon falls back to
  `signed-unknown` or `unsigned`.
- `signature-failed` is **terminal**: the `Trust this pack` control
  is removed entirely. There is no soft-warning click-through.
- Revocation entries with `reason ∈ {malware, tampered}` refuse mount
  outright (`ui.pack-trust.error.revoked`); `reason ∈ {deprecated,
  user-revoked}` ceiling the decision at `sandboxed`.
- Per-transitive consent is required — there is no `Trust all`
  control. Each dependency row writes its own trust-store decision.
- Author-declared `manifest.contentRating` is **advisory only**;
  surfaced under "Author-declared content". Not consumed by
  gameplay or matchmaking gates in v1.

### Animation Contract
- Ribbon stamps colour per tier (green / amber / red / black).
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup shows the four ribbon tiers, capability list, transitive
  rows, scope picker, and the four primary actions
  (`Trust this pack`, `Run sandboxed`, `Deny`, `Cancel`).
- Spec lists all visible regions and authoritative state bindings.
- Interactions cover trust / sandboxed / deny / cancel and the
  per-transitive consent rule.
- `architecture.md` contains screen-specific diagrams (tier
  selection, trust-decision write).
- `data-contracts.md` enumerates the schemas, config, localization,
  and asset IDs the screen depends on.

### AI Implementation Notes
- Screen slug: `pack-trust-prompt`; system group: `system`;
  curation marker: `curated-pass-1`.
- Localization keys live under `ui.pack-trust.*`. All copy follows
  [`pack-trust.md` § Trust & Safety Phrasing](../../../pack-trust.md#7-trust--safety-phrasing).
- The trust store is the only persisted output (IndexedDB
  `hr-trust.decisions`); registered in
  [`data-inventory.md`](../../../data-inventory.md) under
  `trust store`.

---

## 🔍 Sync Check

- **UI: ✔** — Regions, controls, and bindings match
  [`mockup.html`](./mockup.html), [`interactions.md`](./interactions.md),
  [`data-contracts.md`](./data-contracts.md), and
  [`architecture.md`](./architecture.md); ribbon tiers and decision
  enum align with
  [`pack-trust.md` § 4](../../../pack-trust.md#4-trust-anchors).
- **Schema: ✔** — `decision` enum (`trust | sandboxed | deny`),
  `scope` enum (`session | save | global`), and ribbon-tier enum
  match
  [`trust-store.schema.json`](../../../../../content-schema/schemas/trust-store.schema.json),
  [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json)
  (`signature`, `capabilities`, `contentRating`),
  [`publisher-registry.schema.json`](../../../../../content-schema/schemas/publisher-registry.schema.json),
  and
  [`pack-revocation-list.schema.json`](../../../../../content-schema/schemas/pack-revocation-list.schema.json).
- **Tasks: ✔** — Owning task
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  references this file in `Read First` and reserves the screen and
  trust-store paths; trust-store row registered in
  [`data-inventory.md`](../../../data-inventory.md).

## ⚠ Issues

- **Local-ui tokens `CLOSE_PACK_TRUST_PROMPT`, `SET_PACK_TRUST_SCOPE`,
  `TOGGLE_PACK_TRUST_TRANSITIVE` are not enumerated in
  [`command-schema.md`](../../../command-schema.md).** The
  Save-Import & Pack-Trust section of `command-schema.md` lists
  `OPEN_PACK_TRUST_PROMPT`, `GRANT_PACK_TRUST`, `DENY_PACK_TRUST`,
  `RUN_PACK_SANDBOXED`, and `REVOKE_PACK_TRUST`, but the three
  tokens above (used by sibling `interactions.md` and
  `data-contracts.md` to drive cancel / scope-radio / transitive-
  checkbox behaviour) are absent. Per CLAUDE.md ("Stable IDs are
  public API") and the screen-coverage gate
  [`screen-command-coverage.json`](../../../screen-command-coverage.json),
  the owning task
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  must either add them as `local-ui` rows to the same section or
  mark them out-of-scope. Skill did not edit `command-schema.md`
  (Hard Prohibition D).
