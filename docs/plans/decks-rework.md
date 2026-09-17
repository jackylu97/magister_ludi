# The decks rework — batch plan (branch `decks`)

**Plan of record · 2026-09-17.** The user (2026-09-17): *"we just need to playtest these. Let's keep the old cards (dont delete them yet), but lets create a new branch for these systems."* Everything here lands on the branch `decks`, never on `main`, until the playtest says so. The design of record is `docs/six-decks-first-cut.md` (its "The structure", "Leader pools", "Availability and offer rules", "Doctrine reward hands" and "Card-reading conventions" sections are the rules; its six deck tables, the cross-type table and the generic pool are the cards). The five briefs in `docs/astra-brief-*.md` are context, never spec. Where the design doc says "proposal", this plan says which proposals ship in which batch.

## What ships, in order

Three batches on the branch, each gated the ordinary way (typecheck + core tier + build; slow tier before a push of the branch).

### D1a — the structure (one agent, the sim and its data)

The card system learns decks. Nothing about a card's *effect* changes in this batch; only who may draw what, when, and into how many chairs.

- **Data schema.** Every order row gains `decks: DeckId[]` (one or two of `dominion | expansionist | commerce | devotion | scientific | magisterial`; empty = generic) and `band: 0 | 1 | 2 | 3`. `slot` (M/E/W) and `pool` (government) stop being read; leave the fields in place on old rows. A row may carry `charter: { unlocks: { tech?: TechId; building?: BuildingId; rites?: RiteId[] } }` — a charter is drafted, never seated, and its grant is applied on the pick. `rarity` is unchanged. A row may carry `deferred: "<player prose>"` (the existing convention) — a deferred row is in the data and the Compendium, and in no pool.
- **Old cards are kept, not deleted.** Every current order and doctrine row gets `retired: true` (the existing rule: retired rows leave every pool, keep the row for saves and the Compendium). No row is removed. The new rows are added beside them by D1b.
- **Leader rows** gain `decks: [a, b]`; Ibn Battuta's row says `rainbow: true`. `Player.decks` is written at `newGame` from the leader (config may override per seat; default from the leader). The seat pool reading is `deckPoolOf(state, player)` in `statecraft/draft.ts`, replacing `poolOfGovernment` as the draw's source (keep the old function for the retired rows' sake; nothing live calls it).
- **Bands.** A card is drawable when the seat has reached its band's government tier **and** its research age (the highest age among the seat's techs, floored at 1) — both, per the design doc's age check. The four tiers are the design doc's 3 / 4 / 6 / 9 chairs at draft counts 0 / 4 / 18 / 29 (`tierLadder` in `data/statecraft.json` becomes four rungs; `rarityWeights` is replaced by the rarity-first probabilities below).
- **Chairs are universal.** A government supplies a chair *count*; the M/E/W layout is retired. The sixteen governments stay as rows (their signatures untouched in D1a — the simplification is a later ruling); each gains `chairs: n` = its tier's count, and the slot spread on `PlayerStatecraft` becomes a flat list of that length. Adoption rebuilds the list as today. Ibn Battuta's extra chair and any card chair stay additive.
- **The draw** (design doc "Normal three-card hands", rules 1–7, verbatim): positions one and two from the two decks; rarity drawn first at 60 / 30 / 10 renormalised when a rarity is absent, then uniform within it; the third position by the regular-draft-count cadence generic → cross → generic → single (the single alternating decks); rainbow samples two distinct decks then the cadence; every position excludes owned ids and the hand; empty category falls back to the eligible union; fewer than three shows fewer; exhausted pool charges nothing. The pass and its pity stay as today except that pity shifts probability out of common into uncommon and rare (the design doc's rarity-first shape). The faith reroll stays. `explainOfferSize` still adds extra cards after the base hand.
- **Doctrine reward hands** (design doc "Doctrine reward hands"): at draft counts 4, 18 and 29 an extra rare-only hand of three, one from each deck then a third from the union; banked (never blocks End Turn), passed for nothing, exhausted for nothing; a rare taken in either kind of hand leaves the other. `PlayerStatecraft.rewardHands` holds the pending ones as absolute draft counts.
- **Charters.** Picking a charter row applies its grant at once: a tech becomes researchable for that seat (a per-player `charteredTechs` list the research gate reads; the tech row itself is placed off-lane by the data batch), a building becomes buildable (the existing `unlockedByCard` seam), rites become learnable. The card sits in the collection, never in a chair, and the Compendium's opening line names the charter (C1's shape).
- **Saves.** Schema bump. A pre-rework save does not replay under the new draw and is refused with the sentence R4 built; state that in the changelog.
- **The bot.** The minimal honest reading: the bot draws from its seat pool like anyone; its card appraisal keeps working over whatever rows are drawn; personas' family leans are E1a's rows. No new bot knob in D1a. The arena and the six-seat digest keep running (the digest moves and is re-cut with the reason: every seat draws a different deck).
- **UI, the minimum to play.** The draft sheet shows the deck badge on each card and a "charter" mark where a row is one; a reward hand opens as a second sheet with the same controls; the leader select shows the leader's two decks. Everything else UI is D1c.
- **Pins.** The seat pool for each leader is exactly its two decks plus commons plus either-type crosses; a rainbow seat's is everything; bands gate on both tier and age; the draw's positions and cadence over many seeded hands; rarity-first probabilities within tolerance; a charter pick applies its grant and seats nothing; reward hands at the three counts; the retired rows in no pool; a replayed log byte-identical; the doc's structure paragraphs sync-tested where they state a number (chairs, counts, probabilities).

