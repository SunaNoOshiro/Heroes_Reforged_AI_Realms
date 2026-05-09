# Developer Mode

> Companion to [`new-install-defaults.md`](./new-install-defaults.md),
> [`pack-trust.md`](./pack-trust.md), and screen
> [`56-options`](./wiki/screens/56-options/). This file introduces
> the `config.dev.*` keys, the chord-unlock UX, the double-confirm
> rule, and the persistent banner.

## 1. Reserved Config Keys

`config.dev.*` keys are **session-only**. They never persist into
stable saves and never enter `stateHash` or `canonicalContentHash`.
The closed list:

| Key                          | Purpose                                                | Risk |
|------------------------------|--------------------------------------------------------|------|
| `disableSignatureCheck`      | accept any pack regardless of signature                | high |
| `allowUnsignedPacks`         | skip the unsigned-pack ack in casual lobbies           | high |
| `exposeStateInspector`       | mount the in-app state inspector                       | medium |
| `skipMigrations`             | bypass save migrations on load                         | high |
| `disableHashCheck`           | accept mismatched pack hashes in lobby                 | high |
| `forceDesync`                | test-only desync injection                             | high |

Any new `config.dev.*` key MUST update this table and add a row in
[`new-install-defaults.md`](./new-install-defaults.md).

## 2. Chord-Unlock

The `Developer` tab in `56-options` is hidden by default. Five
sequential clicks on the version string in the options footer within
3 seconds dispatch `REVEAL_DEVELOPER_TAB`, which shows the tab for
the remainder of the session. The chord is local-ui only and never
enters the deterministic command log.

## 3. Double-Confirm

Each toggle inside the Developer tab routes through
[`60-confirmation-dialog`](./wiki/screens/60-confirmation-dialog/)
**twice**:

1. First confirmation: `severity: 'critical'`, `requireType: 'DEV'`,
   localized title `developer.toggle.<key>.firstConfirmTitle`.
2. Second confirmation (re-arm): same severity and `requireType`,
   localized title `developer.toggle.<key>.secondConfirmTitle`.

The toggle flips only after both confirmations succeed; cancellation
at either step keeps the prior value.

## 4. Banner

While **any** `config.dev.*` key is non-default, the runtime mounts a
persistent top-of-screen banner across every screen. Localization key
`developer.banner.active`. The banner is **undismissible** and renders
above all modal stacks. Reduced-motion users see the same banner with
animation suppressed.

## 5. Session Reset

All `config.dev.*` keys reset to their defaults on app reload. The
runtime never serializes them into IndexedDB, save records, or replay
exports. The chord must be re-entered each session.

## 6. CI Enforcement

A CI lint scans `src/` for direct mutations of `config.dev.*` keys
that bypass the toggle helper. The toggle helper is the single
enforcement point for the double-confirm rule.

## 7. Cross-Cuts

- **Pack trust**: with `disableSignatureCheck === true`, the pack
  loader still records the resolved trust state per
  [`pack-trust.md`](./pack-trust.md), but allows the load. Saves
  produced under this mode are tagged with a closed marker so a future
  audit can recognize them.
- **Multiplayer**: `forceDesync` is rejected by the dispatcher when
  `state.net.lobby.session.phase === 'in-game'` and the lobby includes
  a peer whose `trustLevel` is not `friend`. This prevents accidental
  cross-peer desync injection in casual play.
- **Telemetry**: developer-mode-emitted events are tagged
  `dev: true` in the metrics sink and never count toward production
  telemetry, even when telemetry consent is granted.
