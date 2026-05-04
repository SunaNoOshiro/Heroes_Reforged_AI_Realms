import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildTaskRegistry } from "./generate-task-registry.mjs";
import {
  pathExists,
  readUtf8,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const schemasDir = path.join(repoRoot, "content-schema", "schemas");
const schemaCache = new Map();

async function loadSchema(schemaFileName) {
  if (schemaCache.has(schemaFileName)) {
    return schemaCache.get(schemaFileName);
  }
  const fullPath = path.join(schemasDir, schemaFileName);
  const schema = JSON.parse(await readUtf8(fullPath));
  schemaCache.set(schemaFileName, schema);
  return schema;
}

function resolvePointer(root, pointer) {
  if (pointer === "#" || pointer === "") {
    return root;
  }
  if (!pointer.startsWith("#/")) {
    throw new Error(`unsupported pointer ${pointer}`);
  }
  const parts = pointer.slice(2).split("/");
  let current = root;
  for (const rawPart of parts) {
    const part = rawPart.replace(/~1/g, "/").replace(/~0/g, "~");
    if (current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

async function resolveRef(ref, context) {
  if (ref.startsWith("#")) {
    const resolved = resolvePointer(context.root, ref);
    return { schema: resolved, context };
  }
  const [rawFile, pointer] = ref.split("#");
  const targetFile = path.basename(rawFile);
  const newRoot = await loadSchema(targetFile);
  const newContext = { root: newRoot, file: targetFile };
  const schema = pointer
    ? resolvePointer(newRoot, `#${pointer}`)
    : newRoot;
  return { schema, context: newContext };
}

async function validate(value, schema, context, pointer = "$") {
  const errors = [];
  if (schema === true || schema === undefined) return errors;
  if (schema === false) return [`${pointer}: schema is false`];

  if (schema.$ref) {
    const resolved = await resolveRef(schema.$ref, context);
    return validate(value, resolved.schema, resolved.context, pointer);
  }

  if (Array.isArray(schema.oneOf)) {
    let matches = 0;
    const branchErrors = [];
    for (const branch of schema.oneOf) {
      const subErrors = await validate(value, branch, context, pointer);
      if (subErrors.length === 0) {
        matches += 1;
      } else {
        branchErrors.push(subErrors);
      }
    }
    if (matches !== 1) {
      errors.push(
        `${pointer}: value did not match exactly one oneOf branch (${matches} matched). First branch errors: ${
          (branchErrors[0] ?? []).slice(0, 3).join("; ")
        }`
      );
    }
  }

  if (Array.isArray(schema.anyOf)) {
    let any = false;
    for (const branch of schema.anyOf) {
      const subErrors = await validate(value, branch, context, pointer);
      if (subErrors.length === 0) {
        any = true;
        break;
      }
    }
    if (!any) {
      errors.push(`${pointer}: value did not match any anyOf branch`);
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (const branch of schema.allOf) {
      errors.push(...(await validate(value, branch, context, pointer)));
    }
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${pointer}: expected const ${JSON.stringify(schema.const)}`);
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${pointer}: expected one of ${schema.enum.join(", ")}`);
  }

  if (schema.type === "object"
    || (!schema.type && isObject(value) && (schema.properties || schema.required || schema.propertyNames || schema.minProperties !== undefined || schema.maxProperties !== undefined))
  ) {
    if (!isObject(value)) {
      errors.push(`${pointer}: expected object`);
      return errors;
    }
    for (const requiredKey of schema.required ?? []) {
      if (!(requiredKey in value)) {
        errors.push(`${pointer}: missing required property "${requiredKey}"`);
      }
    }
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
      errors.push(`${pointer}: must have at least ${schema.minProperties} properties`);
    }
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
      errors.push(`${pointer}: must have at most ${schema.maxProperties} properties`);
    }
    if (schema.propertyNames) {
      for (const key of keys) {
        const keyErrors = await validate(key, schema.propertyNames, context, `${pointer}.<key:${key}>`);
        errors.push(...keyErrors);
      }
    }
    const propSchemas = schema.properties ?? {};
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(propSchemas));
      for (const key of keys) {
        if (!allowed.has(key)) {
          errors.push(`${pointer}: unexpected property "${key}"`);
        }
      }
    } else if (isObject(schema.additionalProperties)) {
      const allowed = new Set(Object.keys(propSchemas));
      for (const key of keys) {
        if (!allowed.has(key)) {
          errors.push(
            ...(await validate(value[key], schema.additionalProperties, context, `${pointer}.${key}`))
          );
        }
      }
    }
    for (const [key, childSchema] of Object.entries(propSchemas)) {
      if (key in value) {
        errors.push(
          ...(await validate(value[key], childSchema, context, `${pointer}.${key}`))
        );
      }
    }
    return errors;
  }

  if (schema.type === "array"
    || (!schema.type && Array.isArray(value) && schema.items)
  ) {
    if (!Array.isArray(value)) {
      errors.push(`${pointer}: expected array`);
      return errors;
    }
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${pointer}: must have at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${pointer}: must have at most ${schema.maxItems} items`);
    }
    if (schema.uniqueItems === true) {
      const seen = new Set();
      for (let i = 0; i < value.length; i += 1) {
        const key = JSON.stringify(value[i]);
        if (seen.has(key)) {
          errors.push(`${pointer}[${i}]: duplicate item violates uniqueItems`);
        }
        seen.add(key);
      }
    }
    if (schema.items) {
      for (let index = 0; index < value.length; index += 1) {
        errors.push(
          ...(await validate(value[index], schema.items, context, `${pointer}[${index}]`))
        );
      }
    }
    return errors;
  }

  if (schema.type === "string") {
    if (typeof value !== "string") {
      return [`${pointer}: expected string`];
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${pointer}: must be at least ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${pointer}: must be at most ${schema.maxLength} characters`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${pointer}: does not match pattern ${schema.pattern}`);
    }
    return errors;
  }

  if (schema.type === "integer") {
    if (!Number.isInteger(value)) {
      return [`${pointer}: expected integer`];
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${pointer}: must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${pointer}: must be <= ${schema.maximum}`);
    }
    return errors;
  }

  if (schema.type === "number") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return [`${pointer}: expected number`];
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${pointer}: must be >= ${schema.minimum}`);
    }
    return errors;
  }

  if (schema.type === "boolean") {
    if (typeof value !== "boolean") {
      return [`${pointer}: expected boolean`];
    }
    return errors;
  }

  return errors;
}

async function collectForbiddenPatternViolations() {
  const violations = [];
  const abbreviation = (...parts) => `\\b${parts.join("")}\\b`;
  const forbiddenSourceTitlePattern = new RegExp([
    ["Heroes", "III"].join("\\s+"),
    ["Heroes", "3"].join("\\s+"),
    abbreviation("H", "oMM"),
    abbreviation("HOM", "M3"),
    ["Heroes", "of", "Might"].join("\\s+"),
    ["Might", "and", "Magic"].join("\\s+"),
    abbreviation("S", "oD"),
    abbreviation("H", "otA"),
    ["Horn", "of", "the", "Abyss"].join("\\s+"),
    ["Shadow", "of", "Death"].join("\\s+"),
    ["Restoration", "of", "Erathia"].join("\\s+"),
    `${["Arma", "geddon"].join("")}'?s\\s+Blade`,
    abbreviation("ho", "mm3")
  ].join("|"), "gi");
  const forbiddenSourceProcessPattern = new RegExp([
    ["reference", "screenshots"].join("\\s+"),
    ["reference", "screenshots"].join("-"),
    ["screenshot", "reference"].join("\\s+"),
    ["first", "screenshot"].join("\\s+"),
    ["second", "screenshot"].join("\\s+"),
    ["third-party", "screenshots"].join("\\s+"),
    ["third-party", "product"].join("\\s+"),
    ["raw", "screenshot"].join("\\s+"),
    ["exact", "parity"].join("\\s+"),
    ["Screen-Specific", "Parity"].join("\\s+"),
    ["original", "game"].join("\\s+"),
    ["source", "title"].join("\\s+"),
    ["reference", "game"].join("\\s+"),
    ["legacy", "game"].join("\\s+")
  ].join("|"), "gi");

  const isPolicyDoc = (relative) =>
    relative === "CONTRIBUTING.md"
    || relative === "AGENTS.md"
    || relative.startsWith("docs/planning/")
    || relative === "tasks/task-registry.json";

  const taskDocsPredicate = (filePath) => {
    const relative = path.relative(repoRoot, filePath);
    if (!/\.(md|json)$/.test(filePath)) return false;
    if (relative.startsWith(".git")) return false;
    if (relative.startsWith("node_modules")) return false;
    if (isPolicyDoc(relative)) return false;
    return (
      relative.startsWith("tasks/")
      || relative.startsWith("docs/architecture/")
      || relative === "README.md"
    );
  };

  const defaultPredicate = (filePath) => {
    const relative = path.relative(repoRoot, filePath);
    if (!/\.(md|json)$/.test(filePath)) return false;
    if (relative.startsWith(".git")) return false;
    if (relative.startsWith("node_modules")) return false;
    if (relative.startsWith("docs/archive/")) return false;
    if (isPolicyDoc(relative)) return false;
    return true;
  };

  const textPredicate = (filePath) => {
    const relative = path.relative(repoRoot, filePath);
    if (!/\.(md|json|js|mjs|ts|tsx|html|yml|yaml)$/.test(filePath)) return false;
    if (relative.startsWith(".git")) return false;
    if (relative.startsWith("node_modules")) return false;
    if (relative.startsWith("docs/archive/")) return false;
    return true;
  };

  const fileRules = [
    {
      root: path.join(repoRoot, "tasks", "phase-3", "02-ai-generation"),
      pattern: /\bAnthropic\b|\bClaude\b|claude-sonnet|apiKey:\s*string/gi,
      message: "AI generation planning must stay provider-neutral."
    },
    {
      root: repoRoot,
      pattern: /src\/engine\/(pack-registry|mod-loader|mod-signature|mod-sandbox)\.ts/g,
      message: "Pack runtime ownership belongs in src/content-runtime/, not src/engine/."
    },
    {
      root: repoRoot,
      pattern: /src\/generation\/(types|provider|validators|providers)\b/g,
      message: "AI generation ownership belongs in src/ai/generation/, not src/generation/."
    },
    {
      root: repoRoot,
      pattern: /resources\/packs\/.+\/(units|heroes|buildings)\.json/g,
      message: "Pack records should be one-per-record files, not aggregate units.json/heroes.json/buildings.json outputs."
    },
    {
      root: repoRoot,
      pattern: /resources\/packs\/.+\/legacy-pack\.json/g,
      message: "Do not describe mega-pack manifests when separate packs are the canonical boundary."
    },
    {
      root: repoRoot,
      pattern: /"files"\s*:\s*\[/g,
      message: "Pack manifests should not carry a separate files[] inventory."
    },
    {
      root: repoRoot,
      pattern: forbiddenSourceTitlePattern,
      message: "Repo text must stay IP-neutral; refer to the baseline corridor instead.",
      predicate: textPredicate
    },
    {
      root: repoRoot,
      pattern: forbiddenSourceProcessPattern,
      message: "Repo text must use internal visual direction instead of copied product-reference language.",
      predicate: textPredicate
    }
  ];

  for (const rule of fileRules) {
    const files = await walkFiles(rule.root, (filePath) => {
      if (rule.predicate) return rule.predicate(filePath);
      return defaultPredicate(filePath);
    });

    for (const filePath of files) {
      const contents = await readUtf8(filePath);
      if (rule.pattern.test(contents)) {
        violations.push(`${path.relative(repoRoot, filePath)}: ${rule.message}`);
      }
      rule.pattern.lastIndex = 0;
    }
  }

  return violations;
}

