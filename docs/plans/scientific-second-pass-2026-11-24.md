# Scientific, second pass: the great city (2026-11-24)

This is a design pass. It changes no data, no code and no test. No test, bot game or dev server was run for it. Every power figure is arithmetic from the data files.

**How numbers are marked:** (live) is in the data today, (proposed) is a suggestion of this pass, (estimate) is my arithmetic and was not measured. In a table, the column heading carries the mark.

**How proposals are marked:** text or number change, existing shape, small extension, new shape.

The user's words for this pass (2026-11-24): "i don't think 'technologies completed' should be a build. i think theres something more universal that scientific needs, technologies completed feels boring/something you'll do anyways. Maybe science gains synergy with population/happiness somehow, those mechanics are already intertwined. Maybe science can also interact with the map: instead of adding yields to tiles, it improves improvements (upgrades to a mine for example) but maybe thats just a semantic difference."

---

## The user's comments, 2026-11-24

The user commented on the page (19 comments). **Where this section and the text below disagree, this section is right.** Nothing is built yet. These changes wait in the queue behind the playtest.

| # | Card or point | Today (live) | The user's words | Result |
|---|---|---|---|---|
| 1 | "The great city" replaces "technologies completed" as a build | Five cards pay when a technology completes. | "yes" | Adopted. The build reads a town's citizens above a line, and spare happiness. |
| 2 | The Astronomical Diaries (Tier I, uncommon) | "Gains +1 culture and +1 production each time you complete a technology." | "great" and "yes" | "Gains +1 science and +1 culture in your capital each time one of your towns grows past eight citizens." |
| 3 | The Reading Rooms (new, Tier I, common) | New | "great" | Build it: "Towns with a Library gain +1 happiness for every five citizens." |
| 4 | The Learned Leisure (new, Tier II, uncommon: "Your capital gains +3 science for each point of spare happiness.") | New | "cut" | Not built. |
| 5 | The Garden of Epicurus (new, Tier III, rare) | New. Today the bonus from spare happiness stops at +20%. | "great", "yes", and "sure, but didn't we rework the happiness tiers? double check with the main thread." | Build it: "The bonus from spare happiness has no upper limit." The check is below. |
| 6 | The Hippodamian Plan (new Doctrine, Tier II) | New | "great" and "yes" | Build it: "Your towns of ten or more citizens ask 30% less happiness. Towns you found cost 1 more authority." |
| 7 | The Round City (Tier II, uncommon) | "+1% production and culture for each citizen in your capital, at most +30%." | "great" | "+1% production and culture for each citizen in your capital." |
| 8 | The Queen of Cities (Tier III, rare) | "Towns of at least 15 citizens produce twice their food and production." It is a live card, not a new one. | "is this new? Let's keep it" and "maybe too strong, lets do +50% instead of double" | It stays, at +50%: "Towns of at least 15 citizens produce 50% more food and production." |
| 9 | The Forward Plans (Tier I, rare) | "You may build Universities before you know Scholarship." | "great" | Retired. |
| 10 | The Barber-Surgeons (Tier II, common) | "Your units gain +10 health after killing a unit." | "lets keep this, make it uncommon" | It stays and becomes uncommon. |
| 11 | The Royal Academies (Tier III, uncommon; from the first review) | "+5% production and culture for each empire building you hold." | In chat: "royal academies can be a rare" | It becomes a rare. |

**The check the user asked for, on the happiness tiers.** The rework of 2026-11-23 changed the unhappy side only: growth is 75% slower below 0, and at -10 or less growth stops and gold, science, culture and faith fall by 20%. The happy side is as this document says: +10% science and culture at 5 spare happiness, and +20% at 10 (`data/rules.json` `meters.tiers`, and `src/sim/meters.ts`, read on 2026-11-24). So The Garden of Epicurus is written against the live rule.

With The Learned Leisure cut and The Barber-Surgeons kept, Tier II gains one Doctrine and no Order, and loses none.

---

## Summary

### What I found

1. **The base rules already say that happiness is science.** Five spare happiness gives +10% science and culture. Ten gives +20% (live, `data/rules.json` `meters.tiers`; `meterEffectsOf` in `src/sim/meters.ts`). Nothing else in the game reads spare happiness, except one generic rare. So the user's idea needs no new mechanic. It needs cards that read a number the game already shows.
2. **The coordinator's reading is right, with one correction.** The large, happy city is the thing Scientific can own. But citizens alone do not separate a tall seat from a wide one, because happiness is charged for each citizen wherever it lives. What separates them is a town's size above a line, and spare happiness. The build reads those two.
3. **The great city already has its late cards, and it has almost nothing early.** The Queen of Cities (Tier III, rare: towns of 15 or more citizens produce twice their food and production) is worth about 740 a turn in a tall seat in age 4 (estimate). That is more than the whole Academy build. Before Tier III only The Round City (Tier II: +1% production and culture for each citizen in the capital) pays for size.
4. **Spare happiness above ten is wasted today.** The second rung is the last one. A seat that holds 25 spare happiness gets the same +20% as a seat that holds 10.
5. **Specialists are not a build quantity.** A specialist is automatic, the player cannot add one, and no live card reads them. I leave them alone.
6. **"Science improves improvements" is mostly a different name.** The real version exists already: five technologies upgrade an improvement, and the charter works read the improvements beside them. I propose no card for it.

