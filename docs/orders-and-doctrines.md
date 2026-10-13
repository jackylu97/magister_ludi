# Orders and Doctrines — the master list

Every Order and government in one place, tables only. The tables ARE the balance
worksheet: edit a cell here, edit the matching field in `data/statecraft.json`, and
`test/sim/statecraftDocSync.test.ts` fails the build if the two ever disagree — every live
row appears in its own deck's table and every table row names a live row, retired rows
excluded from both sides. Every Effect cell — and every government's Signature cell — is
the row's own ratified `text`; bands, chairs, tiers and rarities are the data's. The
reasoning behind each pass lives in `docs/history/orders-and-doctrines-as-built.md`; the
pre-rework shelves, every row of them retired, are `docs/history/orders-and-doctrines-retired.md`.

**The decks rework** (branch `decks`, batch D1a — `docs/plans/decks-rework.md`, ruled
`docs/flags.md` (iiiiii); the design of record is `docs/six-decks-first-cut.md`, whose
structure paragraphs are sync-tested where they state a number):

- **Six decks.** Every Order row carries `decks` — one deck for a single-type card, two for
  a cross-type card (one row, one effect, either membership grants access), none for a
  generic card that belongs to every seat — and a `band`. A leader's row carries its two
  decks; Ibn Battuta's says `rainbow`; a seat under nobody holds all six. A seat's pool is
  its decks' single-type rows, the cross-types naming either, and the commons
  (`deckPoolOf`). No pool rotates away.
- **Five bands, two gates.** A card is dealt once the seat's regular draft count has reached
  its band's rung of the ladder **and** its research age (the highest age among its own
  technologies, floored at one) has reached the band's — both (`bandOpen`). Band 4 (the deck
  sheets' Tier IV) asks for the last age, the same as band 3, since there is no fifth age.
  The ladder is the table below.
- **Universal chairs.** A government supplies a chair count and no layout: 3 / 5 / 8 / 11 by
  its tier's rung (the user's ruling, `docs/decks/deck-design.md` "More chairs"), written on each row as `chairs`; the sixteen governments keep their
  signatures. A leader's extra chair and a card's are additive.
- **The draw is rarity-first.** A hand is three positions — one card from each of the
  seat's two decks, and a third by the regular-draft cadence *generic → cross → generic →
  single* (the single alternating between the two decks; a rainbow seat samples two distinct
  decks a hand, and a third deck on the single turn). In each position a rarity rung is
  drawn at the table's odds (`rarityOdds`, renormalised over the rungs present), then a card
  uniformly within it. Every position excludes the held and the hand; an empty category falls
  back to the eligible union; fewer eligible cards deal a smaller hand; a rider's extra cards
  come after the base hand from the union. Passing moves `skipPity` points out of common into
  uncommon and rare for the next hand; taking a card zeroes it. The faith reroll keeps the
  hand's positions. An exhausted pool charges nothing: the meter stays full and no draft is
  counted until there is a card to deal.
- **Reward hands.** At regular draft counts 4, 18 and 29 a rare-only hand is banked
  (`rewardHands`, absolute counts); it blocks nothing, is dealt when opened — one rare from
  each deck then one from the union — taken for nothing into the collection, or passed for
  nothing, and resolves as exhausted at no cost when every rare is held. A rare taken in
  either kind of hand is out of the other.
- **Charters.** A row with `charter` grants on the pick — a technology made researchable, a
  building made buildable, rites made learnable — and never sits in a chair. It grants no
  free technology and no free building.
- **Nothing deleted.** Every pre-rework Order and Doctrine row is `retired: true`: in the data
  and the Compendium, in no pool. A Doctrine is the reward hand now, not a card class. A row
  whose text needs a shape the vocabulary lacks is `deferred` in plain words, with no
  effects, and is in no pool either. Schema 119; a pre-rework save is refused.

**Rarity** — the mark in an Order's Rarity column **is** `OrderDef.rarity`: ● common ·
◆ uncommon · ○ rare, blank reads as common. The draw takes it as a *probability target,
never a per-card weight* — 60 · 30 · 10 (`rarityOdds`) — drawn first, then a card within the
rung. Passing a draft moves `skipPity` points out of common until a card is taken. Orders
are never upgraded: a card is what it prints, held once, and a draft is take one or pass.

**Role** — **E** an *engine*, a row whose subject is the deck or the board's *kind* (a
count of the chairs, an amplifier over what your other Orders pay, a share on a class of
buildings, a "hexes that already supply this" test, a shortener of the calendar). **P** a
*payoff*, a row that scales with what the empire has built, holds, worked or slotted (a
count, a conversion, a doubler taken last, a tally). **S** a *standalone*, everything
else (a flat, a rule, an occasion, a charter, a boon on the calendar). The mark is
**derived from the row's own effects** and pinned against that derivation, so a row that
changes shape changes its letter or fails the build.

**Band** — the number in an Order's Band column **is** `OrderDef.band`: 0 Early · 1 Middle ·
2 Late · 3 Final, the ladder's rungs.

A row with a struck half carries **†** in its line under Notes, where the words after the
dagger are what the row does *not* do.

## The ladder

| Rung | Band | Regular draft count | Chairs |
|---|---|---|---|
| Chiefdom | 0 | 0 | 3 |
| Government I | 1 | 4 | 5 |
| Government II | 2 | 18 | 8 |
| Government III | 3 | 29 | 11 |
| Government IV | 4 | 45 | 11 |

A reward hand is banked at every rung but the first. A government is offered at its row's
own tier (4 · 10 · 18 · 29 · 45); a tier between two rungs takes the rung below it for its
chairs.

## Governments

| Tier | Government | Chairs | Signature |
|---|---|---|---|
| 0 | Chiefdom | 3 | Grants nothing of its own. |
| 4 | Council of Elders | 5 | +3 happiness. +1 renown per turn for each city you hold. |
|  | Priest-King | 5 | +2 faith in every city. |
|  | War Chief | 5 | +3 authority capacity. +4 combat strength. Killing a unit grants +5 science and +5 culture for each Order you have in a slot. |
| 10 | Republic | 5 | +1 culture for each 5 population in a city. −5% happiness demanded per citizen. |
|  | Theocracy | 5 | +2 faith in every city. Your capital's faith is gained again as science and as culture, at a fifth of the rate. |
|  | Tyranny | 5 | +5 authority capacity. +4 combat strength. Pillaging pays +50% and costs no movement. |
| 18 | Divine Mandate | 8 | +1 faith and +1 culture in your capital for each wildcard Order you have in a slot · +10% faith in every city of 6 or more population. |
|  | Imperium | 8 | +1 production in every city for each military Order you have in a slot · all units +1 movement · capturing a city pays +50 gold and heals every one of your units. |
|  | Merchant League | 8 | +2 gold for each economic Order you have in a slot · trade routes pay 50% more · +1 trade route. |
| 29 | The Curia | 11 | +6 faith for each Cathedral. Faith buildings supply science equal to their faith. |
|  | The Estates | 11 | +1 happiness in every city. +2 culture in every city of 8 or more population. |
|  | The Sultanate | 11 | All units +1 movement, and cities put 25% more production behind units — a fifth off their price. Captured cities +10% science and +10% culture. |
| 45 | The Commonwealth | 11 | Great people may be bought with gold. Great-person improvements pay +50% more. |
|  | The Empire | 11 | +6 authority capacity. +2 combat strength for each great general you have earned this game. |
|  | The Magisterium | 11 | Every offer of every kind shows one more card. +3 renown per turn for each wonder you hold. |

The signatures are untouched by D1a — the simplification to three forms is a later ruling
— so the three tier-18 signatures still count Orders by the old offices' flavour, which
every chair now shares.

## Decks

One table a deck, then the cross-types and the generic pool. **Filled in D1b**: every
pre-rework row is retired and the six decks' rows are D1b's, one agent a deck, entered
from the design doc's deck tables. A row whose text needs a shape the vocabulary lacks
is `deferred` — in the data, in the Compendium, in no pool and in no table below; its
sentence is under Notes, after the dagger. **A live Order lives in its deck's own file**
— `data/decks/<deck>.json`, with the cross-type and generic rows in
`data/decks/common.json` — and the retired shelf stays in `data/statecraft.json`; the
eight fold into one registry with an id-collision check, and a deck's table here mirrors
that deck's file. A row lands here in the same edit that lands it in its file, or the
sync test fails.

An id that collided with a retired row takes its **deck file's name as a prefix**
(`dominionBloodedSpears`, `commerceSaltTithes`, `commonBoundaryStones`) — one convention
across the seven files. Ids are internal; the names in these tables are the card's.

