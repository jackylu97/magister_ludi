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
- **Four bands, two gates.** A card is dealt once the seat's regular draft count has reached
  its band's rung of the ladder **and** its research age (the highest age among its own
  technologies, floored at one) has reached the band's — both (`bandOpen`). The ladder is
  the table below.
- **Universal chairs.** A government supplies a chair count and no layout: 3 / 4 / 6 / 9 by
  its tier's rung, written on each row as `chairs`; the sixteen governments keep their
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
| Government I | 1 | 4 | 4 |
| Government II | 2 | 18 | 6 |
| Government III | 3 | 29 | 9 |

A reward hand is banked at every rung but the first. A government is offered at its row's
own tier (4 · 10 · 18 · 29 · 45); a tier between two rungs takes the rung below it for its
chairs.

## Governments

| Tier | Government | Chairs | Signature |
|---|---|---|---|
| 0 | Chiefdom | 3 | Grants nothing of its own. |
| 4 | Council of Elders | 4 | +3 happiness. +1 renown per turn for each city you hold. |
|  | Priest-King | 4 | +2 faith in every city. |
|  | War Chief | 4 | +3 authority capacity. +4 combat strength. Killing a unit grants +5 science and +5 culture for each Order you have in a slot. |
| 10 | Republic | 4 | +1 culture for each 5 population in a city. −5% happiness demanded per citizen. |
|  | Theocracy | 4 | +2 faith in every city. Your capital's faith is gained again as science and as culture, at a fifth of the rate. |
|  | Tyranny | 4 | +5 authority capacity. +4 combat strength. Pillaging pays +50% and costs no movement. |
| 18 | Divine Mandate | 6 | +1 faith and +1 culture in your capital for each wildcard Order you have in a slot · +10% faith in every city of 6 or more population. |
|  | Imperium | 6 | +1 production in every city for each military Order you have in a slot · all units +1 movement · capturing a city pays +50 gold and heals every one of your units. |
|  | Merchant League | 6 | +2 gold for each economic Order you have in a slot · trade routes pay 50% more · +1 trade route. |
| 29 | The Curia | 9 | +6 faith for each Cathedral. Faith buildings supply science equal to their faith. |
|  | The Estates | 9 | +1 happiness in every city. +2 culture in every city of 8 or more population. |
|  | The Sultanate | 9 | All units +1 movement, and cities put 25% more production behind units — a fifth off their price. Captured cities +10% science and +10% culture. |
| 45 | The Commonwealth | 9 | Great people may be bought with gold. Great-person improvements pay +50% more. |
|  | The Empire | 9 | +6 authority capacity. +2 combat strength for each great general you have earned this game. |
|  | The Magisterium | 9 | Every offer of every kind shows one more card. +3 renown per turn for each wonder you hold. |

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
| Paymasters | 0 | ● | P | Barracks give +3 gold. Each garrisoned unit costs 1 less upkeep, minimum zero. |
| Muster Rites | 0 | ● | S | Training a unit grants 5 faith and 5 food. |
| Conscription | 0 | ◆ | P | +20% production toward units. Cities producing a unit lose 2 gold. |
| Pathfinders | 0 | ◆ | S | Scouts gain +1 movement and +8 strength. |
| Drill Manuals | 0 | ◆ | P | Barracks and Stables give +2 science. +20% production toward Barracks and Stables. |
| The Standing Army | 0 | ○ | S | Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units. |
| Blood Brothers | 0 | ○ | S | A barbarian unit you kill joins your side. |
| The King's Levy | 0 | ○ | S | Every fifteen turns your capital raises a melee unit for free. It counts as trained and costs no upkeep. |
| The War Chronicle | 0 | ● | P | While slotted, pays +3 science and +3 culture, and gains +3 of each for every enemy unit you kill. |
| March Discipline | 1 | ● | S | Military units gain +1 movement when starting their turn in your territory. |
| Field Surgeons | 1 | ● | S | Military units heal an extra 10 health while fortified. |
| The Quartermasters | 1 | ● | S | Worked strategic resources gain +2 food and +2 production. |
| Victory Steles | 1 | ● | P | Gain +1 authority capacity for every two Monuments you hold. Monuments give +2 production. |
| Hunters' Offerings | 1 | ● | S | Worked fishing boats, camps and pastures gain +1 production and +1 faith. |
| Quarry Levies | 1 | ● | S | Worked mines and quarries gain +1 production and +1 gold. |
| Rites of Arms | 1 | ● | P | Cities keeping a rite gain +2 production and +20% production toward units. |
| The Soldiers' Purse | 1 | ● | S | Military units cost 1 less upkeep. |
| The War Hall Schools | 1 | ● | P | War Halls give +3 science and +3 culture. |
| Shore Patrols | 1 | ● | S | Worked fishing boats gain +1 production. Coastal cities with a Harbour gain +1 happiness. |
| The Marshals | 1 | ◆ | S | +2 strength per adjacent friendly combat unit, at most +6. |
| Army Contracts | 1 | ◆ | S | Routes from a city with a Barracks or a Stable gain +2 gold and +1 production; +4 gold and +2 production with both. |
| The Iron Hand | 1 | ◆ | S | +6 authority capacity. |
| War Foundries | 1 | ○ | P | Cities with a Barracks gain gold equal to 20% of their base production and +25% production toward military units. |
| Horse Lords | 1 | ○ | S | Mounted units gain +3 strength and +1 movement. |
| The Muster Rolls | 1 | ◆ | P | While slotted, gains +1 science and +1 culture each time you train a unit. Purchases do not count. |
| The Pacified Marches | 1 | ◆ | P | While slotted, gains +1 authority capacity and +3 culture for every barbarian camp cleared. |
| The Art of War | 1 | ◆ | S | Training a unit grants science equal to half its strength. |
| Songs of the Fallen | 1 | ○ | S | Killing or losing a unit grants science and culture equal to that unit's strength. |
| Siege Works | 2 | ● | S | +25% production toward siege units. Siege units gain +4 strength against cities. |
| The War Chest | 2 | ● | P | Military units cost 1 less upkeep, minimum zero. Barracks give +3 gold. |
| Armoury Guilds | 2 | ● | P | Armouries give +3 science and +3 culture. Cities with one gain +10% production toward buildings. |
| Veterans' Boroughs | 2 | ● | P | Cities of at least ten population with an Armoury gain +3 happiness and +20% science. |
| Conquered Archives | 2 | ● | P | Captured cities gain +10 science and +10 culture. |
| Stockpiles | 2 | ● | P | Cities gain +5 food per defensive building. |
| The Post Roads | 2 | ● | P | Cities connected by road gain +1 happiness and +2 production. |
| Camp Followers | 2 | ● | P | Cities with an Armoury gain +3 food and +3 gold. |
| Naval Yards | 2 | ● | P | Cities with a Shipyard gain +10% production and +2 culture. Ships trained there gain +10 health. |
| Marine Drill | 2 | ◆ | S | Naval melee units gain +4 strength. Land units attacking on the turn they disembark gain +3 strength. |
| Riders of the Steppe | 2 | ◆ | S | Mounted units ignore enemy zone of control. Pillaging costs them one less movement point, minimum zero. |
| The Long March | 2 | ◆ | S | Melee units gain +1 strength and +1 movement. |
| Mercenary Companies | 2 | ◆ | S | Military units cost 25% less gold to purchase in cities with a Barracks. A purchased unit arrives with +10 health. |
| Levies of the Provinces | 2 | ◆ | P | Captured cities produce units 30% faster and gain +2 food. |
| The Admiralty | 2 | ◆ | S | +1 trade-route capacity per two Shipyards, at most +2. Naval units gain +1 sight. |
| Hegemony | 2 | ○ | S | Captured cities you hold cost one less authority. Capturing a city grants +20% production in every city for ten turns. |
| Triumphal Return | 2 | ○ | S | Capturing a city that holds a wonder heals all your units. |
| Master Bowyers | 2 | ○ | S | Ranged and siege units gain +1 range. |
| Triumphs | 2 | ● | S | Capturing a city grants culture equal to ten times its population. |
| Standing Garrisons | 3 | ● | P | Per garrisoned unit, the city gains +8% production and +8% culture. |
| Spoils of Empire | 3 | ● | P | Captured cities gain +25% gold and +25% science. Cities with a Courthouse gain +4 happiness. |
| Arsenals | 3 | ● | P | Cities with an Armoury gain +20% production and produce ships 50% faster. |
| The Siege Train | 3 | ◆ | S | Siege units gain +1 movement. Adjacent friendly land melee units gain +6 strength against cities. |
| Reserve Officers | 3 | ◆ | S | While at war, cities with a Barracks produce military units 40% faster; while at peace, those cities gain +20% production toward buildings. |
| Defensive Lines | 3 | ◆ | S | Land combat units gain +3 strength beside a friendly city. Cities with walls gain +3 defence per garrisoned unit. |
| The Grand Levy | 3 | ◆ | P | Cities with a Barracks produce units 50% faster and gain +1 production per two citizens. |
| Naval Supremacy | 3 | ◆ | P | Naval units gain +1 sight and +1 range. Coastal cities gain +20% gold; coastal captured cities +40%. |
| The Long Peace | 3 | ◆ | S | While at peace, garrisoned units cost no upkeep and cities with a Barracks gain +25% culture. |
| Imperium | 3 | ○ | S | Each captured city you hold gives +5% production toward the Magnum Opus, at most +40%. |
| Total War | 3 | ○ | S | All your military units gain +8 strength and +1 movement. Every city demands +3 more happiness. |

