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

## History
Persist meaningful lifecycle events such as creation, confirmation, listing generation, posting, price changes, sales, and later returns/write-offs. Historical records must remain auditable and should not be silently rewritten by later template changes.