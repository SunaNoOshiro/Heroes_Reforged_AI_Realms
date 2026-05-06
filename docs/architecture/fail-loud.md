# Fail Loud

> Source plan:
> [`docs/implementation-plans/31-trust-boundaries-and-logging-monitoring-plan.md`](../implementation-plans/31-trust-boundaries-and-logging-monitoring-plan.md).
> Cross-link: [`CLAUDE.md`](../../CLAUDE.md) "missing gameplay
> requirements must fail loudly" rule,
> [`trust-boundaries.md`](./trust-boundaries.md) § 7,
> [`error-taxonomy.md`](./error-taxonomy.md),
> [`error-ux.md`](./error-ux.md).

The "fail loudly" rule is policy across this repo. This file
names the four lint rules and the global `assert()` helper that
**enforce** the policy. Without enforcement, "fail loud" devolves
into ad-hoc `console.error(err)` lines that swallow context.

---

## 1. The `assert()` helper

`src/shared/assert.ts` exports a single helper:

```ts
export function assert(
  condition: unknown,
  message: string,
  fields?: Record<string, string | number | boolean | null>,
): asserts condition;
```

- Throws a typed `TrustViolationError` on failure.
- Never silently coerces.
- The thrown error carries `message` + optional `fields` for
  structured logging via
  [`services/shared/logger.ts`](../../services/shared/logger.ts).
- The error name `TrustViolationError` is reserved; lint refuses
  it as a swallowable type in any `catch`.

The helper is a stub today; the runtime body lands when the
first trusted-core code path needs it (gates in
[`trust-boundaries.md`](./trust-boundaries.md) § 3).

---

## 2. Banned: empty `catch`

```ts
try {
  doRiskyThing();
} catch (_) {
  // forbidden: silent swallow
}
```

The lint refuses any `catch` block whose body is empty or
contains only a comment. A correct catch either re-throws,
narrows to a typed error, or emits a `LogRecord` /
`SecurityEvent` via the shared logger.

---

## 3. Banned: default-coalesce on schema-required fields

```ts
const playerName = save.metadata.playerName ?? "Unknown";
// forbidden: playerName is required by save.schema.json;
// missing-on-load = save_load_invalid SecurityEvent, not coerce.
```

The lint walks every schema under `content-schema/schemas/`,
collects the union of `required[]` field names, and refuses
`?? <literal>` / `|| <literal>` / `?? defaultValue` on any access
path that lands on a required-field name. The lint is closed by
field name, not by type — false positives must be rewritten to
not shadow the required name.

---

## 4. Banned: `as any` in `services/` and `src/engine/`

```ts
const command = msg.payload as any;
// forbidden inside services/ and src/engine/.
```

The lint refuses `as any` and `<any>` casts in those two trees.
The trusted core trusts its inputs because callers validate;
`as any` defeats the validate-then-trust pipeline.

UI / tooling code outside those two trees is not bound by this
rule.

---

## 5. Banned: direct `console.*` in `services/`

```ts
console.error(err); // forbidden inside services/
```

The lint refuses `console.log`, `console.warn`, `console.error`,
`console.info` under `services/`. The only sanctioned emission
path is `services/shared/logger.ts → safeLog / appLog / accessLog
/ auditLog / securityLog`.

CLI helpers under `scripts/` and dev fixtures under
`src/**/__tests__/` are exempt.

---

## 6. The four lint rules

| Rule | Refused pattern | Owner |
|---|---|---|
| Empty catch | `catch (_) { /* maybe a comment */ }` | this doc § 2 |
| Default-coalesce on required field | `?? defaultValue` / `||
defaultValue` on required-field name | this doc § 3 |
| `as any` cast | `as any`, `<any>` in `services/` and `src/engine/` | this doc § 4 |
| Direct `console.*` | any console method under `services/` | this doc § 5 |

Each rule is implemented as an AST pass in
`scripts/check-repo-contracts.mjs`. Adding a new rule appends a
row here AND a pass in the script.

---

## 7. Cross-references

- [`trust-boundaries.md`](./trust-boundaries.md) § 3 names the gate
  per row; § 7 says every "fail loud" row routes through
  `assert()` + `securityLog()`.
- [`error-taxonomy.md`](./error-taxonomy.md) defines the typed
  error hierarchy that `TrustViolationError` extends.
- [`error-ux.md`](./error-ux.md) says how the player sees a
  `TrustViolationError` when it surfaces from a player-visible
  surface (modal with `errorId`, never the raw stack).
