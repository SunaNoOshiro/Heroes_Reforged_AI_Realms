# Fail Loud

> Companion docs:
> [`CLAUDE.md`](../../CLAUDE.md) (root rule "missing gameplay
> requirements must fail loudly"),
> [`trust-boundaries.md`](./trust-boundaries.md) (§ 3 names the gate
> per cross-zone arrow; § 7 routes every "fail loud" row through
> `assert()` + `securityLog()`),
> [`error-taxonomy.md`](./error-taxonomy.md) (typed error
> hierarchy that `TrustViolationError` extends),
> [`error-ux.md`](./error-ux.md) (player-facing surface for a
> `TrustViolationError`).

This file is the canonical statement of the **four lint rules and
the global `assert()` helper** that enforce the "fail loud" policy.
Without enforcement, the policy degrades into ad-hoc
`console.error(err)` lines that swallow context.

The helper is implemented today as a public surface; the four lint
rules are spec — they land with the owning implementation task
[`phase-3.05-observability.01-shared-logger-and-redaction`](../../tasks/phase-3/05-observability/01-shared-logger-and-redaction.md).

---

## 1. The `assert()` helper

[`src/shared/assert.ts`](../../src/shared/assert.ts) exports one
helper:

```ts
export function assert(
  condition: unknown,
  message: string,
  fields?: Record<string, string | number | boolean | null>,
): asserts condition;
```

- Throws a typed `TrustViolationError` on failure; never silently
  coerces.
- The error carries `message` + optional `fields` for structured
  logging via
  [`services/shared/logger.ts`](../../services/shared/logger.ts) →
  `securityLog()`.
- The error name `TrustViolationError` is reserved; the empty-catch
  rule (§ 2) refuses it as a swallowable type in any `catch`.

The throw path works today; the structured-log emission body lands
with the first trusted-core code path that needs it (the gates in
[`trust-boundaries.md` § 3](./trust-boundaries.md#3-per-component-matrix)).

---

## 2. Banned: empty `catch`

```ts
try {
  doRiskyThing();
} catch (_) {
  // forbidden: silent swallow
}
```

The lint refuses any `catch` block whose body is empty or holds
only a comment. A correct catch either re-throws, narrows to a
typed error, or emits a `LogRecord` / `SecurityEvent` via the
shared logger.

---

## 3. Banned: default-coalesce on schema-required fields

```ts
const playerName = save.metadata.playerName ?? "Unknown";
// forbidden: playerName is required by save.schema.json;
// missing-on-load is a save_load_invalid SecurityEvent, not coerce.
```

The lint walks every schema under
[`content-schema/schemas/`](../../content-schema/schemas/), unions
the `required[]` field names, and refuses `?? <literal>`,
`|| <literal>`, or `?? defaultValue` on any access path that lands
on a required-field name. The lint is closed by **field name**, not
type — false positives must be rewritten so they no longer shadow
the required name.

---

## 4. Banned: `as any` in `services/` and `src/engine/`

```ts
const command = msg.payload as any;
// forbidden inside services/ and src/engine/.
```

The lint refuses `as any` and `<any>` casts in those two trees.
The trusted core trusts its inputs because callers validate at the
named gate; `as any` defeats the validate-then-trust pipeline.

UI / tooling code outside those two trees is not bound by this
rule. (Repo-wide,
[`eslint.config.mjs`](../../eslint.config.mjs) ships
`@typescript-eslint/no-explicit-any` at `warn`; this rule tightens
it to `error` inside the trusted core.)

---

## 5. Banned: direct `console.*` in `services/`

```ts
console.error(err); // forbidden inside services/
```

The lint refuses `console.log`, `console.warn`, `console.error`,
and `console.info` under `services/`. The only sanctioned emission
path is
[`services/shared/logger.ts`](../../services/shared/logger.ts) →
`safeLog` / `appLog` / `accessLog` / `auditLog` / `securityLog`.

Exempt: CLI helpers under `scripts/`; dev fixtures under
`src/**/__tests__/`.

---

## 6. The four lint rules

| Rule | Refused pattern | Doc owner |
|---|---|---|
| Empty catch | `catch (_) { /* maybe a comment */ }` | § 2 |
| Default-coalesce on required field | `?? defaultValue` / `\|\| defaultValue` on a required-field name | § 3 |
| `as any` cast | `as any`, `<any>` in `services/` and `src/engine/` | § 4 |
| Direct `console.*` | any `console` method under `services/` | § 5 |

Each rule lands as an AST pass in
[`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs).
Adding a new rule appends a row here AND a pass in the script.
Implementation owner:
[`phase-3.05-observability.01-shared-logger-and-redaction`](../../tasks/phase-3/05-observability/01-shared-logger-and-redaction.md).

---

## 7. Cross-references

- [`trust-boundaries.md` § 3](./trust-boundaries.md#3-per-component-matrix)
  names the gate per row;
  [§ 7](./trust-boundaries.md#7-fail-loud-rule) routes every "fail
  loud" row through `assert()` + `securityLog()`.
- [`error-taxonomy.md`](./error-taxonomy.md) defines the typed
  error hierarchy that `TrustViolationError` extends.
- [`error-ux.md`](./error-ux.md) covers how the player sees a
  `TrustViolationError` when it surfaces from a player-visible
  surface (modal with `errorId`, never the raw stack).

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface owned by this doc; the
  player-facing presentation of a `TrustViolationError` is
  delegated to [`error-ux.md`](./error-ux.md), and that link is
  preserved.
- **Schema: ⚠** — `assert()` is fully realized in
  [`src/shared/assert.ts`](../../src/shared/assert.ts) and the
  logger surface in
  [`services/shared/logger.ts`](../../services/shared/logger.ts)
  matches § 5 (`appLog` / `accessLog` / `auditLog` /
  `securityLog` / `safeLog`); however, the four lint rules
  themselves (§§ 2–5) are not yet present in
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs).
  Detail in `## ⚠ Issues`.
- **Tasks: ⚠** — The owning implementation task
  [`phase-3.05-observability.01-shared-logger-and-redaction`](../../tasks/phase-3/05-observability/01-shared-logger-and-redaction.md)
  Reads First this doc and lists three of the four enforcement
  bullets in its Outputs (`pino` import refusal, `console.*` under
  `services/`, plus `dangerouslySetInnerHTML` under `src/`). The
  three other rules in this doc — empty catch (§ 2),
  default-coalesce on required fields (§ 3), and
  `as any` in `services/` and `src/engine/` (§ 4) — have no
  registry-listed owner.

## ⚠ Issues

- **Lint pass not yet implemented in `scripts/check-repo-contracts.mjs`.**
  § 6 says each rule lands as an AST pass in that script. A full
  read of
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  shows it currently implements only forbidden-pattern scans,
  `TBD/TODO` markers, screen-data-contract presence, required-path
  presence, example-record schema validation, and task-doc
  structure — not the four AST passes in §§ 2–5. The owning task
  [`phase-3.05-observability.01-shared-logger-and-redaction`](../../tasks/phase-3/05-observability/01-shared-logger-and-redaction.md)
  is the closer for `console.*` (§ 5); the other three rules need
  to be added either to that task's Outputs or to a new sibling
  task. Per CLAUDE.md ("Hard constraints (CI-enforced)"), a doc
  that names a CI-enforced rule must have a matching gate or be
  re-classified as planned. Suggested fix: extend the owning
  task's Outputs to also land empty-catch (§ 2),
  default-coalesce-on-required (§ 3), and
  `as any`-in-trusted-core (§ 4) AST passes; the rewrite already
  reframes the rules as spec-with-owning-task to keep this honest
  while the gap is open. Skill did not edit the script or the task
  file (Hard Prohibition D).
- **`as any` rule overlaps with the repo-wide ESLint setting.**
  § 4 forbids `as any` in `services/` and `src/engine/`;
  [`eslint.config.mjs`](../../eslint.config.mjs) line 98 already
  enables `@typescript-eslint/no-explicit-any` at `warn` repo-wide
  (line 116 disables it under `**/__tests__/**`). The fail-loud
  rule needs to override the global `warn` to `error` for those
  two trees; otherwise the violation surfaces as a non-blocking
  warning and the AST pass in `check-repo-contracts.mjs` would be
  the only blocking enforcement. Owner: same task as above.
  Suggested values: add a per-files override to `eslint.config.mjs`
  pinning `@typescript-eslint/no-explicit-any: error` for
  `services/**/*.ts` and `src/engine/**/*.ts`, and keep the
  repo-wide `warn` for the rest.
- **Owning task scope drift.**
  [`phase-3.05-observability.01-shared-logger-and-redaction`](../../tasks/phase-3/05-observability/01-shared-logger-and-redaction.md)
  Outputs include a `dangerouslySetInnerHTML` ban under `src/`
  that is not listed in this doc. Either this doc gains a fifth
  row (XSS family rule) or the owning task drops the bullet to
  match. Suggested: add a § 6 row "Direct
  `dangerouslySetInnerHTML`" with refused pattern
  `dangerouslySetInnerHTML={...}` under `src/`, scoped to the
  same `check-repo-contracts.mjs` AST pass. Skill did not add the
  row because it would invent doc scope (Hard Prohibition B).
