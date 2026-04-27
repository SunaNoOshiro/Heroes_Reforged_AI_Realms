# Module: AI Content Generation (M6)

The LLM pipeline: user describes a faction in plain text → a
provider-neutral generation adapter emits structured JSON → schema
validation → coherence check → auto-balance (200 headless battles) →
optional image generation → emit mod pack.

**Milestone**: M6 — AI Generation  
**Total Estimate**: ~35 hours  
**Exit Criteria**: A user types "Undead pirates with ghost ships and cursed cannons" and receives a playable, balanced faction mod pack within 3 minutes.

---

## Task Files

- [00-generation-io-schemas.md](02-ai-generation/00-generation-io-schemas.md)
  🤖 Task 0: Generation I/O schemas — provider-neutral boundary (~3h)
- [01-prompt-provider-structured-output-raw-json.md](02-ai-generation/01-prompt-provider-structured-output-raw-json.md)
  🤖 Task 1: Prompt → provider adapter → raw JSON (~4h)
- [02-schema-validation-plus-coherence-check.md](02-ai-generation/02-schema-validation-plus-coherence-check.md)
  🤖 Task 2: Schema validation + coherence check (~4h)
- [03-auto-balancer-headless-battle-baseline.md](02-ai-generation/03-auto-balancer-headless-battle-baseline.md)
  🧠⚠️ Task 3: Auto-balancer — headless battle baseline (~6h)
- [04-gradient-free-stat-optimizer.md](02-ai-generation/04-gradient-free-stat-optimizer.md)
  🧠⚠️ Task 4: Gradient-free stat optimizer (~5h)
- [05-asset-generation-stub-imagegen-api.md](02-ai-generation/05-asset-generation-stub-imagegen-api.md)
  🤖 Task 5: Asset generation stub (imagegen API) (~3h)
- [06-content-moderation-plus-hard-caps.md](02-ai-generation/06-content-moderation-plus-hard-caps.md)
  🤖 Task 6: Content moderation + hard caps (~3h)
- [07-generation-ui-prompt-preview-download.md](02-ai-generation/07-generation-ui-prompt-preview-download.md)
  🤖 Task 7: Generation UI — prompt → preview → download (~4h)
- [08-evaluation-generate-plus-play-5-new-factions.md](02-ai-generation/08-evaluation-generate-plus-play-5-new-factions.md)
  🤖 Task 8: Evaluation: generate + play 5 new factions (~3h)
