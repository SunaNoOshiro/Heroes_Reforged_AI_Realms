# Map Serializer / Deserializer

Status: planned

Module: [Map System (M1)](../03-map-system.md)

Description:
Serialize a `MapStorage` to a compact binary-safe JSON format for save files and scenario files. Deserialize back to `MapStorage` with full fidelity.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- `MapStorage` (Task 3)

Outputs:
- `src/engine/map-serializer.ts`
- `serializeMap(map: MapStorage): string` (base64-encoded compressed Uint16Array layers)
- `deserializeMap(data: string): MapStorage`

Owned Paths:
- `src/engine/map-serializer.ts`

Dependencies:
- mvp.03-map-system.03-layered-tile-storage

Acceptance Criteria:
- Round-trip: `deserializeMap(serializeMap(map))` produces `MapStorage` with identical tile values
- A 128×128 map serializes to < 50KB (gzip compressed)
- Invalid data throws with a clear error message

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
