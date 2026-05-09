// @hr/contracts/fakes — canonical in-memory fakes for the contracts.
//
// This file is intentionally a placeholder. The concrete fake bodies
// (`FakeRng`, `FakeClock`, `FakeIdAllocator`, `FakePackRegistry`,
// `FakeAssetLoader`, `FakeCommandBus`, `FakeNetTransport`) land in
// follow-up tasks.
//
// The location is fixed by docs/architecture/testing-conventions.md §2:
// every cross-module contract published in src/contracts/ ships at
// least one fake here, and tests that need a fake must import the
// shared one rather than write their own.

export {};