### Dominion

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Blooded Spears | 0 | ● | S | +4 strength against barbarians. Clearing a camp grants 25 production and 25 food to your nearest city. |
| Martial Law | 0 | ● | P | Each garrisoned unit grants its city +1 happiness and +2 food. |
| Muster Rites | 0 | ● | S | Training a unit grants 6 faith and 6 food. |
| The Standing Army | 0 | ○ | S | Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units. |
| Blood Brothers | 0 | ○ | S | A barbarian unit you kill joins your side. |
| The King's Levy | 0 | ○ | S | Every fifteen turns your capital raises a melee unit for free. It counts as trained and costs no upkeep. |
| Commission: Clear the Frontier | 0 | ● | S | Commission. Clear two barbarian camps while this card is seated. Then gain 60 production in your capital and the best melee unit you can build is trained in your capital, free of upkeep. The card leaves its chair. |
| The Horse Herds | 0 | ● | S | Worked pastures and camps give +1 production. +20% production toward mounted units. |
| Battle Honours | 0 | ● | S | Your first kill each turn grants 6 renown, and clearing a barbarian camp grants 12 renown, both favouring great generals. |
| Sword and Plough | 0 | ● | S | While at peace, each city with a garrison gains +2 culture. While at war, each gains +2 production instead. |
| The Camp Chaplains | 0 | ● | P | +1 faith for every unit you control. |
| Drill Manuals | 1 | ● | P | Barracks and Stables give +2 science. +20% production toward Barracks and Stables. |
| March Discipline | 1 | ● | S | Military units gain +1 movement when starting their turn in your territory. |
| The Quartermasters | 1 | ● | S | Worked strategic resources gain +2 food and +2 production. |
| The Soldiers' Purse | 1 | ● | S | Military units cost 1 less upkeep. |
| The War Hall Schools | 1 | ● | P | War Halls give +3 science and +3 culture. |
| The Marshals | 1 | ◆ | S | +2 strength per adjacent friendly combat unit, at most +6. |
| The Pacified Marches | 1 | ◆ | P | While slotted, gains +1 authority capacity and +3 culture for every barbarian camp cleared, at most +8 authority and +24 culture. |
| The Art of War | 1 | ◆ | S | Training a unit grants science equal to half its strength. |
| War Foundries | 1 | ○ | P | Cities with a Barracks gain gold equal to 20% of their base production and +25% production toward military units. |
| Songs of the Fallen | 1 | ○ | S | Killing a unit grants science and culture equal to its strength. Losing a unit while it defends grants the same. |
| Horse Lords | 1 | ○ | S | Mounted units gain +3 strength and +1 movement. |
| The General Staff | 1 | ● | S | Cities with a Barracks give +2 renown a turn, favouring great generals. |
| The Soldier-Farmers | 1 | ● | S | While at peace, garrisoned cities gain +1 food and +1 production on each worked pasture and camp. |
| Siege Works | 2 | ● | S | +25% production toward siege units. Siege units gain +4 strength against cities. |
| Armoury Guilds | 2 | ● | P | Armouries give +3 science and +3 culture. Cities with one gain +10% production toward buildings. |
| Conquered Archives | 2 | ● | P | Captured cities gain +4 science and +4 culture. |
| Stockpiles | 2 | ● | P | Cities gain +5 food per defensive building. |
| Triumphs | 2 | ● | S | Capturing a city grants culture equal to ten times its population. |
| Marine Drill | 2 | ◆ | S | Naval melee units gain +4 strength. Land units attacking on the turn they disembark gain +3 strength. |
| Riders of the Steppe | 2 | ◆ | S | Mounted units ignore enemy zone of control. Pillaging costs them one less movement point, minimum zero. |
| Spoils of War | 2 | ◆ | S | Pillaging grants 10 production to your city nearest the pillaged hex. The first pillage each turn also grants 20 culture. |
| Hegemony | 2 | ○ | S | Captured cities you hold cost one less authority. Capturing a city grants +20% production in every city for ten turns. |
| Master Bowyers | 2 | ○ | S | Ranged and siege units gain +1 range. |
| The Citadel Works | 2 | ● | S | Citadels gain +3 science. Each citadel inside your borders gives +1 renown a turn, favouring great generals. |
| Commission: Take the City | 2 | ◆ | S | Commission. Capture a city with at least five citizens. Then gain culture and science equal to fifteen times its population, and a free Barracks in that city. The card leaves its chair. |
| Standing Garrisons | 3 | ● | P | Per garrisoned unit, the city gains +8% production and +8% culture. |
| Arsenals | 3 | ● | P | Cities with an Armoury gain +20% production and produce ships 50% faster. |
| The Siege Train | 3 | ◆ | S | Siege units gain +1 movement. Adjacent friendly land melee units gain +6 strength against cities. |
| Reserve Officers | 3 | ◆ | S | While at war, cities with a Barracks produce military units 40% faster; while at peace, those cities gain +20% production toward buildings. |
| Defensive Lines | 3 | ◆ | S | Land combat units gain +3 strength beside a friendly city. Cities with walls gain +3 defence per garrisoned unit. |
| Naval Supremacy | 3 | ◆ | P | Naval units gain +1 sight and +1 range. Coastal cities gain +20% gold; coastal captured cities +40%. |
| Total War | 3 | ○ | S | All your military units gain +8 strength and +1 movement. Every city demands +3 more happiness. |
| Imperium | 4 | ○ | S | Each captured city you hold gives +10% production toward the Magnum Opus, at most +40%. |
| Commission: Hold the Capitals | 4 | ○ | S | Commission. Hold two original capitals other than your own at the same time. Then every city gains +25% production for twenty turns, and you gain a great general. The card leaves its chair. |
| Spolia | 4 | ○ | S | Capturing a city that was raising a Magnum Opus adds half the production it had put into that Opus to your own. If you have not begun one, the production is kept until you do. |
| The Praetorian Guard | 4 | ○ | S | The city raising your Magnum Opus gains +5 defence for each unit garrisoned there. Your military units within two hexes of it gain +6 strength. |
| The Grand Army | 4 | ○ | P | Your capital gains +1 science and +1 culture for every military unit you have, at most +30 of each. |
| The Annexed Provinces | 4 | ○ | P | Each captured city you hold gives +5% science and +5% culture in every city, at most +25%. |
| The Marshalate | 4 | ○ | S | Each great general you have called gives your military units +1 strength, at most +5. Citadels give +3 culture and +3 production. |
| The Military Frontier | 4 | ○ | P | Each unit garrisoned in a city gives it +3 science and +3 culture, at most three units per city. |
| The Nation in Arms | 4 | ○ | S | Every ten turns, each city with an Armoury raises the best melee unit you can build. They count as trained and cost no upkeep. |
| The Grand Coalition | 4 | ○ | S | While at war with an empire raising a Magnum Opus, your military units gain +6 strength against it, and cities with a Barracks produce military units 30% faster. |
| The Proconsuls | 4 | ◆ | S | Captured cities with a garrison cost no authority and gain +10 defence. |
| Commission: The Grand Campaign | 4 | ◆ | S | Commission. Capture three cities while this card is seated. Then gain a great general, and science and culture each equal to ten times those cities' total population. The card leaves its chair. |
| Commission: The Captured Marvel | 4 | ○ | S | Commission. Capture a city that holds a world wonder or was another empire's original capital. Then gain science and culture each equal to twenty times its population, plus 200 of each for every world wonder in it. The card leaves its chair. |

