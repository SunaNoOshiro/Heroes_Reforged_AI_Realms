// ESLint flat config — owns the `validate:smells` gate.
//
// Goal: catch the code-smell shapes AI agents reach for first when
// they don't see an existing helper. Cherry-picked sonarjs and
// unicorn rules; full `recommended` presets are deliberately NOT
// extended because they include style opinions that have nothing to
// do with duplication/smells and would generate noise unrelated to
// the gate's purpose.
//
// Rule choices map back to:
//   - sonarjs/no-identical-functions: agent rewrites a helper instead of importing it
//   - sonarjs/no-duplicate-string:    agent re-types magic strings
//   - sonarjs/cognitive-complexity:   agent stacks branches instead of splitting
//   - sonarjs/no-collapsible-if etc.: agent's structural sloppiness
//   - unicorn/prefer-* :              "two slightly different ways to do the same thing"
//
// Tests, fixtures, generated contracts, and migration templates are
// scoped out — duplication is expected there.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";

const SHARED_SMELL_RULES = {
  // --- Duplication ---
  "sonarjs/no-identical-functions": ["error", 4],
  "sonarjs/no-duplicate-string": ["error", { threshold: 5 }],
  "sonarjs/no-duplicated-branches": "error",
  "sonarjs/no-all-duplicated-branches": "error",
  "sonarjs/no-identical-expressions": "error",
  "sonarjs/no-identical-conditions": "error",

  // --- Structural sloppiness ---
  "sonarjs/cognitive-complexity": ["error", 15],
  "sonarjs/no-collapsible-if": "error",
  "sonarjs/no-redundant-boolean": "error",
  "sonarjs/no-redundant-jump": "error",
  "sonarjs/no-useless-catch": "error",
  "sonarjs/no-inverted-boolean-check": "error",
  "sonarjs/no-small-switch": "error",
  "sonarjs/prefer-immediate-return": "error",
  "sonarjs/prefer-single-boolean-return": "error",

  // --- "Two slightly different ways to do the same thing" ---
  "unicorn/prefer-array-some": "error",
  "unicorn/prefer-includes": "error",
  "unicorn/no-useless-undefined": "error",
  "unicorn/no-array-push-push": "error",
  "unicorn/prefer-node-protocol": "error",
  "unicorn/prefer-string-starts-ends-with": "error",
  "unicorn/no-instanceof-builtins": "error",
};

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "reports/**",
      ".stryker-tmp/**",
      "src/contracts/**",
      "src/content-schema/migrations/example-*",
      "**/*.d.ts",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ["src/**/*.ts", "src/**/*.tsx", "services/**/*.ts"],
  })),

  {
    files: ["src/**/*.ts", "src/**/*.tsx", "services/**/*.ts"],
    plugins: {
      sonarjs,
      unicorn,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...SHARED_SMELL_RULES,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-unused-vars": "off",
    },
  },

  {
    files: [
      "**/__tests__/**/*.{ts,tsx,mjs}",
      "**/*.test.{ts,tsx,mjs}",
      "**/*.spec.{ts,tsx,mjs}",
      "**/*.smoke.test.{ts,tsx}",
    ],
    rules: {
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/no-identical-functions": "off",
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/no-duplicated-branches": "off",
      "unicorn/no-useless-undefined": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // src/ui/sanitize.ts contains a regex matching literal control
  // characters and other irregular whitespace by design — that is the
  // function's purpose. See docs/architecture/untrusted-strings.md.
  {
    files: ["src/ui/sanitize.ts"],
    rules: {
      "no-control-regex": "off",
      "no-irregular-whitespace": "off",
    },
  },
];
