# Decisions

## 2026-08-31 — Standalone project
Reselling OS is a new standalone Git repository. Do not build it inside CHIEF/Slims Suite. Future integration should happen through clean interfaces/API boundaries.

## 2026-08-31 — v0.1 scope freeze
Only Home, Inventory, Intake, and Sales are first-class v0.1 screens.

## 2026-08-31 — Facebook first
Facebook Marketplace is the initial selling workflow. v0.1 prepares high-quality listing data and the owner performs the final platform post. Do not build brittle personal-account browser automation as a core dependency.

## 2026-08-31 — eBay later
Keep listings platform-independent so supported eBay APIs can become the first deeper marketplace integration later.

## 2026-08-31 — No purchasing yet
Purchasing automation and Opportunity Radar are deliberately deferred until core inventory/sales data is trustworthy.

## 2026-08-31 — Mobile first
Smart Intake is designed for iPhone first. Repeated taps, keyboard/focus problems, lost drafts, and unnecessary confirmation dialogs are considered product bugs, not polish items.

## 2026-09-01 — Shared business workspace
Authentication remains per-person; passwords and sessions are never shared. Existing owner IDs continue to identify the business record for v0.1, while an explicit membership table grants invited collaborators access to that owner’s inventory, intake drafts, listings, photos, sales, and events. Invitations are matched against the trusted email claim in Supabase Auth and must be accepted by the recipient. The owner can remove a collaborator at any time.
# Owner-only sale finances

Shared workspace members may see operational sale facts (item, marketplace, date, and sale amount), while COGS, platform/payment fees, shipping, other costs, profit, and aggregate financial reporting are owner-only. PostgreSQL column privileges enforce this boundary; it is not only a UI convention. Team activity similarly exposes safe event fields without raw metadata.

## 2026-09-01 — Standalone operating expenses

Owner-only operating expenses are recorded separately from sales so historical spending, subscriptions, sourcing, taxes, shipping, and personal draws reduce actual owner net profit without rewriting an item’s sale record or COGS.

## 2026-09-01 — Incoming shipments are first-class operations

Incoming shipments track the purchase-to-receiving period before inventory exists. They record expected vs actual pieces, packages, exceptions, and a direct Intake handoff. Delivery is not treated as receipt, and inventory is never auto-created from a tracking update.

## 2026-09-01 — Protect shipment capital and projections

Shipment landed cost and projected revenue are owner-only records, stored separately from shared logistics. Inbound capital is not automatically added to operating expenses or realized profit, preventing the same cost from being counted twice when units are eventually sold.

## 2026-09-01 — Optional Sold Moments

Recording a sale leads to an optional one-photo capture screen for real customer, item, or package imagery. It is stored privately in the workspace for later social content and is never posted automatically. Repeatable products already preserve the sold physical unit and roll a fresh available unit under the same product/listing, so Sold Moments add no duplicate inventory records.

## 2026-09-01 — Repeatable listings use physical quantity controls

For a Sell Multiple product, plus and minus adjust actual unsold Inventory Units beneath the same product and listing. Removing quantity never touches a completed sale; adding quantity creates a fresh physical unit using the listing’s current operational defaults. The sales ledger links directly to the one optional Sold Moment archived for each sale.

## 2026-09-01 — Repeatable stock is size-specific and recoverable at zero

Each added repeatable unit has an optional independent size. Existing N/A units can be filled in later, and quantity removal requires choosing the exact size to remove. When the final available unit is removed, the system preserves a non-sellable zero-stock anchor so the operator remains on the listing detail page and can add stock back without reconstructing its listing or product history.

## 2026-09-01 — Move from reference workspace to platform readiness

The existing shared workspace is the reference operation, not yet the multi-customer SaaS model. Reselling OS may be offered to other resellers only after a first-class Business tenant replaces owner-ID-as-business across data, Storage, authorization, and support workflows. Billing and public onboarding follow that security migration; they are not shortcuts around it.