### Expansionist

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Smallholdings | 0 | ● | S | Worked farms and pastures gain +1 food and +1 gold. |
| Granary Levies | 0 | ● | S | When a city grows in population, gain 15 production |
| The Groves and the Stones | 0 | ● | S | Unimproved forests gain +1 faith, in a city with a Shrine. |
| The Naturalists | 0 | ◆ | P | Each city gains +1 science for each distinct feature type it works. Your capital gains +1 science. |
| The Patient Harvest | 0 | ○ | S | Cities retain 30% of the food spent on growth, but produce military units 15% more slowly. |
| Tinkers' Guild | 1 | ● | S | Workers you produce or purchase gain +1 charge. |
| The Old Songs | 1 | ● | S | Worked unimproved land gains +1 culture. |
| Charcoal Burners | 1 | ● | S | Chopping forest or jungle also grants faith and culture each equal to 20% of its chop production. |
| The Highlands | 2 | ● | S | mines and quarries on hills gain +2 science and +1 production. |
| The Steppe | 2 | ● | S | pastures gain +2 production. Horse-dependent military units cost 25% less production. |
| The Coast | 2 | ● | S | Worked fishing boats gain +2 food and +2 culture. |
| The Grain Dole | 2 | ● | S | Cities of at least ten population gain +4 happiness and retain an additional 20% of food spent on growth. |
| The Woodwrights | 3 | ○ | S | Forest and jungle chops grant 100% more production. Chop percentages add together before Charcoal Burners reads the payout. |

