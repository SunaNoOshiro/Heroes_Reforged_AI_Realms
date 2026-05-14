# Variant Screen States To Add

Classic-strategy top-level coverage is complete: every numbered
package under [`screens/`](./screens/) — map, combat, town, hero,
system, multiplayer, editor — is in place. The remaining work is
**variant depth**, not new top-level screens.

> Companion docs:
>
> - [`README.md`](./README.md) — folder shape, sources of truth, and
>   the screen-package authoring rules.
> - [`screen-curation-plan.md`](./screen-curation-plan.md) — work
>   queue for curating each package.
> - [`migration-plan.md`](./migration-plan.md) — folder-shape and
>   batch-migration history.
> - [`_templates/animation-states.md`](./_templates/animation-states.md) —
>   seven-state sweep template applied per screen.
> - [`_templates/contract-sweep.md`](./_templates/contract-sweep.md) —
>   four-contract sweep (hotkey, modal, gesture, `ErrorState`).

## 1. Variant policy

When adding a new variant, decide between **new package** and **same
package, new state**:

- **New package** — the variant needs its own visual contract,
  component tree, or architecture diagram. Add a numbered folder
  under [`screens/`](./screens/) with the full five-file shape
  (`mockup.html`, `spec.md`, `interactions.md`, `data-contracts.md`,
  `architecture.md`) per
  [`README.md` § 6.1](./README.md#61-package-shape). Register the
  package in [`screens/index.json`](./screens/index.json) and add an
  inbound transition from another screen's `interactions.md`.
- **Same package, new state** — the variant is a conditional state
  on an existing screen (different copy, disabled control, alternate
  banner). Describe it inline in that package's `spec.md`,
  `interactions.md`, `data-contracts.md`, and `architecture.md` —
  no new folder.

## 2. Cross-screen contract coverage

The seven normative component states (`idle`, `hover`, `pressed`,
`disabled`, `focused`, `error`, `loading`) and their precedence
rules are canonical in
[`../ui-state-contract.md` § Component State Matrix](../ui-state-contract.md#component-state-matrix).
Every screen `spec.md`'s **Animation Contract** MUST enumerate the
seven states for every control in its Component Tree, or waive an
inapplicable state with a one-line justification. Apply with
[`_templates/animation-states.md`](./_templates/animation-states.md).

Sibling cross-screen contracts live in:

- [`../ui-hotkeys.md`](../ui-hotkeys.md) — hotkey registry, focus
  order, tab-trap.
- [`../ui-routing.md`](../ui-routing.md) — screen-router FSM, modal
  stack, dismissal policy.
- [`../ui-gestures.md`](../ui-gestures.md) — canonical gesture
  vocabulary.
- [`../../../content-schema/schemas/error-state.schema.json`](../../../content-schema/schemas/error-state.schema.json) —
  `ErrorState` shape for `errors.*` bindings.

Apply all four together via
[`_templates/contract-sweep.md`](./_templates/contract-sweep.md) —
do not batch the four-contract sweep with the seven-state sweep.

## 3. High-priority variants

Variants below extend an existing package's conditional states
unless they need a separate visual contract (then promote to a new
package per § 1).

| Owning screen | Variant states |
|---|---|
| [`07-adventure-map`](./screens/07-adventure-map/) | moving hero animation, no active hero, enemy turn visible movement, water embark/disembark, object reward resolved |
| [`38-combat-screen`](./screens/38-combat-screen/) | enemy turn, ranged targeting, dead stack cleanup, morale extra turn, luck damage result, obstacle blocked shot |
| [`24-town-screen`](./screens/24-town-screen/) | no visiting hero, build already used today, not enough resources, unbuilt dwelling, captured town first visit |
| [`46-hero-screen`](./screens/46-hero-screen/) | full army, empty army, full artifact backpack, cursed artifact locked, no spellbook |
| [`55-save-load`](./screens/55-save-load/) | empty save list, overwrite confirmation, incompatible save migration needed, corrupted save |
| [`26-marketplace`](./screens/26-marketplace/) | invalid trade pair, insufficient resources, no marketplace building, multiple market rate tiers |
| [`25-building-recruitment-dialog`](./screens/25-building-recruitment-dialog/) / [`37-quick-recruit-window`](./screens/37-quick-recruit-window/) | cannot afford, no available growth, army full, upgraded creature available |
| [`64-network-lobby`](./screens/64-network-lobby/) / [`77-multiplayer-game`](./screens/77-multiplayer-game/) | disconnected peer, host migration, all players ready, desync detected |

## 4. Lower-priority variants

| Owning screen | Variant states |
|---|---|
| [`03-campaign-selection`](./screens/03-campaign-selection/) / [`04-campaign-narrative`](./screens/04-campaign-narrative/) | branching campaign map, bonus already chosen, hero carryover preview |
| [`05-intro-cinematic`](./screens/05-intro-cinematic/) / [`42-victory-defeat-cinematic`](./screens/42-victory-defeat-cinematic/) | subtitles on/off, skip disabled during mandatory legal splash |
| [`65-map-editor`](./screens/65-map-editor/) | terrain brush active, object placement preview, validation errors, event editor modal |
| _cross-cutting (accessibility)_ | reduced motion, high contrast, keyboard focus traversal for modal-heavy screens |

---

## 🔍 Sync Check

- **UI: ✔** — Every owning-screen link resolves under
  [`screens/`](./screens/); the seven-state list, precedence wording,
  and `#component-state-matrix` anchor match
  [`../ui-state-contract.md`](../ui-state-contract.md);
  [`../ui-hotkeys.md`](../ui-hotkeys.md),
  [`../ui-routing.md`](../ui-routing.md), and
  [`../ui-gestures.md`](../ui-gestures.md) all exist.
- **Schema: ✔** —
  [`error-state.schema.json`](../../../content-schema/schemas/error-state.schema.json)
  exists at the cited path and is the canonical shape for
  `errors.*` bindings, matching
  [`README.md` § 6.3](./README.md#63-schema-and-contract-pins).
- **Tasks: ✔** —
  [`tasks/mvp/07-ui-shell/12-component-state-matrix.md`](../../../tasks/mvp/07-ui-shell/12-component-state-matrix.md)
  lists this file under **Read First** and owns the host doc +
  sweep template; the per-screen seven-state sweep is owned by
  [`13-screen-package-contract-sweep.md`](../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md).
  Both tasks appear in
  [`tasks/task-registry.json`](../../../tasks/task-registry.json).

## ⚠ Issues

- **Owning-screen pairings are advisory, not enforced.** The § 3 / § 4
  tables now name a likely existing screen package for each variant
  group, but the wiki has no validator that pins a variant-state line
  to its package. The decision still belongs to the implementer per
  § 1 (new package vs. inline state). If stricter coupling is wanted,
  it would need a new validator under
  [`scripts/`](../../../scripts/) — out of scope for this audit per
  Hard Prohibition B (never invent features).
