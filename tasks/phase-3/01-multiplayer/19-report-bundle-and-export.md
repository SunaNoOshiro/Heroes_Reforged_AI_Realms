# Report Bundle & Chat Export

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Add `REPORT_PEER`, `EXPORT_CHAT_LOG`, the `ReportPeerDialog`,
the local-download blob-URL pipeline, and the
`report-bundle.schema.json` evidence bundle. The MVP intake is
local-only — bundles are saved to the user's downloads folder;
there is no network upload. Closes Q348–Q350, Q355 and the
no-evidence-for-harassment risk documented in
[`docs/readiness-audit/19-chat-safety-and-user-reporting.md`](../../../docs/readiness-audit/19-chat-safety-and-user-reporting.md).

Read First:
- [`docs/architecture/chat-safety.md`](../../../docs/architecture/chat-safety.md)
- [`content-schema/schemas/report-bundle.schema.json`](../../../content-schema/schemas/report-bundle.schema.json)
- [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)
- [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md)
- [`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../../../docs/architecture/wiki/screens/64-network-lobby/data-contracts.md)

Inputs:
- Validated chat ingress from Task 17 (the report bundle quotes
  `state.net.lobby.chat[]`).
- Per-roster-row overflow menu mount point from Task 18 (Report
  is the third entry alongside Mute and Block).

Outputs:
- `content-schema/schemas/report-bundle.schema.json`
- `content-schema/examples/report-bundle/canonical-peer-behavior.report-bundle.json`
- `content-schema/examples/report-bundle/canonical-ai-ugc.report-bundle.json`
- `src/multiplayer/chat/buildReportBundle.ts` — pure function:
  `(state, { reporter, subject, reasonCode, freeText? }) → ReportBundle`.
  `evidence.chatExcerpt` includes up to 50 messages from the
  subject with a ±2-message context window of reporter messages
  around each subject message; reporter-only chatter outside that
  window is excluded.
- `src/multiplayer/chat/exportChatLog.ts` — pure serializer for
  `EXPORT_CHAT_LOG`; produces a JSON or TXT blob from
  `state.net.lobby.chat[]`. JSON entries conform to
  `chat-message.schema.json`.
- `src/ui/network-lobby/ReportPeerDialog.tsx` — modal dialog;
  renders reason codes (closed enum, locale-bound), optional
  free text (≤ 500 chars, NFKC-normalized via Task 17's
  `normalizeChatText`), and a single confirm action that
  generates the bundle and triggers a browser download via blob
  URL. The blob URL is revoked immediately after the download
  is dispatched.
- `ChatPanelOverflowMenu` overflow-menu entry for "Save chat
  log" wired to `EXPORT_CHAT_LOG`.
- Unit tests under `src/multiplayer/chat/__tests__/`:
  - `buildReportBundle.test.ts` — round-trips through the
    `report-bundle.schema.json` validator; ±2-message context
    window honored; reporter-only chatter excluded; `ai-ugc`
    branch sets the distinct filename prefix.
  - `exportChatLog.test.ts` — JSON output validates against
    `chat-message.schema.json`; TXT output is round-trip safe.

Owned Paths:
- `content-schema/schemas/report-bundle.schema.json`
- `content-schema/examples/report-bundle/canonical-peer-behavior.report-bundle.json`
- `content-schema/examples/report-bundle/canonical-ai-ugc.report-bundle.json`
- `src/multiplayer/chat/buildReportBundle.ts`
- `src/multiplayer/chat/exportChatLog.ts`
- `src/ui/network-lobby/ReportPeerDialog.tsx`
- `src/multiplayer/chat/__tests__/buildReportBundle.test.ts`
- `src/multiplayer/chat/__tests__/exportChatLog.test.ts`

Owned Paths (shared):
- Task 18 ([`18-mute-block-and-trust-banner.md`](./18-mute-block-and-trust-banner.md))
  is the **primary owner** of the per-row overflow-menu mount
  point. This task contributes only the Report entry and the
  dialog mount; the Mute / Block entries are not rewritten.
- Task 08 ([`08-multiplayer-ui-lobby-invite-link-in-game-status.md`](./08-multiplayer-ui-lobby-invite-link-in-game-status.md))
  is the **primary owner** of
  `src/ui/components/MultiplayerLobby.tsx`. This task contributes
  only the `ChatPanelOverflowMenu` "Save chat log" entry and the
  `ReportPeerDialog` mount; the existing slot list, ready-state
  seal, and chat panel layout are not rewritten.

Dependencies:
- phase-3.01-multiplayer.17-chat-envelope-channel-and-rate-limit
- phase-3.01-multiplayer.18-mute-block-and-trust-banner

Acceptance Criteria:
- `REPORT_PEER { peerId, reasonCode, freeText? }` opens
  `ReportPeerDialog`; reason codes are restricted to
  `harassment`, `slurs-or-hate`, `cheating-suspected`,
  `unsafe-ai-content`, `other`.
- On confirm, a `ReportBundle` is built, validated against
  `report-bundle.schema.json`, and offered for download via a
  blob URL. The URL is revoked immediately after dispatch.
- `peer-behavior` bundles use filename
  `heroes-reforged-report-<sessionId>-<ISO>.json`; `ai-ugc`
  bundles use `heroes-reforged-report-ai-ugc-<sessionId>-<ISO>.json`
  so a future AI-content intake can branch on filename.
- `evidence.chatExcerpt` honors the ±2-message reporter context
  window; reporter-only chatter outside that window is excluded.
- `evidence.deviceCapture` is an empty object in v1.
- `EXPORT_CHAT_LOG { format: 'json' | 'txt' }` triggers a blob
  download; JSON output entries conform to
  `chat-message.schema.json`.
- No network call is made on `REPORT_PEER` or
  `EXPORT_CHAT_LOG` in MVP — both flows are local-only.
- **Screen package coverage**: dialog, command, and overflow
  menu match
  [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)
  and
  [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md);
  mockup geometry is not invented locally.
- **Shared-ownership split with Task 18**: Task 18 is the
  **primary owner** of the per-row overflow-menu mount point.
  This task's contribution is **additive**: it MUST NOT rewrite
  the Mute / Block entries; only the Report entry and the
  `ReportPeerDialog` mount are added.
- **Shared-ownership split with Task 08**: Task 08 is the
  **primary owner** of `src/ui/components/MultiplayerLobby.tsx`.
  This task's contribution is **additive**: it MUST NOT rewrite
  the slot list, ready-state seal, or chat panel layout — only
  the `ChatPanelOverflowMenu` "Save chat log" entry and the
  `ReportPeerDialog` mount are added.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
