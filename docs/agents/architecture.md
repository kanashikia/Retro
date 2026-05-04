# Architecture

## Main Structure

- `App.tsx`: top-level routes
- `components/Home.tsx`: entry point to create/join retros
- `components/RetroBoard.tsx`: main session orchestration
- `components/*Board*.tsx`: phase-specific UI
- `utils/sessionExport.ts`: browser-side PDF download for the visible session data
- `services/geminiService.ts`: client-side AI socket wrapper
- `server/index.js`: socket lifecycle, session updates, AI grouping
- `server/routes/auth.js`: login/register/password reset
- `server/db.js`: Sequelize connection and sync

## Core Flow

1. Admin creates or opens a session.
2. Participants join via socket.
3. Session moves through `BRAINSTORM`, `GROUPING`, `VOTING`, `DISCUSSION`.
4. Admin actions are enforced server-side.

## State Contract

The session object is the central contract. Be careful when changing:

- `phase`
- `tickets`
- `themes`
- `currentThemeIndex`
- `adminId`
- `createdAt`
- timer fields

If this shape changes, update frontend and backend together.
