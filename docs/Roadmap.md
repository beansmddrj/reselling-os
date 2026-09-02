# Roadmap

## Current position — reference operation is live

The essential operational loop is implemented and running on Vercel with Supabase:

- [x] Mobile-first Intake with private photos and draft recovery
- [x] Product → Inventory Unit → Listing → Sale lifecycle
- [x] Repeatable listings with per-unit quantities, sizes, and zero-stock recovery
- [x] Sales, deterministic profit, owner-only finances, expenses, and Sold Moments
- [x] Shared operator workspace with invitations and row-level authorization
- [x] Inbound shipment, package, receipt, and owner-only capital tracking
- [x] HTTPS production deployment at `reselling-os.vercel.app`

## Platform readiness — required before selling access

### Tenant and security foundation

- [x] First-class `businesses` tenant, backfilled business records, and Business-linked memberships/invitations
- [x] Switch direct operational reads/writes, photo Storage paths, and database RLS policies to `business_id`
- [x] Ensure inventory/sales RPCs execute as the signed-in caller, enforcing the Business RLS boundary for action reads and writes
- [ ] Remove legacy owner predicates as multi-workspace flows become fully business-native
- [ ] Tenant isolation, migration rollback, and authorization test suite (initial cross-Business pgTAP coverage is checked in; requires Docker Desktop to run and must expand across every operational table, Storage, and privileged action before beta)
- [ ] Self-service business creation, onboarding, member invites, role management, and account recovery
- [x] Owner-designated workspace admins with a private release/update log
- [ ] Support/admin boundary that cannot casually read customer financials

### Commercial readiness

- [ ] Subscription/billing model and entitlements
- [ ] Trial, cancellation, and failed-payment behavior
- [ ] Terms, privacy policy, data-retention/deletion flow, and support contact
- [ ] Product analytics that exclude sensitive item/financial content by default

### Reliability and launch operations

- [ ] Error monitoring and alerting
- [ ] Automated backups plus a restore drill
- [ ] Rate limits and upload-abuse controls
- [ ] Production smoke tests for sign-in, Intake, Inventory, Sales, and team access
- [ ] Closed beta with a small set of real resellers before paid launch

## Product improvements after the platform core

- [ ] Structured AI item identification with confidence and human review
- [ ] Selling Profile-aware listing generation that preserves original AI output and user edits
- [ ] Installable PWA polish and offline/interrupted-work handling
- [ ] Repeat intake/template workflow for known products
- [ ] eBay API publishing/order sync, only through supported APIs

## Explicitly deferred

- Opportunity Radar / external market intelligence
- Automated purchasing or supplier ordering
- Autonomous Facebook posting or buyer messaging
- CHIEF/Slims Suite integration
- Advanced tax/bookkeeping automation