async function collectRequiredPathViolations() {
  const requiredPaths = [
    "docs/architecture/pack-contract.md",
    "docs/architecture/ai-integration.md",
    "docs/architecture/determinism.md",
    "docs/architecture/effect-registry.md",
    "docs/architecture/glossary.md",
    "research/deep-research-report.md"
  ];
  const violations = [];

  for (const relativePath of requiredPaths) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!(await pathExists(absolutePath))) {
      violations.push(`${relativePath}: required path is missing`);
    }
  }

  return violations;
}

function schemaForFile(filePath) {
  const base = path.basename(filePath);
  const parent = path.basename(path.dirname(filePath));

  if (base === "manifest.json") return "manifest.schema.json";
  if (base === "faction.json") return "faction.schema.json";
  if (base === "world.json") return "world.schema.json";
  if (base === "ruleset.json") return "ruleset.schema.json";
  if (base === "index.json" && parent === "assets") {
    return "asset-index.schema.json";
  }

  if (base.endsWith(".ruleset.json")) return "ruleset.schema.json";
  if (base.endsWith(".unit.json")) return "unit.schema.json";
  if (base.endsWith(".hero.json")) return "hero.schema.json";
  if (base.endsWith(".hero-class.json")) return "hero-class.schema.json";
  if (base.endsWith(".building.json")) return "building.schema.json";
  if (base.endsWith(".ability.json")) return "ability.schema.json";
  if (base.endsWith(".skill.json")) return "skill.schema.json";
  if (base.endsWith(".spell.json")) return "spell.schema.json";
  if (base.endsWith(".artifact.json")) return "artifact.schema.json";
  if (base.endsWith(".animation.json")) return "animation.schema.json";
  if (base.endsWith(".vfx.json")) return "vfx.schema.json";
  if (base.endsWith(".sound-set.json")) return "sound-set.schema.json";
  if (base.endsWith(".town-presentation.json")) return "town-presentation.schema.json";
  if (base.endsWith(".adventure-building.json")) return "adventure-building.schema.json";
  if (base.endsWith(".map-object.json")) return "map-object.schema.json";
  if (base.endsWith(".neutral-stack-template.json")) {
    return "neutral-stack-template.schema.json";
  }
  if (base.endsWith(".scenario.json")) return "scenario.schema.json";
  if (base.endsWith(".map-trigger.json")) return "map-trigger.schema.json";
  if (base.endsWith(".themed-week.json")) return "themed-week.schema.json";
  if (base.endsWith(".generation-request.json")) return "generation-request.schema.json";
  if (base.endsWith(".generated-faction.json")) return "generated-faction.schema.json";
  if (base === "game-state.example.json") return "game-state.schema.json";
  if (base === "ui-component-registry.example.json") return "ui-component-registry.schema.json";
  if (base.endsWith(".error-state.json")) return "error-state.schema.json";
  if (base.endsWith(".dispatcher-error.json")) return "dispatcher-validation-error.schema.json";
  if (base.endsWith(".storage-error.json")) return "storage-error.schema.json";
  if (base.endsWith(".error.json")) return "validation-error.schema.json";
  if (base.endsWith(".modal-entry.json")) return "modal-entry.schema.json";
  if (base.endsWith(".hotkey.json")) return "hotkey.schema.json";
  if (base.endsWith(".ai-profile.json")) return "ai-profile.schema.json";
  if (base === "event-log.example.json") return "event.schema.json";
  if (base.endsWith(".event.json")) return "event.schema.json";

  return null;
}

