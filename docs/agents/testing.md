# Testing

## Default Checks

Run what matches the change scope:

```bash
npm test
npm run build
```

The current CI source of truth is `.github/workflows/ci.yml`.

Today, CI runs:

- `npm install`
- `npm run build` with `VITE_SOCKET_URL=http://localhost:3001`
- `npm test`

## Expectations By Change Type

Frontend changes:

- verify affected component behavior,
- run or add targeted tests when practical.

Backend or socket changes:

- verify payload compatibility,
- verify admin and participant permissions,
- verify session updates still broadcast correctly.

AI changes:

- test success and failure paths,
- verify safe fallback behavior.

Auth changes:

- verify login/register/reset flows,
- verify failures remain explicit and safe.
