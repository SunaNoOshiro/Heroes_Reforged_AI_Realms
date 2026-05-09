# New-Install Safe Defaults

> Companion to [`onboarding.md`](./onboarding.md),
> [`age-gate.md`](./age-gate.md),
> [`privacy.md`](./privacy.md), and
> [`developer-mode.md`](./developer-mode.md).  (Risk
> "Hidden telemetry default") introduces this canonical inventory of
> default-state for every optional feature.

A new install starts in **safe mode**. Every entry below is the
default value the runtime reads when no prior preference is on disk.
Any change to a default — adding a feature, flipping a default,
introducing a new flag — MUST update this document in the same PR.

## 1. Defaults Table

| Feature                          | Default               | Source of truth                                  |
|----------------------------------|-----------------------|--------------------------------------------------|
| Storage (IndexedDB)              | granted (required)    | [`onboarding.md`](./onboarding.md)               |
| Multiplayer                      | unset → must opt in   | [`onboarding.md`](./onboarding.md)               |
| AI generation                    | unset → must opt in   | [`onboarding.md`](./onboarding.md)               |
| Telemetry                        | denied (off)          | [`onboarding.md`](./onboarding.md), [`privacy.md`](./privacy.md) |
| Crash reports                    | denied                | [`onboarding.md`](./onboarding.md), [`privacy.md`](./privacy.md) |
| Analytics SDK                    | denied (no SDK ships) | [`privacy.md`](./privacy.md)                     |
| Public lobby browser             | not implemented       | [`lobby-identifiers.md`](./lobby-identifiers.md) |
| Pack signature checks            | enabled               | [`pack-trust.md`](./pack-trust.md)               |
| Pack hash check                  | enabled               | [`pack-trust.md`](./pack-trust.md)               |
| Developer mode                   | off (chord-unlock only) | [`developer-mode.md`](./developer-mode.md)     |
| Age gate                         | `unknown` (treated as `under13`) | [`age-gate.md`](./age-gate.md)        |
| Mature-content gate              | denied                | [`privacy-options.schema.json`](../../content-schema/schemas/privacy-options.schema.json) |
| Display-name mode                | `hashed`              | [`privacy-options.schema.json`](../../content-schema/schemas/privacy-options.schema.json) |
| `prefers-reduced-motion`         | (system) honored until first gesture | [`autoplay-policy.md`](./autoplay-policy.md) |
| Media autoplay                   | muted until first gesture | [`autoplay-policy.md`](./autoplay-policy.md) |
| URL deep-link state changes      | always confirmation-gated | [`url-routing.md`](./url-routing.md)         |
| `registerProtocolHandler`        | banned at v1          | [`url-routing.md`](./url-routing.md)             |
| `localStorage` writes            | banned                | [`persistence.md`](./persistence.md)             |
| `document.cookie`                | banned                | [`persistence.md`](./persistence.md)             |
| Notifications                    | not requested         | [`permissions.md`](./permissions.md)             |
| Microphone / Camera              | banned at v1          | [`permissions.md`](./permissions.md)             |
| Clipboard read                   | banned at v1          | [`permissions.md`](./permissions.md)             |
| Persistent storage prompt        | JIT only after first save | [`permissions.md`](./permissions.md)         |

## 2. CI Enforcement

A CI lint asserts that any `config.privacy.*` or `config.dev.*` field
referenced in `src/` has a default declared in this document. The
lint also asserts that any new feature flag introduced in
[`onboarding.md`](./onboarding.md), [`developer-mode.md`](./developer-mode.md),
or any `tasks/**/*.md` is reflected here.

Failures fail `npm run validate`.

## 3. Cross-Cuts

- **Save imports**: an imported save's `ConsentSnapshot` is **never**
  auto-applied; the importer routes through onboarding with
  `method: 'import'`.
- **Pack imports**: an imported pack inherits the local trust-store
  defaults; signature checks remain enabled.
- **Multiplayer**: `consent.multiplayer === 'unset'` blocks
  `RTCPeerConnection` instantiation; the lobby URL handler still
  parses the fragment but the join is gated by the consent prompt.

## 4. Adding A New Feature Default

1. Add a row above (with a source-of-truth link).
2. If the feature persists state, add a row in
   [`data-inventory.md`](./data-inventory.md).
3. If the feature reads a permission, add a row in
   [`permissions.md`](./permissions.md).
4. If the feature gates a destructive surface, route through
   [`60-confirmation-dialog`](./wiki/screens/60-confirmation-dialog/)
   per the click-through-resistance rules.
