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