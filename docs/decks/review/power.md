# Deck review: power level

Lens: power level. Which cards are too strong or too weak for their tier and rarity, which cards or lines a player would always take, whether rarity tracks power, whether each deck can win and how fast, which pairs are much stronger or weaker than the rest, and whether leads snowball or can be recovered. Read only; nothing on the sheets or the spec was changed.

**Scale used for the judgments.** The turn-100 bot probe (two balanced seats, eight seeds): 6.3 towns, 44 citizens, per turn 74.5 production, 33.5 gold, 55 science, 61 culture, 18 faith, treasury 336. Rules: a hammer costs 4 gold or 1 faith to buy (`rules.production`), and the Opus takes gold at 4 and faith at 1 per hammer as contributions. The Opus costs about 2,500 hammers (wonder size 130 × 1.31^11 for Alchemy's column 12). A draft costs `12 + 5n + n^2.2` culture: about 50 at the fifth draft, 300 at the twelfth, 680 at the eighteenth, 1,700 at the twenty-ninth. A reroll costs 35 faith × 1.35 per reroll already taken. Ordinary improvements yield +1 or +2; great-person works yield +3. Stacking allows one military unit per hex, so "per garrisoned unit" means one per town. Purchase discounts from cards are **summed** and floored at zero (`applyRiders` in `src/sim/purchase.ts`).

## 1. Summary

1. **Commerce and Magisterial are the strongest decks at most tiers; Expansionist is the weakest, and Scientific is weak early and the strongest at the end.** Magisterial's strength comes from flat built cards (Civic Granaries, The Masters' Domain, The Honoured Dead), not from its combinations, which inverts the spec.
2. **Three rules let a line run away:** summed purchase discounts reach 95% or more inside Commerce alone; faith buys production four times cheaper than gold, so Devotion's purchase line beats Commerce's; and The Archive makes passing strictly better than drafting once any pass payer is seated.
3. **Several cards are far off their tier:** The Masters' Domain (+8/+8 on a +3 tile), Conquered Archives (+10/+10 per captured town at common), The Endowment (uncapped science per bought building, moved down to Tier II common), Veteran Colonies (a scout becomes a citizen), and The Last Offering (worse than the base rule it is meant to improve).
4. **Every deck has a route to the Opus, but Expansionist's and Dominion's are weak** (The Land's Great Work is about +10 production; Imperium needs eight captured towns), while Scientific and Magisterial can stack 65 to 90% toward it.
5. **Comeback is thin outside science.** The draft cost curve and three catch-up science cards help a trailing seat; nothing helps a seat that has lost towns, while one capture can pay a Dominion seat through five or six cards at once.

## 2. Per deck

### Dominion

**Works.**
- Tier 0 is strong and honest: Martial Law, The Standing Army, The King's Levy and Commission: Clear the Frontier give a war-ready seat a fast start, which is the deck's identity.
- The military-building line (Drill Manuals, The War Hall Schools, Armoury Guilds, Arsenals) pays science and culture at sizes in line with other decks' building cards.
- Total War is a true rare build-around: +8 strength is about a 1.4× damage swing each way, paid for with −3 happiness everywhere.
- Songs of the Fallen and Defensive Lines are the only cards in any deck that pay a seat for losing, which is good for comeback.

**Does not work.**
- **Capture payouts stack into a snowball.** One capture of a ten-citizen town with Triumphs, Carried-Off Scholars, Commission: Take the City, Hegemony and The New Code seated pays 400 culture, 400 science, +20% production everywhere for ten turns, and a free draft. Conquered Archives then adds +10 science and +10 culture **per turn** in that town, at common rarity. At turn 100 an empire makes 55 science; four captured towns with Conquered Archives add 40 science and 40 culture a turn. That is the largest flat per-town yield on any common in the six decks.
- **Songs of the Fallen pays on losses at full rate.** Losing a warrior (about 15 hammers, strength 20) pays 20 science and 20 culture, and The Art of War pays another 10 science when it is trained. Early in the game that is about two science and one culture per hammer, a better conversion than any card built for converting. Sending cheap units to die becomes the play.
- **Imperium is the hardest Opus card to fill:** +5% per captured town, so its +40% needs eight captured towns. Every other deck's Opus card fills at four of something.

**Changes.** Trim Conquered Archives; halve what Songs of the Fallen pays on a loss; let Imperium fill at four captured towns. (Rows 13–15.)

### Expansionist

**Works.**
- The built core is sound: Smallholdings, Granary Levies, The Patient Harvest, The Old Songs, The Highlands, The Coast and The Grain Dole are dependable and reach the deck's culture through wild land as the spec wants. The Old Songs is the deck's best culture card and makes improving a tile a real choice.
- The Seed Grain, Outposts and The Local Census give the wide line real tools.

**Does not work.**
- **Low value per chair, in the deck that drafts slowest.** The spec asks for Expansionist's early cards to be strong for each card it gets. The four tended-work unlocks (The Forest Gardens, The Fish Traps, The Wild Orchards, The Burning Season) each take a chair to give +1 food (or +1 food and +1 of something) per worker charge spent. Smallholdings pays more with no charges at the same tier. With three chairs at Tier 0, a tended unlock is the weakest pick on the table.
- **Veteran Colonies is a production-to-population loop.** A scout is a military unit costing about 15 hammers; retiring it adds a citizen worth 35 to 115 food of growth. Nothing limits how often a town takes one in. In the Dominion pair, and with Commerce's bought units, this becomes the fastest way to grow.
- **Levy of the Land is far off if "ten turns of their food" means gross food.** A six-citizen town making 18 food would get 180 production for a citizen that costs about 65 food to regrow, every five turns. If it means surplus (about 4), it pays 40 and is weak. Either way the number does not track the citizen's real cost.
- **Daughter Towns hands out the authority relief the spec says must be earned.** Every town founded costs no authority for 20 turns, which feeds the early settling the spec names as already among the strongest plays.
- **No real Opus route.** The Land's Great Work (deferred) pays half a town's food surplus, about +10 production, and cuts military production. Expansionist is wide, and the Opus is built in one town; without a gold or faith bank the deck cannot move its width into the Opus.

**Changes.** Make the four tended unlocks chairless (drafted like a charter); limit Veteran Colonies; price Levy of the Land on the regrowth cost; rewrite The Land's Great Work as a count-scaled Opus card; shorten Daughter Towns. (Rows 16–20.)

### Commerce

**Works.**
- The deck plays as described: gold everywhere, and gold turned into what it lacks. The trade line (Provisioning Contracts, The Common Road, The Home Market, The League of Cities, The Chartered Metropolis) is strong and has real conditions.
- Rarity mostly tracks power: Private Patronage, The League of Cities, The Money Lenders and Merchant Princes are build-around rares.
- The World's Exchange fills at four foreign empires, a fair Opus card.

**Does not work.**
- **Purchase discounts are summed, with no floor.** Frontier Investment (−50% on everything in towns of five or fewer), Private Patronage (−30% buildings) and The Customs Houses (−15%) together take 95% off a building in a small town with a customs house, before leader abilities. Bought Swords plus Frontier Investment plus The Customs Houses takes 85% off a soldier there. Everything here is inside one deck, so a single Commerce seat can assemble it.
- **Frontier Investment is the strongest uncommon in the deck.** Even alone it halves the price of settlers and workers in every new town, which is a wide-expansion engine, and it has no downside. Private Patronage, the rare, gives a smaller discount on buildings only and charges 20% production for it.
- **The Endowment was made stronger on the sheet than in the data.** The data has it at Tier III, uncommon; the sheet lists it at Tier II, common. It pays +2 science per bought building with no cap, in the deck whose plan is to buy every building. Six towns with four bought buildings each is +48 science, almost doubling a turn-100 empire's science, from a common.
- **The Presses (Scientific, read by Commerce) and The Subscription List (Magisterial)** make Commerce's gold the best currency in two pairs; see Across decks.
- **Financed Industry is a weak rare.** −3 food in every town for 20% of town gold as production: a town making 5 gold gets +1 production for 3 food. It only pays late, when Commerce's gold is high.
- **The Money Lenders (2% a turn, no cap) compounds.** A pure hoard reaches the Opus's 10,000 gold about a third sooner with it. This is within the spec's "reserves" theme and the cap was removed by the user's revision, so it is noted at low confidence.
- **Travellers' Letters is the strongest Tier 0 common in the game** on a crowded map: +1 science and +1 culture per empire met, with up to twelve seats allowed. On a four-seat map it is fine.

**Changes.** A floor on summed discounts (rule); narrow Frontier Investment; put The Endowment back where the data has it and cap it; soften Financed Industry's food cost. (Rows 1, 2, 4, 5, 6, 7.)

### Devotion

**Works.**
- The faith-instead-of-production arc is the right shape: miracles and narrow purchases at Tier I, every building at Tier II, a payoff at Tier III.
- The Old Gods Remain, The Rites Commonwealth and The Doctors of the Church are proper build-arounds for their rarity.
- The Copying Houses is one of the few comeback cards in the game: it only buys technologies another empire already knows.

**Does not work.**
- **Faith buys production four times cheaper than gold.** The Lay Brothers and The Monastic Builders open the faith bank at the same 1 faith per hammer that a leader's science-building law and Opus contributions use. In the turn-100 probe faith income is about half of gold income, so a Devotion seat buys about twice as many hammers per turn of income as a Commerce seat buying with gold. The spec expects the two production workarounds to differ in feel, not for one to be twice as efficient.
- **The Last Offering is worse than the base rule.** The Opus already accepts faith at 1 faith per hammer (`acceptsContributions`, `explainContribution`). The card's 3 faith per hammer would never be used. Devotion's real Opus route is the base contribution, and its Tier IV "win" card adds nothing.
- **The Offered Stones** (+2 culture per faith-bought building, no cap) is The Endowment's twin and has the same problem: culture is the draft currency, so in a seat that buys everything it doubles the draft rate.
- **Consecrated Ground is weak.** Buying tiles with faith at the gold price is four times dearer than faith buying buildings.

**Changes.** Price card-opened faith building purchases at 2 faith per hammer; rewrite The Last Offering to improve on the base contribution; cap The Offered Stones; make The Copying Houses cheaper as a catch-up card. (Rows 8–12.)

### Scientific

**Works.**
- The cost the user asked for is real early: Tier 0 has no production card worth the name and no rare, and the charters spend draft picks and research before they pay.
- The charter cards that pay are strong enough to justify the detour (The Spectacle Makers, Crucible Steel, The Engine Works, The Charter Rolls).
- The catch-up cards it shares (Copying the Enemy, Books from the Ships) help a trailing seat.

**Does not work.**
- **The end of the game may be too strong.** The Great Instrument hands a quarter of the Opus (about 630 hammers) to the first empire to reach Alchemy, which is also the moment the Opus opens. With The Great Catalogue (+40% at only four charter technologies) and The Long Inheritance (+30% in mature-Academy towns), Scientific has the largest Opus stack of any deck. Nothing needs to change yet, but this is where to look first if Scientific wins too often.
- **The Presses** buys a point of science for 3 gold, which is cheaper than buying a hammer (4 gold). With science the strongest yield (the user's note), gold should never buy science more cheaply than production. In the Commerce pair this is the most efficient conversion in the game and it is uncapped.
- **The mid-game shelf is thin for an un-chartered seat.** Tier II has 1 common, 6 uncommon and 6 rare, and most of its commons and uncommons are charters or charter-gated. A Scientific seat without charter technologies has four seatable Tier II cards of its own (Enduring Institutions, The Royal Charter Commission, The Quiet Faculties, Discoveries through Scholars), so its partner deck fills most hands. Every other deck has four to six Tier II commons.

**Changes.** Raise The Presses' price; shift two Tier II cards toward common. (Rows 21–22.)

### Magisterial

**Works.**
- The draft-action families are well built: each has an enabler and a payer, none names another card, and the reroll price's exponent (×1.35 per reroll ever taken) stops reroll loops on its own.
- Boons are priced about right for their tiers (Gifts at Court, The Wandering Muse, The Grand Lottery).
- The Antechamber and Commission: The Wonder of the Age deliver the "seats more cards" promise at rare and commission level, where they belong.

**Does not work.**
- **The deck is not weak while its combinations gather.** Three flat built cards carry it with no combination at all, which is the opposite of the spec's "a single Magisterial card is modest":
  - **Civic Granaries** (Tier 0 common): +2 food and +2 production in every town with a Monument. Early this is about +40% production for a three-town empire, the strongest production card at Tier 0 in any deck.
  - **The Masters' Domain** (Tier III uncommon): +8 food and +8 production on every worked great-person work. A work yields +3; every other deck's work card adds +2 to +3 (The Citadel Works +3 science, The Customs Houses +3 gold, The Engineers' Yards +2 production, The Old Academy +2/+2). This one is three to five times larger, at uncommon. If The Quarter of Masters doubles card yields on a work as well as the work's own, the pair reaches +16/+16 per tile.
  - **The Honoured Dead** (Tier III uncommon): +8 production and +4 science in the capital per great person spent, up to +120 and +60. Five spent people give +40 production, about half a turn-100 empire's whole production, in the town that builds the Opus.
- **The Archive breaks the pass family.** A pass spends the hand and banks pity (+10 uncommon, +5 rare weight per pass in a row, reset only by taking a card). With The Archive you keep one card anyway, so with The Patient Eye (25% culture back) or The Unwritten Chapter (science equal to half the hand's cost) seated, passing gives a card, a refund, science, and better odds on the next hand. Drafting normally is never better. Unless the kept card counts as a pick, pity also keeps building, so every hand becomes rare-heavy.
- **The Cabinet of Curiosities** is a tutor for the strongest card in any deck. It is fine as a rare once the outliers above and below are fixed, and dangerous until then.

**Changes.** Make a card kept by The Archive count as a pick; cut The Masters' Domain and The Honoured Dead to the size of other decks' equivalents; trim Civic Granaries. (Rows 23–26.)

## 3. Across decks

### Power at the same tier

A rough reading of each deck's own shelf at each tier: how strong the dependable cards are, and how strong the best card is. "Very high" means a card on that tier is an outlier.

| Tier | Dominion | Expansionist | Commerce | Devotion | Scientific | Magisterial |
|---|---|---|---|---|---|---|
| 0 | High (Martial Law, The Standing Army) | Medium; four tended unlocks are weak per chair | High (Travellers' Letters, Salt Tithes) | Medium | Low, by design | Very high (Civic Granaries) |
| I | High (Songs of the Fallen, The Quartermasters) | Medium; Daughter Towns, Outposts and Levy of the Land are strong or broken | Very high (Frontier Investment, The Common Road) | Medium-high (The Loaves, The Monastic Builders) | Medium (charters, The Assay) | Medium-high (The Wandering Muse, The Working Court) |
| II | Very high at war (Conquered Archives), medium at peace | Medium | Very high (The Endowment, The League of Cities) | High (The Lay Brothers) | Low without charters, high with them | High (The Antechamber, The Archive) |
| III | High (Total War) | Medium | High (The Money Lenders, The Chartered Metropolis) | Medium | High with charters (The Presses, The Charter Rolls) | Very high (The Masters' Domain, The Honoured Dead) |
| IV | Low (Imperium hard to fill) | Low (The Land's Great Work) | High | Low (The Last Offering is dead) | Very high (The Great Instrument, The Great Catalogue) | High |

The two decks the spec calls in good shape, Dominion and Commerce, are not the strongest everywhere; Magisterial is. Expansionist is the only deck without a "very high" or "high" cell after Tier 0.

### Rarity against power

- **Commons stronger than most rares:** Civic Granaries, Conquered Archives, Travellers' Letters, The Endowment (as the sheet now lists it).
- **Uncommons stronger than their deck's rares:** Frontier Investment (beats Private Patronage), The Masters' Domain and The Honoured Dead (beat The Wonder Commonwealth and The Living Canon).
- **Rares that are not build-arounds:** Financed Industry (a trap early), The Woodwrights (a one-off chop bonus at Tier III), The Last Offering (dead), Imperium (rarely filled), The Land's Great Work (small).
- **Shelf shape.** Scientific Tier II (1 / 6 / 6) and Commerce Tier III (0 / 3 / 6) are the most top-heavy. With weights 4 / 2 / 1, a tier with few commons hands most of its draws to the partner deck, which dilutes that deck's identity in that tier.

### What one currency buys in each deck

The game has no single exchange table, and the cards disagree with each other. A hammer is the reference.

| Conversion | Card or rule | Price | In hammers |
|---|---|---|---|
| Gold to production | Base purchase | 4 gold | 1 |
| Faith to production | Base faith purchase; The Monastic Builders; The Lay Brothers; Opus contributions | 1 faith | 1 |
| Culture to production | The Commissioned Works | 2 culture | 1 |
| Gold to science | The Presses | 3 gold per science | 0.75 per science |
| Faith to science | The Copying Houses | 2 faith per science | 2 per science |
| Gold to draft culture | The Subscription List | 3 gold per culture | 0.75 per culture |
| Faith to a great person | Sacred Patronage | 750 faith | 750 |
| Gold to a great person | Merchant Princes | 1,000 gold | 250 |
| Faith to a tile | Consecrated Ground | the gold price in faith | about 4 times a gold tile |
| Faith into the Opus | The Last Offering | 3 faith | 3 (base rule is 1) |

What this shows:
- Faith is cheap where it buys hammers and dear where it buys science, tiles or great people. Gold is the reverse. A Devotion seat should buy buildings and never research; a Commerce seat should buy research and great people before buildings.
- **Gold buys science more cheaply than production** (The Presses), which makes Commerce · Scientific the strongest pair on paper.
- The cleanest fix is a rule: science bought with a bank costs at least what a hammer costs in that bank, and card-opened faith purchases of buildings cost 2 faith per hammer. Rows 3, 9, 12 and 21 apply it card by card.

### Routes to victory

The Opus is built in one town and opens for everyone once any empire knows Alchemy. Each deck's accelerators:

| Deck | Cards | Realistic total | Bank route into the Opus |
|---|---|---|---|
| Dominion | Imperium (+5% per captured town, at most +40%), Commission: Hold the Capitals (+25% production everywhere for 20 turns) | 15–25% | None of its own |
| Expansionist | The Land's Great Work (half the food surplus, deferred) | About +10 production | None |
| Commerce | The World's Exchange (+10% per empire traded with, at most +40%), The Merchant Works, gold contributions | 30–40%, plus gold at 4 per hammer | Gold |
| Devotion | The Great Consecration (+5% per foreign follower town, at most +40%), base faith contributions | 20–40%, plus faith at 1 per hammer | Faith (four times gold's rate) |
| Scientific | The Great Instrument (a quarter of the cost), The Great Catalogue (at most +40% at four charters), The Long Inheritance (+30%) | About 70%, plus a 25% lump | None |
| Magisterial | The Magister's Court (+25%), The Universal Library (at most +40% at 20 Orders held), The Wonder Commonwealth (+25% production in wonder towns), The Last Commission | 65–90% | None |

- **Scientific and Magisterial win fastest; Expansionist and Dominion slowest.** The wide decks suffer most from a one-town build, because their width cannot reach the Opus without a bank.
- Expansionist and Devotion also have no wager family to earn beads from (spec, open question 1). That is the larger obstacle to winning and belongs to the wager rework; the card fixes here only make sure each deck has a fair Opus card once the door is open.

### Pairs

- **Strongest: Commerce · Scientific.** Gold buys science at 0.75 hammers a point (The Presses), every bought building pays +2 science (The Endowment), routes pay science on five cards, and Scientific's Opus stack sits on top. Commerce · Magisterial and Commerce · Devotion follow: Commerce's summed discounts reach every bank, and purchase-reward cards on both sides of Commerce · Devotion (The Endowment, The Offered Stones, The Waqf, Civic Receipts) make "buy everything" pay science and culture as well. The spec worries that Commerce · Devotion may fail for lack of production; on power, the larger risk is that it is too good.
- **Weakest: Expansionist · Devotion.** No shared improvement, few cards that read each other, and almost no science: Expansionist's mountain cards, The Priest-Astronomers, and The Copying Houses as catch-up. Neither deck has a working Opus card. Rows 10 and 16 help it most.
- **Stacking in a target pair.** Dominion · Devotion gets two copies of three effects: The Oriflamme and The Relic Bearers (+4 beside a religious unit, +4 beside an apostle), Convert It or Tax It and The Jizya (+3 gold and +2 faith in a captured town of another faith, doubled again by The Jizya), and The Military Orders and The Holy Army (a citadel beside a holy site). In the one pair they were written for, each pays twice. Row 28 and row 29 remove two of the three; the third (the citadel pair) pays different yields and is small.

### Snowball and comeback

- **Built-in rubber band.** The draft price rises with drafts taken, never with empire size, so a trailing seat drafts more cheaply. This is the game's main comeback and it works for every deck.
- **Leads that compound:** Dominion's capture stack (five or six cards paying on one capture, plus Conquered Archives every turn after); Commerce's summed discounts and The Money Lenders; uncapped per-purchase cards (The Endowment, The Offered Stones, Civic Receipts); Magisterial's culture-to-drafts-to-culture loop, which is the deck's intent.
- **Ways back:** catch-up science (The Copying Houses, Books from the Ships, Copying the Enemy) and losses that pay (Songs of the Fallen). Nothing helps a seat that has lost towns. Row 30 proposes one common-pool card for that.
- **Commissions reward the leader.** Commission: A Victor's Peace, Commission: Hold the Capitals and The Great Commission pay most to the seat already winning. At Tier III and IV that is acceptable as a finisher; earlier commissions should keep goals a trailing seat can reach, and they do.

## 4. Recommended changes

| # | Deck | Card | Change | Kind | Why | Confidence |
|---|---|---|---|---|---|---|
| 1 | All (Commerce first) | Purchase discounts | The percentages from card riders and buildings on one purchase still sum, but the price never falls below half the undiscounted price, in any bank (gold, faith, culture). | rule | `applyRiders` sums riders and floors at zero. Frontier Investment, Private Patronage and The Customs Houses take 95% off a building inside one deck, before leader abilities. | high |
| 2 | Commerce | Frontier Investment | Revise to: "In your towns of five citizens or fewer, domestic trade routes pay double and buildings cost 25% less gold." | revise | Halving the price of settlers, workers and every building in every new town has no downside and outclasses the deck's rare discount. | high |
| 3 | All | Bank conversion prices | Adopt the floor that science bought with a bank costs at least what a hammer costs in that bank (4 gold, 1 faith), and that card-opened faith purchases of buildings cost 2 faith per hammer. | rule | The cards disagree: faith is cheap for hammers and dear for everything else, gold the reverse. Rows 9, 12 and 21 apply this. | medium |
| 4 | Commerce | The Endowment | Revise to "+1 science per purchased building, at most +3 per town", and put it back at Tier III, uncommon, where the data has it. | revise | Uncapped science per bought building in the deck that buys everything; the sheet moved it down a tier and down a rarity. | high |
| 5 | Commerce | Financed Industry | Revise the cost from −3 food to −1 food in every town. | revise | At −3 food the rare is a trap until late game; a town making 5 gold trades 3 food for 1 production. | low |
| 6 | Commerce | The Money Lenders | Add "at most +40 gold a turn". Argues against the sheet's revision that removed the cap. | revise | 2% a turn compounding lets a pure hoard reach the Opus's gold cost about a third sooner. | low |
| 7 | Commerce | Travellers' Letters | Rarity common → uncommon. No-cap ruling kept. | rerarity | On a crowded map it is the strongest Tier 0 common in the game (+1 science and +1 culture per empire met, up to twelve seats). | low |
| 8 | Devotion | The Last Offering | Revise to: "In your holy city, faith you pour into the Magnum Opus buys 50% more production." | revise | The Opus already takes faith at 1 per hammer; the card's 3 faith per hammer is worse than the base rule and would never be used. | high |
| 9 | Devotion | The Lay Brothers | Revise to: "Cities with a Temple may buy ordinary buildings with faith, at 2 faith per hammer." Same rate for The Monastic Builders' science buildings. | revise | At 1 faith per hammer, Devotion buys about twice as much production per turn of income as Commerce does with gold. | medium |
| 10 | Devotion | The Copying Houses | Revise from 2 faith to 1 faith per point of science. | revise | It only buys technologies others already know, so it is a catch-up card; at 2 faith it costs twice a hammer per point, the dearest science in the game, in the pair that needs science most. | medium |
| 11 | Devotion | The Offered Stones | Revise to "+1 culture each, at most +3 per town". | revise | The Endowment's twin in culture, which is the draft currency; uncapped it doubles a buying seat's drafts. | medium |
| 12 | Devotion | Consecrated Ground | Revise to "...with faith instead of gold, at half the gold price." | revise | At the gold price, a tile costs four times as many hammers in faith as a building does. | low |
| 13 | Dominion | Conquered Archives | Revise to "+4 science and +4 culture in every captured city." | revise | +10/+10 a turn per captured town is the largest flat per-town yield on any common, and it compounds every capture. | high |
| 14 | Dominion | Songs of the Fallen | Revise to: "Killing a unit grants science and culture equal to its strength; losing one grants half as much." | revise | At full rate, sending a 15-hammer warrior to die pays 20 science and 20 culture, the best conversion in the game. | medium |
| 15 | Dominion | Imperium | Revise to "+10% per captured city you hold, at most +40%." | revise | Every other Opus card fills at four of something; this one needs eight captured towns. | medium |
| 16 | Expansionist | The Land's Great Work | Revise to: "The city building the Magnum Opus gains +5% production toward it for each of your towns of at least eight citizens, at most +40%." Drop the military penalty. Fits existing effects; removes the deferred blocker. | revise | The deck's only Opus card pays about +10 production; a wide deck needs a way to move its width into a one-town build. | medium |
| 17 | Expansionist | The Forest Gardens, The Fish Traps, The Wild Orchards, The Burning Season | Make each a chairless unlock: append "Once drafted, ... No chair required." in the way The Fast and the charters read. Tiles already tended keep their work. | revise | Each takes one of three Tier 0–I chairs for +1 food per worker charge, less than Smallholdings at the same tier, in the deck that sees the fewest cards. | medium |
| 18 | Expansionist | Veteran Colonies | Revise to: "A military unit other than a scout, standing in one of your towns, may retire there: the unit is removed and the town gains one citizen. A town may take in one veteran every ten turns." | revise | A 15-hammer scout becomes a citizen worth 35 to 115 food, with no limit. | high |
| 19 | Expansionist | Levy of the Land | Revise the payment to "production equal to the food the city would need to regrow that citizen". | revise | "Ten turns of their food" is far too much as gross food and too little as surplus; the regrowth cost prices the citizen at what it is worth. | medium |
| 20 | Expansionist | Daughter Towns | Revise "first 20 turns" to "first 10 turns". | revise | Twenty free turns per new town feeds the early settling the spec says must not get unearned relief. | low |
| 21 | Scientific | The Presses | Revise from 3 gold to 5 gold for each point of science. | revise | At 3 gold, science is cheaper to buy than production, and uncapped; it makes Commerce · Scientific the strongest pair. | medium |
| 22 | Scientific | Enduring Institutions; Discoveries through Scholars | Enduring Institutions uncommon → common; Discoveries through Scholars rare → uncommon. | rerarity | Tier II has one common and it is charter-gated; an un-chartered seat's own Tier II draws are thin, so the partner fills its hands. | low |
| 23 | Magisterial | The Archive | Revise to: "When you pass on an Order hand, you may keep one card from it in your collection, unseated. If you do, the pass counts as a pick: it pays no pass rewards and does not build pity." | revise | With any pass payer seated, passing gives a card, a refund, science and better odds, so drafting normally is never better. | high |
| 24 | Magisterial | The Masters' Domain | Revise to "+3 food and +3 production on worked great-person works; their cities gain +20% gold, once per city." State that The Quarter of Masters doubles a work's own yield only, never card yields. | revise | +8/+8 on a +3 tile is three to five times every other deck's work card, at uncommon. | high |
| 25 | Magisterial | The Honoured Dead | Revise to "+2 science and +4 production per great person spent, at most +30 and +60." | revise | Five spent people give +40 production in the Opus town, about half a turn-100 empire's production, from one uncommon. | medium |
| 26 | Magisterial | Civic Granaries | Revise to "Monuments give +1 food and +1 production." | revise | The strongest production card at Tier 0 in any deck, in the deck meant to be weak until its combinations form. | medium |
| 27 | Magisterial | The Cabinet of Curiosities | Keep; apply after rows 1–26. If outliers remain, exclude rare cards from its pick. | rule | A tutor is as strong as the strongest card it can fetch. | low |
| 28 | Devotion | The Relic Bearers | Cut. | cut | Dominion's The Oriflamme (+4 beside any religious unit) already covers apostles; in the Dominion · Devotion pair the two stack to +8. | medium |
| 29 | Dominion | Convert It or Tax It | Revise to its authority half only: "Captured cities that follow your religion cost one less authority, minimum one." | revise | Its tax half is The Jizya's, and in the Dominion · Devotion pair the two pay a captured town of another faith +9 gold and +6 faith. | medium |
| 30 | Common | The Last Stand | New, Tier I, common: "When one of your cities is captured, your other cities gain +25% production and +2 happiness for 15 turns." | new | Nothing in any deck helps a seat that has lost towns, while one capture pays the taker through five or six cards. | low |
