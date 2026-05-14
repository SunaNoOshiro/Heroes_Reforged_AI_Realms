# Screen 71: Pack Manager

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`pack-trust.md`](../../../pack-trust.md) — single source of truth
  for trust anchors (§ 4), safe mode (§ 5), modded indicator (§ 6),
  and safety phrasing (§ 7).
- Sibling screens: [`72-pack-trust-prompt/`](../72-pack-trust-prompt/)
  (review surface), [`60-confirmation-dialog/`](../60-confirmation-dialog/)
  (destructive gate), [`54-system-menu/`](../54-system-menu/)
  (caller).
- Schemas:
  [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json),
  [`trust-store.schema.json`](../../../../../content-schema/schemas/trust-store.schema.json),
  [`publisher-registry.schema.json`](../../../../../content-schema/schemas/publisher-registry.schema.json),
  [`pack-revocation-list.schema.json`](../../../../../content-schema/schemas/pack-revocation-list.schema.json).

### Description
Tabular surface that enumerates installed packs, distinguishes
trusted from sandboxed, and surfaces install / trust / sandboxed /
revoke / remove / close actions. The install and upgrade-to-trust
paths hand off to screen 72 for the actual decision; downgrade
(sandboxed) and destructive (revoke / remove) paths stay on this
screen and route through `60-confirmation-dialog` where required.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-list dialog over the dimmed caller (typically
  `54-system-menu`).
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the sibling Markdown files.

### Component Tree
- `PackManager`
  - `FilterRow` — chips for `all | canonical | third-party |
    sandboxed | denied`.
  - `InstalledPackTable` — one row per installed pack with id,
    version, author, decision badge, capability summary, and
    `contentHash` prefix.
  - `EmptyState` — shown when only canonical packs are installed
    (mockup line `empty-state: only canonical content is
    installed.`).
  - `ActionFooter` — Install pack… / Trust / Sandboxed / Revoke
    trust / Remove / Close.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `installed` | `selectors.packs.installed` | Ordered manifest snapshots for every mounted or installed pack. |
| `trustStore` | `selectors.packs.trustStore` | Persisted trust decisions per `(packId, contentHash)`. |
| `filter` | `state.ui.packManager.filter` | `all \| canonical \| third-party \| sandboxed \| denied`. |
| `selectedPackId` | `state.ui.packManager.selectedPackId` | Highlights the row whose actions are active. |
| `modeIndicator` | `selectors.session.moddedIndicator` | Closed enum `off \| trusted \| sandboxed \| mixed`; mirrors the status-bar badge from [`pack-trust.md` § 6](../../../pack-trust.md#6-modded-indicator). |

### Mechanics Mapping
- Reads pack registries; never mutates engine gameplay state.
- All trust-decision writes go through `GRANT_PACK_TRUST` (via
  screen 72), `RUN_PACK_SANDBOXED`, `DENY_PACK_TRUST` (via screen
  72), or `REVOKE_PACK_TRUST`. Trust-store keys on
  `(packId, contentHash)`; a content-hash change re-prompts per
  [`pack-trust.md` § 4](../../../pack-trust.md#4-trust-anchors).
- The install path runs the ZIP traversal sanitizer per
  [`pack-trust.md` § 1](../../../pack-trust.md#1-resource-limits)
  before opening screen 72.

### Animation Contract
- Row highlight slides on selection; trust-state badge transitions
  colour on decision write (green=trusted, amber=sandboxed,
  red=denied, black=signature-failed). Reduced-motion mode
  preserves visible state changes with static highlights and
  localized feedback.

### Acceptance Criteria
- Mockup shows the filter row, the installed-pack table, the
  empty-state line, and the action footer.
- Spec lists every visible region, the empty-state, and every
  authoritative state binding.
- Interactions cover install / trust / sandboxed / revoke / remove
  / close / filter.
- Architecture file contains screen-specific diagrams that mirror
  the interaction routes.
- Data contracts identify every schema, config, localization,
  asset, sound, and VFX field required to implement the screen.

### AI Implementation Notes
- Screen slug: `pack-manager`; system group: `system`; curation
  marker: `curated-pass-1`.
- Localization keys live under `ui.pack-manager.*` and
  `ui.pack-trust.*`; all copy follows
  [`pack-trust.md` § 7](../../../pack-trust.md#7-trust--safety-phrasing).
- Owning task:
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md).

---

## 🔍 Sync Check

- **UI: ⚠** — Component tree, state bindings, and action footer
  match `mockup.html` and sibling
  [`interactions.md`](./interactions.md) /
  [`architecture.md`](./architecture.md). Caller chain to
  [`54-system-menu/interactions.md`](../54-system-menu/interactions.md)
  (`system.managePacks` → `OPEN_PACK_MANAGER`) resolves. Empty-state
  copy lacks a `data-i18n` attribute on the mockup — flagged in
  Issues.
- **Schema: ✔** — Selectors mirror
  [`data-contracts.md`](./data-contracts.md);
  `trust-store.schema.json` keys on `(packId, contentHash)` with
  `decision ∈ {trust, sandboxed, deny}` and `scope ∈ {session, save,
  global}`; `manifest.signature.scheme = "ed25519"` and the
  `capabilities` enum match [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json).
- **Tasks: ✔** — Owning task
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  lists this file under Read First and reserves
  `src/ui/screens/pack-manager-screen.tsx`.

## ⚠ Issues

- **Empty-state copy not registered.** `mockup.html` shows the line
  `empty-state: only canonical content is installed.` without a
  `data-i18n` attribute, and sibling
  [`data-contracts.md`](./data-contracts.md) Localization Keys
  section does not yet enumerate a key for it. The other mockup
  rows (`ui.pack-manager.filter.title`,
  `ui.pack-manager.list.title`, `ui.pack-manager.actions.title`)
  resolve through `data-i18n` attributes; the empty-state line
  needs the same treatment. Per CLAUDE.md
  ([`untrusted-strings.md`](../../../untrusted-strings.md) and the
  localization rule in
  [`pack-trust.md` § 7](../../../pack-trust.md#7-trust--safety-phrasing)),
  player-facing strings must resolve through the localization
  runtime. Owner: the screen-implementation task
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  must (a) add a `data-i18n` attribute to the mockup line, and
  (b) add the matching key to
  [`data-contracts.md`](./data-contracts.md) Localization Keys.
  Suggested key: `ui.pack-manager.empty.canonical-only`.
  Skill did not invent the key (Hard Prohibition B) and did not
  edit the mockup (audit reference only).
