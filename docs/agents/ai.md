# AI

## Current Design

AI grouping uses Gemini through the backend only.

Relevant files:

- `src/components/RetroBoard.tsx`
- `src/services/geminiService.ts`
- `server/index.js`

## Constraints

- Never call Gemini directly from the frontend.
- Keep admin-only triggering on the server.
- Keep response normalization on the server.
- Keep client fallback behavior intact unless the task explicitly changes product behavior.

## Current Failure Strategy

If AI fails, the client falls back to a single default theme so the retro can continue.

This fallback is part of the product behavior, not an implementation detail.

## Model Selection

Server-side AI grouping can try multiple hosted models in order when a model is rate-limited, quota-limited, unavailable, or unsupported.

Default order:

- `gemini-3.8-flash`
- `gemini-3.5-flash`
- `gemini-3.5-flash-lite`
- `gemini-3.1-flash-lite`
- `gemma-4-31b-it`
- `gemma-4-26b-a4b-it`

You can override this list with `AI_GROUPING_MODEL_FALLBACKS`, using a comma-separated list of model IDs.

Structured output goes through the SDK's `config` field (`@google/genai` silently ignores `generationConfig`). Gemma models reject JSON mode, so they only get the prompt's JSON instructions; the response is normalized before parsing either way.

## If You Change AI

- update prompt, schema, and parsing together,
- keep fallback ordering and env override aligned with the actual provider model IDs you intend to use,
- verify malformed output does not break the UI,
- verify invalid API keys or network failures still degrade safely.