### Expansionist

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Smallholdings | 0 | ● | S | Worked farms and pastures gain +1 food and +1 gold. |
| Granary Levies | 0 | ● | S | When a city grows in population, gain 15 production |
| The Naturalists | 0 | ◆ | P | Each city gains +1 science for every two hills or mountains in its borders, at most +3. |
| The Patient Harvest | 0 | ○ | S | Cities retain 30% of the food spent on growth, but produce military units 15% more slowly. |
| The Forest Gardens | 0 | ● | S | Once drafted, workers may tend a forest or jungle into a forest garden for one charge: +1 food. The forest stays standing and can still be chopped, which removes the garden. No chair required. |
| The Fish Traps | 0 | ● | S | Once drafted, workers may tend a lake or coastal tile into fish traps for one charge: +1 food and +1 production. No chair required. |
| Sweet Water | 0 | ● | S | Towns beside a river or lake gain +1 happiness. Worked freshwater tiles gain +1 food. |
| The Seed Grain | 0 | ◆ | S | Towns you found start with one extra citizen. |
| The Spirits of Place | 0 | ● | P | Your capital gains +1 faith. Towns working at least two wild tiles gain +1 faith. |
| The Beating of the Bounds | 0 | ● | S | Each town you found claims one extra wild hex of your choice next to its borders. |
| Levy of the Land | 1 | ◆ | S | Cities may spend one citizen to gain production equal to the food it took to grow that citizen. A city may levy once every five turns. |
| Tinkers' Guild | 1 | ● | S | Workers you produce or purchase gain +1 charge. |
| The Muster of the Fields | 1 | ◆ | S | Cities may spend one citizen to muster their best legally available melee unit. This shares the city's five-turn levy limit. The unit counts as trained. |
| The Old Songs | 1 | ● | S | Worked unimproved land gains +1 culture. |
| The Local Census | 1 | ● | S | A town working at least four improved or tended tiles costs one less authority, minimum one. |
| The Wild Orchards | 1 | ● | S | Once drafted, workers may tend a forest or jungle tile into a wild orchard for one charge: +1 food and +1 gold. No chair required. |
| The Burning Season | 1 | ◆ | S | Once drafted, each town may burn its wild grassland and plains once every 30 turns. They become burned country, a tended work worth +1 food. After each burning they yield 1 less food for 3 turns, then +1 food and +1 production for 20 turns. No chair required. |
| Dark Earth | 1 | ◆ | S | Worked farms gain +1 food once they have stood for 20 turns, and another +1 food once they have stood for 50 turns. |
| The Three Sisters | 1 | ● | S | Worked farms beside a plantation or a pasture gain +1 food and +1 production, once per farm. |
| The Commons | 1 | ◆ | P | Each town gains +1 happiness for every two wild tiles it works, at most +3. |
| The Hard Country | 1 | ● | S | Worked desert and tundra tiles gain +1 food and +1 production. |
| The Master Builders | 1 | ● | S | Towns working at least three mines, quarries or lumber mills give +1 renown a turn, favouring great engineers. |
| The Prospectors | 1 | ● | S | Prospecting costs workers and explorers no charge. Worked mines on a seam you surfaced gain +2 production. |
| Daughter Towns | 1 | ◆ | P | While a town you found has fewer than five citizens, the town that trained its settler gains +2 food. |
| Six Gardens | 1 | ◆ | S | Needs tended land. Goal: have six tended tiles. Reward: every town gains 30 food, your capital gains a free worker, and a free Order hand. The card then leaves its chair. |
| The Watercourses | 2 | ◆ | S | Farms directly beside a river irrigate adjacent farms. Irrigated worked farms gain +1 production. Water does not relay beyond that first step. |
| The Highlands | 2 | ● | S | mines and quarries on hills gain +2 science and +1 production. |
| The Coast | 2 | ● | S | Worked fishing boats gain +2 food and +2 culture. |
| Provincial Councils | 2 | ◆ | S | Connected towns other than the capital cost one less authority, minimum one, and gain +1 happiness. |
| The Grain Dole | 2 | ● | S | Cities of at least ten population gain +4 happiness and retain an additional 20% of food spent on growth. |
| The Waterworks | 2 | ◆ | P | Aqueducts cost 25% less production. Towns with an Aqueduct gain +1 happiness for every four citizens, at most +3. |
| The Landscape Garden | 2 | ◆ | S | Needs tended land. Tended tiles beside a great-person work or a wonder gain +2 culture. |
| The Engineers' Yards | 2 | ● | S | Manufactories gain +2 production. Worked farms, mines, quarries and lumber mills beside a manufactory gain +1 production. |
| The Tended Country | 2 | ◆ | S | Needs tended land. Tended tiles gain +1 production. Each worked farm gains +1 food if a tended tile stands beside it, once per farm. |
| The Woodwrights | 3 | ○ | S | Forest and jungle chops grant 100% more production. |
| Seasonal Levies | 3 | ◆ | S | After a city spends a citizen on a levy, it gains +40% food for ten turns. A city can gain this at most once every twenty turns. |
| The Long Tending | 3 | ○ | S | Needs tended land. Tended tiles gain +1 food for every 25 turns since they were tended, at most +3. |
| The Mountain Schools | 3 | ◆ | P | Towns beside a mountain gain +10% science. Worked mines and quarries beside a mountain gain +1 science. |
| A Court of Engineers | 3 | ○ | S | Gain +50% renown, but great-person offers contain only great engineers. |
| The Wide Country | 3 | ◆ | S | Goal: while this card is seated, claim twelve hexes by outposts, cleared camps or buying. Reward: your three smallest towns each gain two citizens, and every town gains +2 happiness for 30 turns. The card then leaves its chair. |
| The Land's Great Work | 4 | ○ | S | The city building the Magnum Opus gains +5% production toward it for each of your towns of at least eight citizens, at most +40%. |
| The Garden of the World | 4 | ○ | S | Needs tended land. Tended tiles gain +2 food, +1 production and +1 culture. Towns working at least six tended tiles gain +3 happiness. |
| The Corvée | 4 | ○ | S | While one of your cities builds the Magnum Opus, each of your other towns of at least ten citizens may spend one citizen for it, once every five turns. The Opus city gains production equal to the food that citizen took to grow. This shares the town's levy limit. |
| The Master of Works | 4 | ○ | P | When a great engineer rushes the works in the city building the Magnum Opus, each of your towns with a manufactory also sends that city one turn of its own production. |
| The Philosophers' Peaks | 4 | ◆ | P | Each town gains +2 science for every mountain in its borders, at most +6. |
| The Inheritance of Fields | 4 | ◆ | S | Worked improvements and tended works that have stood for at least 60 turns gain +1 production. Tended ones also gain +1 culture. |
| The Measure of the Land | 4 | ○ | P | Every town gains +1 production for every 25 hexes your empire owns, at most +6. |
| The Mother City | 4 | ○ | P | Your capital gains +1 production for every citizen it has. |
| The General Levy | 4 | ○ | S | Your towns may spend one citizen to raise their best melee unit. At peace a town may do this once every five turns, sharing the levy limit; while you are at war, once every turn. Units raised this way cost no upkeep inside your borders. |
| The Domesday Survey | 4 | ○ | S | Goal: own at least 150 hexes and work at least 50 improved or tended tiles at the same time. Reward: each town gains production equal to five times the improved or tended tiles it works, toward what it is building, and you gain a great engineer. The card then leaves its chair. |

### Commerce

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Salt Tithes | 0 | ● | P | Gain +3 gold per distinct accessible improved luxury you produce. Worked luxury tiles gain +1 food. |
| The Merchant Shrines | 0 | ● | P | Your capital gains +2 faith. Cities working an improved luxury gain +1 faith, once per city. |
| Travellers' Letters | 0 | ● | P | Your capital gains +2 science and +2 culture, plus +1 of each per foreign empire met, no cap. |
| The Pathfinders' Company | 0 | ◆ | S | Scouts gain +1 sight and +1 movement. |
| The Assayer's Rule | 0 | ◆ | S | Worked resource tiles that supply gold gain +1 gold. |
| The Mineral Trade | 0 | ● | S | Worked mines and quarries gain +2 gold but lose 1 production. |
| Coastal Estates | 0 | ● | S | Worked plantations and fishing boats gain +1 food and +1 gold. |
| Land Speculation | 0 | ◆ | P | Your cities gain +25% gold. Your capital loses 2 happiness. |
| Private Patronage | 1 | ○ | P | Your cities gain +25% gold. Producing ordinary buildings normally takes 20% more production. Empire buildings and wonders are unaffected. |
| Civic Receipts | 1 | ◆ | S | Buying any building grants culture equal to 10% of the gold paid, with no cap. |
| Provisioning Contracts | 1 | ● | S | Domestic routes grant their destination +2 food and +2 production. |
| The Common Road | 1 | ● | S | Your foreign routes grant you +2 gold, +2 science and +2 culture. Each also grants its host city +2 gold. |
| Venture Routes | 1 | ◆ | P | Your trade routes gain two turns of range. Trade routes between cities at least fifteen hexes apart gain +100% gold. |
| The Factors' Houses | 1 | ● | P | Your cities holding your trading post gain +2 gold and +4 culture, and +25% gold. |
| The Planters' Charter | 1 | ◆ | S | Once drafted, unlock the Plantation House for construction. No chair required. The building is purchased with gold; its payload is specified below. |
| Bought Swords | 1 | ◆ | P | Your cities gain +25% gold. Military units take 10% more production to train. Purchased units count as trained. |
| Established Routes | 1 | ◆ | P | A trade route you have kept up for at least thirty turns pays 50% more. A route that lapses, is cancelled or is plundered begins its term again. |
| The Market Writ | 1 | ◆ | P | +1 authority for every two Markets in your empire. Your cities gain +25% gold. |
| Commercial Education | 1 | ● | P | Gold buildings provide +2 science. |
| Ore Caravans | 1 | ● | P | Trade routes gain +1 gold for every mine in their origin city. |
| Frontier Investment | 1 | ◆ | P | In your cities of 5 population or fewer, domestic trade routes pay double, and those cities gain +25% gold. |
| Financed Industry | 1 | ○ | P | Cities gain production equal to 20% of their gold yield. Every city loses 3 food. |
| The Home Market | 2 | ● | P | Cities receiving at least two of your domestic routes gain +20% food, +20% production and +2 happiness, once per city. |
| The Caravanserai Network | 2 | ● | S | Each city receiving a domestic trade route grants +2 happiness (once per city); +1 production and +1 gold on domestic trade routes. |
| The Foreign Factor | 2 | ● | P | Each foreign city holding your trading post grants you +3 gold and its host city +1 gold per turn while you are at peace and the host is not blockaded. |
| The Money Lenders | 3 | ○ | P | Earn interest equal to 2% of your treasury each turn, with no cap. |
| Mining Districts | 2 | ◆ | S | Worked mines gain +1 gold and +1 science for every two adjacent mines. |
| Royal Assays | 2 | ◆ | P | Each improved luxury resource deposit with a mine provides one additional copy of that luxury. |
| Foreign Procurement | 2 | ◆ | S | Ignore strategic resource requirements when purchasing units. All units cost 20% more. |
| The League of Cities | 2 | ○ | P | Cities with one of your paying outgoing routes gain +15% production and cost one less authority, minimum one. Cities without one lose 10% gold. |
| The Exchange | 2 | ◆ | P | Each different foreign empire your routes currently serve grants +5% science and culture empire-wide. Foreign routes to your cities grant +2 science and +2 culture to both you and the sender. |
| The Brokers' Redraw | 2 | ○ | S | You may reroll a draft with gold instead of faith. All other purchasing is 10% more expensive. |
| The Scholars' Roads | 2 | ○ | P | Lose 4 route capacity. Your routes gain +2 science and +2 culture, and gain +50% science and culture. |
| The Customs Houses | 2 | ◆ | P | Customs houses gain +3 gold and +1 renown. Cities with a customs house gain +25% gold. |
| Strategic Exports | 2 | ◆ | P | Trade routes gain +1 science per improved strategic resource deposit in their origin city. Your strategic resource deposits provide twice their normal quantity. |
| Caravanserai Cities | 3 | ◆ | P | Caravanserais can be built in every city. Cities with a Caravanserai gain +20% gold. |
| The Endowment | 3 | ◆ | P | Purchased buildings provide +1 science each, at most +3 per town. |
| Merchant Princes | 4 | ○ | S | Gold may purchase great-person drafts at the existing escalating offer price, with normal availability and purchase limits. |
| The World's Exchange | 4 | ○ | S | +10% production toward the Opus for each foreign empire your trade routes reach, at most +40%. |
| The Chartered Metropolis | 3 | ○ | P | Cities with at least three of your paying outgoing routes gain +25% food, production and culture, but each costs +4 authority while qualified. |
| The Admiralty of Trade | 3 | ○ | S | A sea trade route between two cities that both hold your trading post has no range limit. |
| The Merchant Works | 4 | ○ | P | Cities building a world wonder, an empire building or the Opus gain production equal to 25% of their gold, and lose 20% of their gold. |
| The Gilded Scaffold | 3 | ○ | P | You may purchase world wonders. All your cities lose 15% production. |
| A Court of Merchants | 3 | ○ | S | Gain +50% renown, but great-person offers contain only Great Merchants. |
| Corner the Market | 2 | ◆ | S | Commission. Goal: control four copies of one luxury, counting copies you receive in deals. Reward: a great merchant and 150 gold. The card then leaves its chair. |
| The Strongroom | 4 | ○ | S | Commission. Goal: end a turn with at least 2,000 gold in your treasury. Reward: culture equal to a fifth of your treasury at that moment, and a great merchant. The card then leaves its chair. |
| The Map Sellers | 0 | ● | P | Your capital gains +1 gold and +1 culture for every 40 hexes you have revealed, at most +8 of each. |
| The Carters' Guild | 0 | ● | P | Your cities connected to your capital by road, other than the capital, gain +1 food and +2 gold. |
| The Nest Egg | 0 | ● | P | Your capital gains +1 culture for every 50 gold in your treasury, at most +4. |
| The Staple Right | 1 | ● | P | Gain +2 gold and +1 culture for each luxury you hold two or more copies of. |
| The Waqf | 2 | ● | P | Faith buildings you bought with gold provide +2 faith and +1 culture. |
| The Silk Road Monks | 2 | ◆ | S | Your trade routes carry 100% more religious pressure. Trade routes you send to a city that follows your religion gain +2 gold and +2 culture. |
| Numidian Cavalry | 2 | ◆ | S | Once drafted, unlock Numidian Cavalry, a Horseman replacement. No chair required. Gains +1 combat strength per distinct luxury you control; luxuries obtained only through the Silk Road contribute +0.5 instead. Normal technology requirements apply. |
| Houses of Account | 2 | ● | P | Gold buildings provide +2 happiness and +1 renown. |
| A Guild Commission | 3 | ◆ | S | Commission. Goal: buy five buildings with gold while seated. Reward: a free great-person draft, the same offer Merchant Princes sells for gold. The card then leaves its chair. |
| The Monopoly | 3 | ○ | P | For each luxury you hold three or more copies of and no other empire holds, gain +5 gold, +3 culture and +1 happiness in every city. |
| The Customs Service | 3 | ◆ | S | Trade routes leaving a city whose borders hold a customs house gain +2 gold and +2 culture. |
| The Bourse | 3 | ○ | E | Gold buildings produce 50% more of their own yields. |
| Patrons Abroad | 4 | ○ | P | Your city building the Magnum Opus gains +3 production for each foreign city holding your trading post. |
| The Merchant Dynasties | 4 | ◆ | P | Each customs house inside your borders gives its city +3 science and +3 culture, whether or not it is worked. |
| The Spice Exchange | 4 | ○ | P | Every city gains +5% science and +5% culture for each luxury you hold two or more copies of, at most +30%. |
| Money at Work | 4 | ○ | P | Your capital gains +1 production for every 50 gold in your treasury, at most +40. |
| Bought and Paid For | 4 | ○ | P | Buildings you bought with gold provide +1 production and +2 culture each, counting at most six per city. |
| The Hired Garrison | 4 | ◆ | S | A city with a world wonder or the Magnum Opus at the front of its queue may buy any number of military units with gold each turn. |
| The Neutral Flag | 4 | ◆ | P | Your trade routes to an empire that is at war with another empire gain +100% gold and +50% science. |
| The World's Fair | 4 | ○ | S | Commission. Goal: have six trade routes running at the same time, foreign or domestic. Reward: +50% science and +50% culture in every city for ten turns. The card then leaves its chair. |
| The Great Loan | 4 | ○ | S | When you seat this card, gain gold equal to twenty turns of your gold income. For the next forty turns your cities lose 25% gold. The card then leaves its chair. |
| The Trade Winds | 4 | ○ | S | Gain +3 trade route capacity. Your trade routes reach 50% farther. |

