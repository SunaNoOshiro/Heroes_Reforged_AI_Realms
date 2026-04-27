---
id: "19-locale-variants"
title: "Locale-Specific Asset Variants"
category: "localization"
short: "19. Locale Variants"
---

**Some assets vary by locale.** Creature names rendered as text in art. Currency symbols. Cultural icons. Locale pack can override art with localized version.

```mermaid
flowchart LR
    A[Need asset:<br/>spell:fireball:icon] --> B[Asset Registry]
    B --> C{Has locale variant?}
    C -->|YES| D[Check current locale]
    C -->|NO| E[Use default]

    D --> F{Locale variant exists?}
    F -->|YES en-US| G[icons/spell-fireball-en.png]
    F -->|YES fr-FR| H[icons/spell-fireball-fr.png]
    F -->|YES ja-JP| I[icons/spell-fireball-jp.png]
    F -->|NO| E

    E --> J[icons/spell-fireball.png]

    G --> K[Render icon]
    H --> K
    I --> K
    J --> K

    style A fill:#bbdefb
    style K fill:#a5d6a7
```

## When to Use Locale Variants

- Icons containing readable text
- Currency or numeric symbols
- Cultural imagery (e.g., regional decoration)
- Right-to-left UI mirroring assets

Most game assets (creatures, terrain) don't need locale variants.
