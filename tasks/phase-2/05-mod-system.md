# Module: Pack Runtime / Mod System (M4)

Load, verify, and sandbox third-party content packs. The mod system is
the bridge between the content editor and the live game, and the place
where the repo proves that the pack contract works for both official
and community content.

**Milestone**: M4 — Mods + Content  
**Total Estimate**: ~41 hours  
**Exit Criteria**: A zipped content pack can be dropped into the game,
validated, loaded without restarting, and the official reference bundle
proves the full pack surface.

---

## Task Files

- [01-zip-pack-loader-jszip-plus-manifest-parser.md](05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md)
  🤖 Task 1: Zip pack loader (JSZip) + manifest parser (~3h)
- [02-ed25519-signature-verification.md](05-mod-system/02-ed25519-signature-verification.md)
  🧠⚠️ Task 2: ed25519 signature verification (~4h)
- [03-sandbox-mode-for-ai-generated-packs.md](05-mod-system/03-sandbox-mode-for-ai-generated-packs.md)
  🤖 Task 3: Sandbox mode for AI-generated packs (~3h)
- [04-mod-manager-ui-install-enable-disable.md](05-mod-system/04-mod-manager-ui-install-enable-disable.md)
  🤖 Task 4: Mod manager UI — install, enable, disable (~4h)
- [05a-baseline-ruleset-and-shared-library-packs.md](05-mod-system/05a-baseline-ruleset-and-shared-library-packs.md)
  🤖 Task 5a: Baseline ruleset + shared library packs (~4h)
- [05b-sylvan-and-stormspire-reference-packs.md](05-mod-system/05b-sylvan-and-stormspire-reference-packs.md)
  🤖 Task 5b: Sylvan + Stormspire reference packs (~6h)
- [05c-ashlord-and-deepway-reference-packs.md](05-mod-system/05c-ashlord-and-deepway-reference-packs.md)
  🤖 Task 5c: Ashlord + Deepway reference packs (~6h)
- [05d-official-pack-signing-and-bundle-verification.md](05-mod-system/05d-official-pack-signing-and-bundle-verification.md)
  🤖 Task 5d: Official pack signing + bundle verification (~3h)
- [06-build-boat-command-and-shipyard.md](05-mod-system/06-build-boat-command-and-shipyard.md)
  🧠 Task 6: Build boat command and shipyard (~4h)
- [07-build-grail-structure-command.md](05-mod-system/07-build-grail-structure-command.md)
  🧠 Task 7: Build grail structure command (~4h)
- [08-override-precedence-and-patch-merge.md](05-mod-system/08-override-precedence-and-patch-merge.md)
  🧠 Task 8: Override precedence + patch merge (~5h)
- [09-canonical-packs-registry.md](05-mod-system/09-canonical-packs-registry.md)
  🧠 Task 9: Canonical-packs registry + bundle verifier (~4h)
