# Runbook

## Install

```bash
npm install
```

## Local Commands

Frontend:

```bash
npm run dev
```

Backend:

```bash
npm run server
```

All tests:

```bash
npm test
```

Production build:

```bash
npm run build
```

## Environment

Start from `.env.example`.

Most important variables:

- `GEMINI_API_KEY`
- `JWT_SECRET`
- `VITE_SOCKET_URL`
- `CLIENT_URL`
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`

Defaults:

- frontend dev server: `http://localhost:5173`
- backend: `http://localhost:3001`
