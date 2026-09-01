# Reselling OS

Mobile-first reselling operations system built around one reliable workflow:

**SOURCE → PHOTO → IDENTIFY → REVIEW → LISTING → POST → ACTIVE → SOLD → PROFIT**

## v0.1 scope

Only four first-class product areas:

- **Home** — business snapshot and actionable work
- **Inventory** — source of truth for products, physical units, templates, and listing state
- **Intake** — 1–5 photos, resilient draft recovery, human review, and listing-draft creation (AI identification/listing generation is planned next)
- **Sales** — record sales and deterministically calculate realized profit

## Product principles

1. Mobile-first. Intake must feel excellent on iPhone.
2. AI proposes; business records remain explicit and auditable.
3. Financial calculations are deterministic code, never LLM guesses.
4. Ask the user only for information the system cannot reliably infer.
5. Templates make repeat inventory nearly instant to add.
6. Preserve AI output, user edits, price changes, and outcomes so the system can learn what actually sells.
7. `main` should remain working. Build meaningful changes on branches and merge after verification.

## Explicitly out of scope for v0.1

Opportunity Radar, automated purchasing, supplier ordering, CHIEF/Slims Suite integration, autonomous Facebook posting, autonomous buyer messaging, and speculative multi-agent orchestration.

See `docs/00 - Project Home.md` for the working project specification.
