# Deck review: economy (currencies, sources, sinks, conversion rates)

Reviewer lens: economy designer (sources and sinks, exchange rates, loops). Read-only review of `docs/decks/deck-design.md`, the six sheets and `common.md`, checked against `data/rules.json`, `data/statecraft.json`, `data/religion.json`, `data/units.json`, `data/buildings.json`, `data/decks/*.json` and the pricing code in `src/sim/purchase.ts`, `src/sim/religion.ts` (reroll ladder), `src/sim/statecraft/draft.ts` (draft meter) and `src/sim/cities.ts` (tile price).

## 1. Summary

- Every deck has its currency's source on its sheet. The sinks are uneven: Commerce, Devotion and Magisterial have many; Expansionist's whole sink (levies) is deferred, and Scientific's sink (charter technologies) has no price yet.
- The game has no single exchange rate. Faith is worth 1, 1.33, 1.5, 4 or 6 gold depending on which counter you stand at, and the rules file's own two tables disagree (purchases say 1 faith = 4 gold, the score weights say 1 faith = 1 gold).
- Purchase discounts add up with nothing to stop them, are floored at zero, and apply to the faith bank even when the card says "gold". Stacked Commerce cards make buildings, units and (through The Gilded Scaffold) wonders nearly free in small towns.
- Five profitable loops: cheap unit into citizen (Veteran Colonies), deliberate unit deaths (Songs of the Fallen), pass-and-archive beating a draft, seat churn for culture (The Swearing-In), and gold into culture into rerolls at half The Brokers' Redraw's price.
- Culture: Expansionist starves as the spec intends; Devotion starves early, which the spec does not intend (no card pays culture on religious buildings). The move from 9 to 11 chairs raises the culture needed to fill a Tier IV government by about 70% unless the meter is retuned.

## 2. Per deck

