// Companion test for `example-v1-to-v2-rename-field.ts`.
//
// This is the canonical test shape every real migration must mirror.
// Wired against `node --test` once the TS workspace lands; until then,
// it documents the contract for the test runner.
//
// Required assertions:
//   1. migrate(input) === expected (deep equal)
//   2. migrate(non-matching record) === non-matching record (pass-through)

import { strict as assert } from "node:assert";
import test from "node:test";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { migrate, from, to, appliesTo } from "./example-v1-to-v2-rename-field.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): unknown {
  const filePath = path.join(here, "fixtures", name);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

test("example-v1-to-v2 metadata", () => {
  assert.equal(from, 1);
  assert.equal(to, 2);
  assert.equal(to, from + 1);
  assert.deepEqual(appliesTo, ["heroes-reforged/_example-only.schema.json"]);
});

test("example-v1-to-v2 rewrites displayName -> name and bumps schemaVersion", () => {
  const input = loadFixture("example-v1-to-v2-rename-field.input.json");
  const expected = loadFixture("example-v1-to-v2-rename-field.expected.json");
  assert.deepEqual(migrate(input), expected);
});

test("example-v1-to-v2 leaves non-matching records untouched", () => {
  const unrelated = { schemaVersion: 1, id: "foo", color: "red" };
  assert.deepEqual(migrate(unrelated), unrelated);
});
