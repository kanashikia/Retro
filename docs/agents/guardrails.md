# Guardrails

## High-Risk Areas

- `server/index.js`: central socket and session logic
- phase-specific visibility during `BRAINSTORM`
- voting updates and participant permissions
- auth and password reset flows
- Sequelize model or schema changes

## Rules

- Keep server authorization as the source of truth.
- Non-admin users must not gain admin capabilities through client changes.
- Do not trust model output or client payloads without normalization/validation.
- Do not silently change env var names, ports, or route contracts.
- Prefer local fixes over broad refactors.

## When To Be Extra Careful

- changing socket event payloads,
- changing session merge/update logic,
- changing how tickets/themes are derived or filtered,
- changing auth token behavior,
- changing DB sync or model definitions.
