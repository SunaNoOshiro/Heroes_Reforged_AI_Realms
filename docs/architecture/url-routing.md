# URL & Deep-Link Contract

Closed allowlist for inbound query params and the dispatch path
they take. Every state-changing URL handler routes through
[`60-confirmation-dialog`](./wiki/screens/60-confirmation-dialog/)
**before** any underlying command fires, so a one-click malicious
link cannot mutate state on parse alone.

Companion docs:
- [`60-confirmation-dialog/spec.md` § Click-Through Resistance](./wiki/screens/60-confirmation-dialog/spec.md#click-through-resistance)
  — the per-severity `confirmDelayMs` / `requireType` defaults the
  URL handler inherits.
- [`62-multiplayer-setup/spec.md`](./wiki/screens/62-multiplayer-setup/spec.md)
  — canonical invite-URL shape and fragment-only rule for secrets.
- [`70-save-import`](./wiki/screens/70-save-import/) and
  [`71-pack-manager`](./wiki/screens/71-pack-manager/) — confirm-side
  destinations for save and pack URL deep-links.
- [`lobby-identifiers.md`](./lobby-identifiers.md) — `?lobby=CODE`
  alphabet, length, and validation.
- [`permissions.md`](./permissions.md) — amendment required before
  any future `registerProtocolHandler` flip.

## 1. Accepted query params

The runtime parses **only** the params below. Unknown params are
dropped silently with a single `console.warn` per session.

| Param         | `pendingAction`            | `severity` | `requireType` | Notes |
|---------------|----------------------------|------------|---------------|-------|
| `?lobby=CODE` | `JOIN_MULTIPLAYER_SESSION` | `warning`  | (none)        | `CODE` per [`lobby-identifiers.md`](./lobby-identifiers.md); the matching secret rides the URL fragment (§ 3). |
| `?campaign=`  | `LOAD_CAMPAIGN_FROM_URL`   | `warning`  | (none)        | Loads a known campaign by ID; no remote fetch. |
| `?packId=`    | `INSTALL_PACK_FROM_URL`    | `critical` | `'INSTALL'`   | Pack must already be in the local cache or canonical-packs registry; never fetched from the URL alone. |
| `?import=`    | `IMPORT_SAVE_FROM_URL`     | `critical` | `'IMPORT'`    | Save body must be local; the URL only addresses an already-staged file. |

`severity` and `requireType` populate the
[`REQUEST_CONFIRMATION`](./command-schema.md) payload; per-severity
`confirmDelayMs` defaults come from the
[`60-confirmation-dialog` click-through-resistance table](./wiki/screens/60-confirmation-dialog/spec.md#click-through-resistance).

## 2. Confirmation routing

For every accepted param, the URL handler:

1. Validates the param shape against a closed regex. Invalid shapes
   are dropped silently — no dispatch, no toast, no error.
2. Dispatches `REQUEST_CONFIRMATION` with the row's `pendingAction`,
   `severity`, and (when set) `requireType`. `confirmDelayMs` is
   inherited from the per-severity default unless the caller
   overrides.
3. On `Confirm`, the dialog runs the queued `pendingAction`. On
   `Cancel`, the pending action is cleared and the user is routed
   back to [`01-main-menu`](./wiki/screens/01-main-menu/).

The underlying command **never** fires from URL parse alone — the
confirmation dialog is the single dispatch boundary for URL-triggered
mutations.

## 3. Fragment discipline

Per [`62-multiplayer-setup/spec.md`](./wiki/screens/62-multiplayer-setup/spec.md),
secrets ride the URL **fragment** (after `#`) so they avoid `Referer`
headers, browser history, and OS clipboard sync. On every accepted
deep-link the handler:

1. Reads the fragment.
2. Calls `history.replaceState(null, '', location.pathname)` to scrub
   the URL bar before any UI mounts.
3. Sets the response's `Referrer-Policy: no-referrer`.

URL routing reuses this exact contract; no other surface may read
`location.hash`.

## 4. Protocol handlers

`navigator.registerProtocolHandler` is **forbidden** at v1. A future
`web+heroes://…` registration MUST be:

- User-initiated from a button in
  [`56-options`](./wiki/screens/56-options/).
- Documented here.
- Backed by an architecture amendment + a new row in
  [`permissions.md`](./permissions.md).

## 5. CI enforcement

A CI lint scans `src/` for:

- `URLSearchParams` consumers outside the URL-routing module.
- `window.location.hash` reads outside the fragment helper.
- `navigator.registerProtocolHandler` calls (banned).

Each match must import the URL-routing helper or carry an explicit
allowlist annotation.

---

## 🔍 Sync Check

- **UI: ✔** — Invite-URL fragment rule and `history.replaceState` /
  `Referrer-Policy: no-referrer` scrub in § 3 match
  [`62-multiplayer-setup/spec.md` § State Bindings → `inviteUrl`](./wiki/screens/62-multiplayer-setup/spec.md);
  the `REQUEST_CONFIRMATION` payload shape and `confirmDelayMs` /
  `requireType` semantics match
  [`60-confirmation-dialog/spec.md` § Click-Through Resistance](./wiki/screens/60-confirmation-dialog/spec.md#click-through-resistance).
- **Schema: ⚠** — `pendingAction` is typed as `Command` (any
  closed-enum command) in
  [`60-confirmation-dialog/data-contracts.md` § `REQUEST_CONFIRMATION` Payload Schema](./wiki/screens/60-confirmation-dialog/data-contracts.md).
  Only `JOIN_MULTIPLAYER_SESSION` has an entry in
  [`screen-command-coverage.json`](./screen-command-coverage.json);
  `LOAD_CAMPAIGN_FROM_URL`, `INSTALL_PACK_FROM_URL`, and
  `IMPORT_SAVE_FROM_URL` are unregistered. See `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`mvp/07-ui-shell/29-url-routing-contract.md`](../../tasks/mvp/07-ui-shell/29-url-routing-contract.md)
  reads this doc First, depends on
  `mvp.07-ui-shell.11-screen-router-fsm` and
  `mvp.07-ui-shell.28-confirmation-dialog-hardening`, and restates
  the four-param table verbatim in its Acceptance Criteria. Inbound
  references in
  [`trust-boundaries.md`](./trust-boundaries.md) and
  [`new-install-defaults.md`](./new-install-defaults.md) point here
  as the canonical owner.

## ⚠ Issues

- **Three URL `pendingAction` tokens are not registered in
  `screen-command-coverage.json`.** `LOAD_CAMPAIGN_FROM_URL`,
  `INSTALL_PACK_FROM_URL`, and `IMPORT_SAVE_FROM_URL` appear in § 1
  and in the owning task's Acceptance Criteria, but the closed
  `Command` enum
  ([`command.schema.json`](../../content-schema/schemas/command.schema.json))
  and the registry of out-of-schema tokens
  ([`screen-command-coverage.json`](./screen-command-coverage.json))
  contain neither. Per
  [`command-schema.md` § Contract](./command-schema.md) — "a token
  must be a schema command, an alias to one, UI-local, or explicitly
  out of scope with an owning task" — `npm run validate:commands`
  will fail until each is given a registry entry attributing it to
  `mvp.07-ui-shell.29-url-routing-contract`, or aliased to the
  existing schema entry-points
  (`INSTALL_PACK_FROM_FILE` for packs, `BEGIN_SAVE_IMPORT` for
  saves, and a new `LOAD_CAMPAIGN` for campaigns). Surfaced rather
  than rewritten because picking schema-aliasing vs. registry-only
  attribution is a design call owned by the URL-routing task, and
  because editing
  [`screen-command-coverage.json`](./screen-command-coverage.json)
  is out of scope for this audit (Hard Prohibition D).