### Commerce

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Salt Tithes | 0 | ● | P | Gain +3 gold per distinct accessible improved luxury you produce. Worked luxury tiles gain +1 food. |
| The Guild Halls | 0 | ● | P | A city gains +1 production per distinct luxury type it works. Worked camps and plantations gain +1 food. |
| The Merchant Shrines | 0 | ● | P | Your capital gains +2 faith. Cities working an improved luxury gain +2 faith, once per city. |
| Travellers' Letters | 0 | ● | P | Your capital gains +2 science and +2 culture, plus +1 of each per foreign empire met, no cap. |
| The Pathfinders' Company | 0 | ◆ | S | Scouts gain +1 sight and +1 movement. |
| The Lighthouse Keepers | 0 | ● | S | Ships gain +1 sight. Lighthouses cost 25% less production; worked fishing boats gain +1 food. |
| The Assayer's Rule | 0 | ◆ | S | Worked resource tiles that supply gold gain +1 gold. |
| The Mineral Trade | 0 | ● | S | Worked mines and quarries gain +2 gold but lose 1 production. |
| Coastal Estates | 0 | ● | S | Worked plantations and fishing boats gain +1 food and +1 gold. |
| Land Speculation | 0 | ◆ | S | Buying tiles costs 50% less. Your capital loses 2 happiness. |
| Founding Capital | 0 | ◆ | S | Founding a city grants 75 gold. |
| Private Patronage | 0 | ○ | S | Gold purchases of ordinary buildings cost 30% less. Producing those buildings normally takes 20% more production. Empire buildings and wonders are unaffected. |
| Provisioning Contracts | 1 | ● | S | Domestic routes grant their destination +2 food and +2 production. |
| Bought Swords | 1 | ◆ | S | Military units cost 20% less gold to purchase, but 10% more production to train. Purchases still do not count as training. |
| Civic Receipts | 1 | ◆ | S | Buying any building grants culture equal to 10% of the gold paid, with no cap. |
| Venture Routes | 1 | ◆ | P | Your routes gain two turns of range. Routes whose endpoints are more than fourteen hexes apart gain +100% gold, using the shortest wrapped map distance. |
| Established Routes | 1 | ◆ | P | A trade route you have kept up for at least thirty turns pays 50% more. A route that lapses, is cancelled or is plundered begins its term again. |
| Commercial Education | 1 | ● | P | Gold buildings provide +2 science. |
| Strategic Reserves | 1 | ● | S | Worked strategic resource tiles gain +1 science and +1 gold. |
| Ore Caravans | 1 | ● | P | Trade routes gain +1 gold for every mine in their origin city. |
| Frontier Investment | 1 | ◆ | P | Cities of at most 5 population receive double bonuses from domestic trade routes and gain +50% gold toward purchasing. |
| Market Foundations | 1 | ● | S | Gain +20% production toward Markets. Markets provide +1 happiness. |
| The Market Writ | 1 | ◆ | P | +1 authority for every two Markets in your empire. Buying tiles costs 30% less. |
| The Convoy | 1 | ● | S | Your combat units within one hex of your trader gain +4 strength. Your traders gain +1 movement. Traders remain plunderable. |
| Financed Industry | 1 | ○ | P | Cities gain production equal to 20% of their gold yield. Every city loses 3 food. |
| The Chartered Arsenal | 2 | ◆ | S | Military units purchased with gold gain +4 strength permanently on creation. |
| Luxury Caravans | 2 | ● | P | Trade routes gain +1 gold for every luxury resource tile in their origin city. |
| Mining Districts | 2 | ◆ | S | Worked mines gain +1 gold and +1 science for every two adjacent mines. |
| The Capital Arsenal | 2 | ◆ | S | There is no limit on the number of units that can be purchased per turn in your capital. |
| Foreign Procurement | 2 | ◆ | S | Ignore strategic resource requirements when purchasing units. All units cost 20% more. |
| The Customs Houses | 2 | ◆ | S | Customs houses gain +3 gold and +1 renown. Cities with a customs house gain +15% gold toward purchasing. |
| Purchased Prosperity | 2 | ◆ | S | You may purchase tiles with gold while your authority is negative. If you have purchased a tile in the last 5 turns, all your cities gain +1 happiness. |
| Civic Markets | 2 | ● | P | Markets provide +2 science and +2 food. |
| Maritime Authority | 2 | ● | S | Gain +3 authority. Naval units gain +5 combat strength against cities. |
| Professional Retainers | 2 | ● | S | All units gain +3 combat strength and cost +1 gold in maintenance. |
| The Caravanserai Network | 2 | ◆ | S | Each city receiving a domestic trade route grants +1 happiness, once per city. Domestic routes gain +1 production and +1 gold. |
| The Charter Fleet | 2 | ◆ | S | Naval combat units cost 20% less gold to purchase. Naval combat units you purchase with gold gain +1 movement permanently. Normal coastal, technology and purchase requirements remain. |
| The Scholars' Roads | 2 | ○ | P | Lose 4 route capacity. Your routes gain +2 science and +2 culture, and gain +50% science and culture. |
| The Money Lenders | 2 | ○ | P | Earn interest equal to 2% of your treasury each turn, with no cap. |
| The Brokers' Redraw | 2 | ○ | S | You may reroll a draft with gold instead of faith. All other purchasing is 10% more expensive. |
| The Paid Army | 3 | ◆ | S | Military-unit upkeep falls by 1 gold, minimum zero. Military units cost 25% less gold to purchase. |
| A Court of Merchants | 3 | ○ | S | Gain +50% renown, but great-person offers contain only Great Merchants. |
| The Gilded Scaffold | 3 | ○ | P | You may purchase world wonders. All your cities lose 15% production. |
| Merchant Princes | 3 | ○ | S | Gold may purchase great-person drafts at the existing escalating offer price, with normal availability and purchase limits. |
| The World's Exchange | 3 | ○ | S | Each different foreign empire currently served by your routes grants +10% production toward the Opus, at most +40%. Existing construction and victory requirements remain. |
| The Merchant Works | 3 | ○ | P | Cities building an empire building, world wonder or the Opus gain production equal to 25% of their base city gold, but lose 20% of their gold income while doing so. Foreign-route empire gold and conversion outputs are excluded from the production basis. |

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
- **Veterans' Rest** — † a town with a barracks or a war hall is gladder, and gladder still for each unit standing in it
- **Foragers' Right** — † every unit standing in a town makes that town’s worked resource tiles pay more grain and more hammers
- **The Warlord's Call** — † the first time this is seated a great general answers the call, once and never again; citadels pay more grain and more hammers while it sits in a chair
- **Army Contracts** — Two lines, one for each hall: a town that keeps both sends its caravans out under both.
- **Soldier-Settlers** — † a town you found comes with a melee unit already standing in it; a melee unit you train can do a worker’s job once, building an improvement or felling a wood
- **The Sea Levy** — Half built and therefore not built: training a hull may now pay for how strong it is, but a payroll is discounted as a share of the whole army and cannot be forgiven a coin at a time for one kind of piece. † ships are cheaper to keep; training a ship pays culture in proportion to how strong that ship is
- **Universal Conscription** — † your cities put much more production behind units; once this has been seated you may never buy a unit again for the rest of the game, even after it leaves the chair
- **Provincial Garrisons** — † every unit standing in a town puts more of that town’s production behind its buildings
- **Scorched Earth** — † the unit that burns a tile mends; the coin that tile would have paid is paid to you again as faith
- **Marine Drill** — The blessing is hung on the piece the moment it wades ashore, and lasts the turn it landed.
- **Riders of the Steppe** — A raid costs a single point of movement, so a rider who is forgiven one is forgiven the raid.
- **Fortifications** — † your workers may throw up a fort on open ground; a fort pays grain and hammers, and a unit dug in on one fights harder
- **Beachheads** — † taking to the water costs your units no movement, and so does coming ashore
- **The Iron Levy** — † each strategic resource you hold puts a little more production behind every unit, up to a limit; while you hold iron, units are cheaper to keep
- **Undermining** — † your units fight harder against a city that has walls; siege engines walk past an enemy picket for nothing
- **Spoils of War** — † burning a tile pays production to every city you hold, not only the nearest; the first tile you burn each turn pays culture as well
- **Warlords** — Held whole. Hammers behind a thing can be counted off what the realm holds now, but the great people it holds are not among the things it can count. † every great general you have earned puts more production behind your units; citadels pay hammers and culture
- **Prize Courts** — Half built and therefore not built: a capture may now pay for the people who lived in the town, but nothing tells a coastal town from an inland one at that moment, and a payout mends the whole army or none of it — never the hulls standing beside the gate. † taking a coastal city pays gold in proportion to how many people lived in it; your ships beside a city you take are mended completely
- **Blockade** — † one of your ships beside an enemy coastal city puts that city under siege; a caravan bound for it is plundered where your ship sits
- **The Blood Ledger** — Not built: a card may scale what an occasion pays out of itself, and a kill pays nothing out of itself — everything it hands over is another card's grant. Doubling one card's gifts from a second card is a reading nothing in the vocabulary makes, and the standing counters the text also names are not payouts at all. † everything you are paid for killing a unit, or for losing one, is paid twice over — the one-off rewards and the standing ones alike
- **Pax Imperia** — † while you are at peace every city makes more and is gladder; declaring war silences this card for a long stretch of turns
- **The Sea Treasury** — † every unit standing in a coastal town turns part of that town’s coin into hammers
- **The Military Roads** — † your military units walk your own roads for nothing inside your borders; a town joined to your capital makes more
- **Blockade Admirals** — † your warships move further and fight harder when they are close to an enemy coastal city
- **War Colleges** — † a unit raised in a town with an armoury is born quicker and hardier, and stays so for life
- **Naval Supremacy** — The second share is paid only where both are true, so a coastal town taken in war keeps both lines.
- **The Veterans' Grant** — † every military unit you have ever trained pays your capital hammers and beakers, up to a limit
- **Blitz** — Not built, all three halves: the once-a-turn stamp is kept per card and this one is per piece; an occasion hands over coin, renown, a soldier or a blessing and never movement; and nothing forbids an army to dig in. † a unit that kills gets a couple of movement points back, once a turn, and still may not strike again; your military units may not dig in
- **Casus Belli** — † taking an empire’s first city hands you a bead of the great work
- **Claim by the Spade** — A worker cannot yet build outside your borders, and nothing takes ground in for the town that reaches it. † works raised on open ground beside your border take that ground for the nearest town; the first claim of each place pays that town in grain and coin
- **The Growing Annals** — Not built: the design pays only for growth past the largest a town has ever been, and a town remembers how many people live in it and not how many ever did — so a counter of plain growth would write the annals twice for one citizen a levy took and the fields gave back. † the card keeps count of every citizen born and pays a little more each turn for it
- **The Pioneers' Portion** — A provisional name for a line the worksheet has not finished. Nothing yet prices a town by what its ground carries. † a town founded beside a resource asks less of your writ than any other; the name, the rarity and the wording are the designer's to settle
- **The Field Altars** — A provisional name for a line the worksheet has not finished. The rule itself is ready; the card is not. † the name, the rarity and the wording are the designer's to settle
- **Levy of the Land** — A city cannot yet spend a citizen on anything. The verb, its waiting period and its payment are all still to be built. † a city spends one of its people and is paid in labour for it; a city may do this only now and then
- **Planted Forests** — Nothing may plant a wood, and no wood in the game is young or old — the ground remembers neither. † a worker plants a wood on open ground of your own; a planted wood is young for a long while, and cannot be felled for timber until it is grown
- **The Prize Rolls** — A provisional name for a line the worksheet has not finished. The rule itself is ready; the card is not. † the name, the rarity and the wording are the designer's to settle
- **Old Growth** — No wood in the game is young or old, so neither half can tell which trees it means. † a grown wood your people work feeds and builds better than a young one; felling a grown wood yields more timber than felling a young one
- **The Woodland Edge** — Held whole. A hex can be paid a helping for every wood in its ring now, but the works this card pays are the ordinary ones — and an improvement that is not a great person's work is a thing no ground condition can name. † works pay more for every wild wood standing next to them; a wild wood beside a field feeds better for it
- **The High Pastures** — No law can yet put a citizen on a mountain: what a town may work is a fact about the ground alone. † your people may work the mountains inside your borders; a worked mountain gives stone and devotion
- **The Watercourses** — A field either stands on fresh water or it does not; no field can yet pass water to the next one. † a field on the river waters the fields beside it; a watered field builds better; the water goes no further than one field over
- **The Muster of the Fields** — A city cannot yet spend a citizen on anything. A card may raise a soldier on the calendar, but never in exchange for a person. † a city spends one of its people and stands up the best soldier it could raise; a city may do this only now and then, and not while it is levying for labour
- **The Land Shapes Us** — Nothing writes down what kind of place a town was founded on, so nothing can give it one reward and refuse it the rest. † every town remembers the one kind of place it was founded on; each kind of place pays its town its own reward, and only ever one of them
- **The Old Songs** — Open water your people work counts as unbuilt ground here: the game tells works from wild, and not land from sea.
- **The Local Census** — A card may count your towns, but not yet only the ones whose people work a stated amount of ground. † your writ is widened by every second town that works a real stretch of country
- **The Work's Shadow** — A provisional name for a line the worksheet has not finished. The rule itself is ready; the card is not. † ground beside a great one's work sings for it; the name, the rarity and the wording are the designer's to settle
- **The Open Furlongs** — A provisional name for a line the worksheet has not finished, and marked uncertain there. A hex is paid a helping for every field beside it now, but not for every second one of them. † a field builds better for every second field beside it; the name, the rarity and the wording are the designer's to settle
- **The Provincial Schools** — A provisional name for a line the worksheet has not finished. The rule itself is ready — the realm's single great houses can be named now — and the card is not. † worked seams teach and sing in a town that has raised an empire building; the name, the rarity and the wording are the designer's to settle
- **The Curators' Roll** — A provisional name for a line the worksheet has not finished. The kinds of great one's work a town puts to use can be counted now, but a standing trickle counts the realm's towns and not the ground inside one. † your standing grows with every great one's work your towns put to use; the name, the rarity and the wording are the designer's to settle
- **The Common Treasury** — A city cannot yet spend a citizen on anything, so there is no levy for this to follow. † a levy of labour pays every other town joined to your capital a share of what it raised; what is shared out cannot be shared again
- **Irrigation Works** — There is no such works to build, and no field can yet pass water to the next one. † a worker raises a waterworks on open ground of your own; fields beside it count as watered and feed better; the waterworks itself feeds and teaches
- **Reclamation** — The ground under a wood never changes in this game. The worksheet is reworking this card besides. † clearing a jungle leaves open plain behind it; clearing a jungle fills the granary as well as the woodpile
- **The Coppice** — Nothing may plant a wood, and no wood in the game is young or old. † felling a wood you planted leaves a young wood standing where it was; the young wood grows back in time, and gives no timber until it has
- **The Hermitages** — No card can change what another card's ground condition admits. † a great one's work counts as wild ground for your other laws; ground beside a great one's work shares in whatever that work provides
- **The Old Ways** — A law may take from a hex, but nothing yet stops the taking at nothing, so ground with no labour in it would fall below nothing. † works lose a little labour, and never fall below nothing for it
- **The Steppe** — The horse-dependent soldiers are the mounted ones the roster draws, ridden and shooting alike.
- **The Floodplains** — A share of what a hex's own ground provides reaches every voice it speaks in at once, and this card means the grain alone. The worksheet is reworking the figure besides. † a field on the floodplain is paid again in grain for the grain its ground already gives
- **Provincial Councils** — A card may ask whether a town is joined to the capital and whether it is the capital, but not yet whether its people work a stated amount of ground. † only the towns whose people work a real stretch of country are counted
- **The Standing Patronage** — A provisional name for a line the worksheet has not finished. A card may keep a running count of battles, of wonders and of coin spent, but not yet of the great ones' works. † the card keeps count of every great one's work raised while it sits, and widens your writ for each; the name, the rarity and the wording are the designer's to settle
- **The Woodsmen's March** — A provisional name for a line the worksheet has not finished. A strength line may be paid for hills and not for woods, and nothing excuses a column the cost of rough ground. † your soldiers fight harder in the woods and on the hills, and never for both at once; your soldiers walk into woods and hills for what open ground would cost; the name, the rarity and the wording are the designer's to settle
- **The Quarter of Masters** — A provisional name for a line the worksheet has not finished. The rule itself is ready; the card is not. † a great one's work standing beside another pays twice over, however many stand there; the name, the rarity and the wording are the designer's to settle
- **The Complementary Provinces** — Nothing writes down what kind of place a town was founded on, so nothing can tell how many different kinds your realm holds. † your joined towns build and sing better for every different kind of place your realm was founded on
- **The Varied Country** — Nothing counts how many different kinds of country a town works. † a town whose people work many different kinds of country prospers in every voice at once
- **The Common Domain** — How far a town may reach, and how many hexes its governor may hold aside, are both fixed and cannot yet be widened by a law. † your towns work their own ground one step further out than other towns do; your governors may hold aside more hexes than other governors may
- **Seasonal Levies** — A city cannot yet spend a citizen on anything, so there is no levy for this to follow. † a town that has spent one of its people is fed better for a while afterwards; spending another refreshes the season rather than lengthening it
- **The Harvest Tithe** — No wood in the game is young or old, so the second half cannot tell which trees it means. † a field beside wild ground is worth coin for it; a field beside a grown wild wood builds better besides
- **Forest Sanctuaries** — No wood in the game is young or old, and nothing counts how many a town's people work. † a grown wild wood your people work sings and prays for you; a town working several of them asks less of your peace
- **The Land's Great Work** — A share of a town's grain is read off everything it grows, not off what is left after its people have eaten, and the game keeps no shelf of empire buildings to ask about. † a town raising a great building turns a share of the grain its people do not eat into labour
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
- **The Home Market** — Held whole. A town can be asked whether a road ends in it, never how many do. † a town that more than one of your own roads ends in grows, works and rests better
- **The Caravanserai Network** — Held whole. What a road pays cannot be made to rise with the number of towns your other roads reach. † each of your towns that one of your own roads ends in gladdens the realm and enriches the roads themselves
- **The Foreign Factor** — Held whole. A standing commercial house abroad is a new fact about a town, and no law of yours can pay a foreign town. † every foreign town where your house is established pays you, and pays its host, while the peace holds
- **The Consulate** — Held whole. A standing commercial house abroad has no place on the board, and a discount of yours cannot be handed to another empire. † towns where your house is established buy more cheaply, whoever owns them, and each foreign host sings for you
- **The Warehouses** — Held whole. The realm can be asked which luxuries it holds more than one seam of, never which it holds a shed's worth of. † a luxury you dig in real quantity pays gold, culture and contentment
- **The Purple Works** — Held whole. The works it would open has not been drawn up yet, and neither has the good it would make. † drafting this opens the purple works for building
- **The Money Lenders** — Half built, and so held whole. A surcharge reaches the things a city buys, and never the hire of a cart or the calling of a great name. † your treasury pays you interest each turn, up to a ceiling; everything you buy, hire or call for costs more while the lenders are seated
- **The Harbour Chain** — Held whole. Extra roads are granted to the realm or once per town, never counted off a tally of harbours. † your harbours together open more roads than you could otherwise run; a sea road between two of your established houses runs longer
- **The League of Cities** — Held whole. A town can be asked whether a road ends in it, never whether one sets out from it, and no law makes a single town cheaper to hold. † a town that sends out one of your roads works harder and is easier to hold; a town that sends none loses gold
- **The Charter Fleet** — Half built, and so held whole. A piece can be born stronger or hardier, but nothing can be written on it about how far it sees. † hulls bought with gold cost less and are built with keener lookouts for the rest of their lives
- **Export Guilds** — Held whole. Nothing asks whether a particular good is being sold abroad this turn. † a town working a good you are currently selling abroad builds faster and rests easier
- **The Exchange** — Half built, and so held whole. A law of yours pays your own books; it cannot teach a foreign capital. † every foreign realm your roads reach teaches your whole empire, and learns from it
- **The Scholars' Roads** — A line the design is still writing, entered under a working name so that it is not lost. Each of its three halves would be ordinary law once the card is named and its words are settled. † you may run fewer roads, and every one of them teaches and sings far more
- **The Customs Houses** — A line the design is still writing, entered under a working name so that it is not lost. Renown is paid for a town's buildings and never for one hex's works, and no town's gold can be made to go further at the counter. † a customs house pays gold and renown, and its town buys more with what it earns
- **The Dye Vats** — Held whole. The vats they would open have not been drawn up yet, so the charter has nothing to grant. † drafting this opens the dye vats for building
- **The Endowment** — Held whole. A soldier can be marked at his birth by the bank that paid for him; a building cannot. † a building you buy is better for the rest of its life than one you raised
- **The World's Exchange** — Held whole. Hammers behind a thing are raised by a flat share, never by a share counted off how far your roads reach.
- **The Chartered Metropolis** — Held whole. A town can be asked whether a road ends in it, never how many set out from it, and no law raises what one town costs to hold. † a town that sends out several of your roads grows and works and sings far better, and is far harder to hold
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
- **The Cosmopolitan Court** — † a town's own foreign roads are counted toward the names it raises
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
