# Claude Instructions — Reselling OS

Read `AGENTS.md` before making code changes.

`AGENTS.md` is the canonical engineering policy for this repository.

Also review relevant documentation in `docs/` before implementing a feature.

## Required behavior

- Never work directly on `main`.
- Respect the active feature/release branch workflow.
- Preserve the v0.1 scope.
- Do not fabricate functionality.
- Do not expose secrets.
- Do not perform authoritative financial calculations with an LLM.
- Keep UI, domain logic, data access, and external integrations separated.
- Use database migrations for schema changes.
- Prefer clean, typed, maintainable implementations over quick patches.
- Run validation before claiming a task is complete.

If requested work conflicts with `AGENTS.md` or documented architecture, identify the conflict rather than silently bypassing the architecture.