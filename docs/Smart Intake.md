# Smart Intake

## Goal
Make adding inventory substantially faster than creating a marketplace listing manually.

## New-product flow
1. Open Intake.
2. Capture or select **1–5 photos**.
3. Photos remain visible as thumbnails with an always-available next photo tile until five are present.
4. **Never ask “Add another photo?”** The user simply keeps adding photos and presses Continue when finished.
5. Upload/compress/process photos in the background without freezing the UI.
6. AI identifies as much structured product information as it can.
7. Ask only for missing or low-confidence required information.
8. User reviews/corrects the record.
9. AI generates structured Facebook Marketplace listing content using the Selling Profile.
10. User copies/uses the prepared listing and posts it manually.
11. User marks the listing Active.

## Repeat-product flow
**Intake → From Template → select product → quantity + current unit cost → add inventory.**

Reusable templates can retain appropriate photos, product identity, listing defaults, category, brand, common condition, and other reusable attributes. Each physical unit still receives its own identity and cost/history.

## Mobile UX requirements
- Designed for iPhone first.
- Native HTML controls where possible.
- Tap outside an input dismisses keyboard.
- Natural scroll/gesture keyboard dismissal.
- Focused inputs remain visible above the iOS keyboard.
- Continue/action controls remain reachable with keyboard open.
- No focus traps or major layout jumps.
- Correct numeric keyboards for currency/quantity.
- Intake state auto-saves as a draft.
- Reload, app switching, screen lock, or temporary connection loss must not destroy work.

## Learning
Persist both the original AI-generated listing and the user's final edited version. Record meaningful title, description, and price edits so future systems can learn preferences and later compare them against actual sales outcomes.