#!/usr/bin/env node
// scripts/generate-contracts-from-schemas.mjs
//
// Implementation Plan 16 (T7). Drives JSON-Schema → TypeScript code
// generation for the schema-derived files under src/contracts/.
//
// Current behavior: a check-only stub. Until the project ships its
// first runtime dependency (M0), `json-schema-to-typescript` is not
// installed; we keep the generated TS hand-aligned with the schema
// and verify that alignment by walking every schema-derived contract
// in `MAPPINGS` and asserting the generated file's `// Generated from`
// header still references the matching schema.
//
// Once M0 lands, replace the stub body with a real generator call:
//
//   import { compile } from "json-schema-to-typescript";
//   for (const m of MAPPINGS) {
//     const schema = JSON.parse(await readFile(m.schema, "utf8"));
//     const ts = await compile(schema, m.title, { …options });
//     await writeFile(m.target, BANNER + ts);
//   }

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const MAPPINGS = [
  {
    schema: "content-schema/schemas/renderer-event.schema.json",
    target: "src/contracts/renderer-event.ts",
    title: "RendererEvent"
  },
  {
    schema: "content-schema/schemas/validation-report.schema.json",
    target: "src/contracts/reports.ts",
    title: "ValidationReport"
  },
  {
    schema: "content-schema/schemas/coherence-report.schema.json",
    target: "src/contracts/reports.ts",
    title: "CoherenceReport"
  },
  {
    schema: "content-schema/schemas/balance-report.schema.json",
    target: "src/contracts/reports.ts",
    title: "BalanceReport"
  }
];

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const violations = [];

  for (const mapping of MAPPINGS) {
    const schemaAbs = path.join(repoRoot, mapping.schema);
    const targetAbs = path.join(repoRoot, mapping.target);

    if (!(await pathExists(schemaAbs))) {
      violations.push(`${mapping.schema}: schema is missing`);
      continue;
    }
    if (!(await pathExists(targetAbs))) {
      violations.push(`${mapping.target}: generated contract is missing`);
      continue;
    }

    const ts = await readFile(targetAbs, "utf8");
    const schemaBase = path.basename(mapping.schema);
    if (!ts.includes(schemaBase)) {
      violations.push(
        `${mapping.target}: generated banner does not reference ${schemaBase}`
      );
    }
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Contracts generator stub: every schema-derived contract is aligned with its source schema.");
}

await main();
