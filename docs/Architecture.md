# Architecture

## Product shape
Standalone mobile-first installable PWA with a desktop layout. It must remain independent from CHIEF and Slims Suite while exposing clean interfaces for possible future integration.

## Initial deployment
- Home PC can run the application/server and background AI work.
- iPhone acts as the mobile client/control surface.
- Remote access must use authenticated HTTPS/private networking; do not expose an unauthenticated raw home-server port.
- Essential business data should have reliable persistence and backups.

## Current runtime status
- The application and Supabase migrations are version-controlled and verified through a production build before each push.
- Production is hosted on Vercel at [reselling-os.vercel.app](https://reselling-os.vercel.app). The Vercel project provides the required Supabase public environment values at build/runtime; they are not committed to the repository.
- HTTPS, Supabase Auth, and workspace RLS protect remote access. Never expose the home-PC development port directly to the public internet.

## Platform transition

The current implementation uses a first-class `businesses` tenant. Every legacy workspace has a Business record, memberships and invitations carry `business_id`, and every operational table stores a backfilled `business_id`. Direct application queries, writes, photo Storage paths, and RLS policies enforce that Business boundary. Inventory and sales RPCs explicitly run as the caller, so the same Business RLS policies apply within each action rather than being bypassed by function privileges. Some legacy owner predicates remain as a secondary guard during the transition; the product must not introduce multi-workspace switching until those paths are fully business-native and covered by broader authorization tests.

The hosted application should keep Vercel for the web runtime and Supabase for Auth, Postgres, and Storage. Add production error monitoring, audit logs, backups/restore drills, rate limits, and a support/admin boundary before accepting payment.

## Logical layers
1. **Client/PWA** — Home, Inventory, Intake, Sales.
2. **Application API** — validates and coordinates business actions.
3. **Business/domain layer** — inventory state transitions and deterministic financial calculations.
4. **Persistence** — products, templates, units, photos, listings, sales, events, selling profile.
5. **AI service layer** — image/product identification and listing generation. AI output is structured and reviewable.
6. **Platform integrations** — Facebook manual-assist first; eBay integration later through supported APIs.

## Engineering principles
- Secrets only through environment configuration; never commit credentials.
- Supabase Auth sessions use secure cookie handling through `@supabase/ssr`; the Next.js proxy refreshes claims and protects application routes.
- Public database tables remain protected by workspace-membership RLS even when the authenticated Data API role has explicit table grants. Each account has its own login; an owner can invite one collaborator into the same business workspace by verified account email. Membership checks live in a non-exposed private database helper, and audit events preserve the acting user separately from the business owner.
- Cross-Business database isolation has a checked-in pgTAP test. Running it requires Docker Desktop and is a beta-release gate; coverage must expand across every operational table, Storage, and privileged action before public onboarding.
- Database migrations are version controlled.
- `main` remains working.
- Core financial/state rules are tested.
- AI failures must not corrupt inventory truth.
- Mobile draft state survives interruptions.
- Store timestamps and event history needed for future learning.
