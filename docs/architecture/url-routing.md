# URL & Deep-Link Contract

> Companion to [`60-confirmation-dialog`](./wiki/screens/60-confirmation-dialog/),
> [`62-multiplayer-setup`](./wiki/screens/62-multiplayer-setup/),
> [`70-save-import`](./wiki/screens/70-save-import/),
> [`71-pack-manager`](./wiki/screens/71-pack-manager/), and
> [`docs/architecture/lobby-identifiers.md`](./lobby-identifiers.md).
>  introduces this contract to handle the "Deep-link
> state changes" risk: every state-changing URL handler routes through
> `60-confirmation-dialog` first; the underlying command never fires
> from URL parse alone.

## 1. Accepted Query Params

The runtime parses **only** the params below. Unknown params are
dropped silently with a single console warning per session.

| Param         | Pending Command                           | Severity   | `requireType` | Notes |
|---------------|-------------------------------------------|------------|---------------|-------|
| `?lobby=CODE` | `JOIN_MULTIPLAYER_SESSION`                | `warning`  | (none)        | Code per [`lobby-identifiers.md`](./lobby-identifiers.md); secret rides the URL fragment. |
| `?campaign=`  | `LOAD_CAMPAIGN_FROM_URL`                  | `warning`  | (none)        | Loads a known campaign by ID; no remote fetch. |
| `?packId=`    | `INSTALL_PACK_FROM_URL`                   | `critical` | `'INSTALL'`   | Pack must be in the local cache or canonical-packs registry; never fetched from the URL alone. |
| `?import=`    | `IMPORT_SAVE_FROM_URL`                    | `critical` | `'IMPORT'`    | Save body must be local; the URL only addresses an already-staged file. |

## 2. Confirmation Routing

For every accepted param, the URL handler:

1. Validates the param shape (closed regex) before dispatching
   anything. Invalid shapes are dropped silently.
2. Dispatches `REQUEST_CONFIRMATION` with the values from the table
   above, including `confirmDelayMs` defaulted from `severity`.
3. The user's `Confirm` runs the underlying command; `Cancel` clears
   the pending action and routes back to `01-main-menu`.

The underlying command never fires from URL parse alone — the
confirmation dialog is the single dispatch boundary.

## 3. Fragment Discipline

Per [`62-multiplayer-setup/spec.md`](./wiki/screens/62-multiplayer-setup/spec.md),
secrets ride the URL **fragment** (after `#`) so they avoid `Referer`,
browser history, and OS clipboard sync. The handler:

1. Reads the fragment.
2. Calls `history.replaceState(null, '', location.pathname)` to scrub
   the URL bar.
3. Sets the response's `Referrer-Policy: no-referrer`.

This is the canonical fragment contract; URL routing reuses it.

## 4. Protocol Handlers

`registerProtocolHandler` is **forbidden** at v1. A future
`web+heroes://…` registration MUST be:

- User-initiated from a button in `56-options`.
- Documented here.
- Backed by an architecture amendment + an entry in
  [`permissions.md`](./permissions.md).

## 5. CI Enforcement

A CI lint scans `src/` for:

- `URLSearchParams` consumers outside the URL-routing module.
- `window.location.hash` reads outside the fragment helper.
- `registerProtocolHandler` calls (banned).

Each match must import the URL-routing helper or carry an explicit
allowlist annotation.
