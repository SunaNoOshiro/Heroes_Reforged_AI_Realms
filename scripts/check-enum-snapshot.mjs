import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  pathExists,
  readUtf8,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";
import { buildEnumSnapshot } from "./snapshot-enums.mjs";

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

const snapshotPath = path.join(repoRoot, "content-schema", "enums.snapshot.json");
const removedPath = path.join(repoRoot, "content-schema", "enums.removed.json");
const schemasDir = path.join(repoRoot, "content-schema", "schemas");
const migrationsDir = path.join(repoRoot, "src", "content-schema", "migrations");

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function loadJsonOrEmpty(filePath, fallback) {
  if (!(await pathExists(filePath))) return fallback;
  return JSON.parse(await readUtf8(filePath));
}

async function loadAliasesFor(schemaId) {
  const base = path.basename(schemaId, ".schema.json");
  const aliasesPath = path.join(schemasDir, `${base}.aliases.json`);
  if (!(await pathExists(aliasesPath))) return {};
  return JSON.parse(await readUtf8(aliasesPath));
}

async function loadMigrationFiles() {
  if (!(await pathExists(migrationsDir))) return [];
  return walkFiles(migrationsDir, (p) => p.endsWith(".ts"));
}

async function migrationsApplyToSchema(schemaId) {
  const files = await loadMigrationFiles();
  for (const file of files) {
    const text = await readUtf8(file);
    if (text.includes(schemaId)) return true;
  }
  return false;
}

function aliasCoversValue(aliases, snapshotPointer, value) {
  // snapshotPointer looks like `<schemaId>#/properties/foo/enum`
  // Aliases look like { "/properties/foo": { "<old>": "<new>" } }
  const hashIndex = snapshotPointer.indexOf("#");
  if (hashIndex === -1) return false;
  const localPointer = snapshotPointer.slice(hashIndex + 1);
  // Walk up: snapshot pointer ends with `/enum` or `/const`; the
  // alias key is the parent of that segment.
  const parent = localPointer.replace(/\/(enum|const)$/, "");
  const entry = aliases[parent];
  if (!entry) return false;
  return Object.prototype.hasOwnProperty.call(entry, value);
}

export async function checkEnumSnapshot() {
  if (!(await pathExists(snapshotPath))) {
    return [
      `${path.relative(repoRoot, snapshotPath)}: missing — run \`npm run generate:enum-snapshot\` to create it.`
    ];
  }

  const baseline = JSON.parse(await readUtf8(snapshotPath));
  const current = await buildEnumSnapshot();
  const removedEntries = await loadJsonOrEmpty(removedPath, {});
  const violations = [];

  for (const [schemaId, baselineEntries] of Object.entries(baseline)) {
    const currentEntries = current[schemaId] ?? {};
    const aliases = await loadAliasesFor(schemaId);
    const removedForSchema = removedEntries[schemaId] ?? {};

    for (const [pointerKey, baselineValues] of Object.entries(baselineEntries)) {
      const currentValues = new Set(currentEntries[pointerKey] ?? []);
      for (const value of baselineValues) {
        if (currentValues.has(value)) continue;

        const aliasOk = aliasCoversValue(aliases, pointerKey, value);
        const removedOk = Array.isArray(removedForSchema[pointerKey])
          && removedForSchema[pointerKey].includes(value);

        if (aliasOk) {
          const hasMigration = await migrationsApplyToSchema(schemaId);
          if (!hasMigration) {
            violations.push(
              `${pointerKey}: value "${value}" was aliased but no migration entry under src/content-schema/migrations/ references ${schemaId}.`
            );
          }
          continue;
        }

        if (removedOk) continue;

        violations.push(
          `${pointerKey}: value "${value}" was removed without an alias in ${path.basename(schemaId, ".schema.json")}.aliases.json or an entry in content-schema/enums.removed.json.`
        );
      }
    }
  }

  return violations;
}

if (isDirectRun()) {
  const violations = await checkEnumSnapshot();
  if (violations.length > 0) {
    for (const violation of violations) console.error(violation);
    process.exitCode = 1;
  } else {
    console.log("Enum snapshot check passed.");
  }
}
