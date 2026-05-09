// Pure derivation: task record → mandatory verifyCommands list.
//
// This is the anti-cheat invariant. The gate cannot be weakened by
// editing per-task .md files: any code-path task gets the full
// mutation + coverage gate; any UI-surface task gets the smoke gate.
//
// Single source of truth — imported by:
//   - scripts/tasks.mjs runVerify (in-process verify on `tasks:done`)
//   - scripts/recheck-done-tasks.mjs (CI re-verify on PR)
//
// scripts/__tests__/derive-verify-commands.test.mjs enforces an
// INVARIANT that tasks.mjs imports from here (no inline redefinition).

export function ownsUiSurface(task) {
  return (task.ownedPaths || []).some((entry) => /^src\/ui\//.test(entry));
}

export function ownsCodePath(task) {
  return (task.ownedPaths || []).some((entry) =>
    (/^src\//.test(entry) || /^services\//.test(entry))
    && !entry.endsWith(".md")
    && !entry.endsWith(".json"),
  );
}

export function deriveVerifyCommands(task) {
  const cmds = ["npm run validate", "npm test"];
  if (ownsCodePath(task)) {
    // Structural pre-checks — cheap, fail-fast before mutation/coverage.
    //   duplication: copy-paste over helper reuse
    //   smells:      cognitive blowups, identical functions, dup strings
    //   dead-code:   orphan files, unused exports, unused deps
    // These prove the code's *shape* is reasonable. The mutation/
    // coverage steps below still have to prove the *behavior* is pinned.
    cmds.push("npm run validate:duplication");
    cmds.push("npm run validate:smells");
    cmds.push("npm run validate:dead-code");

    cmds.push("npm run test:coverage");
    cmds.push("npm run test:mutation:changed");
    cmds.push(`npm run validate:mutation-score -- --task ${task.id} --changed-only`);
    cmds.push(`npm run validate:coverage-floor -- --task ${task.id}`);
  }
  if (ownsUiSurface(task)) {
    cmds.push(`node scripts/verify-ui-smoke.mjs "${task.id}"`);
  }
  for (const extra of task.verifyCommands || []) {
    if (!cmds.includes(extra)) cmds.push(extra);
  }
  return cmds;
}
