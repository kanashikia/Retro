# AGENTS.md

Retro is a full-stack retrospective app:

- frontend: React 19 + Vite + TypeScript,
- backend: Express + Socket.io,
- persistence: MySQL via Sequelize,
- presence/state sync: Redis,
- AI grouping: Gemini, server-side only.

## Start Here

Before editing, identify which layer you are touching:

- UI and routes: `components/`, `App.tsx`
- client services and shared types: `services/`, `types.ts`
- socket/session logic: `server/index.js`, `server/utils/`
- auth/email: `server/routes/`, `server/services/`
- persistence: `server/models/`, `server/db.js`

## Non-Negotiables

- Do not call AI providers from the browser.
- Do not bypass server-side admin checks.
- Preserve session visibility rules across phases.
- Keep graceful fallbacks when AI fails.
- Make small changes unless a larger refactor is explicitly required.
- Verify behavior when changing socket payloads, auth flows, or session state.

## Commands

```bash
npm run dev
npm run server
npm test
npm run build
```

## Detailed Docs

Open only the file relevant to the task:

- `docs/agents/architecture.md`: app structure and state flow
- `docs/agents/guardrails.md`: change rules and risky areas
- `docs/agents/ai.md`: Gemini integration and fallback behavior
- `docs/agents/testing.md`: validation expectations
- `docs/agents/runbook.md`: env and local commands

## Delivery

- Match the existing style.
- Do not introduce a second source of truth for session state.
- If a change affects contracts, update both sides together.
- Prefer targeted tests over broad, speculative edits.
