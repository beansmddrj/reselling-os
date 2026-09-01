# Inventory System

## Purpose
Inventory is the source of truth for what the business physically owns and what is currently for sale.

## Core model
**Product → Inventory Unit → Listing → Sale**

A Product answers what the item is. A Unit represents a physical owned copy and its actual cost/history. A Listing represents how that inventory is advertised on a platform. A Sale records the realized transaction.

Identical repeat products may share a reusable template and listing strategy while retaining unit-level cost/history.

## v0.1 statuses
- `DRAFT` — Intake incomplete
- `READY` — product/listing prepared but not posted
- `ACTIVE` — currently offered for sale
- `SOLD` — consumed by a recorded sale

Prefer workflow-driven transitions over arbitrary status dropdowns.

## Mobile inventory UI
Inventory should feel like browsing a clean storefront, not a spreadsheet. Prioritize product imagery, fast search, obvious status, quantity, unit cost, asking price, and quick access to product details.

## Product detail
Show reusable product information, available units, listings, current asking price, unit costs, and historical activity. Existing templates should support extremely fast `Add Stock` actions.

Repeatable products reuse one listing while preserving unit-level history. When `Sell multiple` is enabled, completing a sale consumes the selected unit and automatically creates its replacement with a new SKU, copied unit cost, storage location, and workflow status.

Repeatable units are grouped into one inventory card showing available and sold counts. A product-level restock status communicates `In stock`, `Temporarily out`, `Restock soon`, `Restock ASAP`, or `Don't restock`. Out-of-stock and pending-restock products cannot record another sale until returned to In stock; Don't restock allows the current final sale and then ends the reusable listing without rolling another unit forward.

## History
Persist meaningful lifecycle events such as creation, confirmation, listing generation, posting, price changes, sales, and later returns/write-offs. Historical records must remain auditable and should not be silently rewritten by later template changes.

## v0.1 implementation

Inventory reads the authenticated owner's physical units from Supabase and composes product identity, latest listing price, and the private lead photo through a repository boundary. The browsing surface supports real status counts, status filtering, and local search across product identity, SKU, and storage location. Each unit links to a read-only detail view with ordered photos, product attributes, cost, asking price, location, and listing draft context.

Product, unit, and listing-draft fields can be edited from the detail view through one atomic owner-scoped database function, with a business event recorded after success. Inventory cards expose the same non-destructive quick actions through desktop right-click and a visible three-dot control for touch and keyboard access.

Unsold physical units can be permanently deleted from the quick-actions menu or the item-detail danger zone after an explicit confirmation. Sold units are protected. When the deleted unit is the product's final unit, its product, listing draft, database photo records, and private Storage objects are also removed; shared product data remains while other units exist.

Workflow-driven transitions now move an item from Draft to Ready only after its required listing fields and photo are complete, from Ready to Active only when a marketplace URL is recorded, and from Active back to Ready when a listing is paused or ended. Every transition updates the unit and listing atomically and appends a business event. Sold remains reserved for the Sales workflow; editing alone never implies that a marketplace post occurred.
