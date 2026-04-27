import assert from "node:assert/strict";
import test from "node:test";
import { collectBrokenLinks } from "../check-markdown-links.mjs";
import { collectContractViolations } from "../check-repo-contracts.mjs";

test("markdown links resolve", async () => {
  const brokenLinks = await collectBrokenLinks();
  assert.deepEqual(brokenLinks, []);
});

test("repo contract checks pass", async () => {
  const violations = await collectContractViolations();
  assert.deepEqual(violations, []);
});