### What changes, in order

| # | Change | Today | Proposed | Size |
|---|---|---|---|---|
| 1 | The Astronomical Diaries is re-aimed from technologies to growth. | Tier I, uncommon: "Gains +1 culture and +1 production each time you complete a technology." | Tier I, uncommon: "Gains +1 science and +1 culture in your capital each time one of your towns grows past eight citizens." | Small extension |
| 2 | New: The Reading Rooms, a supply of happiness for large towns. | New | Tier I, common: "Towns with a Library gain +1 happiness for every five citizens." | Existing shape |
| 3 | New: The Learned Leisure, the first card that reads spare happiness. | New | Tier II, uncommon: "Your capital gains +3 science for each point of spare happiness." | Existing shape |
| 4 | New: The Garden of Epicurus, the capstone. | New | Tier III, rare: "The bonus from spare happiness has no upper limit." It then pays +10% science and culture for every five spare happiness. | Small extension |
| 5 | New Doctrine: The Hippodamian Plan, the build's Tier II Doctrine. | New | "Your towns of ten or more citizens ask 30% less happiness. Towns you found cost 1 more authority." | Existing shape |
| 6 | The Round City loses its limit. | Tier II, uncommon: "+1% production and culture for each citizen in your capital, at most +30%." | "+1% production and culture for each citizen in your capital." | Number change |

**What leaves to make room.**
- The Forward Plans (Tier I, rare: "You may build Universities before you know Scholarship."). Lost: early Universities. A University costs about 520 production (estimate), so an age 2 town cannot use the card.
- The Barber-Surgeons (Tier II, common: "Your units gain +10 health after killing a unit."). Lost: a small heal. The user deferred combat cards for this deck.
- Tier III has room already, because The Military Engineers' Charter (it opened the Bastion, a defence building) is retired.

**The technology cards.** The Astronomical Diaries is re-aimed (change 1). The other four stay as plain income: The Royal Workshops (15 production in the capital for each technology), The Alfonsine Tables (on draft: complete the current technology), The Translation Movement (older technologies cost a third less) and The Journeymen (each technology grants each town production equal to three times its population). The Journeymen already reads citizens, so it sits in this build with no change.

### Decisions for you

1. **Is "the great city" the build that replaces "technologies completed"?** It reads two things: a town's citizens above a line, and spare happiness. Recommended: yes.
2. **May The Astronomical Diaries change from "each technology completed" to "each time a town grows past eight citizens"?** Recommended: yes. It is the one technology card that is worth re-aiming, because it is the scaler that carries a seat from Tier I to the end.
3. **Do you want The Garden of Epicurus (Tier III, rare: the bonus from spare happiness has no upper limit)?** With the generic rare The Good Years (your bonus from spare happiness is doubled) it is a broken combination on purpose. Recommended: yes.
4. **A fifth Tier II Doctrine, The Hippodamian Plan (large towns ask 30% less happiness; founded towns cost 1 more authority), or re-aim one of the four?** Recommended: add it. The alternative is to re-aim The Jixian Academy (completing a technology grants culture equal to a fifth of its cost), but that Doctrine is the deck's best source of culture.
5. **The Queen of Cities (Tier III, rare: towns of 15 or more citizens produce twice their food and production) is the strongest single card I found in the deck. Leave it?** Recommended: yes, and measure it first. It is rare, and each such town needs 15 happiness.

---

## 1. The materials

### How the rules work today (all live)

**Population and growth.**
- A citizen eats 2 food. A town grows when its food store reaches `10 + 6n + n^1.65`, where n is its size (`data/rules.json` `cities`). That is 89 food at size 8, 187 at size 15 and 270 at size 20. So a late citizen of a tall town costs about three times the food of a citizen of a small town.
- A town records its largest size (`City.largestSize`). The moment "a town grows past its largest size" exists for cards (`sizeRecord`).

