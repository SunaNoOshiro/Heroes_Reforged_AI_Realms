// Single source of truth for module-class thresholds.
//
// Both `validate-mutation-score` and `validate-coverage-floor` need to
// classify a source file by its repo-path prefix and look up a
// per-class numeric floor. Keeping the path → class map in one place
// means a future "include src/audio/" change lands in one file
// instead of two — and the two gates can never disagree about which
// module class a file belongs to.
//
// Floors mirror `.claude/skills/mutation-test/SKILL.md` and DEC-003.

/** @typedef {{ label: string, mutation: number, coverage: { lines: number, branches: number } }} ModuleClass */

/** @type {{ match: RegExp, class: ModuleClass }[]} */
export const MODULE_CLASSES = [
  { match: /^src\/engine\//,         class: { label: "engine",         mutation: 80, coverage: { lines: 90, branches: 80 } } },
  { match: /^src\/rules\//,          class: { label: "rules",          mutation: 80, coverage: { lines: 90, branches: 80 } } },
  { match: /^src\/content-schema\//, class: { label: "content-schema", mutation: 80, coverage: { lines: 90, branches: 80 } } },
  { match: /^src\/content-runtime\//,class: { label: "content-runtime",mutation: 80, coverage: { lines: 90, branches: 80 } } },
  { match: /^src\/net\//,            class: { label: "net",            mutation: 80, coverage: { lines: 90, branches: 80 } } },
  { match: /^src\/shared\//,         class: { label: "shared",         mutation: 80, coverage: { lines: 90, branches: 80 } } },
  { match: /^src\/contracts\//,      class: { label: "contracts",      mutation: 75, coverage: { lines: 80, branches: 70 } } },
  { match: /^services\//,            class: { label: "services",       mutation: 75, coverage: { lines: 80, branches: 70 } } },
  { match: /^src\/ui\//,             class: { label: "ui",             mutation: 65, coverage: { lines: 70, branches: 60 } } },
  { match: /^src\/renderer\//,       class: { label: "renderer",       mutation: 65, coverage: { lines: 70, branches: 60 } } },
];

/** @type {ModuleClass} */
export const DEFAULT_CLASS = {
  label: "default",
  mutation: 70,
  coverage: { lines: 75, branches: 65 },
};

/** @returns {ModuleClass} */
export function classifyPath(filePath) {
  for (const entry of MODULE_CLASSES) {
    if (entry.match.test(filePath)) return entry.class;
  }
  return DEFAULT_CLASS;
}
