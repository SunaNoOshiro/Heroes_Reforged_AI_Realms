---
id: "20-number-format"
title: "Number & Date Formatting"
category: "localization"
short: "20. Number Format"
---

**Locale-aware formatting.** Damage numbers, gold counts, dates use Intl API. RTL languages flip number alignment. Decimal/thousand separators per locale.

```mermaid
flowchart TD
    A[Show: 1234 damage] --> B[FormatNumber]
    B --> C{Locale?}
    C -->|en-US| D["1,234"]
    C -->|de-DE| E["1.234"]
    C -->|fr-FR| F["1 234"]
    C -->|ar-SA| G["١٬٢٣٤"]

    H[Show: day 105] --> I[FormatDate]
    I --> J{Format style}
    J -->|gameDays| K["Day 105 of 365"]
    J -->|gameWeeks| L["Week 15, Day 3"]
    J -->|gameMonths| M["Month 4, Week 3, Day 3"]

    style A fill:#bbdefb
    style D fill:#c5e1a5
    style E fill:#c5e1a5
    style F fill:#c5e1a5
    style G fill:#c5e1a5
```

## Implementation

Uses native browser `Intl.NumberFormat` and `Intl.DateTimeFormat` APIs. No external library needed. Locale data is built into the browser.

```javascript
new Intl.NumberFormat(locale).format(1234)
// "1,234" en-US
// "1.234" de-DE
// "1 234" fr-FR
```
