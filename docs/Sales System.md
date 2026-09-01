# Sales System

## Purpose
Close the inventory lifecycle and produce trustworthy realized business performance.

## v0.1 sale inputs
- Sold inventory unit/product
- Sale price
- Platform
- Platform fee
- Payment/transaction fee when applicable
- Shipping cost paid by business
- Other directly attributable cost
- Sale timestamp

## Financial rule
Financial calculations are deterministic application code, not LLM output.

**Net profit = sale price − unit cost (COGS) − platform fees − payment fees − shipping paid by business − directly attributable other costs.**

Every dashboard total must be traceable to underlying transactions. AI may explain financial information but may not invent or silently alter it.

Recording a sale consumes the correct physical inventory unit and transitions it to `SOLD`.

## Implemented workflow

Sales can be recorded from an active inventory item or from the Sales ledger. The database records the sale, snapshots the unit cost as COGS, moves the inventory unit and its latest listing to `sold`, and appends a business event in one transaction. Sold inventory cannot be recorded twice or deleted.

The Sales ledger and Home dashboard calculate revenue and realized profit directly from stored sale rows. Empty financial fields are stored as zero; sale price and timestamp are required.

## Repeatable products

Products such as socks that share one long-lived listing can enable `Sell multiple` from the inventory edit screen. Each recorded sale still consumes its own inventory unit and stores its own COGS snapshot, while the listing remains reusable. Available quantity drops by one and is replenished explicitly from the item page, avoiding duplicate listing setup without inventing stock.

Enabling `Sell multiple` on an already-sold item creates an initial available unit and restores the reusable listing to Ready or Active. Each added unit can have an optional size; skipped sizes are recorded as `N/A`.
