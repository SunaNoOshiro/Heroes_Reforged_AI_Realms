# Developer Mode

> Companion to [`new-install-defaults.md`](./new-install-defaults.md),
> [`pack-trust.md`](./pack-trust.md),
> [`peer-trust.md`](./peer-trust.md),
> [`command-schema.md`](./command-schema.md), and screen
> [`56-options`](./wiki/screens/56-options/). Owns the `config.dev.*`
> namespace, the chord-unlock UX, the double-confirm rule, and the
> persistent banner.

## 1. Reserved Config Keys

`config.dev.*` is a **session-only** namespace. Keys never persist
into stable saves, never serialize to IndexedDB, and never enter
`stateHash` or `canonicalContentHash`.

Closed list:

| Key                          | Purpose                                                | Risk |
|------------------------------|--------------------------------------------------------|------|
| `disableSignatureCheck`      | accept any pack regardless of signature                | high |
| `allowUnsignedPacks`         | skip the unsigned-pack ack in casual lobbies           | high |
| `exposeStateInspector`       | mount the in-app state inspector                       | medium |
| `skipMigrations`             | bypass save migrations on load                         | high |
| `disableHashCheck`           | accept mismatched pack hashes in lobby                 | high |
| `forceDesync`                | test-only desync injection                             | high |

Adding a new `config.dev.*` key requires, in the same PR:

1. A new row in this table.
2. A row in
   [`new-install-defaults.md`](./new-install-defaults.md) with the
   default value.

## 2. Chord-Unlock

The `Developer` tab in
[`56-options`](./wiki/screens/56-options/) is hidden by default. It
unlocks via:

- **Trigger.** Five clicks on the version string in the options
  footer within **3 seconds**.
- **Effect.** Dispatches `REVEAL_DEVELOPER_TAB`
  ([`command-schema.md`](./command-schema.md)) which shows the tab
  for the rest of the session.
- **Scope.** `local-ui` only — never enters the deterministic
  command log, never replicated to peers.
- **Re-arm.** Each new session starts with the tab hidden; the
  chord must be re-entered.

## 3. Double-Confirm

Every toggle inside the Developer tab routes through
[`60-confirmation-dialog`](./wiki/screens/60-confirmation-dialog/)
**twice**. Both confirmations use:

- `severity: 'critical'`
- `requireType: 'DEV'`

| Step | Localization key (per toggle `<key>`)                |
|------|------------------------------------------------------|
| 1    | `developer.toggle.<key>.firstConfirmTitle`           |
| 2    | `developer.toggle.<key>.secondConfirmTitle` (re-arm) |

The toggle flips only after both confirmations succeed. Cancellation
at either step keeps the prior value.

## 4. Banner

While **any** `config.dev.*` key is non-default, the runtime mounts
a persistent top-of-screen banner across every screen.

- Localization key: `developer.banner.active`.
- Undismissible; renders **above** all modal stacks.
- Reduced-motion users see the same banner with animation
  suppressed.

## 5. Session Reset

All `config.dev.*` keys reset to their defaults on app reload. The
runtime never serializes them into IndexedDB, save records, or
replay exports. The chord must be re-entered each session (§ 2).

## 6. CI Enforcement

A CI lint scans `src/` for direct mutations of `config.dev.*` keys
that bypass the toggle helper. The toggle helper is the **single
enforcement point** for the double-confirm rule (§ 3).

## 7. Cross-Cuts

- **Pack trust.** With `disableSignatureCheck === true` the pack
  loader still records the resolved trust state per
  [`pack-trust.md`](./pack-trust.md), but allows the load. Saves
  produced under this mode are tagged with a closed marker so a
  future audit can recognize them.
- **Multiplayer.** `forceDesync` is rejected by the dispatcher when
  **both** of:
  - `state.net.lobby.session.phase === 'in-game'`, and
  - any peer in the lobby has `trustLevel !== 'friend'` per
    [`peer-trust.md`](./peer-trust.md).
  This prevents accidental cross-peer desync injection in casual
  play.
- **Telemetry.** Developer-mode-emitted events are tagged
  `dev: true` in the metrics sink and never count toward production
  telemetry, even when telemetry consent is granted.

---

## 🔍 Sync Check

- **UI: ✔** — `severity: 'critical'` + `requireType: 'DEV'` align with [`60-confirmation-dialog/spec.md`](./wiki/screens/60-confirmation-dialog/spec.md) (the `'DEV'` literal is listed as an accepted `requireType` value). Developer-tab placement and chord-unlock anchor to [`56-options/`](./wiki/screens/56-options/).
- **Schema: ✔** — `config.dev.*` is a runtime-only namespace; no persisted schema row is required (session-only, never written to IndexedDB or save records). `state.net.lobby.session.phase === 'in-game'` matches the path used by [`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md), and `trustLevel === 'friend'` matches the closed enum in [`peer-trust.md`](./peer-trust.md).
- **Tasks: ⚠** — `REVEAL_DEVELOPER_TAB` is registered in [`command-schema.md`](./command-schema.md) as `local-ui`. Two adjacent `config.dev.*` / `state.developer.*` references in other surfaces are not reflected in §§ 1 / 7 of this doc — see Issues below.

## ⚠ Issues

- **`config.dev.enableDebugOverlay` is referenced but not on the closed list.** [`56-options/data-contracts.md`](./wiki/screens/56-options/data-contracts.md), [`67-animation-debug-overlay/spec.md`](./wiki/screens/67-animation-debug-overlay/spec.md) (and `data-contracts.md` / `interactions.md` / `architecture.md` in that package), and [`tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md`](../../tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md) all consume `config.dev.enableDebugOverlay` as a developer-mode gate. § 1 of this doc declares the table the **closed list** of `config.dev.*` keys, so the key must either be added here (and a default row in [`new-install-defaults.md`](./new-install-defaults.md) per § 1) or the screens / task must stop referring to a `config.dev.*` key. Per CLAUDE.md root contract on schema/registry sync, the owner of screens 66/67 (animation debug overlay) closes the gap. Suggested values: key `enableDebugOverlay`, purpose `mount the developer-only animation/debug overlay (screen 66/67)`, risk `low` (presentation-only, dev-build-gated). Skill did not edit cross-checked files (Hard Prohibition D).
- **`state.developer.flags.showMatchKey` cites this doc but is not described here.** [`77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md), [`77-multiplayer-game/data-contracts.md`](./wiki/screens/77-multiplayer-game/data-contracts.md), [`77-multiplayer-game/interactions.md`](./wiki/screens/77-multiplayer-game/interactions.md), and [`tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md`](../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md) gate `MatchKeyDisplay` on `state.developer.flags.showMatchKey` "Per `developer-mode.md`". Screen 77's `data-contracts.md` also names `config.developer.flags.showMatchKey` as a sibling key. This doc only owns `config.dev.*`, not `config.developer.*` / `state.developer.*`. Either (a) add a `showMatchKey` entry under § 1 plus a `state.developer.flags.*` runtime-state subsection here, (b) the screen 77 owner (task `phase-3/01-multiplayer/14`) drops the `developer-mode.md` reference and points at a different owner, or (c) collapse the namespaces (`config.developer.flags.*` → `config.dev.*`). Per CLAUDE.md root contract that stable IDs are public API, do **not** silently rename either side. Skill did not edit cross-checked files (Hard Prohibition D).
