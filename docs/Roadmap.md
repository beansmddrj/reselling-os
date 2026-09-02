# Roadmap

## v0.1 — Essential Loop
**SOURCE → PHOTO → IDENTIFY → REVIEW → LISTING → POST → ACTIVE → SOLD → PROFIT**

Build only what is necessary to make that loop reliable through Home, Inventory, Intake, and Sales.

### Foundation
- [x] Next.js, TypeScript, Tailwind, Supabase, and local LAN development environment
- [x] Versioned SQL schema/migrations and business event history
- [x] Per-person authentication, shared workspaces, invitations, and owner-only financial privacy
- [x] Private Supabase Storage for intake photos and Sold Moments
- [x] Mobile-first shell and navigation
- [ ] Installable PWA polish
- [x] Secure HTTPS deployment on Vercel with Supabase Auth and workspace RLS
- [ ] Backups and application error logging/alerting

### Smart Intake
- [x] 1–5 continuous camera/photo-library capture, previews, replacement, reorder, and private upload
- [x] Device and Supabase draft recovery
- [x] Structured human review and atomic Product → Unit → Listing creation
- [ ] Structured AI identification
- [ ] Missing/uncertain AI field review
- [ ] Product-template repeat intake shortcut
- [ ] Selling Profile-aware Facebook listing generation
- [ ] Preserve AI output and user edits

### Inventory
- [x] Product/template/unit/listing separation
- [x] Search, filters, archive, edit, and guarded deletion
- [x] DRAFT → READY → ACTIVE → SOLD lifecycle
- [x] Product details, shared listing groups, restock states, and add/remove stock
- [x] Repeatable quantity by physical unit with optional per-unit sizes and zero-stock recovery

### Sales
- [x] Record transactions and direct costs
- [x] Deterministic COGS/profit calculations and owner-only finance view
- [x] Consume physical inventory and protect completed sales
- [x] Revenue/profit summaries, operating expenses, and optional Sold Moments

### Home
- [x] Actionable business snapshot
- [x] Attention states
- [x] Recent sales

## Later — explicitly not v0.1
- eBay API publishing/order sync
- Opportunity Radar / external market intelligence
- Procurement recommendations
- Purchasing automation
- Supplier integrations
- Autonomous messaging
- CHIEF/Slims Suite integration
- Advanced strategy-learning recommendations