### Devotion

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| First Rites | 0 | ● | P | Shrines cost 25% less production and give +2 faith. |
| Lay Offerings | 0 | ● | P | Worked mines and camps gain +1 faith. A city working at least two gains +3 gold, once per city. |
| The Monastic Table | 0 | ● | P | Cities keeping a rite gain +2 food and +2 production. |
| The Votive Fields | 0 | ● | S | Worked farms and plantations in cities keeping a rite gain +1 food and +1 faith. |
| The Omen Schools | 0 | ● | P | Cities keeping a rite gain +2 science and +1 culture. |
| Rites of Labor | 0 | ◆ | P | Cities keeping a rite gain +20% production toward buildings and +2 gold. |
| The Rites Commonwealth | 0 | ○ | P | Cities keeping a rite gain +3 production and demand 15% less population happiness. Your cities without a rite gain −1 happiness. |
| Monastic Copyists | 1 | ● | P | Cities with a Temple and Library gain +3 science and +3 culture. |
| The Living Hymnal | 1 | ◆ | P | While active, gains +2 science and +2 culture per turn in your capital for each foreign city first converted to your religion, at most +24 of each. |
| The Saints' Fields | 2 | ● | S | Worked Holy Sites give +3 food and +3 production. A city working one gains +2 happiness, once per city. |
| The Cathedral Works | 2 | ● | P | Gain +30% production toward Cathedrals. Cities with one gain +5 production and +5 science. |
| The Spiritual Host | 2 | ◆ | S | Your military units gain +4 strength in territory following your religion. Temple cities gain +2 happiness while you are at war. |
| The Congregation Rolls | 2 | ◆ | P | Each foreign city following your religion gives your capital +2 gold and +2 science, at most +24 of each. |
| The Second Prophet | 2 | ◆ | S | Prophets purchased while this is seated begin with one additional charge. Existing faith prices and charge costs remain. |
| The Festival Calendar | 2 | ◆ | P | Cities keeping a rite gain +20% food and +20% culture. |
| The Consecrated Workshops | 3 | ● | P | Cities keeping a rite gain +20% production. Their Cathedrals give an additional +4 production. |
| The Holy Army | 3 | ◆ | S | Your military units gain +5 strength in territory following your religion. Cities holding a relic train military units 30% faster. |
| The Great Consecration | 3 | ○ | S | Each foreign city following your religion grants +5% production toward the Magnum Opus, at most +40%. |

### Scientific

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| The Almanac | 0 | ● | P | Libraries cost 25% less production and give +1 production. |
| The Scribes' Hall | 0 | ● | P | Cities with a Library gain +1 science per four citizens and +1 culture per three citizens. |
| Field Notebooks | 0 | ● | S | Claiming a ruin grants 15 science, 20 culture and 20 gold. |
| Practical Astronomy | 0 | ◆ | P | Scouts and ships gain +1 sight. Coastal cities with a Library gain +3 food. |
| The Long Study | 0 | ◆ | P | A Library at least twenty turns old grants +2 culture and +1 renown. At forty turns, these bonuses become +4 culture and +2 renown. |
| Working Estates | 1 | ● | S | Worked great-person improvements gain +3 food and +2 gold. |
| The Assay | 1 | ● | P | Gain +2 science and +2 gold for each distinct strategic resource type you can access. |
| The Endowed Provinces | 1 | ◆ | P | Each city working at least one great-person improvement gains +4 food and +3 production, once per city. |
| Learned Commissions | 1 | ● | S | Library cities gain +25% production toward empire buildings. Completing each institution type for the first time grants 40 culture and 20 faith. |
| The Old Academy | 1 | ◆ | S | An Academy at least twenty turns old gains +2 food and +2 production. At forty turns these bonuses become +4 of each. |
| The Royal Society | 2 | ● | S | Each empire building grants +2 renown. Its city gains +2 happiness, once per city. |
| The Learned Chancery | 2 | ● | S | Cities with an empire building cost one less authority, minimum one, and gain +50% border growth. |
| The Academy Quarter | 2 | ◆ | P | A city with an empire building gains +3 production and +3 gold per different great-person work type it works, at most +15 of each. Multiple institutions do not multiply this benefit. |
| The Quiet Faculties | 2 | ○ | P | Cities working a great-person improvement gain +25% food and +20% production, but produce military units 25% more slowly. |
| The Patent Rolls | 2 | ◆ | S | Completing a technology before any other empire grants 20 culture and 10 renown. |
| Enduring Institutions | 2 | ◆ | P | A city with an empire building at least twenty turns old gains +2 happiness and +15% production, once per city. |
| Master Artificers | 3 | ◆ | S | Worked Academies and Manufactories gain +6 production and +6 gold. |
| The Society of Artificers | 3 | ○ | P | A city with an empire building working an Academy or Manufactory gains food and culture each equal to 20% of its base production, excluding conversion outputs. |
| The Long Inheritance | 3 | ○ | S | Cities working a great-person improvement at least twenty turns old gain +30% production toward empire buildings, wonders and the Opus. A mature empire building there adds another +15%. |
| The Learned Realm | 3 | ◆ | S | Each city working a great-person improvement grants +1 authority capacity, at most +8. Cities with a Library at least twenty turns old gain +2 happiness. |

