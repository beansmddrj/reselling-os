# Data Model

This is the conceptual v0.1 model; exact SQL schema is finalized before implementation.

## Product
Reusable identity: brand, model/name, category, color, common attributes, template/default information.

## Photo
Image metadata/storage reference, product association, order, and primary-image state.

## Inventory Unit
A physical owned unit: SKU, product, actual acquisition cost, acquired date, condition/size overrides where needed, and lifecycle status.

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