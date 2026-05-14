# New-Install Safe Defaults

> Companion to [`onboarding.md`](./onboarding.md),
> [`age-gate.md`](./age-gate.md),
> [`privacy.md`](./privacy.md), and
> [`developer-mode.md`](./developer-mode.md). Canonical inventory of
> the on-disk default value the runtime reads when no prior preference
> exists for any optional feature.

A new install boots in **safe mode**. Every row below is the default
value the runtime reads when no prior preference is stored. Any
change to a default — adding a feature, flipping a default,
introducing a new flag — MUST update this document in the same PR.

## 1. Defaults table

| Feature | Default | Source of truth |
|---|---|---|
| Storage (IndexedDB) | granted (required) | [`onboarding.md`](./onboarding.md) |
| Multiplayer | unset → must opt in | [`onboarding.md`](./onboarding.md) |
| AI generation | unset → must opt in | [`onboarding.md`](./onboarding.md) |
| Telemetry | denied (off) | [`onboarding.md`](./onboarding.md), [`privacy.md`](./privacy.md) |
| Crash reports | denied | [`onboarding.md`](./onboarding.md), [`privacy.md`](./privacy.md) |
| Analytics SDK | denied (no SDK ships) | [`privacy.md`](./privacy.md) |
| Public lobby browser | not implemented | [`lobby-identifiers.md`](./lobby-identifiers.md) |
| Pack signature checks | enabled | [`pack-trust.md`](./pack-trust.md) |
| Pack hash check | enabled | [`pack-trust.md`](./pack-trust.md) |
| Developer mode | off (chord-unlock only) | [`developer-mode.md`](./developer-mode.md) |
| Age gate | `unknown` (treated as `under13`) | [`age-gate.md`](./age-gate.md) |
| Mature-content gate | denied | [`privacy-options.schema.json`](../../content-schema/schemas/privacy-options.schema.json) |
| Display-name mode | `hashed` | [`privacy-options.schema.json`](../../content-schema/schemas/privacy-options.schema.json) |
| `prefers-reduced-motion` | (system) honored until first gesture | [`autoplay-policy.md`](./autoplay-policy.md) |
| Media autoplay | muted until first gesture | [`autoplay-policy.md`](./autoplay-policy.md) |
| URL deep-link state changes | always confirmation-gated | [`url-routing.md`](./url-routing.md) |
| `registerProtocolHandler` | banned at v1 | [`url-routing.md`](./url-routing.md) |
| `localStorage` writes | banned | [`persistence.md`](./persistence.md) |
| `document.cookie` | banned | [`persistence.md`](./persistence.md) |
| Notifications | not requested | [`permissions.md`](./permissions.md) |
| Microphone / Camera | banned at v1 | [`permissions.md`](./permissions.md) |
| Clipboard read | banned at v1 | [`permissions.md`](./permissions.md) |
| Persistent storage prompt | JIT only after first save | [`permissions.md`](./permissions.md) |

## 2. CI enforcement

A CI lint asserts:

- every `config.privacy.*` or `config.dev.*` field referenced in
  `src/` has a default declared in this document;
- every feature flag introduced in
  [`onboarding.md`](./onboarding.md),
  [`developer-mode.md`](./developer-mode.md), or any
  `tasks/**/*.md` is reflected here.

Failures fail `npm run validate`.

## 3. Cross-cuts