### Magisterial

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Civic Granaries | 0 | ● | P | Monuments give +2 food and +2 production. |
| The Civic Accounts | 0 | ● | P | Monuments give +2 gold and +2 science. |
| Patronage | 0 | ● | P | Your capital gains +1 renown per four citizens. Monuments give +1 culture. |
| The Temple of the Muses | 0 | ● | P | Culture buildings give +2 faith each. |
| The Sculptors' Quarries | 0 | ● | S | Worked quarries give +1 production and +1 culture. Cities working one gain +15% production toward buildings. |
| The Pageant Fields | 0 | ● | P | Worked farms and plantations in cities with a Monument gain +1 food. Cities working at least three such tiles gain +2 culture, once per city. |
| Hearth Ceremonies | 0 | ● | P | Cities with a Monument and Shrine gain +2 faith and +2 gold. |
| The Wonder-Feasts | 0 | ◆ | P | Cities producing a wonder gain +4 food and +2 happiness. |
| The Civic Nursery | 0 | ◆ | S | Cities with a Monument produce workers and settlers 20% faster. |
| The Court Stewards | 0 | ◆ | P | Your capital gains +1 food and +1 gold per three citizens while it has a Monument. |
| The Founding Pageant | 0 | ○ | S | Founding a city grants a free Monument and 25 culture. Your capital produces settlers 25% faster. |
| The Capital of Letters | 0 | ○ | P | Your capital gains +20% food and +20% gold while it has a Monument and Granary, but trains military units 15% more slowly. |
| Master Masons | 0 | ● | S | Gain +25% production toward Monuments. Completing a culture building for the first time in a city grants 20 production there. |
| The Chronicle of Works | 0 | ◆ | P | While active, gains +1 science and +1 gold per turn for each culture building you complete for the first time in a city, at most +30 of each. |
| The Chancery | 1 | ● | P | Gain +1 authority capacity per two Monuments, at most +3. Cities with at least two culture buildings gain +2 gold. |
| The Civic Stage | 1 | ● | P | Cities with at least two culture buildings gain +2 happiness and +3 food. |
| The Public Copyists | 1 | ● | P | Cities with a Monument and Library gain +3 science and +2 culture. |
| The Artisan Wages | 1 | ● | P | Culture buildings give +2 gold and +1 production each. |
| Provincial Patrons | 1 | ● | P | Noncapital cities with at least two culture buildings gain +1 renown and +2 culture. |
| The Citizens' Watch | 1 | ● | S | Cities with at least two culture buildings train military units 20% faster and gain +3 defence. |
| The Harbour Festival | 1 | ● | P | Harbours give +2 culture and +2 food. Coastal cities with a Monument gain +1 happiness. |
| The Pageant Schools | 1 | ● | P | Cities with a Monument and Temple gain +2 science and +2 faith. |
| The Grand Fairs | 1 | ● | P | Cities with a Market and Monument gain +3 culture and +3 gold. |
| The Groundskeepers | 1 | ◆ | S | Worked great-person improvements give +3 food and +3 production. |
| The Laureate | 1 | ◆ | P | Cities working a great-person improvement gain +3 culture, +2 science and +1 renown, once per city. |
| The Guild of Masons | 1 | ◆ | P | Gain +25% production toward wonders. Cities producing a wonder lose 2 gold per turn. |
| The Civic Assemblies | 1 | ◆ | P | Gain +1 authority capacity per two culture buildings, at most +4. Culture buildings cost 20% less production in noncapital cities. |
| The Patrons' Road | 1 | ◆ | P | Connected noncapital cities with a Monument gain +3 gold and +2 production. Domestic routes from such cities give their destination +2 culture; your foreign routes from them give you +2 culture. |
| The Great Patrons | 1 | ◆ | S | Each wonder you hold gives +2 family-neutral renown. Cities containing a wonder purchase culture buildings for 20% less gold. |
| The Muses' Call | 1 | ○ | P | Gain +20% renown. Cities working a great-person improvement gain +3 food and +3 production, once per city. |
| The Artisan Court | 1 | ○ | S | Cities working a great-person improvement gain +2 renown and purchase culture buildings for 25% less gold. |
| The Working Court | 1 | ○ | P | Cities with a Monument gain production equal to 20% of their base culture, excluding conversion outputs. |
| The Festival Season | 1 | ○ | P | Cities with a Garden and Amphitheater gain +20% food and +20% gold. Each qualifying city costs +2 gold upkeep. |
| The Master Workshops | 1 | ◆ | S | Completing a culture building for the first time in a city grants 25 production there and 20 gold. |
| The Court Archives | 2 | ● | P | Culture buildings give +2 science each. Cities with at least two gain +5 gold. |
| The Public Gallery | 2 | ● | P | Cities with at least three culture buildings gain +6 food and +3 happiness. |
| The Monumental Provinces | 2 | ● | P | Connected noncapital cities with a Monument gain +5 production and +3 culture. |
| The Civic Faith | 2 | ● | P | Culture buildings give +3 faith each. Cities containing a wonder gain +3 happiness. |
| The Provincial Chancery | 2 | ● | P | Gain +1 authority capacity per noncapital city with at least two culture buildings, at most +8. Such cities gain +3 science. |
| The Maritime Galleries | 2 | ● | P | Harbours give +5 culture and +3 science. Ships trained in a city with at least two culture buildings gain +3 strength on creation. |
| The Provincial Stages | 2 | ● | P | Noncapital cities with at least two culture buildings gain +2 renown and +3 food. |
| The Master's Presence | 2 | ◆ | P | Cities working a great-person improvement gain +20% production toward buildings and +15% gold. |
| The Grand Tour | 2 | ◆ | P | Cities containing a wonder gain +5 culture and +5 science. Cities working a great-person improvement gain +2 happiness. |
| The Learned Patron | 2 | ◆ | P | Cities with at least two culture buildings gain science equal to 10% of their base culture, at most +12 science per city. Conversion outputs are excluded. |
| The Performers' Treasury | 2 | ◆ | P | Cities with at least two culture buildings gain gold equal to 20% of their base culture, excluding conversion outputs. |
| The Civic Harvest | 2 | ◆ | P | Cities of at least ten population with at least two culture buildings gain +25% food and +3 happiness, and retain an additional 20% of food spent on growth. |
| The Senate Charter | 2 | ◆ | S | Unlocks the capital-only Assembly Hall. A city with one gains +3 happiness and +20% production toward buildings. |
| The Sculptors' Schools | 2 | ◆ | S | Worked great-person improvements give +3 science and +3 gold. Their cities gain +1 renown, once per city. |
| The Patrons' Fleet | 2 | ◆ | S | Cities with a Harbour and at least two culture buildings train ships 35% faster. Your ships gain +1 movement. |
| The Monumental Court | 2 | ○ | S | Cities containing a wonder gain +3 renown and +25% production toward culture buildings and wonders, once per city. |
| The Civic Commonwealth | 2 | ○ | S | Cities with at least three culture buildings demand 20% less population happiness and cost one less authority, minimum one. |
| The Laureate Cities | 3 | ● | P | Cities of at least twelve population with at least two culture buildings gain +25% culture and +10% science. |
| The National Galleries | 3 | ● | P | Culture buildings give +5 food and +5 gold each. Cities with at least three gain +4 happiness. |
| The Provincial Academies | 3 | ● | P | Connected noncapital cities with a Library and at least two culture buildings gain +20% production and +10% science. |
| The Civic Pantheon | 3 | ● | P | Cities containing a wonder gain +25% faith and +20% gold. Wonders give +10 culture each. |
| The Masters' Domain | 3 | ◆ | P | Worked great-person improvements give +8 production and +8 food. Their cities gain +20% gold, once per city. |
| The Great Chancery | 3 | ◆ | P | Gain +2 authority capacity per city with at least three culture buildings, at most +12. Such cities gain +20% culture. |
| The Honoured Dead | 3 | ◆ | P | Your capital gains +4 science and +8 production per distinct great person you have spent this game, at most +60 science and +120 production. |
| The Pageants of Peace | 3 | ◆ | S | While at peace with every foreign empire, cities with at least two culture buildings gain +20% culture and +2 happiness. |
| The Living Canon | 3 | ○ | P | Cities with at least three culture buildings gain +5% food and +5% production per distinct great-person family whose legacy you currently hold, at most +25% each. |
| The Universal Court | 3 | ○ | P | Cities with at least three culture buildings gain food and gold each equal to 25% of their base culture. Conversion outputs are excluded. |
| The Wonder Commonwealth | 3 | ○ | P | Cities containing a wonder gain +25% production and +25% food. Your cities without a wonder gain +10% culture instead. |

### Cross-type

