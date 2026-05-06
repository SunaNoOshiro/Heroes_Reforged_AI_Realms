#!/usr/bin/env node
// Supersession-annotation validator.
//
// Schemas under content-schema/schemas/ may carry:
//   "x-supersededBy": "<schema-id>"        // canonical replacement
//   "x-supersededReason": "<plan-id>"      // citing plan / source
//
// This validator enforces three invariants:
//
// 1. If a schema carries `x-supersededBy`, the referenced schema id
//    MUST exist under content-schema/schemas/.
// 2. New canonical-example fixtures MUST NOT be authored under a
//    superseded schema. The check looks at every example whose
//    `$schema` pointer references a superseded schema, and at every
//    example file path that lives under
//    `content-schema/examples/<basename>/`.
// 3. Task `Owned Paths` MUST NOT cite a superseded schema unless
//    the task is the **supersession authority** — i.e. the task
//    explicitly references the supersession in its body via the
//    string `x-supersededBy` or by naming the replacement schema.
//
// Wired into `npm run validate` via the `validate:supersession`
// alias.

import fs from "node:fs/promises";
import path from "node:path";
import { repoRoot, walkFiles } from "./lib/repo-utils.mjs";

const SCHEMAS_DIR = path.join(repoRoot, "content-schema", "schemas");
const EXAMPLES_DIR = path.join(repoRoot, "content-schema", "examples");
const TASKS_DIR = path.join(repoRoot, "tasks");

async function readJson(file) {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

async function readUtf8(file) {
  return fs.readFile(file, "utf8");
}

async function loadSchemas() {
  const files = await walkFiles(SCHEMAS_DIR, (p) => p.endsWith(".schema.json"));
  const byId = new Map();
  for (const file of files) {
    const schema = await readJson(file);
    if (typeof schema.$id === "string") {
      byId.set(schema.$id, { file, schema });
    }
  }
  return byId;
}

async function listExamples() {
  if (!(await pathExists(EXAMPLES_DIR))) return [];
  return walkFiles(EXAMPLES_DIR, (p) => p.endsWith(".json"));
}

async function listTaskFiles() {
  return walkFiles(TASKS_DIR, (p) => p.endsWith(".md"));
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function basenameFromId(schemaId) {
  return schemaId.split("/").pop();
}

function exampleSchemaIdFromPointer(value, schemasById) {
  if (typeof value !== "string") return null;
  const tail = value.split("/").pop();
  if (!tail) return null;
  for (const id of schemasById.keys()) {
    if (basenameFromId(id) === tail) return id;
  }
  return null;
}

async function main() {
  const errors = [];
  const schemasById = await loadSchemas();

  const supersededIds = new Set();
  for (const [id, { file, schema }] of schemasById) {
    if (typeof schema["x-supersededBy"] !== "string") continue;
    const target = schema["x-supersededBy"];
    if (!schemasById.has(target)) {
      errors.push(
        `${path.relative(repoRoot, file)}: x-supersededBy targets unknown schema "${target}"`
      );
      continue;
    }
    if (typeof schema["x-supersededReason"] !== "string") {
      errors.push(
        `${path.relative(repoRoot, file)}: x-supersededBy requires a paired x-supersededReason`
      );
    }
    supersededIds.add(id);
  }

  if (supersededIds.size === 0) {
    process.stdout.write(
      "check-supersession: no schemas carry x-supersededBy; nothing to verify.\n"
    );
    return;
  }

  const supersededBasenames = new Set(
    [...supersededIds].map((id) => basenameFromId(id).replace(/\.schema\.json$/, ""))
  );

  // Invariant 2: example fixtures under a superseded schema folder.
  const examples = await listExamples();
  for (const file of examples) {
    const rel = path.relative(EXAMPLES_DIR, file);
    const top = rel.split(path.sep)[0];
    if (supersededBasenames.has(top)) {
      errors.push(
        `${path.relative(repoRoot, file)}: canonical example authored under superseded schema folder "${top}"`
      );
    }
    try {
      const data = await readJson(file);
      const pointer = data?.$schema;
      const id = exampleSchemaIdFromPointer(pointer, schemasById);
      if (id && supersededIds.has(id)) {
        errors.push(
          `${path.relative(repoRoot, file)}: $schema points at superseded schema "${id}"`
        );
      }
    } catch {
      // Non-JSON or unreadable; ignore — other validators cover parse errors.
    }
  }

  // Invariant 3: task Owned Paths citing a superseded schema basename.
  const taskFiles = await listTaskFiles();
  for (const file of taskFiles) {
    const text = await readUtf8(file);
    const ownedMatch = text.match(/Owned Paths:\s*([\s\S]*?)(?:\n\s*\n|^Owned Paths \(shared\):|^Dependencies:|^Acceptance Criteria:|$)/m);
    if (!ownedMatch) continue;
    const owned = ownedMatch[1];
    for (const id of supersededIds) {
      const base = basenameFromId(id);
      if (!owned.includes(base)) continue;
      // Allow if task body cites the superseder by id, basename, or the
      // canonical supersession marker.
      const replacementId = schemasById.get(id).schema["x-supersededBy"];
      const replacementBase = basenameFromId(replacementId);
      if (
        text.includes("x-supersededBy") ||
        text.includes(replacementId) ||
        text.includes(replacementBase)
      ) {
        continue;
      }
      errors.push(
        `${path.relative(repoRoot, file)}: Owned Paths cites superseded schema "${base}" without referencing the supersession authority`
      );
    }
  }

  if (errors.length > 0) {
    for (const e of errors) process.stderr.write(`${e}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `check-supersession: ${supersededIds.size} superseded schema(s) verified.\n`
  );
}

await main();
