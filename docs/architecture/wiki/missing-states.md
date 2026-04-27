# Variant Screen States To Add

The current migration provides explicit numbered screen packages for the
classic fantasy strategy coverage set: map navigation, combat, town interactions, hero
management, system dialogs, multiplayer, and editor surfaces. The
remaining work is variant depth, not missing top-level coverage.

When a variant needs its own visual and behavior contract, add another
numbered screen package with the same five-file shape:
`mockup.html`, `spec.md`, `interactions.md`, `data-contracts.md`, and
`architecture.md`. If a variant is only a
minor conditional state, describe it inside the existing screen package's
`spec.md`, `interactions.md`, `data-contracts.md`, and `architecture.md`.

## High Priority Variants

- Adventure Map: moving hero animation, no active hero, enemy turn visible movement, water embark/disembark, object reward resolved.
- Combat Screen: enemy turn, ranged targeting, dead stack cleanup, morale extra turn, luck damage result, obstacle blocked shot.
- Town Screen: no visiting hero, build already used today, not enough resources, unbuilt dwelling, captured town first visit.
- Hero Screen: full army, empty army, full artifact backpack, cursed artifact locked, no spellbook.
- Save / Load: empty save list, overwrite confirmation, incompatible save migration needed, corrupted save.
- Marketplace: invalid trade pair, insufficient resources, no marketplace building, multiple market rate tiers.
- Recruitment: cannot afford, no available growth, army full, upgraded creature available.
- Multiplayer: disconnected peer, host migration, all players ready, desync detected.

## Lower Priority Variants

- Campaign: branching campaign map, bonus already chosen, hero carryover preview.
- Cinematics: subtitles on/off, skip disabled during mandatory legal splash.
- Map Editor: terrain brush active, object placement preview, validation errors, event editor modal.
- Accessibility: reduced motion, high contrast, keyboard focus traversal for modal-heavy screens.
