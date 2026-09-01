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
- The repository has no configured public host, deployment pipeline, or tracked production URL yet. A local production process also requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` at build/runtime; those values must be configured in the chosen host rather than committed.
- Until hosting is selected, use the authenticated LAN workflow only. The next deployment decision is a managed HTTPS host or a private authenticated tunnel; never expose port 3000 directly to the public internet.

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
- Database migrations are version controlled.
- `main` remains working.
- Core financial/state rules are tested.
- AI failures must not corrupt inventory truth.
- Mobile draft state survives interruptions.
- Store timestamps and event history needed for future learning.
