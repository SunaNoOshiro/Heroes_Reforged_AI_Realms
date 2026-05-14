# Error UX

> Sister docs:
> [`error-taxonomy.md`](./error-taxonomy.md) (severities, codes,
> `validation-error` shape),
> [`observability.md`](./observability.md) (telemetry emission rules),
> [`pack-error-codes.md`](./pack-error-codes.md) (pack-loader codes),
> [`ui-technology-choice.md`](./ui-technology-choice.md) (localization
> runtime).

This file is the single rule for **how an error reaches the player**.
Error *shape* (validation-error / dispatcher-error / storage-error
schemas) is owned by [`error-taxonomy.md`](./error-taxonomy.md). This
doc owns the *surface* decision (toast vs. inline disabled vs. modal
vs. log-only) plus the localization-key and telemetry-tag conventions
every screen package must follow. The first user-filed bug a tightly
scoped audit predicts is a "greyed-out control with no tooltip"; the
rules below exist so every screen implementer reaches the same
answer.

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

The "actionable by player?" column is the dominant axis: if the
player *can* change an input, the surface lives next to that input
(disabled control + tooltip explaining why); if not, the surface is
a transient toast that does not steal focus.

## 2. Code → surface mapping

The mapping is *prefix-based* so a new code automatically inherits a
surface:

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
- `<part>` is one of `title`, `body`, `cta`. `body` is required;
  the others are optional.

Example: `DISPATCHER_NOT_CURRENT_ACTOR` resolves to
`error.dispatcher.not-current-actor.body`. The locale fallback chain
is owned by [`ui-technology-choice.md`](./ui-technology-choice.md);
this doc only names the convention.

## 4. Telemetry tagging

