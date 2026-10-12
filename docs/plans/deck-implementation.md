# Plan: put the four approved decks into the game

**Goal.** Make Commerce, Dominion, Expansionist and Devotion play the way their sheets in `docs/decks/` say, quickly, so the user can playtest them. Common, Scientific and Magisterial are still under the user's review and are not touched, except where a shared card pairs two approved decks.

**The user's bias (2026-10-12):** *"bias towards implementations that are fast and capture the idea of each belief and skip over any mechanics that require significant changes (reworking existing mechanics, touch multiple files and involve a UX change)."* We expect to change much of this after playtesting.

## What "implement a sheet" means

For every row on an approved sheet:

| Sheet status | What the batch does |
|---|---|
| **built** | Nothing, unless the sheet's text differs from the data row; then the data is brought to the sheet. |
| **revised** | Change the data row's effects and text to the sheet. |
| **new**, "fits existing effects" | Add the data row with existing effect shapes. |
| **new** or **deferred**, "needs: …" | Use the **cheapest version that captures the idea**: existing shapes, or at most one small new effect shape or rule, local to the evaluator and the data. If that is not possible without a significant change (below), add the row as `deferred` with a plain one-line reason, so it appears in the Compendium but is not dealt. |
| **Proposed cuts** | Mark the data row `retired: true` (kept for saves, out of every pool). Rows that never reached the data need nothing. |

**A significant change, which every batch skips and defers:** reworking an existing mechanic; a change spread across many files; or a new interface (a new screen, panel, button or counter on a card face). Examples on these sheets: commissions (goal tracking, leaving the chair, progress on the card), levies (spending a citizen), miracle-style faith orders, moving citizens between towns, tiles changing owner without a capture, a tile holding two works, reward hands, new unit or building rows that need art.

**Cheap mechanics worth building when several cards share them** (one batch builds each, others reuse): a "city building the Magnum Opus" scope; a capture payout that reads the captured city; a card that unlocks an improvement row (for tended works, added as ordinary improvement rows marked as tended: they count as unimproved for wild-land cards and cannot be pillaged). Each batch says which it built.

## Rules applied in these batches
- **Tiers map to bands:** sheet Tier 0–III are data `band` 0–3; **Tier IV is a new band 4** (foundation batch).
- **Ruling (qqqqqq) 1:** every card that took a percentage off a purchase price now gives **+25% of that currency's yield** in the same scope, keeping its downside. On these sheets: Private Patronage, Bought Swords, Frontier Investment, The Customs Houses, The Factors' Houses, Land Speculation, The Market Writ, The Tithe and Letters of Marque (gold); The Calling and The Holy Inquisition (faith). The batch updates both the data and the sheet's card text.
- **Ruling (qqqqqq) 3:** faith buys production at 2 faith per hammer (foundation batch).
- **Ruling (qqqqqq) 4 and the "uncapped engines" ruling:** no caps are added; caps written on the sheets stay as written.
- Rulings 5–9 and 13 (keeping cards on government adoption, the collection rules, one draft pool, growth counting) are mechanic reworks. **Not in these batches;** a later batch.

## Batches

**Batch F — foundation (first, alone).**
- Add band 4 for Tier IV: `Band` gains 4; the band ladder gains a fifth rung; band 4 opens in the last research age (there is no fifth age, so the age gate for band 4 is age 4) on the fifth rung.
- Set the chairs to 3 / 5 / 8 / 11 (the deck design's ruling), and decide the fifth rung's chairs (11) and draft count (the tier-45 governments' rung).
- `faithPerHammer` 1 → 2.
- Done-gate: narrow tests on the draft and the bands, plus the registers that pin the ladder.

**Batches D1–D4 — one per deck, in parallel after F** (Commerce, Dominion, Expansionist, Devotion). Each owns `data/decks/<deck>.json` and its own sheet; new effect shapes go in the evaluator and types; tests under `test/sim/decks/`.

**Batch S — shared cards, after D1–D4.** Shared rows live in `data/decks/common.json`. Implement the shared cards whose **both** decks are approved (pairs among Commerce, Dominion, Expansionist and Devotion). Shared cards that involve Scientific or Magisterial wait for the user's review of those sheets.

## Gates
- Every batch: its own tests green, its files typechecking, narrow runs only.
- Orchestrator, per merged batch: `npm run typecheck`, the core tier, `npm run build`. Bot-game digests will move (new and retired cards change what bots draft); re-cut once after the last batch, before the push-gate.

## Not in scope
Common, Scientific and Magisterial cards; rulings 5–9 and 13; the interface for commissions, counts and maturity (ruling 15); balance tuning, which is the user's playtest.
