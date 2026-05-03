// Illustrative migration entry — NOT wired against any shipping schema.
//
// Clone this file when authoring the first real migration. The
// canonical procedure lives in
// `docs/architecture/schema-migration-policy.md`. The registry README
// at `./README.md` summarises the file layout.
//
// What this example does:
//   v1 record shape: { schemaVersion: 1, id: string, displayName: string }
//   v2 record shape: { schemaVersion: 2, id: string, name:        string }
//
// It renames `displayName` -> `name` and bumps `schemaVersion`.

export const from = 1;
export const to = 2;

// Real entries list one or more schema $ids here. The empty
// "example" id keeps the runner from applying this migration to any
// shipping schema by accident.
export const appliesTo: string[] = [
  "heroes-reforged/_example-only.schema.json"
];

type ExampleV1 = {
  schemaVersion: 1;
  id: string;
  displayName: string;
};

type ExampleV2 = {
  schemaVersion: 2;
  id: string;
  name: string;
};

function isExampleV1(value: unknown): value is ExampleV1 {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === 1
    && typeof record.id === "string"
    && typeof record.displayName === "string"
  );
}

export function migrate(record: unknown): unknown {
  if (!isExampleV1(record)) {
    // The runner walks every record in a pack; non-matching shapes
    // pass through untouched. Real entries should follow the same
    // pattern: only rewrite records that look like the source shape.
    return record;
  }
  const next: ExampleV2 = {
    schemaVersion: 2,
    id: record.id,
    name: record.displayName
  };
  return next;
}