Every surface that renders a player-facing error MUST emit
`error.shown` per [`observability.md` § 4](./observability.md#4-required-emissions-catalogue)
row "Per-screen error.shown":

```ts
metrics.counter("error.shown.count", 1, {
  code,
  surface,        // "toast" | "inline" | "modal" | "fullscreen"
  screenId
});
logger.info("error.shown", { code, surface, screenId });
```

The player-facing string is **never** included in the emit — strings
can leak PII and locale-specific content. Codes only.

## 5. Per-screen wiring

Every screen *inherits* the prefix-based default mapping in § 2; the
generic "rejected commands fail loudly" boilerplate every template
carries is already covered. A per-screen `## Error surfaces` block is
REQUIRED only when the screen names a **specific** error code by
name — i.e. when it overrides the default surface for that code, or
wires the code to a specific localization key or telemetry tag.

Block shape — one row per `action × error-code`:

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
omits the `## Error surfaces` block. The schema-validation step that
asserts each named code is known is delegated to the edge-cases gate
once the `validation-error` shape locks.

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

---

## 🔍 Sync Check

- **UI: ✔** — § 5 block shape and the
  `(DISPATCHER|VALIDATION|STORAGE|PACK|NET|AI|ASSET|UI)_<TOKEN>` gate
  match the regex in
  [`scripts/check-error-ux-coverage.mjs`](../../scripts/check-error-ux-coverage.mjs);
  the `error.<domain>.<code>.<part>` localization-key convention is
  the form used by every screen `interactions.md` under
  [`docs/architecture/wiki/screens/*/interactions.md`](./wiki/screens/)
  (e.g. `error.dispatcher.rejected.body`,
  `error.storage.rejected.body`).
- **Schema: ❌** — Two CI-blocking gaps inherited from
  [`error-taxonomy.md`'s audit](./error-taxonomy.md): (a) the eight
  prefixes named in § 2 are not present in the canonical schemas
  ([`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json)
  uses `NOT_CURRENT_ACTOR` etc. without the `DISPATCHER_` prefix,
  [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json)
  uses `QUOTA_EXCEEDED` etc. without `STORAGE_`,
  [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json)
  has no `code` field at all); (b) `severity: debug` appears in § 1
  but not in `validation-error.schema.json` /
  `error-state.schema.json` (both pin
  `info | warn | error | fatal`). Detail in `## ⚠ Issues`.
- **Tasks: ⚠** — Owning task is
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md),
  which Reads First this doc and names the closed surface mapping in
  § 2 as one of its inputs. Required emission registered in
  [`observability.md` § 4](./observability.md#4-required-emissions-catalogue)
  row 11 (`error.shown` event with `code`, `surface`); the metrics
  counter `error.shown.count` and the `screenId` label this doc adds
  are tighter than that row but compatible — telemetry catalogue
  task
  [`phase-2.11-observability.02-required-emissions-catalogue`](../../tasks/phase-2/11-observability/02-required-emissions-catalogue.md)
  should pin them when it next revises the row.

## ⚠ Issues

- **Code-prefix divergence between this doc and the on-wire schemas.**
  § 2 maps eight prefixes (`VALIDATION_*`, `DISPATCHER_*`, `PACK_*`,
  `STORAGE_*`, `NET_*`, `AI_*`, `ASSET_*`, `UI_*`); the regex in
  [`scripts/check-error-ux-coverage.mjs`](../../scripts/check-error-ux-coverage.mjs)
  agrees. The schemas disagree:
  [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json)
  defines bare codes (`NOT_CURRENT_ACTOR`, `MALFORMED_PAYLOAD`, …),
  [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json)
  uses `QUOTA_EXCEEDED` / `IDB_*`, and
  [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json)
  has no `code` field (it pins `rule` only). Per CLAUDE.md
  ("Stable IDs are public API"), one side must give. Owners:
  [`mvp.01-engine-core.06-command-dispatcher`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md)
  for dispatcher codes,
  [`mvp.08-persistence.09-quota-handling`](../../tasks/mvp/08-persistence/09-quota-handling.md)
  for storage codes, and
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md)
  for the formatter that bridges schema-rule → UI-prefixed code.
  Suggested fix: add the prefix to each schema's `code` enum so the
  surface mapping in § 2 stays automatic; regenerate
  `enums.snapshot.json` per
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md). Skill did
  not edit the schemas (Hard Prohibition D).
- **`severity: debug` is in § 1 but not the schemas.** Matrix § 1
  enumerates `fatal | error | warn | info | debug`; the `severity`
  enum in
  [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json)
  and
  [`error-state.schema.json`](../../content-schema/schemas/error-state.schema.json)
  is `info | warn | error | fatal` (no `debug`). Either the schemas
  need `debug` (additive at tail) or this doc and
  [`error-taxonomy.md` § 1](./error-taxonomy.md#1-severities) drop
  the row. Owner:
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md).
  Suggested values: extend both severity enums to
  `["info", "warn", "error", "fatal", "debug"]` and regenerate the
  enum snapshot.
- **Localization-key convention conflict across error docs.** § 3
  here uses `error.<domain>.<code>.<part>` (singular `error`, dotted,
  hyphenated, with `body` required and `title`/`cta` optional).
  [`error-taxonomy.md` § 4](./error-taxonomy.md#4-user-facing-vs-internal)
  uses `errors.<lowercase code>` (plural `errors`, snake-case).
  [`error-codes.md` § 3](./error-codes.md) uses
  `errors.network.joinFailed` style (plural `errors`, dotted,
  camelCase). The localization runtime can only honor one. Owner:
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md).
  Suggested values: pick the form in this file
  (`error.<domain>.<code>.<part>`) — it carries the mandatory
  `body` + optional `title`/`cta` parts the toast/modal renderers
  already need, and it is the form already adopted by every
  `interactions.md` file in
  [`docs/architecture/wiki/screens/*/interactions.md`](./wiki/screens/).
- **`ui-technology-choice.md` does not document a "locale fallback
  chain".** § 3 says "the locale fallback chain is owned by
  [`ui-technology-choice.md`](./ui-technology-choice.md)", but that
  file's
  [Localization Runtime](./ui-technology-choice.md#localization-runtime)
  section covers `useTranslation`, plural tables, RTL, and font
  swap — it never names a key-resolution fallback chain (e.g. what
  the runtime returns when `error.<domain>.<code>.body` is missing
  in the active locale). Either `ui-technology-choice.md` needs to
  add a fallback-chain subsection or this reference should retarget
  to whichever doc actually owns it. Owner:
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md)
  (formatter is the runtime hop that walks the chain). Skill did not
  silently rewrite the link target because the underlying gap would
  remain unsurfaced.
