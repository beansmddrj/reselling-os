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