### D1b — the cards (six agents in parallel, one deck each, after D1a lands)

Each agent enters one deck's table from the design doc as rows in `data/statecraft.json`, using the effect vocabulary as it stands:

- A card whose text fits an existing shape becomes a live row (`decks`, `band`, `rarity`, `effects`, plain `text` through the describers).
- A card whose text needs a shape that does not exist becomes a **deferred** row: `deferred: "<the card's own sentence in plain words>"`, no `effects`, in the data and the Compendium, in no pool. The agent lists every deferred row and the shape it waits on in its report — that list is the shape audit, deck by deck, and D2's input.
- The cross-type table and the generic pool are a seventh agent's, after the six (they need every deck's ids).
- Fences by deck within `data/statecraft.json` are by row; the seven agents must not touch each other's rows, `src/`, or the doc. Card-text fixtures regenerate deliberately per agent (`CARD_TEXT_WRITE=1`) and the orchestrator resolves the fixture at the merge.

### D1c — the surfaces (one agent, after D1b)

The Compendium grouped by deck with the retired rows in their own shelf; the draft sheet's deck badges and charter marks finished; the Ledger's statecraft names unchanged; the arena and spectator pages need nothing. Screenshots for the user's eye.

### D2 — the shapes (waves, after the playtest begins)

Each wave builds one shape and un-defers every row that waited on it. First wave, by cards served per shape: the **age stamp** (a "placed on turn" fact on buildings, works, forests and routes, read as "how long has it stood"), the **charter-keyed tree** (off-lane tech rows gated by `charteredTechs`), **planting and maturity**, **population payments**, the **per-empire commercial post**, **miracle commands**. Later waves per the deferred lists.

## What is not in D1

The government simplification to three forms (held; governments keep their signatures and gain a chair count only). New strategic resources and unit-requirement promotions (parked by the design doc). Any bot tuning (held with the tuner). Pool expansion mid-game (deferred by the user).

## Fences and gates

D1a: `src/sim/statecraft/*`, `src/sim/commands.ts` (new arms), `src/sim/state.ts` (schema, `Player.decks`), `src/sim/tech.ts` (the chartered gate), `data/statecraft.json` (schema fields on every row, `tierLadder`, the probabilities; **no new card rows**), `data/leaders.json` (`decks`), `src/ui/` the two sheets and the leader select only, `src/ai/` only where the draw's caller changed, tests beside each. D1b: rows only. D1c: `src/ui/compendium.ts`, the draft sheet's styling, `src/style.css`. Every batch: narrow tests for the agent, the orchestrator's core tier per module on the branch, the slow tier before the branch is pushed. Nothing on `main`.