async function collectExampleRecordViolations() {
  const examplesRoot = path.join(repoRoot, "content-schema", "examples");
  const files = await walkFiles(examplesRoot, (p) => p.endsWith(".json"));
  const violations = [];

  for (const filePath of files) {
    const schemaFile = schemaForFile(filePath);
    if (!schemaFile) {
      violations.push(
        `${path.relative(repoRoot, filePath)}: no schema mapping (add a suffix mapping or rename the file)`
      );
      continue;
    }
    const schemaPath = path.join(schemasDir, schemaFile);
    if (!(await pathExists(schemaPath))) {
      violations.push(
        `${path.relative(repoRoot, filePath)}: mapped schema ${schemaFile} is missing`
      );
      continue;
    }
    let data;
    try {
      data = JSON.parse(await readUtf8(filePath));
    } catch (error) {
      violations.push(`${path.relative(repoRoot, filePath)}: invalid JSON (${error.message})`);
      continue;
    }
    if (isObject(data) && "$schema" in data) {
      const { $schema: _ignored, ...rest } = data;
      data = rest;
    }
    const schema = await loadSchema(schemaFile);
    if (Array.isArray(data) && schemaFile === "event.schema.json") {
      for (let index = 0; index < data.length; index += 1) {
        const errors = await validate(data[index], schema, { root: schema, file: schemaFile }, `$[${index}]`);
        for (const error of errors) {
          violations.push(
            `${path.relative(repoRoot, filePath)} [${schemaFile}]: ${error}`
          );
        }
      }
      continue;
    }
    const errors = await validate(data, schema, { root: schema, file: schemaFile });
    for (const error of errors) {
      violations.push(
        `${path.relative(repoRoot, filePath)} [${schemaFile}]: ${error}`
      );
    }
  }

  return violations;
}

