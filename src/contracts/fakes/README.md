# `@hr/contracts/fakes` — Shared fake catalogue

Canonical in-memory implementations of every cross-module contract.
Pinned by [`testing-conventions.md`](../../../docs/architecture/testing-conventions.md)
§2.

## Inventory

| Fake | Mirrors | Status |
|---|---|---|
| `FakeRng` | [`Rng`](../rng.ts) | placeholder — body lands via [15-testability-plan.md](../../../docs/implementation-plans/15-testability-plan.md) |
| `FakeClock` | [`Clock`](../clock.ts) | placeholder |
| `FakeIdAllocator` | [`IdAllocator`](../id-allocator.ts) | placeholder |
| `FakePackRegistry` | [`PackRegistry`](../pack-registry.ts) | placeholder |
| `FakeAssetLoader` | [`AssetLoader`](../asset-loader.ts) | placeholder |
| `FakeCommandBus` | [`CommandBus`](../command-bus.ts) | placeholder |
| `FakeNetTransport` | [`NetTransport`](../net-transport.ts) | placeholder; will be the deterministic NetSim |

## Discipline

- **Tests must import shared fakes.** If you need a fake of a contract
  that lives in `src/contracts/`, import the shared fake here. Do
  not write a new fake in your test file.
- **Fakes implement the full contract.** A fake that supports a
  partial subset of methods is a bug; extend the fake (and add a test
  for the new method) instead of working around it in tests.
- **Fakes are deterministic.** `FakeRng` is a counter, `FakeClock`
  ticks on demand, `FakeNetTransport` (NetSim) delivers messages in
  registered order. No real I/O, no wall-clock, no network.
