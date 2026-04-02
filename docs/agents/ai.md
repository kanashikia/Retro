# AI

## Current Design

AI grouping uses Gemini through the backend only.

Relevant files:

- `components/RetroBoard.tsx`
- `services/geminiService.ts`
- `server/index.js`

## Constraints

- Never call Gemini directly from the frontend.
- Keep admin-only triggering on the server.
- Keep response normalization on the server.
- Keep client fallback behavior intact unless the task explicitly changes product behavior.

## Current Failure Strategy

If AI fails, the client falls back to a single default theme so the retro can continue.

This fallback is part of the product behavior, not an implementation detail.

## If You Change AI

- update prompt, schema, and parsing together,
- verify malformed output does not break the UI,
- verify invalid API keys or network failures still degrade safely.
