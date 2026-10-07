# Deck review: systems (how the cards interact)

Lens: the systems-weaver method (loops, sources and sinks, relationships between cards). For each of the fifteen pairs in `deck-design.md`, does a card on one sheet create the hook and a card on the partner's sheet read it? Where do payouts feed their own triggers? Where does a payer have no enabler left? Do each deck's arcs run from opener to payoff?

Numbers used below come from the data: a draft costs `12 + 5n + n^2.2` culture (`data/statecraft.json`; about 53 at the fifth hand, 220 at the eleventh, 840 at the twenty-first), and every hand, passed or taken, moves `n` up. A reroll starts at 35 faith (`data/religion.json`). A prophet costs 120 faith, plus 60 for each one after. Growth costs `10 + 6p + p^1.65` food (115 at size 10, 270 at size 20). A light unit is 10 hammers × 1.31 per column. Gold buys a hammer at 4, faith at 1 (`data/rules.json`). Only one military unit may stand on a hex, so "per garrisoned unit" cards pay about once per city.

## 1. Summary

- Thirteen of the fifteen pairs connect on the sheets. Dominion · Devotion connects too much: three of its ideas are carded twice, once on each sheet. Expansionist · Devotion and Scientific · Magisterial each have a side that reads nothing from the partner.
- One degenerate interaction is live today. Four built Commerce cards add their purchase discounts together, and the price is floored at zero, so a small town buys buildings at 5% of price, or free once The Tithe is in play.
- Three proposed loops need brakes before they are built. The Archive makes passing better than drafting. Veteran Colonies turns cheap units into citizens in any town. Seasonal Levies restarts on every levy, so a town that levies every five turns keeps its +40% food for good.
- The arcs hold together, but four of them depend on one missing mechanic each: tended works, spending a citizen, reward hands, and an occasion that fires for every way a great person is spent. Expansionist's tended-work unlocks also take chairs, which a three-chair government cannot afford.
- Across decks, Opus cards stack. A Scientific · Magisterial seat can reach about +135% production toward the Opus, while any Expansionist pair has one deferred card. That decides the race by which pair a seat holds.

## 2. Per deck

### Dominion

**Works.** All three arcs run cleanly from Tier 0 to a payoff. The garrison state goes from Martial Law and The Standing Army to Standing Garrisons and Reserve Officers. The building line follows the tech tree: Barracks (Drill Manuals), then War Halls, then Armouries, then citadels. Raid and conquer climbs from camps to captures to holding capitals. Most payouts have a brake on the card itself: Total War costs happiness, the War Reparations pieces need a peace, and Imperium is capped. Garrison cards cannot run away, because stacking allows one military unit per hex.

**Does not work.**
- **Spoils of War with Riders of the Steppe.** Spoils pays 10 production to every city for each pillage. Riders pillage without spending movement, so one horseman raiding a ten-city empire's land can earn about 100 production per pillage, several times a turn. The targets run out, but one raid can be worth thousands of hammers.
- **Twins with Devotion.** The Oriflamme repeats The Relic Bearers, Convert It or Tax It repeats The Jizya, and The Military Orders repeats The Holy Army. Each pair reads the same hook and pays the same kind of yield, so a seat holding both decks is paid twice for one placement or one capture. Section 3 has the detail.
- **Looted Art is gone from both sheets.** Dominion cut it pointing at Magisterial's The Looted Gallery, and Magisterial cut that card pointing back at Dominion's. This is the same miss the reconciliation caught for The Chartered Company and Carried-Off Scholars. The spec lists looted art among the strongest history lines.

**Changes.** Narrow Spoils of War to the nearest city. Merge the three twins into shared cards. Restore Looted Art as a shared card with a payout Triumphs does not already give.

### Expansionist

**Works.** The managed wild is the deck's best-built system: unlocks, then build-up, then a payoff for having tended early (The Long Tending, The Garden of the World). Because tended land counts as wild, the wild-land cards (The Commons, The Old Songs, Sacred Groves) read tended tiles without any extra rule. The tall line ends in The Heartland, and the mountain-science line stays on terrain.

