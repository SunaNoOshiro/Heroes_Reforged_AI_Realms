---
id: "27-component-resolution"
title: "Component Resolution — data-component → React Constructor"
category: "ui"
short: "27. Component Resolution"
---

**How a `data-component` annotation becomes a runtime component.**
Pinned in [`ui-component-resolver.md`](../ui-component-resolver.md) and
backed by
[`content-schema/schemas/ui-component-registry.schema.json`](../../../content-schema/schemas/ui-component-registry.schema.json).

```mermaid
flowchart TD
    Mockup["screen mockup.html<br/>data-component='X'"] --> Spec
    Spec["screen spec.md<br/>### Component Tree"] --> Validator
    Registry["ui-component-registry.example.json"] --> Validator
    Validator["validate-screen-component-coverage.mjs"]
    Validator -- coverage ok --> Boot
    Boot["app boot"] --> Resolver["ComponentResolver<br/>(merged registries)"]
    Resolver --> Mount["screen mount"]
    Mount --> Resolve{resolveComponent X}
    Resolve -- found --> Ctor["import module exportName<br/>per-mount or singleton"]
    Resolve -- missing & DEV --> RedBox["red placeholder + console.warn"]
    Resolve -- missing & PROD --> Empty["data-missing-component div + telemetry"]
    Ctor --> Render["React render"]
    RedBox --> Render
    Empty --> Render
```

## Rules

- The mockup and spec are the **visual contract**; the registry is
  the **runtime contract**. The validator binds them.
- One `componentId` resolves to exactly one constructor. Pack
  registries layer additively; no overrides at MVP.
- Reuse policy: per-mount instantiation by default; `singleton: true`
  shares one instance across the app.
- Missing-component behaviour is non-throwing in both DEV and PROD;
  it is loud in DEV and quiet (with telemetry) in PROD.

## Related diagrams

- [26 — Pointer Event Routing](./26-pointer-event-routing.md)
- [18 — Localization String Resolution](./18-string-resolution.md)
