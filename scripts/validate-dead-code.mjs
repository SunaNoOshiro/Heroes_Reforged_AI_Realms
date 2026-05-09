// validate:dead-code — runs knip and fails on unused files, unused
// exports, or unused dependencies. Each category gets a tailored
// "right fix / wrong fix" message so an agent reading the failure
// reaches for the correct action instead of the cheap one.
//
// Why this gate exists:
//   - Agent half-finishes a refactor and leaves an orphan file.
//   - Agent adds a "helper" that nothing imports.
//   - Agent adds a dependency that no source file actually uses.
//
// The exact entry/project/ignore list lives in knip.json so that IDEs
// and `npx knip` from a developer terminal surface the same problems.

import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..");

function runKnipJson() {
  return new Promise((resolve, reject) => {
    const args = ["knip", "--no-progress", "--reporter", "json"];
    const child = spawn("npx", args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "inherit"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code: code ?? 0, stdout }));
  });
}

function categorize(report) {
  // knip's JSON shape: { issues: [{ file, owners, ...categories }] }
  // Each category is an array of { name, line, col, ... } findings.
  const findings = {
    files: [],       // file is fully unused
    exports: [],     // unused named export
    types: [],       // unused exported type
    enumMembers: [], // unused enum member
    classMembers: [],
    duplicates: [],  // duplicate exports
    dependencies: [],       // unused devDep / dep
    devDependencies: [],
    optionalPeerDependencies: [],
    unlisted: [],    // imports an unlisted dep
    binaries: [],    // unlisted binary in scripts
    unresolved: [],
  };
  const issues = report.issues || [];
  for (const issue of issues) {
    const file = issue.file;
    if (issue.files) findings.files.push(file);
    for (const key of [
      "exports", "types", "nsExports", "nsTypes", "enumMembers",
      "classMembers", "duplicates",
    ]) {
      const arr = issue[key];
      if (Array.isArray(arr)) {
        for (const f of arr) findings.exports.push(`${file}: ${f.name || f}`);
      }
    }
    for (const key of [
      "dependencies", "devDependencies", "optionalPeerDependencies",
    ]) {
      const arr = issue[key];
      if (Array.isArray(arr)) {
        for (const f of arr) findings[key].push(f.name || f);
      }
    }
    for (const key of ["unlisted", "binaries", "unresolved"]) {
      const arr = issue[key];
      if (Array.isArray(arr)) {
        for (const f of arr) findings[key].push(`${file}: ${f.name || f}`);
      }
    }
  }
  return findings;
}

function printSection(title, items) {
  if (items.length === 0) return;
  console.error(`\n${title} (${items.length}):`);
  for (const item of items) console.error(`  - ${item}`);
}

function printDoctrine() {
  console.error(
    "\n┌─ Right fix per category ──────────────────────────────────────────",
  );
  console.error(
    "│ Unused file:    either delete it (it really isn't needed) OR wire",
  );
  console.error(
    "│                 it into a consumer. If it's scaffolding for a future",
  );
  console.error(
    "│                 task, add to knip.json#ignore AND a one-line reason",
  );
  console.error(
    "│                 in knip.ignore-reasons.json on the same PR.",
  );
  console.error(
    "│ Unused export:  delete the export, OR start using it from a real",
  );
  console.error(
    "│                 caller. Library-style \"reserved for future\" surfaces",
  );
  console.error(
    "│                 are not allowed by default.",
  );
  console.error(
    "│ Unused dep:     `npm uninstall <pkg>`. If the dep is invoked via a",
  );
  console.error(
    "│                 binary that knip can't see (e.g. via npx in a script),",
  );
  console.error(
    "│                 add it to knip.json#ignoreDependencies with a reason.",
  );
  console.error(
    "│ Unlisted dep:   add it to package.json#dependencies (or devDeps) and",
  );
  console.error(
    "│                 commit the lockfile diff.",
  );
  console.error(
    "├─ Wrong fixes (treated as cheats per structural-checks SKILL.md) ──",
  );
  console.error(
    "│ × Re-export the unused symbol from a barrel just to silence knip.",
  );
  console.error(
    "│ × Add a fake test that imports the unused file solely to make it",
  );
  console.error(
    "│   reachable — knip will see it but the file has no real consumer.",
  );
  console.error(
    "│ × Add the file to knip.json#ignore without a reasons-file entry.",
  );
  console.error(
    "│ × Delete a file that another in-progress task depends on. If unsure,",
  );
  console.error(
    "│   surface the orphan in the task notes — do not delete blindly.",
  );
  console.error(
    "└──────────────────────────────────────────────────────────────────",
  );
  console.error(
    "\nDoctrine: .agents/skills/structural-checks/SKILL.md § dead-code",
  );
}

async function main() {
  const { code, stdout } = await runKnipJson();
  if (code === 0) {
    console.log("validate:dead-code: OK");
    return;
  }

  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    console.error(
      `validate:dead-code: knip exited ${code} but JSON output failed to parse.`,
    );
    console.error(stdout.slice(0, 4000));
    printDoctrine();
    process.exitCode = 1;
    return;
  }

  const f = categorize(report);

  console.error("validate:dead-code FAIL — knip findings:");
  printSection("Unused files", f.files);
  printSection("Unused exports", f.exports);
  printSection("Unused dependencies", f.dependencies);
  printSection("Unused devDependencies", f.devDependencies);
  printSection("Unused optional-peer dependencies", f.optionalPeerDependencies);
  printSection("Unlisted dependencies", f.unlisted);
  printSection("Unlisted binaries", f.binaries);
  printSection("Unresolved imports", f.unresolved);

  printDoctrine();
  process.exitCode = 1;
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  await main();
}
