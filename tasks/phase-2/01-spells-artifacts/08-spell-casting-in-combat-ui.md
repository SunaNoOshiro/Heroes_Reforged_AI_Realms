# Spell Casting in Combat UI

Status: planned

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Add spell book button to battle HUD. Opens spell book modal; clicking a spell selects it and prompts for target (hex or unit). Casting animation plays.

Read First:
- `docs/architecture/wiki/screens/44-combat-spell-targeting/spec.md`
- `docs/architecture/wiki/screens/44-combat-spell-targeting/interactions.md`
- `docs/architecture/wiki/screens/44-combat-spell-targeting/data-contracts.md`
- `docs/architecture/wiki/screens/44-combat-spell-targeting/architecture.md`
- `docs/architecture/wiki/screens/44-combat-spell-targeting/mockup.html`
- `docs/architecture/wiki/screens/47-spell-book/spec.md`
- `docs/architecture/wiki/screens/47-spell-book/interactions.md`
- `docs/architecture/wiki/screens/47-spell-book/data-contracts.md`
- `docs/architecture/wiki/screens/47-spell-book/architecture.md`
- `docs/architecture/wiki/screens/47-spell-book/mockup.html`

Inputs:
- Tasks 1–2, `07-ui-shell.md`
- Screen package `docs/architecture/wiki/screens/44-combat-spell-targeting/`
- Screen package `docs/architecture/wiki/screens/47-spell-book/`

Outputs:
- `src/ui/components/SpellBook.tsx`
- Spell book modal: tabs by school, shows known spells with mana cost
- Click spell → enter targeting mode (highlight valid targets)
- Click target → dispatch `SPELL_CAST` command

Owned Paths:
- `src/ui/components/SpellBook.tsx`

Dependencies:
- phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling
- phase-2.01-spells-artifacts.02-combat-spells

Acceptance Criteria:
- Spells grayed out when hero lacks mana
- Targeting mode shows correct valid targets (AoE vs single target)
- Animation plays before next unit's turn begins
- Spell book accessible only on hero's turn (button disabled otherwise)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/44-combat-spell-targeting/mockup.html`, `docs/architecture/wiki/screens/44-combat-spell-targeting/interactions.md`, and `docs/architecture/wiki/screens/44-combat-spell-targeting/data-contracts.md`.
- Layout, bindings, and commands match `docs/architecture/wiki/screens/47-spell-book/mockup.html`, `docs/architecture/wiki/screens/47-spell-book/interactions.md`, and `docs/architecture/wiki/screens/47-spell-book/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