- **Save imports.** An imported save's `ConsentSnapshot` is **never**
  auto-applied; the importer routes through onboarding with
  `method: 'import'` per
  [`onboarding.md` § 6](./onboarding.md#6-save-imports).
- **Pack imports.** An imported pack inherits the local trust-store
  defaults; signature checks remain enabled per
  [`pack-trust.md` § 4](./pack-trust.md#4-trust-anchors).
- **Multiplayer.** `consent.multiplayer === 'unset'` blocks
  `RTCPeerConnection` instantiation; the lobby URL handler still
  parses the fragment, but the join is gated by the consent prompt.

## 4. Adding a new feature default

1. Add a row to § 1 with a source-of-truth link.
2. If the feature persists state, add a row in
   [`data-inventory.md`](./data-inventory.md).
3. If the feature reads a permission, add a row in
   [`permissions.md`](./permissions.md).
4. If the feature gates a destructive surface, route through
   [`60-confirmation-dialog`](./wiki/screens/60-confirmation-dialog/)
   per its click-through-resistance rules.

---

## 🔍 Sync Check

- **UI: ✔** — Confirmation routing for destructive defaults
  resolves to [`60-confirmation-dialog/spec.md`](./wiki/screens/60-confirmation-dialog/spec.md)
  (`severity` / `confirmDelayMs` / `requireType` exist as documented).
  Onboarding rows reflect [`76-onboarding-consent`](./wiki/screens/76-onboarding-consent/)
  toggles per [`onboarding.md` § 3](./onboarding.md#3-onboarding-flow).
- **Schema: ✔** — `displayNameMode` default `'hashed'`,
  `allowMatureContent` default `false`, and `analyticsOptIn` default
  `false` match
  [`privacy-options.schema.json`](../../content-schema/schemas/privacy-options.schema.json).
  `ConsentScope` enum (`storage | multiplayer | aiGeneration |
  telemetry | crashReports | analytics | unsignedPacks`) per
  [`onboarding.md` § 2](./onboarding.md#2-consent-scopes) covers every
  consent-tier row in § 1; `unsignedPacks` is intentionally absent
  from this table because it is a per-lobby `method: session` ack,
  not a persisted on-disk default.
- **Tasks: ⚠** — No `tasks/**/*.md` lists this doc in its *Read
  First* or claims ownership of the § 2 lint, even though § 2
  declares a CI gate. See `## ⚠ Issues`.

## ⚠ Issues

- **No task owns the § 2 CI lint.** § 2 declares a lint that
  cross-checks `config.privacy.*` / `config.dev.*` defaults in `src/`
  against this document, and another that asserts every feature flag
  in [`onboarding.md`](./onboarding.md),
  [`developer-mode.md`](./developer-mode.md), and `tasks/**/*.md` is
  reflected here. A repo-wide `Grep` for `new-install-defaults`
  finds zero references in `tasks/` and no implementing script under
  `scripts/`. Per CLAUDE.md root contract ("Failures fail
  `npm run validate`"), the lint must exist before any new
  `config.privacy.*` / `config.dev.*` field lands. Suggested values:
  add a task under `tasks/mvp/07-ui-shell/` (or the closest
  privacy/onboarding cluster) that owns
  `scripts/check-new-install-defaults.mjs` and lists this doc in its
  *Read First*. Skill did not create the task (Hard Prohibition B —
  never invent features; D — never edit cross-checked files).
- **Developer-mode `disableHashCheck` not surfaced as a row.**
  [`developer-mode.md` § 1](./developer-mode.md#1-reserved-config-keys)
  lists `disableHashCheck` as one of six closed `config.dev.*` keys
  and requires "a row in `new-install-defaults.md` with the default
  value" for every key (§ 1 closing rule). § 1 of this doc collapses
  the six developer-mode keys into a single `Developer mode | off`
  row, which technically satisfies the spirit but does not give per-
  key defaults. Not CI-blocking today (the umbrella row is
  load-bearing because § 5 of `developer-mode.md` resets the whole
  namespace per session), but a future drift in any single key
  cannot be caught row-by-row from this table. Suggested values:
  either expand § 1 with one row per `config.dev.*` key (default
  `off` for each), or add a one-line note here pointing readers at
  `developer-mode.md` § 1 as the per-key default registry. Skill
  preserved the existing collapsed row to avoid changing meaning
  (Hard Prohibition A) and surfaces the gap here instead.
