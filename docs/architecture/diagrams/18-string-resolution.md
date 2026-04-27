---
id: "18-string-resolution"
title: "Localization String Resolution"
category: "localization"
short: "18. String Resolution"
---

**How text appears in player's language.** All UI strings have IDs (e.g., `unit.dragon.name`). Locale pack provides translations. Fallback to English if missing. Right-to-left layouts handled by UI engine.

```mermaid
flowchart TD
    A[Code calls<br/>t 'unit.dragon.name'] --> B[Localization Service]
    B --> C{Current locale?}
    C -->|en-US| D[Load en-US pack]
    C -->|fr-FR| E[Load fr-FR pack]
    C -->|ja-JP| F[Load ja-JP pack]
    C -->|user-mod-loc| G[Load custom pack]

    D --> H[Lookup<br/>'unit.dragon.name']
    E --> H
    F --> H
    G --> H

    H --> I{Key found?}
    I -->|YES| J[Return translated]
    I -->|NO| K[Fallback to en-US]
    K --> L{Found in fallback?}
    L -->|YES| M[Return English + warn]
    L -->|NO| N[Return key name]

    J --> O[UI displays string]
    M --> O
    N --> O

    style A fill:#bbdefb
    style J fill:#a5d6a7
    style N fill:#ef5350,color:#fff
```

## Locale Pack Structure

Each locale pack contains:

```
locale-en-US/
├── manifest.json
├── strings/
│   ├── ui.json         # UI labels
│   ├── units.json      # Creature names
│   ├── spells.json     # Spell names/descriptions
│   ├── heroes.json     # Hero names/biographies
│   └── tooltips.json   # Help text
```

Strings use the same key in every locale pack. Translators only edit values.