### Dominion — currency: units
**Works.** Sources (production, The King's Levy, Blood Brothers, Commission: Clear the Frontier) and sinks (garrison payers, conquest payers, upkeep relief) are both present and both built. Units have a carrying cost (gold upkeep), which is the natural brake the other currencies lack. Conquest lumps (Triumphs, Conquered Archives, War Reparations) scale with the captured town's population, so they keep their value across the game.

**Does not work.**
- **Songs of the Fallen turns production into science and culture through deliberate deaths.** A Warrior costs 15 hammers (10 for a light unit, plus `militaryPercent` 50) and has strength 20. Losing it pays 20 science and 20 culture; The Art of War adds 10 science on training and Muster Rites 5 faith and 5 food. 15 hammers (60 gold) for 30 science and 20 culture is a better rate than any converter in the game, and Warriors do not escalate in cost. A player can march Warriors into a barbarian camp every turn.
- **The Pacified Marches has no ceiling.** Barbarian camps respawn (`campEveryTurns` 2, up to 24), and each one cleared adds +1 authority and +3 culture for as long as the card is seated. Over a long game this is an open-ended faucet of both culture and authority.
- **Commission: Take the City pays 30 times the town's population in culture and in science.** That is three times Triumphs, a standing card, on a single capture, and well above every other commission's culture reward (100 to 300 flat).

### Expansionist — currency: food and land, spent on citizens (levies) and claimed land
**Works.** Food sources are plentiful (22 cards mention food). Land sources exist as new cards (Outposts, The Barbarian Frontier, The Wide Country).

**Does not work.**
- **The sink is unbuilt.** Levy of the Land, The Muster of the Fields and Seasonal Levies are all deferred, and Migration and Veteran Colonies are new. Without levies, food has only one outlet (growth), and the deck's own happiness cards remove the cap on that. The spec says levies are where this deck spends its currency; that half of the engine does not exist yet.
- **The levy prices are generous and inconsistent with the rest of the game.** Levy of the Land pays "production equal to ten turns of their food". If that means gross food, a size-8 town making about 24 food pays 240 production for one citizen that costs about 89 food to regrow (`growthBase` 10 + 6n + n^1.65). The Muster of the Fields pays the best melee unit (about 200 hammers mid-game) for the same citizen. The Loaves, the only card that buys a citizen, prices it at 1 faith per food of growth (at least 80), and faith buys 1 hammer per faith. So a citizen is bought at about 1 hammer per food and sold at 2 to 3 hammers per food. With Granary Levies (+15 production per growth) and Seasonal Levies (+40% food after a levy), levy and regrow becomes a production printer on a five-turn cycle.
- **Veteran Colonies is the cheapest citizen in the game.** Any military unit becomes a citizen. A Warrior is 15 hammers or 60 gold; with Commerce's stacked discounts it is a few gold; The King's Levy, Blood Brothers, Commission: Clear the Frontier and Mercenary Contracts hand out units for nothing. Paired with The Muster of the Fields it is a citizen-to-unit-to-citizen cycle, and if a retirement counts as growth it also fires Granary Levies.
- **Culture starvation matches the spec** (only The Old Songs is live, at Tier I; nothing at Tier 0). The spec also asks that this deck's early cards be strong per card, but two of its eight Tier 0 cards are called filler on its own sheet (Smallholdings, Granary Levies). The deck has no route to an extra hand that is not culture.

### Commerce — currency: gold, spent on purchases
**Works.** The richest source list in the game (29 cards mention gold) and a real set of sinks: purchases, The Brokers' Redraw, Merchant Princes, The Gilded Scaffold, the shared Mercenary Contracts, and two partner sinks (Magisterial's The Subscription List, Scientific's The Presses). The reserves line (The Money Lenders, The Strongroom, War Bonds) makes hoarding against spending a real choice, which is the "reserves versus purchased capability" direction the sheet names. Every yield conversion on the sheet (Financed Industry, The Merchant Works) reads the town's flats before any conversion, so no chain of conversions can loop; this is stated on Financed Industry's row and is correct.

**Does not work.**
- **Discounts stack to free.** Purchase riders are summed and applied once, floored at zero (`applyRiders` in `purchase.ts`). Private Patronage (−30%), Frontier Investment (−50%) and The Customs Houses (−15%) make an ordinary building cost 5% of its price in a town of five or fewer citizens with a customs house. For military units, Bought Swords (−20%), Frontier Investment and The Customs Houses reach −85%; for ships, the shared Letters of Marque (−25% in a Harbour town) takes the total past 100% and the ship is free, one per class per town per turn. The tile price, by contrast, is floored at 1 with the comment "free land is not a discount, it is a different game"; the same reasoning applies to buildings and units.
- **"Gold" discounts also discount faith.** Card riders carry no bank (`cardPurchaseRiders` in `statecraft/evaluator.ts` has no currency filter; only building-held discounts are gold-only). Private Patronage, Bought Swords, Frontier Investment, The Customs Houses and The Tithe all say "gold" in their text. Today faith buys few things, so this barely shows; once Devotion's The Lay Brothers opens every building to faith, a Commerce · Devotion seat gets the Commerce discounts on faith purchases too.
- **Private Patronage reaches wonders bought through The Gilded Scaffold.** Its text says wonders are unaffected, and its sheet note relies on wonders being refused at the counter. The Gilded Scaffold removes that refusal, and wonder rows do not carry the `empireBuilding` marker the rider's exclusion reads, so the −30% applies to them. With Frontier Investment and The Customs Houses a wonder costs 5% of its gold price in a small town.
- **The Money Lenders compounds without a ceiling.** 2% of the treasury per turn doubles a hoard in about 35 turns. The user removed the old ceiling in the hand edit, so this is a risk to watch rather than an error, but it is the only open-ended inflation source on the sheet, and The Strongroom (culture equal to a fifth of the treasury) and War Bonds both read the same growing number.
- **The Waqf compounds faith on faith.** It pays +2 faith on purchased faith buildings, from either bank. With The Lay Brothers, faith buys faith buildings that pay faith, paid back in about ten turns and then compounding. The history line it comes from (the *waqf*) is gold given once turning into faith, which is the Commerce-to-Devotion bridge the spec wants.

### Devotion — currency: faith, spent on faith purchases and miracles
**Works.** The sinks are now the centre of the sheet, as the spec asked: miracles (The Healing, The Consolation, The Loaves), faith purchases (Consecrated Ground, Consecrated Labor, The Monastic Builders, The Lay Brothers), and the late Opus route (The Last Offering). Faith also competes with the belief ladder and rerolls, so it has more sinks than any other currency, and sources to match (shrines, pastures, camps, holy sites, rites).

**Does not work.**
- **Faith's exchange rate changes at every counter** (see section 3). Consecrated Ground sells a tile for the same number of faith as gold, while buildings cost a quarter as much in faith as in gold. A Devotion player will never buy land with faith while buildings are available at four times the rate.
- **"At their normal purchase price" on The Lay Brothers does not say which price.** The game's faith bank converts at `faithPerHammer` 1 against gold's 4. If that is the intended rate, The Lay Brothers buys buildings at a quarter of Commerce's price and is the strongest production substitute in the game. The text should name the rate.
- **Early culture is missing.** The spec says Devotion reaches culture through "religious buildings, holy sites and festivals". No card pays culture on a religious building, The Festival Calendar and The Creed sit at Tier II, The Old Holy Places pays culture only after 40 turns, and The Living Hymnal needs foreign conversions. Before Tier II, Devotion has no regular culture of its own, so it drafts as slowly as Expansionist without being meant to.

### Scientific — currency: science, spent on charter technologies
**Works.** Few direct science cards, as the spec asks (11 mention science; most are gated or small). Strong early culture (The Scribes' Hall, The Long Study, The Prize Essay, Field Notebooks at Tier 0), which it needs because a charter uses up a draft pick without filling a chair.

**Does not work.**
- **The sink has no price.** "Costs more research than an ordinary technology" is the deck's whole taper and none of the charter technologies exist in `data/techs.json`. Until the premium is a number in data, the deck's currency has no measured sink.
- **The Presses sells science cheaper than production.** 3 gold per science against 4 gold per hammer at the counter. The spec says science is probably the strongest yield and must be tapered; the score table weights science and production equally (0.04 each). As written, a Commerce · Scientific seat should turn its whole treasury into research.

### Magisterial — currency: culture, spent on drafts
**Works.** The most culture of any deck (27 cards), and the only deck with culture sinks other than the meter (The Salon des Refusés, The Commissioned Works), which is exactly "trading drafts for strength". The conversion cards (The Working Court, The Learned Patron, The Performers' Treasury) read pre-conversion figures and cannot chain.

**Does not work.**
- **Passing beats drafting with three cards.** The Archive keeps one card from a passed hand; The Patient Eye refunds 25% of the hand's cost; The Unwritten Chapter pays science equal to half the cost. Together, a pass gives a card plus 75% of the culture back in culture and science. Drafting gives only the card. Once a player holds all three, passing every hand is strictly better.
- **The Swearing-In pays 15 culture a turn for moving cards.** Rotating two cards through one chair satisfies "seat or unseat" every turn; seals only limit one card at a time. At Tier I a hand costs 18 to 70 culture, so this one card is worth a free hand every two to five turns.
- **Gold-to-culture-to-reroll undercuts The Brokers' Redraw.** The Subscription List turns 3 gold into 1 culture, and The Salon des Refusés spends culture at the faith price. So a reroll costs 3 gold per faith point by that route, against 6 (`statecraft.redraw.goldMultiple`) through The Brokers' Redraw, which exists to make gold the expensive route.
- **The Critics' Circle has no ceiling.** With The Second Reading, the first reroll of every hand is free and does not raise the ladder (`rerollsTaken` rises only on paid rerolls), so every hand adds a permanent +1 science and +1 culture. The Encyclopedia, its sibling, stops at +15.
- **The Wandering Muse (Tier I) is worth far more than The Grand Lottery (Tier III).** A great person is priced at 1,000 gold or 750 faith at the counter; the Lottery's options are 150 of one yield. A free great person for one early draft should at least raise the renown threshold like any other called great person.
- **On-draft boons need a rule for cards that arrive without a draft.** The Archive and The Cabinet of Curiosities put cards into the collection. If Gifts at Court or The Wandering Muse fires when archived or granted, the boon family loops into itself.

## 3. Across decks

### Every conversion rate the cards and rules set

Reading key: hammers are the common unit, using the purchase table (`goldPerHammer` 4, `faithPerHammer` 1), so 1 hammer = 4 gold = 1 faith.

**Spend conversions** (one currency is spent to get another):

| From → to | Where | Rate as printed | In hammer terms |
|---|---|---|---|
| Gold → production | Purchase counter (`rules.production.goldPerHammer`) | 4 gold per hammer | 1 : 1 (the reference) |
| Gold → wonder | The Gilded Scaffold | 4 gold per hammer | same as reference |
| Gold → unit for 15 turns | Mercenary Contracts | half the gold price, no upkeep | 2 gold per hammer, rented |
| Faith → production | Faith bank (`faithPerHammer`): Reliquary, Cathedral contributions, The Monastic Builders, The Lay Brothers, Consecrated Labor | 1 faith per hammer | 1 faith = 4 gold |
| Faith → Opus | The Last Offering | 3 faith per hammer | 3x the faith bank (a deliberate premium) |
| Faith → land | Consecrated Ground | 1 faith per gold of the tile price | 1 faith = 1 gold |
| Gold or faith → great person | `greatPeople.offerPriceGold` / `offerPriceFaith` (Merchant Princes, Sacred Patronage) | 1,000 gold or 750 faith | 1 faith = 1.33 gold |
| Faith → reroll | Reroll ladder (`religion.reroll`: 35 × age × 1.35^paid rerolls) | the ladder | reference for rerolls |
| Gold → reroll | The Brokers' Redraw (`statecraft.redraw.goldMultiple`) | 6 × the faith price | 1 faith = 6 gold |
| Culture → reroll | The Salon des Refusés | 1 × the faith price | 1 culture = 1 faith |
| Gold → culture | The Subscription List | 3 gold per culture | |
| Gold paid → culture (bonus) | Civic Receipts | 1 culture per 10 gold spent on a building | |
| Treasury held → culture | The Strongroom | 1 culture per 5 gold held (not spent) | |
| Culture → building | The Commissioned Works | 1 culture per 2 gold of price | 2 culture per hammer |
| Culture → science | The Unwritten Chapter (on a pass) | 2 culture per science | |
| Gold → science | The Presses | 3 gold per science | 0.75 hammer per science |
| Faith → science | The Copying Houses | 2 faith per science | 2 hammers per science |
| Faith → citizen | The Loaves | 1 faith per food still needed, at least 80 | about 1 hammer per food |
| Unit → citizen | Veteran Colonies | any military unit | from 15 hammers per citizen |
| Citizen → production | Levy of the Land | ten turns of the town's food | about 2 to 3 hammers per food of regrowth |
| Citizen → unit | The Muster of the Fields | best melee unit | about 2 hammers per food of regrowth mid-game |
| Unit lost → science and culture | Songs of the Fallen | strength each | Warrior: 15 hammers → 20 science + 20 culture |
| Unit trained → science | The Art of War | half the unit's strength | Warrior: 10 science |

**Yield conversions** (a share of one yield is paid again as another; nothing is spent). All read the town's flats before any conversion, so none can chain:

| Card | Deck | Share |
|---|---|---|
| The Working Court | Magisterial | 20% culture → production |
| The Learned Patron | Magisterial | 10% culture → science, at most +12 per city |
| The Performers' Treasury | Magisterial | 20% culture → gold |
| Financed Industry | Commerce | 20% gold → production, −3 food per city |
| The Merchant Works | Commerce | 25% gold → production, −20% gold (0.8 gold per hammer, five times cheaper than the counter) |
| War Foundries | Dominion | 20% production → gold |
| The Tithe | Commerce · Devotion | 25% faith → gold |
| The Cloister | Devotion · Scientific | 20% faith → science |
| The Engine Works | Scientific | 15% science → production |

### The same conversion priced differently

1. **Faith against gold: five rates.** 1 (tiles), 1.33 (great people), 1.5 (science: 2 faith or 3 gold per point), 4 (buildings and units), 6 (rerolls). The rules file's score weights (`score.perDeckYield`: gold 0.02, faith 0.02, production 0.04) value faith equal to gold and a hammer at 2 gold, while the purchase table values a hammer at 4 gold and at 1 faith. Two of the game's own tables disagree on what faith is worth, and every faith card inherits the disagreement. This needs one ruling, then each card's price follows from it.
2. **Rerolls: gold pays 6, or 3 through the culture route.** See Magisterial above.
3. **Science: 0.75 hammer through The Presses, 2 hammers through The Copying Houses**, with The Unwritten Chapter's 2 culture between them.
4. **Gold into production: 4 gold per hammer at the counter, 0.8 through The Merchant Works.** Defensible because The Merchant Works only applies to slow builds (wonders, empire buildings, the Opus), but it is the widest gap in the table and worth knowing when tuning.
5. **Citizens: bought at 80+ faith (The Loaves) or one Warrior (Veteran Colonies); sold at 2 to 3 hammers per food of regrowth (levies).**
6. **Culture against gold:** 2 (The Commissioned Works), 3 (The Subscription List), 5 (The Strongroom), 6 (rerolls via The Salon des Refusés against The Brokers' Redraw), 10 (Civic Receipts). The round trip gold → culture → building loses a third, so it is not a loop; the reroll route is the only place the gap pays.

### Profitable loops

1. **Discounts to zero → free units → Veteran Colonies → free citizens** (Commerce + Dominion + Expansionist). Also free buildings and near-free wonders. Fixed by a discount floor (rule).
2. **Free or cheap unit → citizen.** The King's Levy, Blood Brothers, Commission: Clear the Frontier, Mercenary Contracts (a hired unit that would leave anyway) all feed Veteran Colonies. Fixed by repricing Veteran Colonies.
3. **Citizen ↔ unit and levy-regrow** at more than one hammer per food (Expansionist alone). Fixed by pricing levies off the growth threshold.
4. **Suicide Warriors** (Songs of the Fallen, plus The Art of War and Muster Rites).
5. **Pass with The Archive** (Magisterial alone): a pass returns a card plus 75% of its cost.
6. **Seat churn** (The Swearing-In).
7. **Gold → culture → reroll** at half The Brokers' Redraw's price.
8. **Faith → faith building → faith** (The Waqf with The Lay Brothers).
9. **Treasury interest** (The Money Lenders), not a loop between currencies but a compounding stock.

### The culture economy

The draft meter is `12 + 5n + n^2.2` (`statecraft.meter`). Hand 1 costs 12, hand 5 costs 53, hand 9 costs 149, hand 11 costs 220, hand 15 costs 414, hand 21 costs 840. Filling 9 chairs from nothing costs 579 culture; filling 11 costs 981, about 70% more. Charters (drafted, never seated) and Magisterial's collection cards push the number of hands needed higher still.

Who starves, at the tiers where it matters:

| Deck | Regular culture at Tier 0 to I | Starves? | Matches the spec? |
|---|---|---|---|
| Magisterial | many (The Repertory, The Laureate, The Accessions Register, The Swearing-In, boons) | no | yes: the drafting deck |
| Scientific | four Tier 0 cards | no | yes: it needs extra hands for charters |
| Commerce | Travellers' Letters, The Map Sellers, The Factors' Houses, The Common Road, Civic Receipts, The Staple Right | no; second-best drafter | yes, though it crowds Magisterial's lead |
| Dominion | none at Tier 0; Songs of the Fallen, The War Hall Schools, The Pacified Marches at Tier I | mildly, in peace | yes: culture comes from victories |
| Devotion | none regular until Tier II; The Living Hymnal needs foreign converts | yes, early | **no**: its gap is production, and the spec names religious buildings as a culture route |
| Expansionist | The Old Songs (Tier I) only | yes | yes, deliberately; but it has no non-culture route to a hand |

Commission culture rewards are flat (100 to 300). At hand 5 that is two to six hands; at hand 15 it is a quarter to three quarters of one. Rewards written as a share of the next hand's cost would keep their meaning across the game.

The common pool has two faucets worth watching: "+1 faith for each card slotted in your government" gives every seat up to +11 faith a turn at eleven chairs, which makes rerolls cheap for every deck and weakens Devotion's and Magisterial's hold on the reroll; and "every tile with at least 1 gold gains 1 more" roughly doubles Commerce's tile engine for any seat that draws it.

## 4. Recommended changes

| # | Deck | Card | Change | Kind | Why | Confidence |
|---|---|---|---|---|---|---|
| 1 | All | Purchase discounts | Card and building discounts on one price add up as now, but the total is capped at −50% (a price never falls below half). State the cap in `data/rules.json` beside `goldPerHammer`. | rule | Stacked Commerce discounts reach −95% on buildings, −85% on soldiers and past −100% on ships; the tile price already refuses free land for the same reason. | high |
| 2 | All | Purchase riders | A purchase rider names its bank. Every rider whose card text says "gold" (Private Patronage, Bought Swords, Frontier Investment, The Customs Houses, The Tithe's discount, Letters of Marque) applies to gold purchases only. | rule | Today riders apply to both banks; once The Lay Brothers opens faith to every building, Commerce discounts would cut Devotion's faith prices against the card text. | high |
| 3 | All | Faith's exchange rate | Rule once on what 1 faith is worth in gold (the purchase table says 4, the score weights say 1), record it in `data/rules.json`, and price every faith counter from it: tiles (Consecrated Ground), great people (`offerPriceFaith`), science (The Copying Houses), buildings (The Lay Brothers). | rule | Faith is worth 1, 1.33, 1.5, 4 or 6 gold depending on the counter; the cards inherit the disagreement. | medium |
| 4 | All | Draft meter | Re-check `statecraft.meter` against the new 3 / 5 / 8 / 11 chairs (for example in the arena at turn 100). If chairs are routinely empty, flatten `costExponent` (2.2) so that eleven hands cost about what nine cost before (about 580). | rule | Eleven hands cost 981 culture against 579 for nine; the chair change was made without a meter change. | medium |
| 5 | All | On-draft boons | "On draft" fires only when the card is taken from a hand (including reward hands). A card added by The Archive, The Cabinet of Curiosities or any other grant does not fire its on-draft boon. | rule | Otherwise boon cards can be gained through passes and grants and fire repeatedly. | medium |
| 6 | Scientific | Charter technologies | Put the charter premium in data: a charter technology costs its column's price × 1.5 (one figure in `data/rules.json`). | rule | Science is the deck's currency and charters are its only sink; the sink has no price. | medium |
| 7 | All | Commission culture rewards | Write culture rewards as a share of the next Order hand's cost (for example "culture equal to your next Order hand's cost") instead of flat figures. | rule | Flat 100 to 300 is two to six hands early and under one hand late. | low |
| 8 | Commerce | Private Patronage | Exclude wonders in data as the text says (the rider's `empireBuilding: false` admits wonder rows, which carry no marker). | revise | With The Gilded Scaffold the −30% reaches wonders, against the card text. | high |
| 9 | Commerce | The Waqf | "Buildings you bought with gold that are faith buildings provide +2 faith and +1 culture." | revise | Gold given once turning into faith is the history line; from either bank it compounds faith on faith with The Lay Brothers. | medium |
| 10 | Commerce | The Money Lenders | "Earn interest equal to 2% of your treasury each turn, at most +30 gold a turn." (Reverses the user's removal of the ceiling; for the user to rule on.) | revise | The only open-ended compounding source in the game, and The Strongroom and War Bonds read the same number. | medium |
| 11 | Commerce | The Strongroom | Reward: "400 culture and a great merchant." | revise | A fifth of the treasury grows without limit once The Money Lenders compounds it. 400 is exactly what the card pays at its own goal. | medium |
| 12 | Commerce | Frontier Investment | Purchases in such towns cost 25% less, not 50%. | revise | The single largest discount on the shelf, and it applies to "all", which feeds Veteran Colonies with near-free units. Lower priority if row 1 lands. | low |
| 13 | Magisterial | The Salon des Refusés | "You may reroll a hand with culture from your draft pool instead of faith, at twice the faith price." | revise | Through The Subscription List a culture reroll costs 3 gold per faith point; at twice the price it costs 6, matching The Brokers' Redraw. Culture is also the scarcer currency. | medium |
| 14 | Magisterial | The Archive | Add: "A pass that keeps a card pays nothing to other cards that pay for passing." | revise | With The Patient Eye and The Unwritten Chapter, a pass returns a card plus 75% of its cost, so passing beats drafting. | medium |
| 15 | Magisterial | The Swearing-In | "Each time you seat or unseat a card, gain 5 culture, at most once per turn." | revise | Rotating two cards through one chair pays 15 culture a turn, a free Tier I hand every two to five turns. | medium |
| 16 | Magisterial | The Critics' Circle | Add "at most +10 of each." | revise | Free first rerolls (The Second Reading) do not raise the ladder, so the bonus grows by one every hand for the whole game; The Encyclopedia stops at +15. | medium |
| 17 | Magisterial | The Wandering Muse | Add: "This great person counts as called: your next one needs more renown, as usual." | revise | A free great person (priced at 1,000 gold at the counter) for one Tier I draft, against The Grand Lottery's 150 of one yield at Tier III. | medium |
| 18 | Magisterial | The Commissioned Works | Add: "A building bought this way counts as bought for cards that read purchases, but pays nothing to cards that read gold or faith paid." | revise | The Endowment, The Offered Stones, The Waqf and Civic Receipts each read which bank paid; culture is a third bank with no stated answer. | low |
| 19 | Magisterial | The Performers' Treasury | 40% of culture as gold, not 20%. | revise | The Working Court pays 20% as production; at the score table's 2 gold per hammer, 40% gold is the same value. | low |
| 20 | Expansionist | Veteran Colonies | "A military unit standing in one of your towns may retire there: the unit is removed and the town gains food equal to its production cost." | revise | As written any unit becomes a whole citizen, so a 15-hammer Warrior (or a free or discounted one) buys a citizen worth 80+ food; with The Muster of the Fields it is a closed cycle. Food at 1 per hammer matches The Loaves' rate. | high |
| 21 | Expansionist | Levy of the Land | "Cities may spend one citizen to gain production equal to the food it took to grow that citizen. A city may levy once every five turns." | revise | Ten turns of food pays two to three hammers per food of regrowth; with Granary Levies and Seasonal Levies the cycle prints production. One food per hammer matches The Loaves. | medium |
| 22 | Expansionist | The Muster of the Fields | Add: "and the town loses food equal to the unit's production cost beyond the food it took to grow that citizen, down to zero stored." | revise | The best melee unit mid-game is about twice the food a citizen costs; matches row 21's rate. | low |
| 23 | Expansionist | Six Gardens *(commission)* | Add to the reward: "and a free Order hand." | revise | Expansionist has no route to a hand that is not culture; a reward hand (Magisterial's mechanic) gives it one without breaking the "culture only from terrain" rule. The Wide Country and The Heartland could do the same. | medium |
| 24 | Devotion | (new) The Hymn Schools | Tier 0, common: "Shrines and Temples give +1 culture each." | new | The spec names religious buildings as Devotion's culture route; no card pays it, and the deck has no regular culture before Tier II. | medium |
| 25 | Devotion | The Lay Brothers | Name the price: "...may buy ordinary buildings with faith, at one faith per hammer of their cost." (or the rate row 3 sets) | revise | "Normal purchase price" is ambiguous; at the live faith rate it is a quarter of Commerce's gold price, which should be a stated decision. | medium |
| 26 | Devotion | Consecrated Ground | "You may buy tiles with faith, at half their gold price." | revise | At the same number as gold, a tile costs four times as much in faith as a building does, so the card is never used. Half is a first pass pending row 3. | low |
| 27 | Dominion | Songs of the Fallen | "Killing a unit grants science and culture equal to its strength. Losing a unit while it defends grants the same." | revise | Losses on the attack let a player turn 15-hammer Warriors into 20 science and 20 culture each turn; on defence the enemy decides. | medium |
| 28 | Dominion | The Pacified Marches | Add "at most +8 authority and +24 culture." | revise | Camps respawn, so the uncapped count is an open-ended culture and authority faucet. | medium |
| 29 | Dominion | Commission: Take the City | "culture and science equal to fifteen times its population" | revise | Thirty times is three times Triumphs on one capture, and above every other commission's culture reward. | low |
| 30 | Scientific | The Presses | "...at 6 gold for each point of science. At most half of a technology's cost may be bought this way." | revise | At 3 gold, science is cheaper than production (4 gold per hammer), against the spec's note that science is the strongest yield. 6 is The Brokers' Redraw's premium applied to the hammer rate. | medium |
| 31 | Common | "+1 faith for each card slotted in your government" | Cap at +5 faith, or move it to Devotion's shelf. | revise | At eleven chairs it is +11 faith a turn for every seat, which makes rerolls cheap everywhere. | low |

## Final notes for the apply pass

- Rows 1, 2 and 8 are about how the purchase code composes prices, not about one card's number; they change no data row by themselves except Private Patronage's.
- Row 3 is the root of rows 25 and 26; if the user rules faith = 4 gold (the live purchase table), row 26 becomes "a quarter of their gold price" and the great-person faith price (750) should drop to 250.
- Nothing here touches a settled ruling. Row 10 reverses a user hand edit and is labelled so.
