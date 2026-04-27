export function ownsUiOrEditorPath(task) {
  return (task.ownedPaths || []).some((ownedPath) =>
    ownedPath.startsWith("src/ui/") || ownedPath.startsWith("src/editor/")
  );
}

export function taskHasArchitectureOrSchemaAnchor(task) {
  const references = [
    ...(task.readFirst || []),
    ...(task.inputs || []),
    ...(task.outputs || [])
  ];

  return (task.screenPackages || []).length > 0
    || (task.schemaPaths || []).length > 0
    || references.some((reference) =>
      /docs\/architecture\//.test(reference)
      || /content-schema\/schemas\//.test(reference)
    );
}

export function hasUnsafeOwnedPathOptOut(task) {
  if (!task.ownedPathsOptOut) return false;

  const outputs = (task.outputs || []).join("\n");
  return /(?:^|`)(?:src|content-schema|resources)\//.test(outputs)
    || /\bupdate\b.*\bhandler\b/i.test(outputs)
    || /\bhandler\b.*\bupdate\b/i.test(outputs);
}

export function sharedOwnershipCriteriaMissing(task) {
  if ((task.sharedOwnedPaths || []).length === 0) return [];

  const acceptanceText = (task.acceptanceCriteria || []).join("\n").toLowerCase();
  const missing = [];

  if (!/\badditive\b/.test(acceptanceText)) {
    missing.push({
      reportLabel: "additive scope",
      lintLabel: "what is additive"
    });
  }
  if (!/\b(?:do not|must not|cannot|without)\b[\s\S]{0,80}\brewrit(?:e|ing)\b/.test(acceptanceText)) {
    missing.push({
      reportLabel: "rewrite guard",
      lintLabel: "what must not be rewritten"
    });
  }
  if (!/\b(?:primary owner|primary contract|owned by|owns)\b/.test(acceptanceText)) {
    missing.push({
      reportLabel: "primary owner",
      lintLabel: "which task owns the primary contract"
    });
  }

  return missing;
}

export function hasSecondarySkillContractSplit(registry, readinessContract = {}) {
  const taskIds = new Set((registry.tasks || []).map((task) => task.id));
  const contract = readinessContract.secondarySkillContract || {};
  const requiredTaskIds = contract.requiredTaskIds || [];
  const replacedTaskIds = contract.replacedTaskIds || [];

  return requiredTaskIds.every((id) => taskIds.has(id))
    && replacedTaskIds.every((id) => !taskIds.has(id));
}

export function collectTaskReadinessMetrics(
  registry,
  taskCommandLiteralViolations = [],
  readinessContract = {}
) {
  const unanchoredTasks = (registry.tasks || []).filter(
    (task) => !taskHasArchitectureOrSchemaAnchor(task)
  );
  const unsafeOwnedPathOptOuts = (registry.tasks || []).filter(hasUnsafeOwnedPathOptOut);
  const sharedOwnershipGaps = (registry.tasks || [])
    .map((task) => ({ task, missing: sharedOwnershipCriteriaMissing(task) }))
    .filter(({ missing }) => missing.length > 0);
  const secondarySkillContractReady = hasSecondarySkillContractSplit(registry, readinessContract);

  return {
    taskCommandLiteralViolations,
    unanchoredTasks,
    unsafeOwnedPathOptOuts,
    sharedOwnershipGaps,
    secondarySkillContractReady
  };
}
