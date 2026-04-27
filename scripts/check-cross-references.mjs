import path from "node:path";
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

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const recordTypeBySuffix = [
  [".faction.json", "faction"],
  [".unit.json", "unit"],
  [".hero.json", "hero"],
  [".hero-class.json", "hero_class"],
  [".building.json", "building"],
  [".ability.json", "ability"],
  [".spell.json", "spell"],
  [".skill.json", "skill"],
  [".artifact.json", "artifact"],
  [".scenario.json", "scenario"],
  [".ruleset.json", "ruleset"],
  [".adventure-building.json", "adventure_building"],
  [".map-object.json", "map_object"],
  [".neutral-stack-template.json", "neutral_template"],
  [".town-presentation.json", "town_presentation"],
  [".animation.json", "animation"],
  [".vfx.json", "vfx"],
  [".sound-set.json", "sound_set"]
];

function recordTypeForFile(filePath) {
  const base = path.basename(filePath);
  if (base === "faction.json") return "faction";
  if (base === "world.json") return "world";
  if (base === "ruleset.json") return "ruleset";
  for (const [suffix, type] of recordTypeBySuffix) {
    if (base.endsWith(suffix)) return type;
  }
  return null;
}

// Field -> expected record type. Resolving by field name lets us
// distinguish record references from asset references by a closed
// allow-list; anything not listed is ignored (assumed asset or
// primitive).
const scalarRefFields = {
  factionId: "faction",
  unitId: "unit",
  heroId: "hero",
  heroClassId: "hero_class",
  buildingId: "building",
  abilityId: "ability",
  spellId: "spell",
  skillId: "skill",
  artifactId: "artifact",
  worldId: "world",
  rulesetId: "ruleset",
  scenarioId: "scenario",
  targetUnitId: "unit",
  targetFactionId: "faction",
  targetHeroId: "hero",
  dwellingBuildingId: "building",
  referenceFactionId: "faction",
  referenceRulesetId: "ruleset",
  guardNeutralStackTemplateId: "neutral_template"
};

const arrayRefFields = {
  unitIds: "unit",
  heroIds: "hero",
  buildingIds: "building",
  abilityIds: "ability",
  spellIds: "spell",
  skillIds: "skill",
  artifactIds: "artifact",
  factionIds: "faction",
  startingSkillIds: "skill",
  startingHeroIds: "hero",
  candidateUnitIds: "unit"
};

const requiresOwnerTypes = new Set(["building"]);

function formatLocation(filePath, pointer) {
  return `${path.relative(repoRoot, filePath)}${pointer ? ` (${pointer})` : ""}`;
}

function collectReferences(node, pointer, ownerType, out) {
  if (Array.isArray(node)) {
    node.forEach((child, index) => {
      collectReferences(child, `${pointer}[${index}]`, ownerType, out);
    });
    return;
  }
  if (!isObject(node)) return;

  for (const [key, value] of Object.entries(node)) {
    const nextPointer = pointer === "$" ? `$.${key}` : `${pointer}.${key}`;

    if (key in scalarRefFields && typeof value === "string") {
      out.push({
        expectedType: scalarRefFields[key],
        id: value,
        pointer: nextPointer
      });
      continue;
    }

    if (key in arrayRefFields && Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "string") {
          out.push({
            expectedType: arrayRefFields[key],
            id: item,
            pointer: `${nextPointer}[${index}]`
          });
        }
      });
      continue;
    }

    if (key === "requires" && requiresOwnerTypes.has(ownerType) && Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "string") {
          out.push({
            expectedType: "building",
            id: item,
            pointer: `${nextPointer}[${index}]`
          });
        }
      });
      continue;
    }

    collectReferences(value, nextPointer, ownerType, out);
  }
}

function buildIndex(records) {
  const index = new Map();
  const collisions = [];

  for (const record of records) {
    const existing = index.get(record.id);
    if (existing) {
      collisions.push({ id: record.id, files: [existing.filePath, record.filePath] });
      continue;
    }
    index.set(record.id, record);
  }
  return { index, collisions };
}

export async function collectCrossReferenceViolations() {
  const examplesRoot = path.join(repoRoot, "content-schema", "examples");
  const files = await walkFiles(examplesRoot, (p) => p.endsWith(".json"));
  const records = [];
  const parseErrors = [];

  for (const filePath of files) {
    const type = recordTypeForFile(filePath);
    if (!type) continue;
    let data;
    try {
      data = JSON.parse(await readUtf8(filePath));
    } catch (error) {
      parseErrors.push(`${path.relative(repoRoot, filePath)}: invalid JSON (${error.message})`);
      continue;
    }
    if (!isObject(data)) continue;
    if (typeof data.id !== "string") continue;
    records.push({ id: data.id, type, filePath, data });
  }

  const { index, collisions } = buildIndex(records);
  const violations = [...parseErrors];

  for (const { id, files: collidingFiles } of collisions) {
    violations.push(
      `${id}: duplicate record id declared in ${collidingFiles
        .map((f) => path.relative(repoRoot, f))
        .join(" and ")}`
    );
  }

  for (const record of records) {
    const references = [];
    collectReferences(record.data, "$", record.type, references);
    for (const ref of references) {
      const target = index.get(ref.id);
      if (!target) {
        violations.push(
          `${formatLocation(record.filePath, ref.pointer)}: references unknown ${ref.expectedType} id "${ref.id}"`
        );
        continue;
      }
      if (target.type !== ref.expectedType) {
        violations.push(
          `${formatLocation(record.filePath, ref.pointer)}: expected ${ref.expectedType} id but "${ref.id}" is a ${target.type}`
        );
      }
    }
  }

  // Provides-completeness: every record inside a pack must appear in
  // manifest.provides[<kind>], and every id listed under provides must
  // map to a real record file. Catches drift between pack-level
  // indexes and the filesystem (e.g. a building added without being
  // added to manifest.provides.buildings).
  const manifestFiles = files.filter((f) => path.basename(f) === "manifest.json");
  for (const manifestPath of manifestFiles) {
    let manifest;
    try {
      manifest = JSON.parse(await readUtf8(manifestPath));
    } catch {
      continue;
    }
    if (!isObject(manifest) || !isObject(manifest.provides)) continue;
    const packRoot = path.dirname(manifestPath);
    const packRecords = records.filter((r) => r.filePath.startsWith(packRoot + path.sep));
    const recordIdsInPack = new Set(packRecords.map((r) => r.id));
    const providesIds = new Set();
    for (const [kind, ids] of Object.entries(manifest.provides)) {
      if (!Array.isArray(ids)) continue;
      for (const id of ids) {
        if (typeof id !== "string") continue;
        providesIds.add(id);
        if (!recordIdsInPack.has(id)) {
          violations.push(
            `${path.relative(repoRoot, manifestPath)} (provides.${kind}): lists "${id}" but no matching record file exists in pack directory`
          );
        }
      }
    }
    for (const record of packRecords) {
      if (record.type === "world" || record.type === "scenario") continue;
      if (!providesIds.has(record.id)) {
        violations.push(
          `${path.relative(repoRoot, manifestPath)}: missing "${record.id}" from provides (found at ${path.relative(repoRoot, record.filePath)})`
        );
      }
    }
  }

  return violations;
}

if (isDirectRun()) {
  const violations = await collectCrossReferenceViolations();
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation);
    }
    process.exitCode = 1;
  } else {
    console.log("Cross-reference checks passed.");
  }
}
