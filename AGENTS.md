# Reselling OS — Agent Engineering Rules

## Mission

Reselling OS is a mobile-first operating system for a reselling business.

Core workflow:

SOURCE → PHOTO → IDENTIFY → REVIEW → LISTING → POST → ACTIVE → SOLD → PROFIT

The software should reduce administrative work while keeping important financial and purchasing decisions auditable and under human control.

## Current Release

Target: v0.1.0

Only four first-class product areas belong in v0.1:

- Home
- Inventory
- Intake
- Sales

Do not introduce unrelated product areas without explicit approval.

## Git Workflow

Never develop directly on `main`.

Branch hierarchy:

main
└── release/v0.1.0
    └── feature/*

Rules:

1. `main` represents production releases.
2. Feature work belongs on `feature/*` branches.
3. Completed features integrate into the active release branch.
4. The release branch is tested as a complete system before merging into `main`.
5. Do not push directly to `main`.
6. Keep commits focused and understandable.
7. Do not mix unrelated refactors into feature commits.
8. Never rewrite shared Git history without explicit approval.

## Architecture

Primary stack:

- Next.js
- TypeScript
- React
- Tailwind CSS
- Supabase/PostgreSQL
- Supabase Storage
- Supabase Auth
- OpenAI API
- PWA

Repository structure:

- `src/app` — routing, layouts, route handlers
- `src/components` — reusable UI components
- `src/features` — domain feature modules
- `src/lib` — infrastructure, integrations, shared services
- `src/types` — shared TypeScript types
- `supabase/migrations` — database schema history
- `tests` — automated tests
- `docs` — architecture and product documentation

Keep business logic out of presentation components.

Do not scatter direct Supabase calls throughout React components.

Data access must pass through clearly defined services/repositories.

External AI integrations must have a defined service boundary.

## Data Model

Maintain separation between:

PRODUCT → INVENTORY UNIT → LISTING → SALE

These concepts must not be collapsed together.

A Product describes what an item is.

An Inventory Unit represents one physical owned unit.

A Listing represents an advertisement on a marketplace.

A Sale represents a completed transaction consuming an inventory unit.

Inventory is the source of truth for physical stock.

## Financial Integrity

Financial calculations must be deterministic code.

Never ask an LLM to calculate or invent:

- revenue
- profit
- margins
- fees
- COGS
- inventory value
- financial totals

LLMs may explain deterministic results but must not generate authoritative financial values.

Every dashboard financial value should eventually be traceable to stored transactions.

## AI Behavior

AI output must not be treated as ground truth.

For identification and listing generation:

- preserve confidence/uncertainty where relevant
- request missing required information
- allow human correction
- preserve important original AI output when needed for future learning

Do not fabricate marketplace data, product performance, agent activity, sales, inventory, or financial information.

## Database

Schema changes must be represented by migrations.

Do not manually mutate production schema as an undocumented shortcut.

Never destroy historical sale or inventory records simply because a Product or Template changes.

Important business actions should eventually be represented in event/history data.

## Security

Never commit:

- API keys
- service-role keys
- access tokens
- passwords
- secrets
- private credentials

Use environment variables.

Do not expose privileged Supabase credentials to client-side code.

Validate server-side authorization for privileged operations.

## UI Engineering

The product is mobile-first.

iPhone behavior is a first-class requirement.

Prefer native browser controls and accessible semantics over fake controls.

Pay special attention to:

- keyboard behavior
- touch targets
- focus management
- responsive layouts
- loading states
- error states
- empty states
- offline/interrupted workflows

Do not fabricate UI states that imply backend actions occurred when they did not.

## Code Quality

Prefer:

- small focused components
- explicit types
- domain-oriented modules
- descriptive naming
- reusable primitives
- simple code over clever abstractions

Avoid:

- giant components
- duplicated business logic
- `any` without strong justification
- unnecessary dependencies
- premature abstraction
- hidden side effects

Before declaring implementation complete:

1. Run lint.
2. Run TypeScript checks.
3. Run relevant tests.
4. Confirm production build succeeds when appropriate.
5. Review Git diff for accidental files or secrets.

## Documentation

If implementation changes an architectural decision, workflow, schema concept, or important product behavior, update the corresponding file in `docs/`.

Do not allow implementation and project documentation to silently diverge.

## Scope Discipline

Do not implement these in v0.1 unless explicitly authorized:

- Opportunity Radar
- autonomous purchasing
- supplier ordering
- autonomous Facebook posting
- autonomous buyer messaging
- CHIEF integration
- Slims Suite integration
- speculative multi-agent orchestration
- advanced bookkeeping/tax automation

Build the reliable core first.