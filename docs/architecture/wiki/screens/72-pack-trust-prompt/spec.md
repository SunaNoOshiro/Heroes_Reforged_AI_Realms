# Screen 72: Pack Trust Prompt

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Per-pack trust review with identity header, signature-tier ribbon
(`signed-known | signed-unknown | unsigned | signature-failed`),
capability disclosure, author-declared content rating, transitive
dependency consent rows, and persistence-scope picker. Per
[`pack-trust.md`](../../../pack-trust.md) §§ 4 (Trust Anchors) and
8 (Content Rating).

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-trust dialog over the dimmed import or manager caller.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in Markdown package files.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| pack | selectors.packs.pendingTrustRequest | `{ id, version, author, contentHash, capabilities, signature, contentRating }`. |
| tier | selectors.packs.signatureTier | `signed-known \| signed-unknown \| unsigned \| signature-failed`. |
| transitive | selectors.packs.pendingTransitive | Per-dependency rows; per-pack consent required. |
| scope | state.ui.packTrust.scope | `session \| save \| global` (default `session`). |
| trustStore | selectors.packs.trustStore | Read-only consult to skip prior decisions. |

### Mechanics Mapping
- Reads pending pack identity and writes a `trust-store.schema.json`
  entry on confirm.
- `signature-failed` is **terminal**: the install button is
  removed entirely. There is no soft-warning click-through.
- `signed-known` ribbon requires a publisher-registry hit; otherwise
  the ribbon falls back to `signed-unknown` or `unsigned`.

### Animation Contract
- Ribbon stamps colour per tier (green / amber / red / black).
  Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup shows the four ribbon tiers, capability list, transitive
  rows, scope picker, and four primary actions.
- Spec lists all visible regions and authoritative state bindings.
- Interactions cover trust / sandboxed / deny / cancel and the
  per-transitive consent rule.
- Architecture file contains screen-specific diagrams.
- Data contracts identify schema/config/localization fields required.

### AI Implementation Notes
- Screen slug: `pack-trust-prompt`; system group: `system`;
  curation marker: `curated-pass-1`.
- Localization keys live under `ui.pack-trust.*`. All copy follows
  [`pack-trust.md` § Trust & Safety Phrasing](../../../pack-trust.md#7-trust--safety-phrasing).
- Owning task:
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md).
