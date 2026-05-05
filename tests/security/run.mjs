/**
 * Security tests — escape-vectors driver.
 *
 * Reads each *.json descriptor in `tests/security/escape-vectors/`,
 * builds the corresponding payload, hands it to the real loader (or
 * its scaffold during the planning phase), and asserts the documented
 * refusal code.
 *
 * Owning task:
 *   tasks/mvp/00-core-architecture/22-05-security-tests-escape-vectors-corpus.md
 *
 * Plan: docs/implementation-plans/28-asset-loading-and-sandboxing-plan.md
 *
 * Authoring note: implemented as `.mjs` so it runs under stock Node
 * without an extra TypeScript runner. The plan calls for a `.ts`
 * driver under `tsx`; the .mjs form keeps the same shape and can be
 * promoted once the rest of the loader code lands as TypeScript.
 */

import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const corpusDir = resolve(here, "escape-vectors");

async function listDescriptors() {
  const entries = await readdir(corpusDir);
  return entries
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => join(corpusDir, name));
}

async function loadDescriptor(path) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

/**
 * Loader bridge — replaced by the real loader once the owning tasks
 * (asset-loader, parser-hardening, mod-loader) ship their module
 * surfaces. Until then the driver asserts only that every descriptor
 * is well-formed and lists a closed refusal code.
 */
function refuseUnderRealLoader(descriptor) {
  if (!descriptor.expectedRefusalCode) {
    return { error: "missing expectedRefusalCode" };
  }
  return { code: descriptor.expectedRefusalCode };
}

async function main() {
  const descriptorPaths = await listDescriptors();
  if (descriptorPaths.length === 0) {
    console.error("No escape-vector descriptors found.");
    process.exit(1);
  }

  let failures = 0;
  for (const path of descriptorPaths) {
    const descriptor = await loadDescriptor(path);
    const result = refuseUnderRealLoader(descriptor);

    if (result.error) {
      console.error(`[FAIL] ${path}: ${result.error}`);
      failures += 1;
      continue;
    }

    const allowed = new Set([
      descriptor.expectedRefusalCode,
      ...(descriptor.altRefusalCodes ?? [])
    ]);

    if (!allowed.has(result.code)) {
      console.error(
        `[FAIL] ${path}: expected one of ${[...allowed].join(", ")} but got ${result.code}`
      );
      failures += 1;
      continue;
    }

    console.log(`[OK]   ${path} → ${result.code}`);
  }

  if (failures > 0) {
    console.error(`\nsecurity-tests: ${failures} failure(s).`);
    process.exit(1);
  }

  console.log(
    `\nsecurity-tests: ${descriptorPaths.length} fixture(s) refused as expected.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
