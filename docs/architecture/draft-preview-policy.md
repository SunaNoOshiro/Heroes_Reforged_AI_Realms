# Draft-Preview Policy

Canonical UI policy that prevents one peer from iteratively probing
canonical RNG outcomes pre-commit by running `apply(state, draft)`
against the deterministic reducer. The reducer is pure and
deterministic; without an explicit rule, a "preview attack outcome"
affordance is a *stochastic-outcome oracle* that lets the player
re-roll until they like the result before committing the command.

This policy is enforced by two mechanisms:

1. A **doctrine rule** in this file (read by humans).
2. A **lint gate** `npm run validate:no-stochastic-preview` that scans
   `src/ui/` for forbidden call sites (read by CI).

Companion docs:
[`security-model.md`](./security-model.md) § Mitigations,
[`effect-registry.md`](./effect-registry.md),
[`determinism.md`](./determinism.md).

---

## 1. The rule

UI previews of stochastic effects MUST compute **closed-form
expected values and ranges** from effect parameters. UI code MUST
NOT call `apply(state, draftCommand)` against the canonical
reducer for any stochastic effect, because a single draft-apply
followed by an undo lets the player observe a sample of the
canonical RNG sub-stream before deciding whether to commit.

| UI affordance | Allowed | Required form |
| --- | --- | --- |
| "Show damage range for this attack" | yes | Closed-form: `min`, `max`, `expected` derived from the unit's damage formula. |
| "Show this spell's expected effect" | yes | Closed-form expected values and ranges. |
| "Pre-roll five sample damage values" | only with the preview RNG carve-out (§ 3) | Sample preview RNG sub-stream, **not** canonical. |
| "Apply this command speculatively, show result, allow undo" | **no** | Forbidden. |
| "Run the engine reducer in a dry-run mode and roll back" | **no** | Forbidden. |
| "Preview line of sight on the adventure map" | yes (deterministic preview) | Pure function over visibility geometry; no `random()` call. Mark the call site `@deterministic-preview`. |
| "Preview pathfinding cost" | yes (deterministic preview) | Same as above. |

---

## 2. Closed-form previews

For every stochastic effect declared in
[`effect-registry.md`](./effect-registry.md), the runtime exposes
a closed-form expected-value selector. Examples:

- `selectors.combat.expectedDamage(attackerId, targetId)` →
  `{ min, max, expected }`. Uses the same parameters as the
  reducer but evaluates them analytically (no RNG draw).
- `selectors.spell.expectedEffectRange(spellId, casterId, target)`
  → range table per affected unit.

Closed-form selectors live next to the canonical reducer so the
formulas stay in sync. They are **read-only** and **pure**: same
inputs always produce the same expected ranges, and they MUST NOT
call `random()` on any RNG sub-stream.

---

## 3. Sample-preview RNG carve-out

If a UI affordance genuinely requires sample previews (e.g., "show
five representative damage rolls" for a tutorial), it MUST consume
a **non-canonical** PCG32 sub-stream:

```ts
const previewRng = createPreviewRng(commandId);
const samples = Array.from({ length: 5 }, () => simulateDamage(previewRng, …));
```

The preview RNG seed is `xxh64('preview-v1' || commandId)`. The
preview RNG sub-stream is **not** registered in
[`rng-streams.md`](./rng-streams.md) and is **not** part of the
canonical seed advancement. Sample previews never touch canonical
state and never affect the per-turn state hash.

The carve-out call site MUST be marked `@deterministic-preview`
in source so the lint gate ignores it.

---

## 4. Lint gate

`npm run validate:no-stochastic-preview` runs
`scripts/check-no-stochastic-preview.mjs`:

1. Walk `src/ui/**/*.{ts,tsx,mts,cts,js,mjs,cjs}`.
2. For every static import / dynamic import / `require()` whose
   resolved path is under `src/engine/`, `src/rules/`, or
   `src/content-runtime/`, inspect the imported binding name.
3. Reject imports of any function whose exported name matches
   `^(apply|simulate|advance|step|reduce)`.
4. Allow exceptions when the call site is preceded by a comment
   `// @deterministic-preview` on the same or previous source
   line.

Wired into `npm run validate` so CI catches misuse before merge.

---

## 5. Why this matters

Without this policy, a competent UI implementer can ship a feature
like "battle preview" that internally runs `apply(state,
attackCommand)` to render the predicted result. Because the
reducer advances the RNG, a hostile player can:

1. Open battle-preview → observe outcome.
2. Cancel → reducer state has already advanced one RNG draw.
3. Re-open battle-preview → observe new outcome from the next RNG
   draw.
4. Iterate until the next draw is favorable.
5. Commit.

The deterministic-engine layer **cannot** detect this misuse
because every reducer call is deterministic and therefore valid.
The protection lives at the UI / source-lint layer.

---

## 6. Out of scope

- **Showing the *result* of a committed command** is not a
  preview; it's a render. The reducer has already committed the
  state; rendering its output does not advance any RNG.
- **AI bot previews of its own moves** are not user-facing
  previews; they're part of the AI search. They run on their own
  AI sub-stream per [`rng-streams.md`](./rng-streams.md).