| Order | Decks | Band | Rarity | Role | Effect |
|---|---|---|---|---|---|
| Frontier Garrisons | Dominion · Expansionist | 0 | ● | P | Garrisoned cities of at most five population gain +2 food. |
| Military Colonies | Dominion · Expansionist | 1 | ◆ | S | Cities with a Barracks gain +30% production toward settlers and workers. |
| The Escorted Roads | Dominion · Commerce | 1 | ◆ | S | Routes whose origin has a garrison gain +3 gold. Naval units gain +2 strength while adjacent to one of your traders. |
| Field Academies | Dominion · Scientific | 1 | ◆ | S | Your first combat kill each turn grants 15 science. Cities with a Library produce siege units 25% faster. |
| The Engineer Corps | Dominion · Scientific | 3 | ◆ | S | Siege units gain +1 movement. Cities with a Workshop gain +20% production toward siege units and +2 science while at war. |
| The Imperial Examinations | Dominion · Magisterial | 1 | ◆ | P | Garrisoned cities with a Monument gain +2 culture and +1 scholar renown. |
| Examinations of State | Dominion · Magisterial | 2 | ○ | P | Cities with a Monument and a garrison gain +1 science and +1 culture per three citizens. Ungarrisoned cities receive no bonus. |
| Market Gardens | Expansionist · Commerce | 0 | ● | S | Farms beside a road gain +1 gold. Domestic routes grant an additional +1 food to their destination. |
| The Provincial Fair | Expansionist · Commerce | 2 | ◆ | P | Connected noncapital cities with a Market gain +2 food. Their worked plantations, camps and pastures gain +1 gold. |
| Sacred Groves | Expansionist · Devotion | 0 | ◆ | S | Worked, unimproved forests gain +1 food and +1 faith. |
| Hydraulic Schools | Expansionist · Scientific | 1 | ● | P | Cities with an Aqueduct gain +1 science per three citizens and +20% production toward science buildings. |
| The Sculpted Landscape | Expansionist · Magisterial | 3 | ◆ | S | Farms beside a great-person improvement gain +1 food and +1 culture. Each farm receives this once regardless of the number of adjacent works. |
| The Tithe | Commerce · Devotion | 2 | ○ | P | Cities with a Temple gain gold equal to 25% of their base faith. Gold purchases of religious buildings there cost 30% less. |
| Merchant Scholars | Commerce · Scientific | 1 | ◆ | S | Foreign routes from a city with a Library gain +3 science. |
| Travelling Players | Commerce · Magisterial | 0 | ◆ | S | Foreign routes from a city with a Monument gain +2 culture. |
| Cloister Schools | Devotion · Scientific | 1 | ◆ | P | Cities with both a Temple and a Library gain +3 food and +3 science. |
| The Cloister | Devotion · Scientific | 2 | ○ | P | Cities with a Temple gain science equal to 20% of their base faith. Their Libraries and Universities each gain +2 food. |
| Sacred Commissions | Devotion · Magisterial | 1 | ◆ | S | Cities with a Holy Site gain +25% production toward wonders. Completing a wonder grants 40 faith. |
| Illuminated Treatises | Scientific · Magisterial | 0 | ● | P | Cities with both a Library and a Monument gain +1 science and +1 culture. |
| The House of Wisdom | Scientific · Magisterial | 3 | ◆ | S | Worked Academies gain +2 culture. Cities working an Academy gain +1 renown and +20% production toward wonders. Each city receives the city bonus once. |
| Marcher Lords | Dominion · Expansionist | 2 | ◆ | P | Cities founded within four hexes of a foreign border gain +3 defence and +2 production, and cost one less authority, minimum one. |
| The Merchant Navigators | Commerce · Scientific | 2 | ● | S | Ships gain +1 movement. Routes from a city with a Harbour and a Library gain +3 science. |
| Letters of Marque | Dominion · Commerce | 3 | ○ | S | Naval combat kills grant 40 gold. Cities with a Harbour purchase naval combat units for 25% less gold, but produce those units 20% more slowly. |
| The Exchange of Discoveries | Commerce · Scientific | 3 | ◆ | S | +1 science on mines and quarries on a resource. Additional +1 if the city has a market. |
| Garden Provinces | Expansionist · Magisterial | 2 | ● | P | Connected cities with a Monument gain +2 food and +2 culture. |
| Pilgrim Markets | Commerce · Devotion | 1 | ◆ | S | Routes gain +2 gold and +2 faith if either endpoint contains a Holy Site. This pays once per route even when both endpoints qualify. |
| The Grain Exchange | Expansionist · Commerce | 1 | ◆ | S | Domestic routes from a city with a Granary give +3 food to their destination. Cities receiving one gain +1 happiness. |
| The Cosmopolitan Court | Commerce · Magisterial | 3 | ○ | S | Cities with a culture building gain +1 renown per outgoing foreign route, at most +3 per city. Great-person improvements worked by such cities gain +2 gold. |

### Generic

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Hearth Stores | 0 | ● | S | Your capital gains +1 food. |
| Watchmen | 0 | ● | S | Friendly combat units gain +2 strength when defending in your territory. |
| Resting Camps | 0 | ● | S | Friendly units that take no action this turn heal an additional 5 health when otherwise eligible to heal. |
| Local Markets | 0 | ● | S | Your capital gains +2 gold. |
| The Village Scribe | 0 | ● | S | Your capital gains +1 science. |
| Public Gatherings | 0 | ● | S | Your capital gains +1 culture. |
| Household Altars | 0 | ● | S | Your capital gains +1 faith. |
| Boundary Stones | 0 | ● | S | Cities with a Monument expand their borders 20% faster. This does not increase draft culture. |
| Public Wells | 1 | ● | P | Cities without freshwater gain +1 food. |
| Civic Peace | 1 | ● | S | Gain +1 empire happiness. |
| Local Clerks | 2 | ● | S | Gain +1 authority capacity. |
| Public Hospitals | 3 | ● | S | Cities of at least eight population gain +1 happiness. |
| Common Ledgers | 3 | ● | P | Cities with a Market gain +1 science; cities with a Library gain +1 gold. |

### Notes and deferred halves (from the data rows)