**Does not work.**
- **Tended-work unlocks take chairs.** The Forest Gardens, The Fish Traps, The Wild Orchards and The Burning Season are written as seated abilities. At three chairs, a seat that opens the arc fills its whole government with unlocks worth +1 food a tile, and has no room left for the cards that pay for tending. The Fast and every charter already unlock things "once drafted, no chair required", and these four should work the same way.
- **The levy loop has no working brake.** Levy of the Land turns a citizen into "ten turns of their food" as production. Seasonal Levies then gives +40% food for ten turns and restarts on each levy, and Granary Levies pays 15 production when the town regrows. Because the levy limit is one per five turns, a town that levies on that cycle keeps the +40% forever, and the food feeds the next levy. Seasonal Levies says regrowth "triggers no historical-growth reward", but that needs a record of a city's highest population, and Devotion cut Hearth Blessings because that record does not exist. "Their food" also needs to say surplus. If it means gross food, a size-10 town turns one citizen into about 300 production.
- **Veteran Colonies converts production into population with no limit.** A unit retires into any town as a citizen. A light unit costs about 10 to 100 hammers depending on the age, and a citizen at size 15 to 20 costs 190 to 270 food. Big towns can step past their growth wall, and with Commerce the unit is bought cheaply (see section 3). With The Muster of the Fields, citizen becomes unit becomes citizen again, and each step pays its riders.
- **Daughter Towns is flat authority relief.** "Costs no authority for its first 20 turns" applies to every new town, including towns founded by towns that are themselves on the 20-turn grace. That runs against the spec's ruling that authority relief should be earned, and it feeds the early settling the spec calls already among the strongest things in the game.
- **The engineer family has no renown source.** Dominion has The General Staff and The Citadel Works feeding generals, and Commerce has The Customs Houses feeding merchants. Expansionist pays on manufactories (The Engineers' Yards) and spends engineers (Public Works), but nothing on the sheet makes an engineer more likely to arrive before A Court of Engineers at Tier III.
- **Two hooks with no reader.** The Breadbasket creates surplus food in a town that has stopped growing, but no Commerce card carries surplus food anywhere. And Expansionist reads nothing from Dominion's captured towns.

**Changes.** Make the four unlocks chairless. Put a brake on Seasonal Levies and Veteran Colonies, and define "food" in the levy as surplus. Add a rule on what counts as growing. Move Daughter Towns' relief onto something earned. Add one early engineer-renown card.

### Commerce

**Works.** All three arcs run from Tier 0 or I to a Tier III or IV payoff. The deck's conversions (Financed Industry, The Tithe, War Foundries on the Dominion side) read each town's yields as they stood before any conversion, so the gold-to-production and production-to-gold cards cannot feed each other. The reserves strand (The Money Lenders, The Strongroom, the shared War Bonds) and the buying strand pull against each other: one wants the gold kept and the other wants it spent, and that tension is good.

**Does not work.**
- **Purchase discounts add up to free.** Frontier Investment (−50% in towns of five or fewer), Private Patronage (−30% on ordinary buildings), The Customs Houses (−15% in a town holding one) and The Tithe (−30% on faith buildings in Temple cities) are all built. The purchase fold adds card percentages together and floors the price at zero (`src/sim/purchase.ts`, the rider sum near line 676). A small town with a customs house buys an ordinary building at 5% of its price. With The Tithe, a faith building is free. Every building and every unit bought in small towns gets cheaper through this one interaction, and it reaches Expansionist (Veteran Colonies) and Devotion (The Tithe).
- **The Money Lenders compounds without a cap.** 2% a turn doubles an idle treasury in about 35 turns, and The Strongroom then pays a fifth of whatever the treasury holds as culture, also uncapped. A capped interest card is still a reserves card. Uncapped, it decides the late game for any seat that simply stops spending.
- **The Waqf reads every bank.** It pays on any purchased faith building, so in Commerce · Devotion a faith-bought temple collects The Endowment (+2 science), The Offered Stones (+2 culture) and The Waqf (+2 faith, +1 culture). The endowment idea is gold paid once becoming faith, so the card should read gold purchases only.

**Changes.** Add a ceiling on summed purchase discounts. Cap The Money Lenders. Narrow The Waqf to gold.

### Devotion

**Works.** The faith-instead-of-production arc is now coherent: miracles and tile, worker and science-building purchases at Tier I, every building at Tier II, culture for buying at Tier III, and faith into the Opus at Tier IV. The spread arc runs from The Living Hymnal to The Great Commission. Catch-up loops act as brakes, which is healthy: The Copying Houses only buys technologies another empire already knows.

**Does not work.**
- **The arc's foundation is one missing mechanic.** The Healing, The Consolation and The Loaves all need the same city miracle order. Consecrated Ground, Consecrated Labor and The Lay Brothers each need the faith bank opened to something new. Until those exist, Tier I of the core arc deals nothing, and the deck's Tier 0 cards (First Rites, Pastoral Shrines, Lay Offerings) make faith with nowhere to spend it except prophets and rerolls.
- **The faith price of a hammer is a quarter of gold's.** The Lay Brothers opens every ordinary building at "the normal purchase price", and faith buys a hammer at 1 against gold's 4. The docblock on `faithPerHammer` in `src/sim/rulesData.ts` argues for half of gold's rate, not a quarter. It was written when gold was 2 a hammer. Consecrated Ground, meanwhile, buys tiles "at the same price" in faith as in gold, so the two faith cards use different exchange rates.
- **The Fast meets The Loaves.** A fasting town "does not grow", but The Loaves adds a citizen for faith. Whether a bought citizen breaks the fast should be said once.
- **Twins with Dominion:** see Dominion.
- **It reads no tended land.** The Expansionist pair's hook ("tended land pays faith in Devotion's cards") rests on the shared Sacred Groves, which does read forest gardens and wild orchards on forest, because tended land is still wild. No Devotion card reads tended land or the burning season.

**Changes.** Merge the twins. Settle one faith-to-hammer rate for every faith purchase. Add a card that reads the burning season.

### Scientific

**Works.** The maturity arc is the cleanest on any sheet. Every card reads a building's age stamp, and The Spectacle Makers speeds the whole arc from behind a charter. Captured buildings keep their age stamp, so a Library Dominion takes from a rival pays The Long Study at once. That makes a live Dominion · Scientific hook neither sheet names.

**Does not work.**
- **Charters make being first automatic.** Only a seat holding a charter can research its technology, so a Scientific seat is always first to it. The Prize Essay pays on every charter, and The Prize Question is met by researching any two. The being-first arc should either exclude charter technologies or claim them on purpose.
- **The two steps of a charter connect only by chance.** A charter's gated cards (eleven of the 33 seatable cards) join a pool of about 80 drawable cards, so a seat may research Optics and never see The Spectacle Makers. One guaranteed draw would tie the steps together.
- **The Religious University makes faith into academies.** Holy sites count as Academies "for every card", and holy sites are bought with faith through prophets (120, 180, 240 …), while an Academy needs a scholar who must be called. Every academy card (The Old Academy, The Quiet Faculties, The Long Inheritance, The House of Wisdom, and Merchant Scholars once it is narrowed) then reads Devotion's cheapest repeatable work. Two holy sites side by side also meet The Monastic University's "Holy Site beside an academy".
- **It reads nothing from Magisterial.** The sheet says so itself: Magisterial reads charters (The Accessions Register), but no Scientific card reads a Magisterial draft action. "More drafts show more charters" is a side effect, not a hook.
- **The Commerce hook is one charter.** The Printers' Charter is the only card that gives Commerce a trade unlock early. That is enough to connect the pair, but only just.

**Changes.** Keep charter technologies out of being first. Seed the next hand after a charter technology from its cards. Narrow The Religious University. Let drafted charters count as collection cards, which gives the Magisterial pair a two-way hook.

### Magisterial

**Works.** The draft-action families are paired as the spec asks, and each enabler arrives at the same tier as its payer: The Second Reading with The Critics' Circle (Tier 0), The Patient Eye with The Unwritten Chapter (0–I), The Open Door with The Accessions Register (I), and The Rotating Chairs with The Swearing-In (I). I checked the loops against the draft ladder:
- The Accessions Register's 20 culture is 38% of the fifth hand's cost and about 2% of the twenty-first, so draft refunds cannot sustain themselves.
- The free reroll is stamped on the offer and survives the redraw (`OrderOffer.rerolled`), so The Second Reading cannot chain free rerolls.
- Culture rerolls (The Salon des Refusés) pay The Critics' Circle at most +1 a hand, on an escalating price.
- The Subscription List (3 gold to 1 culture) feeding The Commissioned Works (1 culture to 2 gold of building) loses a third, so it is not a loop.

**Does not work.**
- **The Archive makes passing better than drafting.** A pass with The Archive keeps a card, just as a draft does. On top of that, the pass refunds 25% (The Patient Eye), pays science worth half the hand's cost (The Unwritten Chapter), and raises `orderSkips`, which in turn raises rarity on the next hand. The count resets only on a pick. With The Archive seated, nothing is lost by passing every hand, the rarity pity grows without end, and with Officials by Merit the kept card is chosen from five.
- **The Swearing-In pays for busywork.** It pays 15 culture once a turn for any seat or unseat, and The Rotating Chairs halves seals, so the best play is to swap one wildcard chair between cards every turn. The user asked for the game to be fluid and not tedious, and this card pays for a click each turn.
- **The Quarter of Masters doubles other decks' cards.** "Pay double their own yields" on a work hex would double every card line on that hex: The Masters' Domain's +8/+8, The Citadel Works, The Old Academy, The Saints' Fields, The Engineers' Yards. That makes it a multiplier on five decks' work cards. Doubling should stop at the work's own base yield.
- **The Opus stack is the deepest in the game.** The Magister's Court (+25%), The Universal Library (+40%) and The Last Commission (production per great person spent) add to the partner's Opus card. See section 3.
- **Cards that enter the collection by other routes are undefined.** It is not stated whether a card added by The Archive, The Cabinet of Curiosities or a reward hand pays its on-draft boon, fires a charter's unlock, or counts for The Accessions Register. One rule should answer all three.

**Changes.** Make an Archive keep count as a draft. Have The Swearing-In pay the first time each card is seated. Limit The Quarter of Masters' doubling to base yield. Add one rule on how cards enter the collection.

## 3. Across decks

### The fifteen pairs: do the hooks connect?

"Creates" means a card on the first deck's sheet (or a shared card) that makes the hook; "reads" means a card on the partner's sheet that uses it.

| Pair | First deck's hook → partner's reader | Partner's hook → first deck's reader | Verdict |
|---|---|---|---|
| Dominion · Expansionist | Cleared camps → The Barbarian Frontier (shared), The Wide Country. Captured towns → nothing | Levies (The Muster of the Fields, deferred) → no Dominion card says a levied unit counts as trained. New towns → Marcher Lords, Military Colonies | Connected on camps and founding. The levy hook has no reader until a levied unit counts as trained |
| Dominion · Commerce | Gold from reparations and naval kills → The Money Lenders, The Strongroom. Guarded routes → The Escorted Roads | Gold reserve → War Bonds. Purchases → Bought Swords, Mercenary Contracts, The Chartered Company | Connected both ways |
| Dominion · Devotion | Captures → The Jizya, The Crusader Orders. Battles → The Sacred Host | Following cities → Convert It or Tax It, The Spiritual Host. Religious units → The Oriflamme. Holy sites → The Military Orders | Connected, but three ideas are carded twice (Oriflamme / Relic Bearers, Convert It or Tax It / Jizya, Military Orders / Holy Army) |
| Dominion · Scientific | Kills → Copying the Enemy, Field Academies. Captures → Carried-Off Scholars. Captured old Libraries → every maturity card, since age stamps survive capture (live, unstated) | Units ahead of their age (Alloys, Mechanics, Chemistry) → Siege Works, Master Bowyers, The Siege Train, The Art of War through unit classes | Connected both ways |
| Dominion · Magisterial | Generals and citadels → The Laureate, The Masters' Domain, The Patron's Gallery. Captures → The New Code | Works and boons → Gifts at Court, The Wandering Muse. Monuments → Examinations of State | Connected, but the spec's looted-art card was cut on both sheets |
| Expansionist · Commerce | Opened resources → Salt Tithes, The Staple Right, Royal Assays. Surplus food (The Breadbasket) → nothing | Gold and cheap tiles → Land Speculation, Frontier Investment, The Wide Country. Food routes → Provisioning Contracts, The Grain Exchange | Connected, except that surplus food has no reader |
| Expansionist · Devotion | Wild and tended forest → Sacred Groves (shared). Population → The Loaves. Burning seasons → nothing | Faith-bought workers → Consecrated Labor feeding tending. Happiness → The Consolation, The Rites Commonwealth | The weakest pair on the sheets. Devotion's own sheet reads no tended land |
| Expansionist · Scientific | Population and worked land → The Scribes' Hall, The Field Survey. Seams → The Prospectors' Notes | Early Aqueduct and the Qanat → The Waterworks, Public Works, The Watercourses | Connected, though nearly all of it is new or deferred |
| Expansionist · Magisterial | Tended tiles → Commission: The Paradise Garden. Manufactories → every any-family card | Works that claim land → The Landmark Bounds. Works → The Landscape Garden, The Sculpted Landscape | Connected both ways |
| Commerce · Devotion | Routes → The Alms Roads. The record of which bank paid → The Offered Stones | Holy sites → Pilgrim Markets (shared). Follower cities → The Silk Road Monks. Faith → The Tithe (shared) | Connected. Three cards stack on one faith-bought building (The Endowment, The Offered Stones, The Waqf) |
| Commerce · Scientific | Gold → The Presses. Foreign routes → Books from the Ships, The Merchant Navigators | Early trade (The Printers' Charter, +1 route) → Venture Routes, The Scholars' Roads | Connected, but Scientific's side is one charter. Merchant Scholars reads every family's works rather than Scientific's Academies |
| Commerce · Magisterial | Gold → The Subscription List. Gold rerolls (The Brokers' Redraw) → The Critics' Circle. Gold great-person drafts → Merchant Princes | Culture to gold → The Performers' Treasury. Deck count → Travelling Players | Connected strongly. The Cabinet of Curiosities can seat cards of a third deck, which raises Travelling Players. That is a good emergent link |
| Devotion · Scientific | Faith → The Monastic Builders, The Copying Houses, The Cloister. Holy sites → The Religious University, The Monastic University | Early Cathedral and Apostle (The Schoolmen's Charter) → The Cathedral Works, The Rising Nave, Mission Houses, The Second Prophet | Connected both ways. The Religious University is the risk point |
| Devotion · Magisterial | Faith → rerolls (The Critics' Circle). Holy sites → every any-family card (a holy site is a work by the game's own marker, `ImprovementDef.greatPerson: 'prophet'`) | Wonders → Sacred Commissions, The Rising Nave. Faith from culture → The Temple of the Muses | Connected. Sacred Patronage and The Last Commission wait on the same missing occasion |
| Scientific · Magisterial | Charters drafted → The Accessions Register | Rerolls, larger hands → nothing on Scientific's sheet reads them | One way only. Letting drafted charters count as collection cards gives The Encyclopedia and The Universal Library something to read, and makes the pair two-way |

### Loops, ranked by risk

1. **Purchase discounts sum to free** (Commerce, live). Positive and uncapped. It is a sum, not a loop, but it feeds every purchasing loop in three decks. Fix: a ceiling on summed card discounts.
2. **Pass with The Archive** (Magisterial, proposed). A positive loop: each pass raises rarity, keeps a card and refunds culture, so passing again is better still. Fix: an Archive keep counts as a draft.
3. **Levy, then regrow** (Expansionist, proposed). A positive loop: Seasonal Levies' food feeds the next levy. Its brake (no growth reward on regrowth) depends on a record the game does not have. Fix: a once-per-twenty-turns limit, and a growth rule.
4. **Units retired into citizens** (Expansionist, with Commerce's discounts and Dominion's free units). An open converter. Bought units in small towns at −85% (Frontier Investment −50, Bought Swords −20, The Customs Houses −15) retire as citizens at one a turn per town. Fix: a waiting period and a once-per-ten-turns limit per town.
5. **Interest on the treasury** (Commerce, live). Exponential while idle. Fix: a cap.
6. **Spoils of War with free pillaging** (Dominion, proposed). Bounded by targets, but very large. Fix: pay the nearest city only.
7. **Holy sites as works** (Devotion with Magisterial and Scientific). Bounded by the prophet price, which rises 60 a time. Each holy site is a work for The Masters' Domain (+8 food, +8 production), for The Landmark Bounds (claims land) and, with The Religious University, an Academy. This is intended by the spec ("holy sites for its any-family cards"), but it makes faith the cheapest way to feed every work card in the game. Leave it, and watch it. Do not let The Quarter of Masters double it.
8. **The Rising Nave** (shared). It pays per turn on progress, so a slower build is paid more in total. That is the history line on purpose. Watch it in the lowest-production Devotion town.

The healthy loops are the negative ones: The Copying Houses and Books from the Ships pay more to whoever is behind, Total War and The Chartered Metropolis carry their own costs, and the draft ladder escalates on every hand.

### Opus cards stack by pair

| Deck | Cards toward the Magnum Opus |
|---|---|
| Dominion | Imperium (+40%) |
| Expansionist | The Land's Great Work (deferred; food-based) |
| Commerce | The World's Exchange (+40%), The Merchant Works (gold to production) |
| Devotion | The Great Consecration (+40%), The Last Offering (faith at 3:1) |
| Scientific | The Great Catalogue (+40%), The Long Inheritance (+30%), The Great Instrument (a quarter of the cost) |
| Magisterial | The Universal Library (+40%), The Magister's Court (+25%), The Last Commission (150 per great person spent) |

At eleven chairs a seat can hold both decks' Opus cards. Scientific · Magisterial reaches about +135% plus two lump payments. Any Expansionist pair gets its partner's card and nothing that works today. Since "each deck must be able to win", a shared ceiling on card bonuses toward the Opus keeps the pair from deciding the race.

### Rules that several cards need

- **What counts as growing.** Granary Levies, the levy cards, The Loaves, Migration, Veteran Colonies and The Seed Grain all either add citizens or pay when a town grows. Only one of them (The Loaves) says that its citizen is not growth.
- **What counts as drafted.** This covers The Archive, The Cabinet of Curiosities, reward hands (The Unveiling, The Grand Lottery, The New Code, Commission: The Salon Season) and charters. The Accessions Register and every on-draft boon need one answer.
- **Which bank a culture purchase records.** The Commissioned Works buys with culture. The Endowment, The Offered Stones and The Waqf read the bank that paid.
- **One missing occasion blocks three decks.** "A great person spent by any route" is needed by Sacred Patronage (Devotion · Magisterial), The Last Commission (Magisterial) and Discoveries through Scholars (Scientific). Building it once lights three payers.

## 4. Recommended changes

| # | Deck | Card | Change | Kind | Why | Confidence |
|---|---|---|---|---|---|---|
| 1 | Commerce (all) | Frontier Investment, Private Patronage, The Customs Houses, The Tithe | Card discounts on one purchase add up to at most −50%. A card that raises prices (The Brokers' Redraw, Foreign Procurement) still counts against the total. | rule | The purchase fold sums card percentages and floors at zero. Today a small town with a customs house buys at 5%, and a faith building with The Tithe as well is free. All four cards are built. | high |
| 2 | Magisterial | The Archive | "When you pass on an Order hand, you may keep one card from it, unseated. If you keep one, the hand counts as drafted, not passed: it refunds nothing, pays no card that pays for passing, and resets your pass count." | revise | As written, passing with The Archive keeps a card and also collects the pass refund, the pass science and an ever-rising rarity pity, so passing beats drafting every time. | high |
| 3 | Dominion, Devotion | The Oriflamme / The Relic Bearers | Merge into one shared Dominion · Devotion card with The Oriflamme's text, at Tier I, uncommon. Cut The Relic Bearers. | cut | The same "beside a religious unit, +4 strength" line on two sheets, and a seat with both decks would hold both. | high |
| 4 | Dominion, Devotion | Convert It or Tax It / The Jizya | Merge into one shared card with Convert It or Tax It's text, at Tier II, uncommon. Cut The Jizya. | cut | Both pay +3 gold and +2 faith for a city that keeps another faith, which is the one *jizya* line in the spec. | high |
| 5 | Dominion, Devotion | The Military Orders / The Holy Army | Merge into one shared card: "Worked Holy Sites and citadels that stand beside each other each gain +2 faith and +2 culture." Tier III, uncommon. Cut The Military Orders. | cut | Both pay on the same placement, a citadel beside a holy site. | high |
| 6 | Expansionist | Veteran Colonies | "A military unit that has stood in one of your towns for ten turns may retire there: the unit is removed and the town gains one citizen. A town may take one retired unit every ten turns." | revise | Otherwise it turns production, or gold at Commerce's stacked discounts, into citizens in any town, past the growth cost of a large town. | high |
| 7 | Expansionist | Seasonal Levies | "After a city spends a citizen on a levy, it gains +40% food for ten turns. A city can gain this at most once every twenty turns." | revise | The levy limit is one per five turns, so "levying again restarts the ten turns" makes the +40% permanent, and the food feeds the next levy. | high |
| 8 | All | Granary Levies, levies, The Loaves, Migration, Veteran Colonies, The Seed Grain | Only a citizen gained by filling the food basket counts as growing. Citizens from a levy refund, migration, a retired unit, faith or a founding do not. | rule | The levy loop's only stated brake ("no historical-growth reward") needs a record of each city's highest population, which does not exist; Devotion's Hearth Blessings was cut for lacking it. | high |
| 9 | Expansionist | Levy of the Land | "…to gain production equal to ten turns of their food surplus." | revise | "Their food" read as gross food is about 300 production for one citizen at size 10. Surplus keeps the levy in line with what regrowing the citizen costs. | medium |
| 10 | Expansionist | The Forest Gardens, The Fish Traps, The Wild Orchards, The Burning Season | Each becomes "Once drafted, workers may … No chair required." The unlock stays for the rest of the game. | revise | As seated abilities, the four unlocks fill a three-chair government before any payoff card can sit. The Fast, the charters and The Chartered Company already unlock this way. | high |
| 11 | Expansionist | Daughter Towns | "While a town you found has fewer than five citizens, the town that trained its settler gains +2 food." Drop the authority clause. | revise | Twenty turns of free authority for every new town is unearned relief, and it chains, because new towns train settlers too. The spec wants relief earned (The Local Census, Provincial Councils). | medium |
| 12 | Expansionist | The Master Builders | New, Tier I, common: "Towns working at least three mines, quarries or lumber mills give +1 renown a turn, favouring great engineers." | new | Generals, merchants and scholars all have an early renown source. Engineers have none before A Court of Engineers at Tier III, so The Engineers' Yards and Public Works have no feed. | medium |
| 13 | Dominion, Magisterial | Looted Art | Restore as one shared card, Tier II, uncommon: "Capturing a city grants 20 renown for each great-person work and wonder inside its borders." | restore | Both sheets cut their copy, each pointing at the other's. The spec lists it among the strongest history lines. Renown rather than culture keeps it apart from Triumphs and feeds Magisterial's great people. | medium |
| 14 | Dominion | Spoils of War | "Pillaging grants 10 production to your city nearest the pillaged hex. The first pillage each turn also grants 20 culture." | revise | Production to every city, multiplied by Riders of the Steppe's free pillaging, is worth hundreds of hammers per raid. | medium |
| 15 | Expansionist | The Muster of the Fields | Add: "The unit counts as trained." | revise | This gives the spec's levy hook a Dominion reader (Muster Rites, The Art of War). It is safe only with #6 and #8. | medium |
| 16 | Expansionist, Commerce | The Grain Exchange (shared) | "Domestic routes from a town that has stopped growing carry half its food surplus to their destination. Towns receiving one gain +1 happiness." | revise | The spec's hook for this pair is surplus food carried away. The Breadbasket creates it, and no Commerce card reads it. | medium |
| 17 | Expansionist, Devotion | The Flood Festival | New shared card, Tier I, uncommon: "When a town starts a burning season, it gains faith equal to five times the number of tiles it burns." | new | Devotion's sheet reads no tended land or burning. This is a one-off payout on Expansionist's own decision, not another rite-gated flat yield. | medium |
| 18 | Scientific, Magisterial | Charters | Drafted charters stay in your collection, unseated, and count as Orders held (for The Encyclopedia and The Universal Library). They still take no chair. | rule | This makes the pair two-way. Today Scientific reads nothing of Magisterial's. | medium |
| 19 | All | The Archive, The Cabinet of Curiosities, reward hands | A card that enters your collection by any route counts as drafted. It pays its on-draft boon, a charter grants its technology, and The Accessions Register pays. | rule | Five Magisterial cards and every charter depend on this, and no sheet says it. | medium |
| 20 | Scientific | The Prize Essay, The Prize Question | "Completing a technology before any other empire" excludes charter technologies. | rule | Only a charter holder can research a charter technology, so it is always first, and The Prize Question would be met by any two charters. | medium |
| 21 | Scientific | Charter technologies | Completing a charter technology draws one card of the next Order hand from the cards that technology opens. | rule | The two steps of a charter (research, then seat what it opens) connect only by luck in a pool of about 80 cards. | low |
| 22 | Scientific | The Religious University | "In each city with a University, one Holy Site counts as an Academy for every card." | revise | Holy sites are bought with faith and academies need a called scholar. Unlimited, every academy card reads Devotion's cheapest work, and two adjacent holy sites meet The Monastic University. | medium |
| 23 | Commerce, Scientific | Merchant Scholars (shared) | Agree with Scientific: "+2 science for every Academy in the origin city." | revise | Narrowed, it reads Scientific's own family, which gives Commerce a reader of Scientific's hook. | medium |
| 24 | Commerce | The Waqf | "Faith buildings you bought with gold provide +2 faith and +1 culture." | revise | Reading every bank stacks it on The Offered Stones and The Endowment for faith-bought buildings. Gold paid once becoming faith is the endowment idea. | medium |
| 25 | Magisterial | The Swearing-In | "The first time you seat each card, gain 30 culture." | revise | Paying once a turn for any seat or unseat rewards swapping a chair every turn, which is busywork. Paying per new card still rewards the seat family. | medium |
| 26 | Magisterial | The Quarter of Masters | "Great-person works beside another great-person work gain their base yield again. This never stacks." | revise | "Double their own yields" would double every card line on the hex (The Masters' Domain, The Citadel Works, The Saints' Fields and others) and become a multiplier on five decks' cards. | medium |
| 27 | All | Opus cards | All card bonuses to production toward the Magnum Opus add up to at most +60%. Lump payments (The Great Instrument, The Last Commission, The Last Offering) are outside the ceiling. | rule | Pairs stack two or three Opus cards (Scientific · Magisterial about +135%), while Expansionist pairs have none that work today. The pair then decides the winner. | medium |
| 28 | Devotion, Commerce | Faith and gold prices | Set one faith price for every faith purchase. Either raise `faithPerHammer` to half of gold's rate, as its docblock argues, or price The Lay Brothers' buildings in faith at half the gold price. Have Consecrated Ground use the same rate. | rule | Faith buys a hammer at a quarter of gold's price, while Consecrated Ground buys tiles at gold's number. Commerce and Devotion fill the same gap at very different prices. | medium |
| 29 | Commerce | The Money Lenders | "Earn interest equal to 2% of your treasury each turn, at most +30 gold." Argued against the sheet's "no cap". | revise | 2% compounding with no cap is exponential while idle, and The Strongroom (also uncapped) then turns the hoard into culture. | medium |
| 30 | Commerce | The Strongroom | "Reward: culture equal to a fifth of your treasury, at most 600, and a great merchant." | revise | An uncapped lump pays for hoarding with no limit. This pairs with #29. | low |
| 31 | Devotion | The Fast | Add: "A fasting city cannot gain citizens by any means." | revise | Otherwise The Loaves (faith for a citizen) grows a town that is collecting faith for not growing. | low |
| 32 | All | The Endowment, The Offered Stones, The Waqf | A building bought with culture (The Commissioned Works) records the culture bank and counts as purchased for The Endowment only. | rule | Three cards read which bank paid, and the culture bank is new. | low |

## Confidence

**Most confident.**
1. Commerce's purchase discounts add up to a free building today (#1). Four built cards feed one fold that sums and floors at zero.
2. The Archive makes passing strictly better than drafting (#2).
3. Dominion and Devotion carry three ideas twice (#3–#5). The reconciliation missed them because the names differ.

**Least sure.**
1. The Opus ceiling (#27). It assumes production bonuses toward one item add together and that seats reliably draw their Tier IV cards. I did not run games.
2. The faith-to-hammer rate (#28). The 1-against-4 ratio is in the data, but faith income per turn for a Devotion seat may already be about a quarter of a Commerce seat's gold, in which case the ratio is fair.
3. The size of the Veteran Colonies converter (#6) depends on what the cheapest buildable military unit costs at each age once the escalation ladders apply. The direction is clear; the size is an estimate.
