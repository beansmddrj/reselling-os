# Data Model

This is the conceptual reference-workspace model. The platform migration adds a first-class Business tenant above every operational record.

## Business (platform foundation implemented)
An independent customer organization. Every product, unit, listing, sale, photo, shipment, expense, and event now carries a `business_id`; legacy owner references remain only while the application is migrated safely. Membership roles and invitations are granted within a Business. The launch requirement is that no customer can discover or access another Business's records through a query, RPC, or Storage path.

## Product
Reusable identity: brand, model/name, category, color, common attributes, template/default information.

## Photo
Image metadata/storage reference, product association, order, and primary-image state.

## Inventory Unit
A physical owned unit: SKU, product, actual acquisition cost, acquired date, condition/size overrides where needed, and lifecycle status. Repeatable products can add individual units with their own optional `variant_size`; skipped sizes are explicitly stored as `N/A` in the UI. When a repeatable product reaches zero stock, one non-sellable zero-stock anchor preserves its product/listing detail page for recovery and restocking.

## Listing
Platform-specific advertisement: platform, title, description, asking price, status, external listing ID/URL when available, timestamps, and preserved AI-original vs user-final content.

## Sale
Realized transaction: unit, platform, sale price, fees, shipping/other direct costs, timestamp, and deterministic calculated profit.

## Event
Append-oriented business history: event type, entity IDs, timestamp, actor/source, and relevant before/after values.

## Selling Profile
Explicit owner preferences plus platform-specific strategy settings. Learned recommendations should be proposed separately rather than silently mutating this profile.

## Intake Draft
Recoverable work-in-progress state for mobile Intake, including photos and completed/remaining steps.

## Incoming Shipment
The operational record for a buy before goods enter inventory: supplier/reference, expected and received piece counts, lifecycle status, visibility, dates, packages, receiving history, and the eventual handoff to Inventory Units.

## Shipment Financials
Owner-only capital plan associated with an Incoming Shipment: purchase, shipping, taxes, duties, insurance, other landed costs, and optional projected revenue. It is deliberately separate from operating expenses and realized sales.

## Package and Receipt
A shipment can have several packages. A receipt is an append-only actual count (with optional exception), so "delivered" never falsely means the goods were received correctly.