**Happiness** is one number for the whole empire. It is supply minus demand.
- Supply: 6 from the palace, and 4 for each different luxury. Few ordinary buildings add to it: the Garden (+1 for every five citizens of its town), the Public Bath (+1 in a town joined to the capital), the Cathedral (+3).
- Demand: 1 for each citizen, in any town. There is no extra charge for a large town since 2026-09-09.
- Spare happiness of 5 or more: +10% science and culture. 10 or more: +20%. That is the top.
- Below 0: towns grow 75% more slowly. At −10 or below: no growth, and −20% gold, science, culture and faith (the user's rulings of 2026-11-23).

**Authority** is the limit on the number of towns. A founded town uses 3 and a captured town 4. Capacity is 6, plus 2 for each age entered, plus buildings (a Monument gives 1). Spare authority of 5 gives +10% production and 10 gives +20%.

**Specialists.**
- A specialist is a citizen who works no hex. The game calls it a guildsman.
- A town gets one with no action by the player. Each turn the town banks the renown its buildings earn, plus a little for each citizen and each specialist it has. When the bank reaches 60, then 67, 75, 84 and 93, one citizen becomes a specialist (`src/sim/guilds.ts`).
- The town needs a building that earns renown for scholars, merchants, engineers or artists. At most a quarter of its citizens may be specialists.
- The family follows the town's renown: a Library makes scholars, a Market makes merchants.
- A scholar pays 2 science, a merchant 4 gold, an engineer 2 production and an artist 2 culture. Each also pays 1 renown to its family.
- **The player cannot choose it.** The only action is to dismiss one.
- No live card reads specialists. The count exists (`guildsmen`), and its one card, The Scholars' Guild (scholars in the trades also pay +1 food and +1 production), is retired.

### Every quantity a card could read

"Raises" and "reads" list live rows. Each is described the first time it appears in this table.

| Quantity | Does it separate tall from wide? | Who raises it | Who reads it |
|---|---|---|---|
| Citizens in a town | No. It is the same for 5 towns of 18 and 12 towns of 8. | Growth cards: Scientific's Doctrine The Removal to Xianyang (towns grow 30% faster; Settlers cost twice as much), the Surveyors' Charter (the qanat, and the Aqueduct early), the Glassmakers' Charter (the Glasshouse: +3 food). Expansionist's Synoecism (Doctrine: towns of six or more grow 30% faster). Devotion's The Imarets (Doctrine: devout towns grow 25% faster). The Hanging Gardens (wonder: +25% growth). | Many, in every deck: The Journeymen (Scientific), The Great Households (Expansionist: +1 production for every 2 citizens), The Market Halls (Commerce: +1 food and +1 production for every three citizens in a town with a Market), Examinations of State (shared rare: garrisoned towns gain +1 science and +1 culture for every three citizens), four rites (the Night Watch: +1 science for each citizen), the government Republic (+1 culture for every 5 citizens), the leaders Sejong, Qin Shi Huang and Jayavarman. |
| Citizens above a line, and towns of N or more | **Yes.** | The same growth cards. | Scientific: The Queen of Cities (15), the Doctrine The Universitas (science buildings in towns of twelve or more produce twice their yields; in smaller towns half). Expansionist: The Megalopolis (rare; approved new text: each town gains +2 science and +2 production for each citizen above ten), The Grain Dole (towns of 10 or more gain +4 happiness), The Freedom of the City (the first time a town reaches 15 it gains production equal to forty times its population). Shared: Commission: The Master Plan (four towns of 20: +40% toward the Magnum Opus). The legacy of Omar Khayyam (towns of 8 or more ask 15% less happiness). |
| The capital's citizens | Yes | The same. Scientific's Doctrine The Two Capitals (your largest other town also counts as your capital for your cards). | The Round City (Scientific). Market Day (Commerce: +1 gold for each), The Royal Cult (Devotion: +1 faith for each), The Threshing Floor (generic: +1 production for every two). Nezahualcoyotl. The generic rare The Summer Palace (cards that pay your capital pay 50% more). |
| A town growing past its largest size (a moment) | Only with a line | Growth | Expansionist's The Grain Census (gains +1 production and +1 gold each time), Granary Levies and Plenty (production when a town grows). |
| Spare happiness (the meter) | **Yes, in practice.** A tall seat that keeps it must grow with care. | Scientific: The Curators of Works (public works give +1 science and +1 happiness), the Herbalists' Charter (the Physic Garden: +2 science and +2 happiness). Expansionist: public works and water. Commerce: luxuries. Devotion: temples and devout towns. Magisterial: The Keepers of Wonders (each wonder +2 happiness). Dominion: Martial Law (each garrison +2 happiness and +4 food). Generic: Common Festivals (+1 in every town), The Settled Realm (+2 in every town). | **Almost nothing.** The base rungs, and the generic rare The Good Years (your bonus from spare happiness is doubled). The luxury Amber adds points to the rungs. The legacy of Hypatia gives +10% science while happiness is not negative. |
| What a citizen asks (demand) | With a line, yes | Expansionist's Doctrine The Contented City (citizens ask 20% less; gold is halved). Devotion's Doctrine The Patrimony of Peter (your holy city's citizens ask nothing). Sugar from age 3. | none |
| Specialists | No (a quarter of any town) | Buildings that earn renown | none live |
| Food surplus | No | Farms, the Glasshouse, the qanat | The growth rules only |
| Science buildings in a large town | Yes | A Library in age 1. The University, the Observatory and the Printing House come in age 4. Charters add the Scriptorium and the Great Archive in age 3. | The Universitas. The Laboratories (Scientific, Tier IV: science buildings give +10% production). The Royal Tutors (+2 scholar renown for each). The Lecture Halls (an Academy gains +2 science for each). |
| Spare authority | Yes: a tall seat has it | Monuments, Courthouses, ages | The base rungs (+10% and +20% production). Devotion's The Two Swords (+1 happiness for every two points). Expansionist's rare The Sovereign Writ (spare authority's bonus has no ceiling). |

**What this shows.**
- Citizens are read by about 25 rows in every deck. A new reader of plain citizens adds nothing.
- Spare happiness is raised by about 40 rows and read by one card. That is the largest unread quantity in the game.
- Size above a line is read late (Tier III) and mostly by Expansionist.

---

## 2. The build: the great city

**The way to play.** Found four or five towns, then stop. Grow them, keep them content, and fill them with schools. The seat is paid twice: by its citizens above a line, and by the happiness it keeps spare. The decision each time a town is ready to grow is "one more citizen, or five more points of contentment".

**The split with Expansionist.** Expansionist raises the two limits (happiness and authority) from the land, and it is paid for many towns and many citizens. Scientific reads what a seat does with a few towns: size above a line, and happiness left over. Expansionist supplies. Scientific reads. `docs/decks/deck-design.md` already proposes this: "Scientific grows a few great cities to feed its schools".

### The cards, by role

"Live" means in the data today and unchanged. Each card has its text beside it.

| Role | Tier 0 | Tier I | Tier II | Tier III | Tier IV |
|---|---|---|---|---|---|
| **Supply** (citizens and happiness) | The Curators of Works (live: public works give +1 science and +1 happiness). The Herbalists' Charter (live, shared: Physic Garden, +2 science and +2 happiness in each town). | **The Reading Rooms (new).** The Surveyors' Charter (live: the qanat, +2 food and fresh water; the Aqueduct early). The Glassmakers' Charter (live: Glasshouse, +3 food and +1 science for each farm worked). Doctrine The Removal to Xianyang (live: towns grow 30% faster; Settlers cost twice as much). | **Doctrine The Hippodamian Plan (new).** | | Generic: The Settled Realm (live: +2 happiness in every town). |
| **Widen** (the large town pays something new) | The House of Life (live, rare: the capital gains science equal to half its production). | The Free Cities (live: while you hold at most five towns, buildings and wonders are built 20% faster). | **The Learned Leisure (new).** | The Humanists (live: towns with a Library gain culture equal to a quarter of their science). The Journeymen (live: each technology grants each town production equal to three times its population). | The Laboratories (live: science buildings give +10% production). |
| **Multiply** | | | The Round City (**changed**: no limit). Generic rare The Summer Palace (live: cards that pay your capital pay 50% more). | The Queen of Cities (live, rare). **The Garden of Epicurus (new, rare).** Doctrine The Universitas (live). Generic rare The Good Years (live: your bonus from spare happiness is doubled). | Doctrine The Two Capitals (live: your largest other town also counts as your capital; your other towns grow 25% more slowly). |
| **Act** (a choice or a moment) | | **The Astronomical Diaries (re-aimed)**: it gains each time a town grows past eight. The Observers' Charter (live, shared: the Night Watch rite, ten turns of +1 science for each citizen). | | | Commission: The Master Plan (live, shared: hold four towns of 20: +40% toward the Magnum Opus). |

- **Live cards that already belong: 16.** The build needs three new cards, one new Doctrine, one re-aim and one number change.
- **Types.** The three new cards are Civic. The build's Economic cards are The Free Cities, The Queen of Cities and The Laboratories. It has no Military card, as you asked.
- **The cost of the build shows in its cards:** Settlers at twice the price, founded towns at 1 more authority, small towns that grow more slowly under The Two Capitals, and schools at half yield in small towns under The Universitas.

### Proposal rows

#### 1. The Astronomical Diaries (re-aimed)

| Field | |
|---|---|
| Today | Tier I, uncommon, Civic: "Gains +1 culture and +1 production each time you complete a technology." It starts at +2 and +2 in the capital. |
| Proposed | Tier I, uncommon, Civic: "Gains +1 science and +1 culture in your capital each time one of your towns grows past eight citizens." It still starts at +2 and +2. |
| Age goal | Age 2, "commit": the seat chooses to grow few towns. |
| Theme and role | The great city: act, and the scaler that carries over. |
| Role | Pay-off. Floor: a wide seat of 12 towns of 9 gains 12 times in a game. Ceiling: a tall seat of five towns that reach 22 and 16 gains 46 times. |
| Councils | Early council, from Tier I to the end. |
| Attention | It rewards growth the player already wants. The card shows its count. A town that is levied and grows again does not count twice, because the moment is a new largest size. |
| Power (estimate) | Tall seat: +4 and +4 at turn 80 (the capital at 10), +21 and +21 in age 3, +48 and +48 in age 4, so 96 a turn, and 144 with The Summer Palace. Today's text pays about 64 in age 4. Early culture is worth about three times its face value. |
| Synergy | Reads: a town growing past its largest size, above a line. Raised by every growth card in the materials table (more than ten before Tier II). Pays the capital, so The Summer Palace and The Two Capitals raise it. |
| Displaces | Nothing. It keeps its chair. |
| Condition | The line of eight. Six is the alternative if eight pays too late; then a wide seat gains more. |
| Shape | Small extension: the tally `sizeRecord` (The Grain Census uses it) with a floor on the town's size. The moment's rider has `atPopulation` already. |
| What is lost | One of five cards that pay on a technology completed, and its production. |

#### 2. The Reading Rooms (new)

| Field | |
|---|---|
| Band, rarity | Tier I, common, Civic. New. |
| Text (proposed) | "Towns with a Library gain +1 happiness for every five citizens." |
| Age goal | Age 2: happiness starts to bind at five or six towns. |
| Theme and role | The great city: supply. It is Scientific's own source of happiness, from its schools. |
| Role | Glue. Floor: any seat with Libraries gains about a fifth of its citizens as happiness. Ceiling: the same; it does not grow with commitment. |
| Councils | Early council. It can leave in Tier III. |
| Attention | None. |
| Power (estimate) | Age 2, four towns of 7 to 10: +5 happiness. Age 4, five towns of 16 to 22: +17. Each point is room for one citizen (about 5 yield in age 2 and 10 in age 4) or a step toward a rung. So about 25 a turn in age 2, a regular Tier I card. |
| Synergy | Raises: spare happiness. Reads: citizens, and Libraries. Read by The Learned Leisure and The Garden of Epicurus below, by The Good Years, and by the base rungs. |
| Displaces | The Forward Plans leaves the tier. |
| Condition | A Library in the town. |
| Shape | Existing shape: the Garden's line (`pays` to happiness, `count: population`, `per: 5`, `within: city`) with a `hasBuilding` scope. Devotion's The Deaconries (devout towns gain +1 happiness for every four citizens) is the same shape. |

#### 3. The Learned Leisure (new)

| Field | |
|---|---|
| Band, rarity | Tier II, uncommon, Civic. New. |
| Text (proposed) | "Your capital gains +3 science for each point of spare happiness." |
| Age goal | Age 3, "grow into it": happiness is the limit. |
| Theme and role | The great city: widen. Spare happiness above ten pays for the first time. |
| Role | Pay-off. Floor: a seat at the first rung (5 spare) gains 15 science. Ceiling: 25 spare is 75, and 112 with The Summer Palace. |
| Councils | Early council at the end of Tier II, and late. |
| Attention | One new choice: grow a town, or keep the points. The happiness meter already shows the number. |
| Power (estimate) | 8 spare in age 2: 24, against a seat's 30 science. 12 spare in age 3: 36. 25 spare in age 4: 75. A regular Tier II card is 35 to 60. |
| Synergy | Reads: spare happiness. About 40 live rows raise it, in all six decks and the generic cards. |
| Displaces | The Barber-Surgeons leaves the tier. |
| Condition | None. It pays nothing at zero or below. |
| Shape | Existing shape: `pays`, `where: city`, capital scope, `basis: count`, `count: happiness` (the meter, counted only while positive). Only a wager reads that count today. |

#### 4. The Garden of Epicurus (new)

| Field | |
|---|---|
| Band, rarity | Tier III, rare, Civic. New. Epicurus taught in a garden in Athens that contentment is the aim of a learned life. |
| Text (proposed) | "The bonus from spare happiness has no upper limit." The rules text beside it: +10% science and culture for every five spare happiness. |
| Age goal | Age 4, "decide the game". |
| Theme and role | The great city: multiply, and the capstone. |
| Role | Build-defining. Floor: nothing, for a seat at 10 spare or less. Ceiling: 25 spare is +50%. |
| Councils | Late council. |
| Attention | It changes how the seat grows. Each citizen now costs 2% of the seat's science and culture. High attention, high impact. |
| Power (estimate) | Age 4 seat, science 494 and culture 442. At 25 spare: +50% in place of +20%, so +281 a turn. With The Good Years (doubled): +100% in place of +20%, so +749. A Tier III headline card is 200. |
| Synergy | Reads: spare happiness. Feeds every science and culture card. It is the twin of Expansionist's rare The Sovereign Writ (spare authority's bonus has no ceiling). |
| Displaces | A flat science card. |
| Condition | The happiness itself. A tall seat of 86 citizens needs 111 happiness to hold 25 spare, and the base rules supply about 70 (section 3). |
| Shape | Small extension: a second meter flag beside `writUncapped`, read where `meterEffectsOf` takes the happiness rung. `uncappedTierPercent` already does the arithmetic. |

#### 5. The Hippodamian Plan (new Doctrine)

| Field | |
|---|---|
| Band | Doctrine, Tier II. New. Hippodamus of Miletus planned cities on a grid. |
| Text (proposed) | "Your towns of ten or more citizens ask 30% less happiness. Towns you founded cost 1 more authority, including those you already hold." |
| Theme and role | The great city: supply. The build has Doctrines at Tiers I, III and IV and none at Tier II. |
| Power (estimate) | Age 3, five towns with 59 citizens, all at ten or more: 18 happiness. Age 4, 86 citizens: 26. That is the 25 spare points the capstone asks for. |
| Drawback | Five founded towns use 4 more authority. Twelve use 11 more. So a wide seat cannot take it, and a tall seat spends its spare authority on it. |
| Shape | Existing shape: `rulePercent`, `happinessDemand`, with a `populationAtLeast` scope (the legacy of Omar Khayyam). The drawback is Synoecism's line. |
| Counts | Tier II would hold five Doctrines. The skill allows three to five. |

#### 6. The Round City (number change)

| Field | |
|---|---|
| Today | Tier II, uncommon: "+1% production and culture for each citizen in your capital, at most +30%." |
| Proposed | "+1% production and culture for each citizen in your capital." |
| Why | You dislike limits, and this one is rarely reached. A capital of 22 gives +22%, about 202 a turn in age 4 (estimate). Without the limit the capital is worth growing past 30. |
| Shape | Number change: remove `max: 30`. |

### Example councils, with no Academy card

**Early, end of Tier I** (five chairs, Council of Elders: every town gains +2 food and +1 renown).
- The House of Life (0, rare: the capital gains science equal to half its production), or The Scribes (0: +1 science in every town) if it was not offered.
- The Curators of Works (0: public works give +1 science and +1 happiness).
- The Free Cities (I: at most five towns, buildings and wonders 20% faster).
- The Reading Rooms (I, new).
- The Astronomical Diaries (I, re-aimed).
- With no chair: the Herbalists' Charter and the Surveyors' Charter. Doctrine: The Removal to Xianyang.
- How it plays: four towns by turn 50, then no more Settlers. Each town builds a Library, a Granary and its garden. The capital passes eight citizens near turn 60 and the Diaries start to count.

**Early, end of Tier II** (six chairs, Republic: +1 trade route, and towns gain +1 culture for every 5 citizens).
- The Curators of Works leaves. The Round City and The Learned Leisure come in, and The Summer Palace if it is offered.
- Doctrine: The Hippodamian Plan. With no chair: the Observers' Charter (the Night Watch).
- How it plays: the seat holds 8 to 12 spare happiness. It keeps the Night Watch in the capital. Each new luxury is 12 science at once (The Learned Leisure) and room for the next citizens.

**Late, Tier III** (eight chairs, Divine Mandate or Merchant League): The Queen of Cities, The Garden of Epicurus, The Good Years, The Round City, The Astronomical Diaries, The Learned Leisure, The Humanists, The Journeymen. Doctrine: The Universitas.

**Late, Tier IV** (eleven chairs, The Curia: your Civic cards pay 30% more): add The Laboratories, The Settled Realm and The Summer Palace. Doctrine: The Two Capitals. With no chair: Commission: The Master Plan.

### What the build pays (estimate)

The tall seat I used: four towns and 31 citizens in age 2, five towns and 59 citizens in age 3, five towns and 86 citizens in age 4 (a capital of 22 and four towns of 16). Its yields are the median seat's.

| | Age 2 | Age 3 | Age 4 |
|---|---|---|---|
| Typical (three or four of the build's cards) | about 45: the Diaries 8, The Curators 8 and 8 happiness, The Reading Rooms 5 happiness, the first rung 6 | about 140: the Diaries 42, The Round City 28, The Learned Leisure 30, the top rung 38 | about 570: the Diaries 96, The Round City 202, The Learned Leisure 30, The Journeymen 52, the top rung 187 |
| Committed | about 70 | about 290, with The Queen of Cities in the capital only | about 1,700: The Queen of Cities 740, The Round City 202, The Garden of Epicurus 281, The Laboratories 190, the Diaries 144, The Learned Leisure 112, The Universitas 65. About 2,200 with The Good Years. |
| Academy build, for comparison (first review) | 12 to 90 | 32 to 465 | 60 to 666 |

- **The deck then has two real choices.** The Academy build is ahead in ages 2 and 3 for a committed seat. The great city is ahead in age 4. A seat can play either with no card of the other.
- **Two broken combinations, both late.**
  1. Live: The Queen of Cities in a seat where every town has 15 citizens. It doubles most of the seat's food and production.
  2. New: The Garden of Epicurus with The Good Years. Each five spare happiness is +20% science and culture.
- **The early game is still the weak part.** About 45 a turn in age 2 is two regular cards. The build is a slow one by design, and its cost is paid early (Settlers at twice the price).

---

## 3. Happiness as a resource

### What spare happiness is worth today (estimate, from the live rungs)

| Spare happiness | Effect (live) | Worth a turn, age 2 / 3 / 4 |
|---|---|---|
| 0 to 4 | nothing | 0 |
| 5 to 9 | +10% science and culture | 6 / 19 / 94 |
| 10 or more | +20% science and culture | 11 / 38 / 187 |
| every point above 10 | nothing | 0 |
| below 0 | growth −75%; at −10, no growth and −20% to four yields | a large loss |

- One citizen costs 1 happiness and pays about 5 a turn in age 2 and 10 in age 4.
- So today the best play is exact: hold 10 spare, and turn every other point into a citizen. Happiness above the second rung is only a store for the next citizens.

### With the three new cards

- **The Learned Leisure** makes each spare point worth 3 science. A point is then worth less than a citizen, so the seat still grows, but waiting is no longer a waste.
- **The Garden of Epicurus** makes each five points worth 10% of science and culture: 94 a turn in age 4, or about 19 a point. That is more than a citizen. So in age 4 the seat stops growing its small hexes and holds contentment. Science is then the thing that spends happiness, in place of citizens.
- The Queen of Cities pulls the other way: a town must reach 15 citizens. The player balances the two, town by town. That balance is the build's decision.
- No proposal adds a penalty or a limit. The two drawbacks are on Doctrines, as Doctrines have.

**The other idea, "large towns cost more happiness and pay more science".** I do not propose it. The Megalopolis (Expansionist, rare) already pays for each citizen above ten, and a second card with that job would be the same card in another deck. A card that raises demand is also a plain penalty.

### What a tall seat gives up against a wide seat

| | Tall (five towns) | Wide (twelve towns) |
|---|---|---|
| Happiness demand | The same for the same citizens: 1 each (live) | The same |
| Happiness supply from the land | Fewer luxuries, at 4 each | More luxuries |
| Happiness for each town | Five times: Common Festivals (+1 in every town) gives 5 | Twelve times: 12 |
| Happiness for size | The Grain Dole, The Reading Rooms, The Hippodamian Plan, the Garden building | Little |
| Authority used (live: 3 a town, the capital free) | 12 | 33 |
| Spare authority | Yes: +10% to +20% production | No. It needs authority cards. |
| Food for the last citizen (live) | 270 at size 20 | 89 at size 8 |
| Cards that pay "in every town" | Paid five times | Paid twelve times |
| Empire buildings (live: cost × √(towns ÷ 4)) | × 1.12 | × 1.73 |

A tall seat of 86 citizens needs 96 happiness for the top rung. The base rules give about 70: the palace 6, seven luxuries 28, Gardens 17, Public Baths 5, Cathedrals 15 (estimate). The cards must bring the rest. That gap is why happiness can carry a build.

---

## 4. The map idea: "science improves improvements"

**Verdict: I agree with the coordinator. It is mostly a different name, and it stands on Expansionist's ground.** "Mines are upgraded: +2 production" and "mines give +2 production" are one line of data (`pays`, `where: hex`, on an improvement). Expansionist's way to play is "raise the land itself".

**The real version exists already, in two places.**
1. **Technologies upgrade improvements** (live, `data/improvements.json`, the `upgrades` field). Irrigation: farms beside fresh water +1 food. Prospecting: mines +1 production. The Cataphract: pastures +1 production. Currency: plantations +1 gold. Philosophy and Scholarship: each great-person work +2 of its yield. So research does interact with the map today, for every deck.
2. **The charter works read the improvements beside them** (live). The smelter (the Smelters' Charter) gains +1 production and +1 science for each mine or quarry beside it. The qanat (the Surveyors' Charter) gives fresh water to the hexes around it, and Irrigation then upgrades the farms there. The Glasshouse (the Glassmakers' Charter) gains +1 science for each farm its town works.

**If you want it to be visible, the smallest step is words, not cards.** The technology card could print these lines under one heading, "Upgrades" (a UI text change). **If you want one more step,** a charter technology could carry an upgrade line: for example Smelting, "mines +1 production". It is an existing shape and it adds no card. I do not recommend it now. The charters were just made half price, and Expansionist already has the land cards.

---

## 5. Pairs

Each line goes through a general quantity. No card names another card.

| Partner | Through | What the partner brings (live) | How it plays |
|---|---|---|---|
| **Expansionist** (Nezahualcoyotl: in cities with an Aqueduct, farms give +1 science and +1 production) | Citizens above a line; public works; happiness from water | The Megalopolis (approved text: each town gains +2 science and +2 production for each citizen above ten). The Grain Dole (towns of 10 or more gain +4 happiness). The Waterworks (Aqueducts give +3 happiness). The Thermae (each public work gives its town +2 science). The Doctrine The Curator of Waters (public works give +2 happiness and are built 50% faster). | The strongest pair. Expansionist supplies the happiness and Scientific reads it. The Surveyors' Charter gives the Aqueduct an age early. The tension is real: Expansionist's levies spend citizens, and its cards pay for more towns. |
| **Magisterial** (Sejong: every city gains +1 science and +1 culture for every four citizens) | Wonders in one town; happiness for each wonder | The Keepers of Wonders (each wonder gives +2 happiness). The Wonder Commonwealth (towns with a wonder gain +35% production and food). The Hanging Gardens (+25% growth), The Circus Maximus (+4 happiness and more). | A great city is the natural wonder town. Six wonders are 12 happiness. The Free Cities speeds the wonders. A large town also works every great-person work it has. |
| **Devotion** (Al-Ma'mun: +2 food for every faith or science building a city holds) | Rites that pay for each citizen; happiness from temples | The rites: the Night Watch (+1 science for each citizen), Fasting (no growth; +1 science and +1 culture for each citizen), Naming (+2 food for each citizen). The Temple Storehouses (Temples give +2 food and +2 happiness). The Deaconries (devout towns gain +1 happiness for every four citizens). The Doctrine The Patrimony of Peter (your holy city's citizens ask no happiness). | One rite in a town of 22 pays as much as three rites in towns of 7, for one cast. With The Patrimony of Peter the capital is the holy city, and its 22 citizens are free. That is 22 spare happiness for the capstone. |
| **Commerce** (Cleopatra: trade routes pay +2 science) | Luxuries as happiness | 4 happiness for each different luxury (base). The Doctrine The Forbidden Silks (luxuries give twice their happiness; you cannot lend them). The Capitulations (each foreign town with your trading post lends you a luxury you lack). Corner the Market (commission: +2 happiness for each different luxury). The Market Halls (+1 food and +1 production for every three citizens). | A tall seat owns little land, so it buys its luxuries. Commerce is its happiness supplier. With The Learned Leisure each luxury is +12 science in the capital. |
| **Dominion** (Mehmed: each Barracks gives +1 science, and more for scholars and generals) | Garrisons; captured towns | Martial Law (each garrisoned unit grants its city +2 happiness and +4 food). Examinations of State (shared rare: garrisoned towns gain +1 science and +1 culture for every three citizens). The Sutlers (Dominion's card shared with Commerce, so only a Dominion and Commerce seat draws it: garrisoned towns gain +1 gold for each citizen). | The weakest pair for this build. A garrison is one for each town, so five towns have five. The cards that pay a garrisoned town for each citizen do like a large town. A captured town arrives large, and a tall seat has the spare authority to hold it. |

---

## 6. What I could not verify

- **Town sizes.** I found no measured figures for citizens in a town by age. The tall seat (31, 59 and 86 citizens) and the wide seat (12 towns of 8 or 9) are my assumptions. Every figure in section 2 depends on them.
- **The Queen of Cities at 740 a turn.** I assumed that 80% of a tall seat's food and production is made in towns of 15 or more, and that the seat makes the median seat's yields.
- **Base happiness supply.** I read the palace, the luxuries and the building rows. I did not run `explainHappiness`, and I may have missed a source.
- **Whether a specialist asks for happiness.** I read that demand is charged on a town's population, so I assume yes.
- **The Universitas at 65.** I assumed it doubles the flat yields of science buildings and not their percentages.
- **How The Good Years combines with an unlimited bonus.** I assumed its doubling applies to the whole bonus, as it does to the rungs today.
- **The Astronomical Diaries' new shape.** I did not check how the `sizeRecord` tally counts a town that gains two citizens in one turn across the line.
- **The count `happiness`.** Its docblock says "the happiness meter, counted only while positive". I did not trace its reader in the evaluator. One wager uses it.
- **The Megalopolis.** Its approved text is in `docs/plans/deck-review-expansionist-2026-11-23.md`. The data still holds the old text.
- **Draft pacing and the tiers of the generic cards** are as the data and the skill state them. The power bar predates the changes of November.
- **Names.** "The Reading Rooms", "The Learned Leisure", "The Garden of Epicurus" and "The Hippodamian Plan" have no match in `data/` or `docs/`.
