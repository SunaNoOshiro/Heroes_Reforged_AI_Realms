# Error UX

> Sister docs:
> [`error-taxonomy.md`](./error-taxonomy.md) (severities, codes,
> `validation-error` shape),
> [`observability.md`](./observability.md) (telemetry emission rules),
> [`pack-error-codes.md`](./pack-error-codes.md) (pack-loader codes).

This file is the single rule for **how an error reaches the player**.
The error *shape* (validation-error / dispatcher-error / storage-error
schemas) is owned by
[`error-taxonomy.md`](./error-taxonomy.md). This doc owns the *surface*
decision: toast vs. inline disabled vs. modal vs. log-only, and the
localization-key + telemetry-tag conventions every screen package
must follow.

The audit names "greyed-out control with no tooltip" as the most-likely
first user-filed bug. The rules below exist so every screen
implementer reaches the same answer.

---

## 1. Surface decision matrix

| Severity (from `error-taxonomy.md`) | Originator | Actionable by player? | Surface |
|---|---|---|---|
| `fatal` | any | any | full-screen blocking modal |
| `error` | dispatcher (rejected command) | yes (player can change input) | inline disabled-control + tooltip |
| `error` | dispatcher (rejected command) | no (state changed under the player) | toast |
| `error` | save / persistence | yes (retry / pick another save) | modal |
| `error` | save / persistence | no | toast |
| `error` | network / multiplayer | yes (reconnect) | modal |
| `error` | network / multiplayer | no | toast |
| `error` | pack / asset | yes (re-download / disable pack) | modal |
| `error` | pack / asset | no (load-time) | full-screen pre-game error |
| `warn` | any | yes | subtle banner |
| `warn` | any | no | toast (transient) |
| `info` | any | any | toast (transient) or none |
| `debug` | any | any | log only |

The "actionable by player?" column is the dominant axis: if the player
*can* change an input, the surface lives next to that input
(disabled control + tooltip explaining why); if not, the surface is a
transient toast that does not steal focus.

## 2. Code → surface mapping

The code → surface mapping is *prefix-based* so a new code
automatically inherits a surface.

| Code prefix | Default surface |
|---|---|
| `VALIDATION_*` | inline disabled-control + tooltip |
| `DISPATCHER_*` | inline disabled-control + tooltip (player just attempted the action) |
| `PACK_*` | full-screen pre-game error |
| `STORAGE_*` | modal |
| `NET_*` | modal (for fatal / connection lost) or toast (for transient packet loss) |
| `AI_*` | toast (provider failure) or modal (kill-switch tripped) |
| `ASSET_*` | toast (presentation fallback applied) or full-screen pre-game error (atlas-build failure) |
| `UI_*` | log only — never user-visible by default |

A screen MAY override the default by declaring an explicit
`Error surfaces:` block in its `interactions.md`. The block must list
every fallible action the screen can dispatch.

## 3. Localization-key naming

Every surface that renders a player-facing error string MUST resolve
the string through the localization runtime using the convention:

```
error.<domain>.<code>.<part>
```

Where:

- `<domain>` is the lowercase code prefix (`validation`, `dispatcher`,
  `pack`, `storage`, `net`, `ai`, `asset`).
- `<code>` is the rest of the code, hyphenated and lowercased
  (e.g. `not-current-actor`).
- `<part>` is one of `title`, `body`, `cta`. `body` is required; the
  others are optional.

Example: `DISPATCHER_NOT_CURRENT_ACTOR` resolves to
`error.dispatcher.not-current-actor.body`. The locale fallback chain
is owned by [`ui-technology-choice.md`](./ui-technology-choice.md);
this doc only names the convention.

## 4. Telemetry tagging

Every surface that renders a player-facing error MUST emit
`error.shown` with structured fields per
[`observability.md`](./observability.md) § 4 row "Per-screen
error.shown":

```ts
metrics.counter("error.shown.count", 1, {
  code,
  surface,        // "toast" | "inline" | "modal" | "fullscreen"
  screenId
});
logger.info("error.shown", { code, surface, screenId });
```

This is the canonical way to measure how often each error reaches a
player and on which screen. The player-facing string is **never**
included in the emit — strings can leak PII and locale-specific
content. Codes only.

## 5. Per-screen wiring

Every screen *inherits* the prefix-based default surface mapping
declared in § 2. A screen package's `interactions.md` therefore does
NOT need to list the defaults; the generic "rejected commands fail
loudly" boilerplate that every template carries is already covered
by § 2.

A per-screen `## Error surfaces` block is REQUIRED only when the
screen names a **specific** error code by name — i.e. when it
overrides the default surface for that code, or when it wires the
code to a specific localization key or telemetry tag. The block
shape is one row per action × error-code:

```markdown
## Error surfaces

| Action | Error code | Surface | Localization key | Notes |
|---|---|---|---|---|
| Confirm BATTLE_DEFEND | DISPATCHER_NOT_CURRENT_ACTOR | inline | error.dispatcher.not-current-actor.body | Tooltip on the disabled DEFEND button. |
```

The CI gate
[`scripts/check-error-ux-coverage.mjs`](../../scripts/check-error-ux-coverage.mjs)
fires whenever an `interactions.md` names a specific code matching
`(DISPATCHER|VALIDATION|STORAGE|PACK|NET|AI|ASSET|UI)_<TOKEN>` but
does not include the `## Error surfaces` block. The schema-validation
step that asserts the codes are known is delegated to the
edge-cases gate once the `validation-error` shape locks.

## 6. Worked example — DEFEND rejected because hero already moved

- The dispatcher returns `Err({ code: "DISPATCHER_NOT_CURRENT_ACTOR",
  fields: { actorId, currentActorId } })`.
- Surface decision (matrix § 1): `error`, dispatcher-rejected,
  player-actionable → inline disabled-control + tooltip.
- The DEFEND button in the battle HUD is rendered with `aria-disabled`
  and a tooltip that resolves
  `error.dispatcher.not-current-actor.body`.
- The interaction emits `error.shown` with
  `{ code: "DISPATCHER_NOT_CURRENT_ACTOR", surface: "inline",
  screenId: "battle-hud" }`.
- The button stays disabled until the dispatcher's view selector
  reports the actor has the turn back.

## 7. Anti-patterns

- A disabled control with **no** tooltip.
- A toast that disappears in < 4 seconds for a player-actionable
  error.
- Two surfaces firing for the same error (inline + toast).
- Surfacing a code without first emitting `error.shown`.
- Embedding a player-facing string into a code or telemetry payload.
