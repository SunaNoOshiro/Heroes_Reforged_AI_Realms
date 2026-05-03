import path from "node:path";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  readUtf8,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

const schemasDir = path.join(repoRoot, "content-schema", "schemas");
const snapshotPath = path.join(repoRoot, "content-schema", "enums.snapshot.json");

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pointerJoin(parent, segment) {
  const escaped = String(segment).replace(/~/g, "~0").replace(/\//g, "~1");
  return `${parent}/${escaped}`;
}

function collectFromNode(node, pointer, sink) {
  if (!isObject(node)) return;

  if (Array.isArray(node.enum)) {
    const values = node.enum
      .filter((v) => typeof v === "string")
      .slice()
      .sort();
    if (values.length > 0) {
      sink.push({ pointer: `${pointer}/enum`, values });
    }
  }

  if (typeof node.const === "string") {
    sink.push({ pointer: `${pointer}/const`, values: [node.const] });
  }

  for (const [key, child] of Object.entries(node)) {
    if (key === "enum" || key === "const") continue;
    if (Array.isArray(child)) {
      child.forEach((entry, idx) => {
        if (isObject(entry)) {
          collectFromNode(entry, pointerJoin(pointer, `${key}/${idx}`), sink);
        }
      });
    } else if (isObject(child)) {
      collectFromNode(child, pointerJoin(pointer, key), sink);
    }
  }
}

export async function buildEnumSnapshot() {
  const files = await walkFiles(schemasDir, (p) => p.endsWith(".schema.json"));
  const snapshot = {};

  for (const file of files) {
    const schema = JSON.parse(await readUtf8(file));
    const schemaId = schema.$id ?? path.basename(file);
    const sink = [];
    collectFromNode(schema, "#", sink);
    if (sink.length === 0) continue;

    const entries = {};
    for (const { pointer, values } of sink) {
      const key = `${schemaId}${pointer}`;
      entries[key] = values;
    }
    snapshot[schemaId] = entries;
  }

  // Sort keys deterministically for canonical JSON output.
  const sorted = {};
  for (const schemaId of Object.keys(snapshot).sort()) {
    const entries = snapshot[schemaId];
    const sortedEntries = {};
    for (const key of Object.keys(entries).sort()) {
      sortedEntries[key] = entries[key];
    }
    sorted[schemaId] = sortedEntries;
  }
  return sorted;
}

export async function writeSnapshot(snapshot) {
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  await fs.writeFile(snapshotPath, json, "utf8");
}

if (isDirectRun()) {
  const snapshot = await buildEnumSnapshot();
  await writeSnapshot(snapshot);
  console.log(`Wrote ${path.relative(repoRoot, snapshotPath)}.`);
}