- **Muster Rites** — A unit bought outright counts as trained, and pays this once.
- **The King's Levy** — The levy is raised, not bought: it goes on no payroll, and everything that rewards a unit finished rewards this one.
- **Marine Drill** — The blessing is hung on the piece the moment it wades ashore, and lasts the turn it landed.
- **Riders of the Steppe** — A raid costs a single point of movement, so a rider who is forgiven one is forgiven the raid.
- **The Relay Stations** — † Moving a unit from one connected city to another in a single order needs a new order on the map, which the game does not have yet.
- **War Reparations** — † The game does not yet pay anything when a peace is signed, or remember which cities each side took during a war.
- **Naval Supremacy** — The second share is paid only where both are true, so a coastal town taken in war keeps both lines.
- **Commission: A Victor's Peace** — † The game does not yet notice a peace being signed or an empire being destroyed, or remember which cities each side took during a war.
- **The Legions' Labour** — † Disbanding a unit pays nothing today, so the game cannot yet put a disbanded unit's work into a wonder.
- **Circumvallation** — † Stopping a rival town's work on the great work, and seeing which rival towns are raising one, both need changes the game does not have yet.
- **The Fish Traps** — The traps go on coastal water, which a worker reaches by boat. A lake cannot be reached yet, so traps on a lake wait.
- **The Rope Stretchers** — The game does not yet announce the moment a worker finishes a work, so no card can pay for it. † a town is paid in labour when a worker finishes a mine, a quarry or a lumber mill on its ground
- **The Beating of the Bounds** — For now the town takes the hex its borders would have grown into next, rather than one you choose.
- **The Old Songs** — Open water your people work counts as unbuilt ground here: the game tells works from wild, and not land from sea.
- **The Burning Season** — For now a worker burns one grassland or plains hex at a time into burned country, and the season of lean and rich years after a burning is not built.
- **Outposts** — No work can yet be raised outside your borders, and only a town or a great general can claim ground. † a worker plants an outpost on wild ground near your border, and it claims that ground and the ring around it for your nearest town
- **The Prospectors** — Prospecting already costs no charge. The mine bonus is paid on any surveyed hill that carries a resource, whoever surveyed it.
- **Daughter Towns** — For now the small town itself gains the food, because the game does not remember which town trained a settler.
- **Six Gardens** — For now the food arrives over several turns rather than all at once, and the free Order hand is not built.
- **The Watercourses** — For now any fresh water counts as a river, and a farm standing on fresh water counts as irrigated too.
- **The Waterworks** — The saving on the aqueduct is paid as extra production toward it, which comes to the same price.
- **The Breadbasket** — A town told to stop growing moves its people off food, so it has no spare grain for this card to read. † a town that has stopped growing turns its spare grain into contentment and into settlers
- **Migration** — No rule yet moves a citizen from one town to another. † a crowded town sends a citizen to a small town joined to it
- **Veteran Colonies** — Units have no way to retire yet; it needs a new order and a new button. † a soldier standing in one of your towns may retire there, and the town gains food for it
- **The Landscape Garden** — For now only a great person's work counts. A wonder stands inside its town, not on the hex beside the tended tile.
- **The Common Domain** — How far a town may reach is fixed and cannot yet be widened by a law. † large towns work their own ground one step further out than other towns do
- **The Polders** — The ground under a hex never changes during a game, by a deliberate rule, and the board would have to redraw the hex. † a worker turns shallow sea beside your land into grassland
- **Public Works** — A great engineer has no such act yet, and terraces belong to one leader alone. † a great engineer may finish an aqueduct in a town, or raise terraces on its worked hills
- **The Wide Country** — For now only hexes bought with gold count toward the goal, and instead of citizens in the smallest towns, small towns grow faster for the same span.
- **The Land's Great Work** — For now the bonus counts the citizens of your whole empire rather than its large towns.
- **The Heartland** — A reward cannot yet mark one town for the rest of the game. † one town working a great stretch of rich land becomes your heartland, cheaper to hold and happier for good
- **The Master of Works** — For now a great engineer's act simply pays half as much again, wherever it is spent.
- **The General Levy** — Not built yet: soldiers raised this way pay upkeep like any other, inside your borders or out.
- **The Great Migration** — No rule yet moves a citizen from one town to another, let alone between empires. † unhappy foreign towns near your border lose citizens to your happier towns
- **The Encroaching Fields** — A hex never changes hands between empires except when its town is captured. † large towns take unworked hexes from the borders of smaller foreign towns beside them
- **The Domesday Survey** — For now the whole production reward lands in your capital rather than in each town.
- **The Raising of the Land** — A great engineer has no such act yet, and a hex cannot carry a lasting mark. † a great engineer raises every worked hex in one town for good
- **The Two Harvests** — A hex can hold only one work at a time. † an improved hex may also be tended, and counts as both
- **Travellers' Letters** — Half built, and so held whole. Nothing in this game counts the empires you have met, so the letters have nobody to be addressed to. † your capital learns and sings a little more for every foreign empire you have met
- **Letters of Introduction** — Held whole. The world does not announce a first meeting, and no law of yours can put coin in another realm's treasury. † meeting an empire for the first time pays you, and pays them; claiming a discovery pays gold
- **Private Patronage** — Held whole. A discount here would reach the great national houses as well, and the card says it must not. † buying an ordinary building costs less, and raising one the slow way costs more
- **The Common Road** — Half built, and so held whole. A law of yours pays your own books; it has no way to put coin in a foreign market. † a road that ends abroad pays you, and pays the town it ends in
- **The Return Leg** — Held whole. A caravan's earnings are banked where it arrives, and there is no way to send a share of them home. † a road pays the town it left as well as the town it reaches, and the second helping never travels again
- **The Merchant Ledger** — Held whole. No book in this game records which markets your caravans have already found. † hiring a caravan costs less; every new market your roads reach for the first time teaches and sings, for as long as you keep the ledger
- **The Factors' Houses** — Held whole. A standing commercial house is a new fact about a town, and nothing on the board keeps one yet. † the towns where your house is established pay gold and culture, and send caravans more cheaply
- **The Planters' Charter** — Held whole. The house it would open has not been drawn up yet, so the charter has nothing to grant. † drafting this opens the planters' house for building
- **The Convoy** — Half built, and so held whole. A soldier can only be told that another soldier stands beside him; a cart is nobody's formation. † soldiers standing beside one of your carts fight harder; your carts travel further
- **The Treaty Ports** — Held whole. Nothing counts your standing agreements, and no law of yours can pay a foreign capital. † every partner you have a standing agreement with pays your capital, and theirs
- **The Post Riders** — Held whole. A piece can be paid for the ground it stands on, but the road under it is not among the grounds it can be asked about. † a cart or a workman that wakes on your own road travels further that turn
- **Established Routes** — Held whole. A caravan is hired and lapses; nothing remembers that the same road was run before. † a road kept up across renewals pays far more
- **The Market Writ** — A line the design is still writing, entered under a working name so that it is not lost. Both halves would be ordinary law once the card is named and its words are settled. † your markets widen your writ, and land is cheaper to buy
- **The Caravanserai Network** — Held whole. What a road pays cannot be made to rise with the number of towns your other roads reach. † each of your towns that one of your own roads ends in gladdens the realm and enriches the roads themselves
- **The Foreign Factor** — Held whole. A standing commercial house abroad is a new fact about a town, and no law of yours can pay a foreign town. † every foreign town where your house is established pays you, and pays its host, while the peace holds
- **The Consulate** — Held whole. A standing commercial house abroad has no place on the board, and a discount of yours cannot be handed to another empire. † towns where your house is established buy more cheaply, whoever owns them, and each foreign host sings for you
- **The Warehouses** — Held whole. The realm can be asked which luxuries it holds more than one seam of, never which it holds a shed's worth of. † a luxury you dig in real quantity pays gold, culture and contentment
- **The Purple Works** — Held whole. The works it would open has not been drawn up yet, and neither has the good it would make. † drafting this opens the purple works for building
- **The Money Lenders** — Half built, and so held whole. A surcharge reaches the things a city buys, and never the hire of a cart or the calling of a great name. † your treasury pays you interest each turn, up to a ceiling; everything you buy, hire or call for costs more while the lenders are seated
- **The Harbour Chain** — Held whole. Extra roads are granted to the realm or once per town, never counted off a tally of harbours. † your harbours together open more roads than you could otherwise run; a sea road between two of your established houses runs longer
- **The Charter Fleet** — Half built, and so held whole. A piece can be born stronger or hardier, but nothing can be written on it about how far it sees. † hulls bought with gold cost less and are built with keener lookouts for the rest of their lives
- **Export Guilds** — Held whole. Nothing asks whether a particular good is being sold abroad this turn. † a town working a good you are currently selling abroad builds faster and rests easier
- **The Exchange** — Half built, and so held whole. A law of yours pays your own books; it cannot teach a foreign capital. † every foreign realm your roads reach teaches your whole empire, and learns from it
- **The Scholars' Roads** — A line the design is still writing, entered under a working name so that it is not lost. Each of its three halves would be ordinary law once the card is named and its words are settled. † you may run fewer roads, and every one of them teaches and sings far more
- **The Customs Houses** — A line the design is still writing, entered under a working name so that it is not lost. Renown is paid for a town's buildings and never for one hex's works, and no town's gold can be made to go further at the counter. † a customs house pays gold and renown, and its town buys more with what it earns
- **The Dye Vats** — Held whole. The vats they would open have not been drawn up yet, so the charter has nothing to grant. † drafting this opens the dye vats for building
- **The Endowment** — Held whole. A soldier can be marked at his birth by the bank that paid for him; a building cannot. † a building you buy is better for the rest of its life than one you raised
- **The World's Exchange** — Held whole. Hammers behind a thing are raised by a flat share, never by a share counted off how far your roads reach.
- **The Admiralty of Trade** — Held whole. A standing commercial house has no place on the board, and nothing may waive how far a road is allowed to reach. † a sea road between two of your established houses may be run at any distance
- **The Merchant Commonwealth** — Held whole. A standing commercial house has no place on the board, and no law makes a single town cheaper to hold. † your own towns where your house is established and one of your roads ends rest easier and are easier to hold
- **The Merchant Works** — Half built, and so held whole. A town can be asked whether it is raising a wonder, but the realm's single great houses and the last work of all are not a class anything can name. † a town raising one of the realm's great houses turns a share of its coin into stone, and loses a share of its coin while it does
- **Pastoral Shrines** — Not built, both halves together: the law can dress a herder's ground, and nothing can yet ask whether the realm keeps a single pen anywhere at all, which is the clause the capital's hammers hang on. † worked pastures pay an offering of faith and a little more food; your capital works harder while you keep a penned herd anywhere at all
- **Hearth Blessings** — Not built: a town remembers how many people live in it and not how many ever did, so nothing can tell a new high from an ordinary birth. † a town growing past the largest it has ever been gives thanks in faith; a shrine there sets bread on the table besides
- **The Book of Mercy** — Not built: neither observance has been written into the book of rites, so the charter has nothing to open. The row is kept so the two may be written. † a town may mourn, and while it grieves its people ask far less of it and it raises no soldiers; a town may keep a watch, seeing the raiders' camps around it and taking faith for every kill near its walls
- **Pilgrims' Welcome** — Not built: the law can ask whether a town keeps your faith and cannot yet ask whether it keeps somebody's. † towns with a shrine that keep any faith at all, yours or a rival's, eat better and trade better
- **The Healing** — Not built: there is no order a town can give that spends faith on the wounded, and no price quoted for one. † a town may spend faith to mend your soldiers standing in it and beside it
- **The Loaves** — Not built: there is no order a town can give that buys a citizen, and no price quoted for one. † a town may spend faith to seat another citizen at once
- **The Feast Days** — Not built: nothing counts the years a particular town has spent keeping its rites while this law stood. † a town that has kept its rites long enough holds a feast, takes faith for every citizen at it, and is glad of it for a while
- **The Quiet Hours** — Not built: a law may make the realm's rites run longer by a share of their length and cannot yet add a flat count of turns to them. † a rite granted while this stands runs five turns longer than it would
- **The Rites Charter** — Not built, both halves together: the chapel is ready to be opened and the rite charted beside it has not been written into the book of rites. † the chapel may be raised in your towns under its ordinary rules; a town may keep the Rite of Passage, and the soldiers raised there are hardier for the rest of their lives
- **Missionary Hospitality** — Half built and therefore not built: the world now writes down the first time each foreign town turns to your faith, but the roster has no word that gathers every kind of clergy into one line, so nothing can make them cheaper to call. † clergy cost less faith to call; the first time each foreign town turns to your faith your capital is fed and the realm sings
- **The Alms Roads** — Not built: a caravan carries no faith, and a law of yours cannot put coin in another empire's purse. † roads from your temple towns feed and enrich the towns they reach; roads from them into another realm pay you in faith and coin, and pay your host a little too
- **Consecrated Labor** — Not built: the faith bank sells clergy and houses of learning, and nothing opens it to the spade. † workers may be bought with faith in temple towns at the price coin would have paid; and those workers come with an extra charge in them
- **The Votive Companies** — Not built, both halves together: the faith bank does not sell soldiers, and the price the other half charges is no card on its own. † temple towns keeping a rite may buy soldiers with faith at the price coin would have paid; and every soldier you keep costs a coin more while this stands
- **The Concord** — Not built: the waiver on a town's first citizens is a rule of the whole realm and cannot yet be narrowed to the towns that keep a faith. † in a town that keeps any faith the first three citizens ask nothing of the realm's contentment
- **The Parish Rolls** — Not built: the writ is granted to the realm as capacity and is never taken off a particular town's price. † a temple town that keeps any faith is cheaper to hold, though never free
- **Sainthood** — Not built: nothing can set a relic down but the apostle who carries one. † spending a great person in a temple town's country leaves a relic behind in that town if it has none
- **The Pilgrim Road** — Not built: a caravan carries no faith, and a law of yours cannot pay another empire. † your roads ending at a town that holds a relic or works a holy site pay faith to the sender and to the host alike
- **Mission Houses** — Not built, both halves together: a proclamation's weight can be shifted by a flat figure and not by a share of itself, and the roster has no word that gathers the prophet, the apostle and the inquisitor into one line. † your proclamations press harder on the towns that hear them; clergy travel farther in a turn
- **Consecrated Ground** — Not built: land is bought out of the treasury and nothing opens the faith bank to it. † hexes may be bought with faith at the price coin would have paid
- **The Council** — Not built: there is no council a prophet can call, and no offer of beliefs to lay before one. † once an age a prophet at your faith's first seat may set one follower belief aside and choose another from three
- **The Settled Faith** — Not built, both halves together: a proclamation's weight can be shifted by a flat figure and not by a share of itself. † temple towns keeping a rite learn faster and are gladder; and your proclamations press more gently for it
- **Pilgrim Hospices** — Not built: the law can ask whether a town keeps your faith and cannot yet ask whether it keeps somebody's. † great towns with a cathedral that keep any faith eat well and are glad of it
- **The Holy Inquisition** — Not built, both halves together: a town's resistance to another faith belongs to its temple and cannot yet be raised for the realm at large. † a rival's faith presses far more weakly on your towns, over whatever defence they already keep; inquisitors cost less faith to call
- **The Sacred Treasury** — Not built: a bonus on building can name one row or one category, never a marvel and the last work of all at once. † a town with a cathedral, a relic and a worked holy site grows rich, sings, and builds the great works faster
- **The Bishop's Choice** — Not built: a cathedral's consecration is settled as the roof goes on and there is no offer to put before anyone. † when you finish a cathedral you choose its consecration instead of being given one
- **The Cloistered Realm** — Not built, both halves together: a proclamation's weight can be shifted by a flat figure and not by a share of itself. † cathedral towns keeping a rite learn and build far faster; and your proclamations press more gently for it
- **The Celestial Rites** — † your capital gathers faith from the sky, and being the first to set eyes on each new kind of country or ground pays faith besides
- **Natural Philosophy** — † being the first to set eyes on each new kind of country or ground pays science, and feeds your capital
- **Apprentice Engineers** — Not built: the world announces a wood felled, a hill surveyed and a hex bought, and never a work finished on the ground — so the first of each kind has no moment to be paid at, however well the ledger would remember it. † towns with a library raise workers faster, and the first works of each kind you build on ground of your own pay the town that holds them
- **The Long Study** — † a library that has stood a long while pays culture and renown, and pays more again once it is very old
- **The Research Annals** — Not built: nothing counts the studies an empire has finished — the tree is a list no card can yet ask the length of. † while this sits in council, your capital works and sings for every technology you have completed, up to a limit
- **Patient Research** — † science buildings cost more to raise, and each one that has stood a long while feeds and works the town it stands in
- **The Glassmakers' Charter** — † drafting this opens the study of lenses for research
- **The Open Collegium** — † you gain more renown while no great person of yours is waiting to be spent
- **The Old Academy** — † an academy that has stood a long while feeds and works the town it serves, and more again once it is very old
- **The Strategic Reserves** — † every improved strategic deposit past the first of its kind works and pays the town that holds it, and a great person's works count as improvements here
- **The Practical Arts** — † technologies that match what your empire already does cost less to research, while ordinary soldiers cost more to raise
- **Research through Construction** — † your towns' science becomes production instead, and finishing an ordinary building pays research worth part of its price
- **The Metallurgists' Charter** — † drafting this opens the study of alloys for research
- **The Naturalists' Charter** — † drafting this opens the study of living things for research
- **The Inherited School** — Held whole. The realm can now count the families whose legacies it keeps, but what a hex pays cannot be multiplied by a thing the realm holds — only by what stands beside the hex itself. † worked academies and manufactories feed and work the better for each different family of great person whose legacy you still keep, up to a limit
- **Discoveries through Great People** — Half built and therefore not built: a gift may now be held to once a turn, but the moment announced is the boon alone and not the lasting work or the legacy, and nothing pays a share of what the study you are on would cost. † spending a great person on an act, a work or a legacy pays part of the research you are studying, at most once in a turn
- **Husbandry Studies** — † soldiers of yours that depend on horses are quicker on their feet from the day they are raised, and stay so
- **Enduring Institutions** — † a town whose empire building has stood a long while is gladder and builds faster, once per town
- **Commissions of Service** — † spending a great person on an act or a legacy pays food and gold to your nearest town, though placing a work does not
- **The Mechanists' Charter** — † drafting this opens the study of mechanics for research
- **The Alchemists' Charter** — † drafting this opens the study of chemistry for research
- **The Second Seat** — † you may raise one further copy of an empire building, in a town that holds a university, and only one such copy may be building or standing at a time
- **The Long Inheritance** — † towns working a great person's work that has stood a long while build empire buildings, wonders and the great work faster, and faster again where the empire building there is itself old
- **The Distant Colleges** — † a town holding an empire building may work your great people's works one hex beyond its usual reach, and gains no ground and no citizens by it
- **The Learned Realm** — Held whole. Nothing in the game remembers when a building was raised, so no law can tell an old library from a new one. † towns with a library that has stood a long while are gladder
- **The Civic Guard** — † Towns that keep a Monument are harder to storm.; Soldiers defending beside such a town fight harder. A strength line can be told where the fight is happening — your ground, the hills, a town — but not which buildings stand in the town behind it.
- **Festival Commissions** — Not built: a windfall is paid to an empire and cannot be told what stands in the town that grew; and the design pays only for growth past a town's own historical high, which nothing remembers. † a town that holds a monument is paid in song and bread each time it grows
- **The Civic Annals** — Not built: a counter is a number on a card and carries no subject, so it cannot be told which towns to watch; and the design pays only for growth past a town's own historical high, which nothing remembers. † the card keeps count of every time one of your towns that holds a monument grows, and pays a little more each turn for it
- **Public Benefactors** — Half built and therefore not built: a purchase now says what it cost and whether it was that town's first, but a windfall is paid to an empire and cannot be told what stands in the town where the money changed hands. † buying a building in a town that holds a monument pays song in proportion to the coin that actually left the treasury, the first time that town acquires one of that kind
- **The Commemorative Feast** — † Spending a great person feeds and supplies the nearest town. The world announces the moment a great person is spent on a deed, and not the moment one is spent laying down a lasting work — so a card written on the spending would pay for half of the ways a person may be spent.
- **The Living Chronicle** — Not built: a card may count a marvel finished anywhere in the world and a great one spent, but not a marvel finished by you alone; and two counters cannot share one ceiling, so a card whose limit is on the pair of them cannot be written as a pair of lines. † the card keeps count of the marvels you finish and the great ones you spend, and pays a little more each turn for both
- **The Complete Court** — † Your capital is paid for the breadth of what it has raised. The kinds of building a town holds can be counted now, but not with one of those kinds left out — and this card is paid for everything except its own.
- **The Palace Guard** — † Towns that keep several culture buildings raise soldiers faster and are defended harder. A strength line cannot be told which buildings stand in the town behind it.
- **The Cultural Embassies** — † Your capital is paid for each foreign realm you have met and are not fighting. Nothing counts the realms you have met, nor the ones you are at peace with — only the ones your caravans trade with.
- **The Great Exhibition** — † Great-person works pay half again as much as they were built to pay.; Towns working several different kinds of such work earn more. The kinds a town works can be counted and paid for one at a time, but a town cannot yet be admitted for working several of them.
- **The Golden Age** — † Finishing a marvel gives the whole realm a decade of plenty, and a second marvel begins the decade again rather than doubling it. A blessing hung on the realm at a moment is hung a second time beside the first, so two would pay twice over instead of lasting longer.
- **The Salon** — † Culture buildings pay renown in towns whose citizens work a great person's lasting work. A trickle counted off a shelf of buildings is counted across the whole realm, and cannot be held to a class of town or to a ceiling in each one.
- **The Magister's Court** — † Towns holding a wonder press on faster with the Great Work and with cathedrals. A bonus on building can name one row or one category, never two rows at once.
- **The Imperial Pageant** — † Soldiers defending near your marvels and your great people's works fight harder. A strength line can be told whose ground the fight is on, but not what stands two hexes away from it.; Towns that keep several culture buildings raise soldiers faster.
- **The Last Commission** — † Spending a great person pours production into whichever town is building the Great Work. A windfall's supplies go to the nearest town to where the deed happened, and cannot be sent to the town that is building a named thing.
- **Letters of Marque** — † cities with a harbour buy warships more cheaply, and build them more slowly
- **Rites of Passage** — † completing a soldier — and no other kind of unit — pays faith
- **The Sacred Host** — † soldiers may be bought with faith, in the cities that keep a temple
- **Harvest Offerings** — † a town of your faith that grows is given a day's labour with it
- **The Hydraulic Commonwealth** — † a share of the grain a town has left over is gained again as learning
- **Garden Cities** — † the farms a town actually works are counted, and paid in song
- **Pilgrim Markets** — † a road pays when either of its two ends keeps a holy site
- **The Exchange of Discoveries** — † a town counts the distinct realms its own caravans reach
- **Sacred Patronage** — Half built and therefore not built: a gift may now be held to once a turn, but the moment the world announces is a great one spending themselves on their boon — so a card written on the spending would pay for one of the ways a person may be spent and stay silent for the others. † spending a great person pays faith, but never more than once in a turn
- **Triumphal Arches** — † taking a town raises the name of a general in particular. A town that holds a wonder can be told from one that does not now, but the renown an occasion pays favours nobody in particular — a deed is not a shelf of buildings, and the draw's bias is a fact about what an empire keeps.
- **The Crusader Orders** — † taking a town preaches your faith into it, and the unbelieving ground is the harder fought
- **The Grain Exchange** — † the town at the far end of one of these particular roads is the gladder for it
- **The Monastery Libraries** — Held whole. One half of this asks for a house the realm no longer raises, so that half can never pay — and a card is never bent to fit the half that can. † a house of quiet study teaches as well as prays, and a library prays as well as teaches
- **Common Tools** — † the hammers are for workers and buildings, and for nothing else
- **Road Crews** — † a worker that wakes on one of your roads travels further that day
- **Road Maintenance** — † the upkeep of your roads is reduced, up to a limit each turn
- **Emergency Stores** — † the hammers are for buildings, and for nothing else
- **City Watches** — † a soldier standing inside one of your towns mends faster there

## Themes (the archetype lines)

The `line` tag — presentation only, read by no draw; the decks are the card's home.

| Line | Playstyle | Ideas |
|---|---|---|
| 🏹 **The Wild Hunt** | barbarian economy |  |
| 🐫 **The Long Caravan** | luxuries, gold, duplicates |  |
| 🌱 **The Green Belt** | tall growth |  |
| ⚒ **The Forge Levy** | wide production, war |  |
| ✶ **The Star Chart** | science |  |
| 🕯 **The Procession** | faith engine |  |
| 🧭 **The Wayfarers** | exploration |  |
| 🏛 **The Marble Court** | wonders, renown, great people |  |
| ⚓ **The Tide** | trade routes, the sea, coastal empire |  |
| 🎖 **The Banner** | the *pace* of war — levies, muster, decisive battle |  |
| 🜍 **The Athanor** | the Magister's sciences — alchemy, automata, the Great Work |  |
| ☽ **The Cloister** | spiritualism — faith + science |  |
| 📜 **The Charter** | expansionist — wide cities → authority → more settling |  |
| 🌾 **The Ploughshare** | agrarian — stacking yields on farms |  |
| ⛰ **The Highlands** | mountains — hills and mountain bonuses |  |