async function collectTaskDocViolations() {
  const registry = await buildTaskRegistry();
  const violations = [];

  for (const task of registry.tasks) {
    if (!task.description) {
      violations.push(`${task.path}: missing Description section`);
    }
    if (task.outputs.length === 0) {
      violations.push(`${task.path}: missing Outputs section`);
    }
    if (task.dependencies.length === 0) {
      violations.push(`${task.path}: missing Dependencies section`);
    }
    if (task.acceptanceCriteria.length === 0) {
      violations.push(`${task.path}: missing Acceptance Criteria section`);
    }
    if (!task.estimatedTime) {
      violations.push(`${task.path}: missing Estimated Time section`);
      continue;
    }

    const estimatedHoursMatch = task.estimatedTime.match(/(\d+)\s*hours?/i);
    if (!estimatedHoursMatch) {
      violations.push(
        `${task.path}: Estimated Time must include an integer hour count`
      );
      continue;
    }

    const estimatedHours = Number(estimatedHoursMatch[1]);
    if (estimatedHours < 2 || estimatedHours > 6) {
      violations.push(
        `${task.path}: Estimated Time must stay within 2–6 hours (found ${estimatedHours})`
      );
    }
  }

  return violations;
}

export async function collectContractViolations() {
  const [
    forbiddenPatternViolations,
    requiredPathViolations,
    exampleRecordViolations,
    taskDocViolations
  ] = await Promise.all([
    collectForbiddenPatternViolations(),
    collectRequiredPathViolations(),
    collectExampleRecordViolations(),
    collectTaskDocViolations()
  ]);

  return [
    ...forbiddenPatternViolations,
    ...requiredPathViolations,
    ...exampleRecordViolations,
    ...taskDocViolations
  ];
}

if (isDirectRun()) {
  const violations = await collectContractViolations();

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation);
    }
    process.exitCode = 1;
  } else {
    console.log("Repo contract checks passed.");
  }
}
