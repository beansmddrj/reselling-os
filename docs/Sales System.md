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

Products such as socks that share one long-lived listing can enable `Sell multiple` from the inventory edit screen. Each recorded sale still consumes its own inventory unit and stores its own COGS snapshot. In the same transaction, the system creates the next available unit with a new SKU and preserves the listing's current workflow status, avoiding duplicate listing setup without merging distinct sales together.

Enabling `Sell multiple` on an already-sold item repairs the sequence by creating its next available unit and restoring the reusable listing to Ready or Active. The sold item page links directly to recording another sale against that fresh unit.
