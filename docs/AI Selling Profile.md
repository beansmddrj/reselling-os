# AI Selling Profile

## Principle
The system should learn both **how the owner prefers to sell** and **what actually performs well**. These are not always the same thing.

## Persist from day one
- Original AI-generated title/description/price suggestion
- Final user-edited title/description/price
- Meaningful edits
- Listing/post timestamp
- Price changes
- Sale price
- Days to sale
- Realized profit/margin
- Platform

## Initial profile
Start with explicit owner preferences such as title structure, description length/style, pricing posture, negotiation room, prohibited phrases, and platform-specific behavior.

## Learning behavior
Do not silently rewrite the owner's strategy. When sufficient evidence suggests a useful change, propose it with sample size, measured effect, and confidence, then let the owner adopt or reject it.

Never claim a strategy is proven from tiny samples. Preference learning and performance learning must remain distinguishable.

Facebook and future eBay behavior should support separate platform profiles while sharing global business preferences.

## Platform requirement

Selling Profiles and future learning data belong to one Business tenant. Never train, benchmark, or surface one reseller's private listing copy, photos, sales, or pricing data to another reseller without explicit opt-in.
