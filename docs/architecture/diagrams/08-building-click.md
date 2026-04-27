---
id: "08-building-click"
title: "Building Click → Action Flow"
category: "town"
short: "8. Building Click"
---

**Player clicks a building, game responds.** Click position is mapped to building. Building schema declares its action (recruit, learn spell, build, etc.). UI panel opens. Player command is dispatched.

```mermaid
sequenceDiagram
    actor Player
    participant Mouse
    participant Town as TownView
    participant Building as BuildingDef
    participant Cmd as CommandDispatcher
    participant State as GameState

    Player->>Mouse: Click on castle building
    Mouse->>Town: hit_test(x, y)
    Town->>Town: Find building at coords
    Town->>Building: Get building.actionType
    Building-->>Town: 'recruit_units'
    Town->>Town: Open recruit panel
    Town-->>Player: Show panel (units, prices)
    Player->>Town: Click 'Recruit 5 hounds'
    Town->>Cmd: dispatch RECRUIT_UNITS<br/>{heroId, dwellingId, qty: 5}
    Cmd->>Cmd: Validate command
    Cmd->>State: Apply state mutation
    State-->>Cmd: New state
    Cmd-->>Town: Success
    Town->>Town: Play recruit animation
    Town-->>Player: Updated UI
```

## Action Types

Each building declares one of: `recruit_units`, `learn_spell`, `build`, `upgrade`, `tavern`, `market`, `none`

The action type maps to a panel component, which handles its specific UI flow.
