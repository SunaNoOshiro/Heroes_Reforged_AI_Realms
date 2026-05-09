// validate:smells — runs ESLint with --max-warnings 0 over the
// product source. The actual rule set lives in eslint.config.mjs;
// this script is the uniform entry point so `npm run validate` and
// per-task `verifyCommands` invoke it the same way.
//
// Why this gate exists:
//   Catches cognitive-complexity blowups, identical-function clones
//   that jscpd misses (e.g. two functions with different names but
//   the same body shape), and the family of "two slightly different
//   ways to do the same thing" smells (`indexOf >= 0` vs `.includes`,
//   `for-of` vs `.some`, raw `require('fs')` vs `node:` protocol,
//   etc.).

import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..");

function runEslint(scope) {
  return new Promise((resolve, reject) => {
    const args = ["eslint", "--max-warnings", "0", ...scope];
    const child = spawn("npx", args, { cwd: repoRoot, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function main() {
  const scope = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  // Default scope is product code only. scripts/ is intentionally
  // excluded for now: most files there pre-date the gate, several are
  // restricted (anti-cheat surface) and cannot be edited without
  // owner approval, and the gate's purpose is to catch sloppiness in
  // *new* engine/UI code. Pass an explicit scope to lint scripts/.
  const paths = scope.length > 0 ? scope : ["src", "services"];

  const exitCode = await runEslint(paths);
  if (exitCode !== 0) {
    console.error(
      `\nvalidate:smells FAIL (eslint exit ${exitCode}).`,
    );
    console.error(
      "\n┌─ Right fix per common rule ──────────────────────────────────────",
    );
    console.error(
      "│ sonarjs/no-identical-functions: extract the shared body into a",
    );
    console.error(
      "│   helper; both functions call it.",
    );
    console.error(
      "│ sonarjs/no-duplicate-string: define a `const NAME = \"value\"` and",
    );
    console.error(
      "│   import it everywhere. Don't stringify around the matcher.",
    );
    console.error(
      "│ sonarjs/cognitive-complexity: extract sub-functions with semantic",
    );
    console.error(
      "│   names; replace nested branches with early returns or a lookup",
    );
    console.error(
      "│   table. Don't split arbitrarily just to lower the count.",
    );
    console.error(
      "│ sonarjs/no-collapsible-if: merge the nested `if` conditions with `&&`.",
    );
    console.error(
      "│ unicorn/prefer-includes / prefer-array-some / etc.: use the more",
    );
    console.error(
      "│   idiomatic API. Behavior is identical.",
    );
    console.error(
      "├─ Wrong fixes (treated as cheats per structural-checks SKILL.md) ─",
    );
    console.error(
      "│ × `// eslint-disable-next-line <rule>` without a `-- reason: <why>`",
    );
    console.error(
      "│   justification on the same line. validate:suppression-audit",
    );
    console.error(
      "│   catches unjustified suppressions on a separate gate.",
    );
    console.error(
      "│ × Add a useless argument or rename to defeat no-identical-functions.",
    );
    console.error(
      "│ × Lower the cognitive-complexity / no-duplicate-string threshold",
    );
    console.error(
      "│   in eslint.config.mjs to make warnings disappear.",
    );
    console.error(
      "│ × Disable the rule globally instead of fixing the offending site.",
    );
    console.error(
      "└──────────────────────────────────────────────────────────────────",
    );
    console.error(
      "\nDoctrine: .agents/skills/structural-checks/SKILL.md § smells",
    );
    process.exitCode = 1;
    return;
  }
  console.log("validate:smells: OK");
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  await main();
}
