# Wonders review, 2026-11-18

A review of every wonder in the game, and proposals for new wonders that fit the arcane theme. This is a design note. It changes no data and no code.

## The user's ruling (2026-11-19)

- The user read the first page and ruled on the proposals: *"lets go with wonders that are not solely european, i want a diverse set from other cultures"*.
- The user then set the frame: *"lets assume the game is set in a fantasy world where all the magisters from around the world are playing this game, in some kind of mystical cabal"* (recorded in `docs/flags.md`, last section).
- Part 3 below follows both rulings. The proposed set draws on many cultures, with at most one European or Greco-Roman wonder in each age. Each wonder stands on what it meant to the adepts of its own tradition. No wonder is tested against what Renaissance Europe knew.
- Every existing wonder stays. The Terracotta Army, The Walls of Uruk and The Great Mosque of Djenné are fine as they are. Petra, Angkor Wat, Chichen Itza and Machu Picchu are weak, and each gets a better effect (see its direction), not removal.

## How this was made

- The effect text is the game's own. A script read `compendiumSections()` (`src/ui/compendium.ts`), which prints each row through `describeBuildingRow`, and wrote the lines out. Nothing in the effect columns is a paraphrase.
- Costs are `buildingProductionCost` for each row. Ages and columns are from `data/techs.json` and `techColumn`.
- Verdicts compare each wonder with `.claude/skills/card-design/references/power-bar.md` (seat yields by age, the pay of a regular card) and with ordinary buildings of the same column. No bot game was run.
- Verdicts: **fine**; **weak** (too small to matter for its price); **outdated** (reads a system that changed or was retired); **odd** (works, but does not fit its name, its age or the one-effect rule).

## Summary

- The game has 27 wonders: 8 in age 1, 3 in age 2, 12 in age 3, 4 in age 4. Age 2 and age 4 are thin, and age 3 holds almost half.
- Four wonders open on one technology, Theology (Chichen Itza, Hagia Sophia, Angkor Wat, The Great Mosque of Djenné). Stonecraft, Iron Working and Satrapies open two each. `docs/wonders.md` asks for one wonder for each technology where possible.
- The wager "The Wonder of the Age" asks for three wonders of the current age, held at once. Age 2 has exactly three, so the wager needs all of them. Age 4 has four.
- A wonder costs 130 production at column 1 and 1.31 times more for each column: 170 in most of age 1, 292 to 382 in age 2, 501 to 860 in age 3, and 1,127 to 1,934 in age 4. A town makes about 5, 10, 15 and 35 production a turn in the four ages (bot games), so an age 3 or age 4 wonder is 32 to 57 turns of one ordinary town. At that price, an effect of a few yield a turn in one city is too small.
- A wonder costs 2.2 times a large building of its column, 3.3 times a medium one and 4.3 times a small one. `docs/wonders.md` still says "5 to 7 times the age's best building; hand-tuned rows", which was true before the one cost standard. It also names a Sistine wonder that has no row. The doc needs an update.
- Every wonder also pays +10 renown when it is finished and +1 or +2 renown a turn. The tables leave these lines out.
- Five bead rows that read wonders (The First Marvel, The Exposition, Three of the Age, The Builder, The Most Marvels) are retired with the rest of the feats. No wonder effect reads them.
- The Compendium prints "on completion, a glass bead is yours" for The Magnum Opus, but the bead it grants is the golden bead. That is a wording slip in the describer.
- Only one clause on any wonder is marked deferred: The Alhambra's. Two rows carry a design note: The Great Lighthouse (the trade route) and The Alhambra.

### Flagged wonders (11 of 27)

| Wonder | Age | Verdict | Reason in short | Direction |
|---|---|---|---|---|
| The Great Lighthouse | 1 | **odd** | Five small clauses, one a copy of Chart the Stars, and a row note that says the trade route does not match the design. | Keep the trade route and the fishing-boat gold. Drop the sight and the embarked movement, and settle the note. |
| The Pyramids | 1 | **weak** | One more worker charge saves about 40 production over ten workers, against a price of 170. | Give it one builder effect that lasts, for example faster wonders or cheaper improvements in every city, and drop the charge. |
| The Great Ziggurat | 1 | **outdated** | The discount on religious units reaches only the augur, which is retired. | Point the discount at prophets and apostles (the `religious` filter exists), or replace the clause. |
| The Great Library | 3 | **odd** | The library of antiquity arrives in age 3 with about 10 science a turn, and its free technology is the same grant as The House of Wisdom. | Move it to age 2 (Chronology or Code of Laws have room) and give it one effect of its own, so it is not a smaller House of Wisdom. |
| Petra | 3 | **weak** | About 16 yield a turn in one desert city for 657 production, and two ages late. | Move it to age 2, or make the desert bonus reach every city of the empire. |
| Angkor Wat | 3 | **weak** | About 7 faith a turn and cheaper hexes, for 860 production; two clauses with no link. | Choose one idea. Either a land wonder (cheaper hexes and wider borders for every city) or a faith wonder, not both. |
| Chichen Itza | 3 | **weak** | Longer rites save at most about 12 faith a turn, for 860 production. | Make the rite clause larger and plain: a rite said in this city is also said in the capital, or rites cost less faith. |
| The Circus Maximus | 3 | **weak** | +4 happiness at twice the price of a Cathedral, and it counts the Barracks, an age 1 military building. | Raise the flat happiness, and count a building that towns already want (Amphitheaters are taken, so Public Baths or Stables). |
| The Water Clock of Su Song | 3 | **outdated** | The cadence clause reads Orders that are almost all retired: one of eight is live. | Keep the 7-turn payment as the one effect. Drop the cadence clause and the Scholarship rider. |
| Machu Picchu | 4 | **weak** | +25% gold in one city is 8 to 15 gold a turn for 1,477 production, and the name has no link to gold. | Give it a mountain effect (for example yields on mountain hexes, which nothing else can work) and move it earlier. |
| The Alhambra | 4 | **weak** | +4 strength for mounted units only, below the bar for age 4, at the price of four Knights; the second clause is deferred. | Replace both clauses with one that the game can already do, for example a strength stamp on every unit raised here (the Terracotta Army's shape) at a larger figure. |

## Part 1 and 2: every wonder, with its verdict

### Age 1 (8 wonders)

#### The Temple of Artemis: fine

- Opens with Husbandry (age 1, column 1). Costs 130 production. Site: none. Renown: +1 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +2 food, +1 faith
  - +1 food on every hex with a Camp
  - +1 food on every hex with a Pasture
  - +1 happiness per improved bonus resource in this city (at most +4 happiness)
- Verdict: **fine**. The cheapest wonder (130). It pays food on every Camp and Pasture in the empire and up to 4 happiness. That is a good return in age 1, where a seat makes about 44 yield a turn.

#### Stonehenge: fine

- Opens with Stonecraft (age 1, column 2). Costs 170 production. Site: none. Renown: +1 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +3 faith
  - +1 pantheon slot
  - +1 faith on every hex carrying Stone or Marble
  - on completion, a god is named, and your faith is not spent
- Verdict: **fine**. A second pantheon slot and a god named for free. Strong and clear.

#### The Great Lighthouse: odd

- Opens with Sailing (age 1, column 2). Costs 170 production. Site: a coastal city. Renown: +2 per turn and +10 when it is finished, toward merchants.
- Effect, in the game's words:
  - +2 gold
  - all units: +1 movement while embarked
  - +1 gold on every hex with a Fishing Boat
  - every coastal city: +1 city sight
  - +1 trade route
- Row note: "The extra trade route is empire-wide. The design calls for one per coastal city."
- Verdict: **odd**. Five small clauses where a wonder should have one or two. The row's own note says the trade route does not match the design ("one per coastal city"). The +1 movement while embarked is the same effect as Chart the Stars. No trader exists until Currency in age 2, so the route waits.
- Direction: Keep the trade route and the fishing-boat gold. Drop the sight and the embarked movement, and settle the note.

#### The Hanging Gardens: fine

- Opens with Calendar (age 1, column 2). Costs 170 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward engineers.
- Effect, in the game's words:
  - +3 food
  - +25% food surplus stored toward growth
  - +1 food on every hex with a Farm beside fresh water, in every city with The Hanging Gardens
- Verdict: **fine**. +3 food, +25% growth, and +1 food on river farms in its city. A clear growth wonder for one big town.

#### The Oracle: fine

- Opens with Divination (age 1, column 2). Costs 170 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +2 culture, +2 faith
  - +1 faith in every city with The Oracle
  - +1 card in every Order hand
  - +1 card in every Doctrine draft
- Verdict: **fine**. One more card in every Order hand and every Doctrine draft is a strong effect for the whole game, and +2 culture is large when a seat makes 3 or 4 culture a turn. Small point: "+1 faith in every city with The Oracle" is one city, so it reads bigger than it is. It could join the base faith.

#### The Pyramids: weak

- Opens with Stonecraft (age 1, column 2). Costs 170 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward engineers.
- Effect, in the game's words:
  - +2 production
  - newly created workers gain +1 charge
- Verdict: **weak**. A worker has 3 charges and costs 10 to 13 production. One more charge saves about 4 production for each worker built, so ten workers repay about 40 of the 170 it costs. The +2 production repays the rest in 85 turns.
- Direction: Give it one builder effect that lasts, for example faster wonders or cheaper improvements in every city, and drop the charge.

#### The Walls of Uruk: fine

- Opens with Bronzeworking (age 1, column 2). Costs 170 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward generals.
- Effect, in the game's words:
  - +2 culture
  - your capital: +10 city defence
  - +4 combat strength inside your capital’s borders
  - +2 authority capacity
  - +50 to how much punishment the city can take
- Verdict: **fine**. +4 combat strength inside the capital's borders is strong in age 1 (units have 15 to 33 strength), and +2 authority capacity pays for most of a town. I could not judge how often a capital is attacked in age 1 without a game run.

#### The Great Ziggurat: outdated

- Opens with Writing (age 1, column 3). Costs 223 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +2 science, +2 faith
  - religious units cost −25% to buy
  - +1 science in every city with a Shrine
- Verdict: **outdated**. The clause "religious units cost −25% to buy" reads the `consecrates` marker, and the only unit with that marker is the augur, which is retired. Prophets and apostles do not get the discount, so the clause does nothing. The rest (+2 science, +2 faith, +1 science per Shrine city) still pays well for age 1.
- Direction: Point the discount at prophets and apostles (the `religious` filter exists), or replace the clause.

### Age 2 (3 wonders)

#### The Mausoleum: fine

- Opens with Currency (age 2, column 4). Costs 292 production. Site: none. Renown: +1 per turn and +10 when it is finished, toward merchants.
- Effect, in the game's words:
  - +2 gold
  - +1 gold per building in this city
  - +1 gold on every hex with a Quarry
  - +2 authority capacity
- Verdict: **fine**. +1 gold for each building in its city is about +8 to +12 gold in age 2, where a seat makes about 19 gold a turn, and +2 authority capacity. The name and the effect have little to do with each other, but it pays.

#### The Theatre of Dionysus: fine

- Opens with Epic Poetry (age 2, column 4). Costs 292 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +4 culture
  - +1 happiness per Amphitheater
  - on completion, a Doctrine draft opens
  - on completion, an Amphitheater is raised here as well
- Verdict: **fine**. A Doctrine draft, a free Amphitheater, +4 culture and happiness for each Amphitheater. Age 2 culture is about 25 a turn, so this is a headline wonder.

#### The Colossus: fine

- Opens with Wayfinding (age 2, column 5). Costs 382 production. Site: a coastal city. Renown: +2 per turn and +10 when it is finished, toward merchants.
- Effect, in the game's words:
  - +3 gold
  - +1 trade route for your empire
  - +1 production, +1 gold on every water hex carrying a resource
- Verdict: **fine**. +3 gold, a trade route, and +1 production and +1 gold on every water resource in the empire. Good for a coastal empire, small for anyone else, which is right for a site wonder.

### Age 3 (12 wonders)

#### The Great Library: odd

- Opens with Rhetoric (age 3, column 6). Costs 501 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +3 science
  - +1 science in every city with a Library
  - on completion, the technology you are researching is finished
- Verdict: **odd**. The library of antiquity arrives in age 3, on the same technology as the Forum, and costs 501. Its pay each turn is about +3 and +1 for each Library city, so about 10 science where a seat makes 106. The free technology carries the whole wonder, and The House of Wisdom gives the same grant one age later. I did not price the free technology.
- Direction: Move it to age 2 (Chronology or Code of Laws have room) and give it one effect of its own, so it is not a smaller House of Wisdom.

#### The Statue of Zeus: fine

- Opens with Iron Working (age 3, column 6). Costs 501 production. Site: none. Renown: +1 per turn and +10 when it is finished, toward generals.
- Effect, in the game's words:
  - +1 culture
  - +15% combat strength for all units against cities
  - on completion, the best melee unit you can build joins you
- Row note: "Your soldiers strike harder at walls than at men."
- Verdict: **fine**. +15% against cities is about +7 strength in age 3, and a free Legionary is worth 81 production. Useful only to an empire at war, which is the point.

#### The Terracotta Army: fine

- Opens with Iron Working (age 3, column 6). Costs 501 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward generals.
- Effect, in the game's words:
  - +2 production
  - +6 combat strength when defending while standing in one of your cities
  - newly created units in every city with The Terracotta Army gain +2 combat strength
  - +2 authority capacity
- Row note: "Soldiers raised in this city start out better trained, and keep that training wherever they march."
- Verdict: **fine**. +6 defending in a city is 12% to 14% of age 3 unit strength, and units raised in its city keep +2 strength for life. A good defensive wonder.

#### Petra: weak

- Opens with Mathematics (age 3, column 7). Costs 657 production. Site: a city built on or next to desert. Renown: +2 per turn and +10 when it is finished, toward merchants.
- Effect, in the game's words:
  - +2 gold
  - +1 food, +1 production on every desert hex, in every city with Petra
  - +1 gold on every floodplain hex, in every city with Petra
- Row note: "A caravan city at the edge of the sand: it may be raised in a town standing on desert, or in one with desert beside it."
- Verdict: **weak**. +1 food and +1 production on desert hexes, in one city only, for 657 production. A city that works eight desert hexes gains 16 yield a turn. A regular card of this age pays 35 to 60. It also arrives late: by age 3 a desert town has already been small for a hundred turns.
- Direction: Move it to age 2, or make the desert bonus reach every city of the empire.

#### The Forbidden City: fine

- Opens with Satrapies (age 3, column 7). Costs 657 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward merchants.
- Effect, in the game's words:
  - +2 culture
  - you have one more wildcard chair
  - +5 authority capacity
- Verdict: **fine**. One more Wildcard chair and +5 authority capacity. Probably the strongest wonder in the game for its price (657).

#### The Great Wall: fine

- Opens with Satrapies (age 3, column 7). Costs 657 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward engineers.
- Effect, in the game's words:
  - +2 production
  - every hex you own exerts zone of control on enemy units, as a unit of yours would
  - this city: +10 city defence
  - +25 to how much punishment the city can take
- Verdict: **fine**. Every hex you own slows enemy units. I could not judge the size of this without a game run: zone of control is a movement cost, not a block.

#### Angkor Wat: weak

- Opens with Theology (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +2 faith
  - +1 faith per 2 hexes worked here
  - a hex costs 25% less to buy
- Verdict: **weak**. +1 faith for every 2 worked hexes in one city is about +5 faith, and a hex costs 25% less to buy. With the base +2 faith that is about 7 faith a turn for 860 production. The two clauses have nothing to do with each other.
- Direction: Choose one idea. Either a land wonder (cheaper hexes and wider borders for every city) or a faith wonder, not both.

#### Chichen Itza: weak

- Opens with Theology (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +2 culture, +2 faith
  - rites last +50% longer
  - +1 happiness
- Verdict: **weak**. Rites last 15 turns in place of 10. That saves a third of the faith an empire spends on rites. A seat makes about 36 faith a turn in age 3, so the most it can save is about 12 faith a turn, and only if all its faith goes to rites. With +2 culture, +2 faith and +1 happiness the total is small for 860 production.
- Direction: Make the rite clause larger and plain: a rite said in this city is also said in the capital, or rites cost less faith.

#### Hagia Sophia: fine

- Opens with Theology (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +3 faith
  - +1 culture, +1 faith in every city with a Temple
  - spreads your religion +4 faith to every city within 8 hexes
  - on completion, a Prophet joins you
- Verdict: **fine**. A free Prophet (120 faith or more), +1 culture and +1 faith in every Temple city, and religious pressure on every city within 8 hexes. A full religion wonder.

#### The Circus Maximus: weak

- Opens with Engineering (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +1 happiness per Barracks
  - +4 happiness
- Verdict: **weak**. +4 happiness and +1 for each Barracks, for 860 production. A Cathedral gives +3 happiness with culture and faith for 397. The Barracks is the age 1 drill yard for foot soldiers and pays nothing itself, so the count asks a peaceful empire to build a military building in every town. A circus for chariots would count Stables.
- Direction: Raise the flat happiness, and count a building that towns already want (Amphitheaters are taken, so Public Baths or Stables).

#### The Great Mosque of Djenné: fine

- Opens with Theology (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +3 faith
  - newly created prophets gain +1 charge
  - newly created apostles gain +1 charge
  - +1 pantheon slot
- Verdict: **fine**. Prophets and apostles get a third charge, so each one does half as much again, and a pantheon slot opens. Good for a Devotion seat. It is the fourth wonder on Theology.

#### The Water Clock of Su Song: outdated

- Opens with Horology (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward engineers.
- Effect, in the game's words:
  - +3 science
  - Scholarship pays +3 science
  - your Orders that pay on a cadence come round 2 turns sooner
  - every 7 turns, 1 science for every production your empire makes a turn
  - +3 authority capacity
- Row note: "The escapement keeps the realm's whole calendar. Every boon of yours that comes round on a beat comes round sooner, and on the clock's own beat the realm is paid in learning for everything its workshops made."
- Verdict: **outdated**. The clause "your Orders that pay on a cadence come round 2 turns sooner" has almost nothing to read. Seven of the eight Orders with a cadence are retired; only The Champagne Fairs (Commerce) is live. The Clocktower, its sister building on the same technology, is retired too. The clock's own payment (science equal to the empire's production every 7 turns, about 15 science a turn in age 3 and 68 in age 4) is good. Four clauses is too many.
- Direction: Keep the 7-turn payment as the one effect. Drop the cadence clause and the Scholarship rider.

### Age 4 (4 wonders)

#### The House of Wisdom: fine

- Opens with Scholarship (age 4, column 9). Costs 1127 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +4 science
  - +50% science in every city with The House of Wisdom
  - on completion, the technology you are researching is finished
- Verdict: **fine**. +50% science in its city and a free technology of the last age. A seat makes about 494 science a turn in age 4, so a science capital gains 40 or more.

#### Machu Picchu: weak

- Opens with Natural Philosophy (age 4, column 10). Costs 1477 production. Site: a city next to a mountain. Renown: +2 per turn and +10 when it is finished, toward engineers.
- Effect, in the game's words:
  - +2 gold
  - +25% gold in every city with Machu Picchu
- Verdict: **weak**. +25% gold in one city, for 1,477 production. A seat makes about 298 gold a turn in age 4 over 10 to 15 towns, so one town gains 8 to 15 gold. A Bank gives +4 gold and +20% for 520 to 680. The mountain city of the Inca also has no link to gold or to Natural Philosophy, the technology that opens it.
- Direction: Give it a mountain effect (for example yields on mountain hexes, which nothing else can work) and move it earlier.

#### Notre-Dame: fine

- Opens with The Holy Office (age 4, column 11). Costs 1934 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +2 culture
  - +1 happiness per Temple
  - +3 culture and +1 happiness in every city with a Cathedral
- Verdict: **fine**. +1 happiness for each Temple, and +3 culture and +1 happiness in every Cathedral city. A wide Devotion empire of twelve towns gains about 24 happiness and 36 culture. It arrives at column 11 of 12 and costs 1,934, so it may come too late to matter. I could not judge that without a game run.

#### The Alhambra: weak

- Opens with Militant Orders (age 4, column 11). Costs 1934 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward generals.
- Effect, in the game's words:
  - +3 culture
  - +4 combat strength for mounted units
  - +1 happiness
  - units raised here begin dug in, as if they had already fortified — not built yet **(deferred)**
- Row note: "Being dug in is something a piece does and stops doing, not something it is born with, so the second clause is not built."
- Verdict: **weak**. +4 combat strength for mounted units only, in an age where units have 45 to 80 strength, so 5% to 9%. The bar for a regular combat card of this age is +6 for every unit. It costs 1,934, the price of four Knights. Its second clause ("units raised here begin dug in") is marked deferred and is not built.
- Direction: Replace both clauses with one that the game can already do, for example a strength stamp on every unit raised here (the Terracotta Army's shape) at a larger figure.

### The Magnum Opus

- Not a wonder row (`wonder: true` is absent), but it is priced at the wonder size: 2534 production at column 12. It is an empire building, opened for everybody when any empire researches Alchemy, and an empire may begin it only with 7 beads.
  - +4 culture
  - on completion, a glass bead is yours
- Verdict: fine. It is the end of the game and not a wonder to balance here.

### Empire buildings (the "great houses")

- These are not wonders. Each empire may build one of each (a card can lift that limit), they cost the large size and have upkeep, and no other empire can take them from you by building first.
- The game has 15 rows of this class: Forum, Caravanserai, Bourse, Chart the Stars, The Turning Heavens, The Alchemical Codex, The Magnum Opus, Mouseion, Bimaristan, Tophane, Heroic Epic, Imperial Throne, High Temple and The Valley of Kings, and the four below in full.

| Building | Opens with | Cost | Effect, in the game's words |
|---|---|---|---|
| Forum | Rhetoric (age 3, column 6) | 231 | +10% science and +10% culture in every city with a Forum |
| Caravanserai | The Silk Road (age 3, column 6) | 231 | +3 trade routes for your empire; +1 food, +1 production on every trade route sent from every city with a Caravanserai |
| Bourse | Paper Money (age 4, column 9) | 520 | +1 culture per 4 gold gained per turn |
| Chart the Stars | Chronology (age 2, column 4) | 134 | +2 science; ships: +1 movement; all units: +1 movement while embarked; on completion, a glass bead is yours |

- Chart the Stars gives +1 movement while embarked, the same clause as The Great Lighthouse. The two add together.

## Existing wonders that serve the arcane theme

| Wonder | Why it fits |
|---|---|
| The Oracle | A house of divination. Its effect (more cards in each draft) is a good match. |
| Stonehenge | A ring of stones set to the sun at midsummer and midwinter: a calendar keeper's work. |
| The Great Ziggurat | A temple tower where priests watched the sky. Its mix of science and faith fits. |
| Chichen Itza | Its pyramid counts the days of the year in its steps, and its round tower was built for watching Venus. The rite effect fits, but it is too small. |
| The Water Clock of Su Song | An astronomical clock tower with a turning sphere of the heavens. |
| The House of Wisdom | A house of translators, astronomers and alchemists. |
| The Great Library | The library that tried to hold every book. |
| The Great Mosque of Djenné, Hagia Sophia, Angkor Wat, Notre-Dame | Great houses of faith. They serve the faith systems more than the arcane ones, and that is right for them. |
| The Magnum Opus | The centre of the theme. |

- Every existing wonder stays. The Terracotta Army, The Walls of Uruk and The Great Mosque of Djenné are fine as they are. Petra, Angkor Wat, Chichen Itza and Machu Picchu are weak, and each gets a better effect (see its direction), not removal.

## Part 3: proposed wonders

- Each has one effect and at most one condition, as the card-design skill asks.
- 10 of 16 use an existing effect shape. 5 need one new option on an existing kind. 1 needs a new shape.
- 2 depend on the wager system, which is due for a rework: The Oracle Pits of Yin and The Observatory of Ulugh Beg.
- No name is used by a building, Order, belief, great person, wager or bead in `data/`.
- Each entry says what the place meant in its own tradition, then which kind of magister would seek it and for what knowledge.
- Every proposal is a real place, a real work, or a place from a real tradition's legend. A legend is labelled as one. Nothing is invented here.
- No proposal is a place of worship in use today.
- The shape notes say "confirm" where I read the type and not the evaluator.

### Age 1

#### The Pillars of Seth

- Culture and period: Jewish tradition, ancient Near East; told of the time before the Flood. Legendary.
- In its own tradition: Josephus wrote that the children of Seth cut all they knew of the heavens into two pillars, one of brick and one of stone, so that the knowledge would outlast a flood and a fire. The story is about saving knowledge from the end of an age.
- Sought by: The keeper of records, who fears that an age will end and take its knowledge with it. They come to learn what to write down and what to write it on.
- Proposed effect: **When you enter a new age, the technology you are researching is finished.**
- Shape: Existing kind, needs one new option. The `tech` grant exists on completion only. This needs the same grant on the age-entry moment (`ageEntered` is already an announced occasion).
- Site: None.
- Picture: Two tall pillars cut with signs, one of red brick and one of grey stone, standing in water after a flood.
- Note: Kept from the first list. It pays three times in a game, so the figure could become a share of the technology in place of all of it.

#### The Temple of Thoth

- Culture and period: Ancient Egypt; Khemenu (Hermopolis), from the Old Kingdom. Real, now a ruin.
- In its own tradition: Khemenu was the city of Thoth, the god of writing, counting, the moon and magic, and its priests told how the world began there. Egyptian stories speak of a Book of Thoth that held every spell; the book is legendary.
- Sought by: The scribe-priest and the alchemist. They come for the words that give a thing its true name, and for the first book of spells.
- Proposed effect: **This city gains science equal to half of its faith.**
- Shape: Existing shape. `pays` with `where: city` and `basis: share`. Confirm that the pair is live in the register in `docs/yields.md`.
- Site: A city beside fresh water.
- Picture: A hall of papyrus columns at night, an ibis-headed figure writing on a palette, and the moon above the roof.
- Note: This takes the effect proposed for The Emerald Tablet. The temple is the home of the same tradition, and it is a place and not a text.

#### The Oracle Pits of Yin

- Culture and period: Shang China; about 1250 to 1050 BCE. Real.
- In its own tradition: At Yin, the last Shang capital, diviners put questions for the king to his ancestors. They heated ox bones and turtle shells until they cracked, read the cracks, and cut the question and the answer into the bone. The bones were then stored in pits, and they are the oldest Chinese writing we have.
- Sought by: The diviner. They come to learn how to put a question so that the answer can be checked later.
- Proposed effect: **You are dealt one more wager to choose from in each age.**
- Shape: Existing kind, needs one new option. `offerRider` has no wager scope. It needs one. **Depends on wagers.**
- Site: None.
- Picture: A diviner holding a hot bronze point to a turtle shell, cracks spreading, and a pit of stacked shells behind.
- Note: Depends on wagers. Hold it until the wager rework is settled. This takes the effect proposed for The Sibyl's Cave: a question put to the future, with the answer written down and kept.

#### Chavín de Huántar

- Culture and period: Chavín, the Andes; about 1200 to 500 BCE. Real, now a ruin.
- In its own tradition: A temple in a high valley of Peru that drew pilgrims from the coast and the forest. Under it run dark stone galleries with water channels that roar, and at their centre stands the Lanzón, a carved stone god. Priests used shell trumpets and the dark to lead visitors through the rites.
- Sought by: The mystic and the master of rites. They come to learn how sound, water and the dark can change a person who walks through them.
- Proposed effect: **Your rites cost 25% less faith.**
- Shape: Existing kind, needs one new option. `effectAmplifier` has `riteDuration` and no target for the price of a rite. It needs one.
- Site: A city next to a mountain.
- Picture: A narrow stone passage lit by one torch, ending at a tall carved stone with fangs, and a priest with a shell trumpet.
- Note: This takes the effect proposed for The Telesterion of Eleusis: a house of secret rites. Chichen Itza makes rites longer and this makes them cheaper, so the two work together.

### Age 2

#### The Pillars of Hercules

- Culture and period: Phoenician and Greek; classical antiquity. Real place, legendary marker.
- In its own tradition: The two rocks at the Strait of Gibraltar. Phoenician sailors kept a temple of Melqart near them at Gades, and the Greeks said that Hercules set the rocks there to mark the end of the world.
- Sought by: The navigator and the maker of maps. They come to learn what is beyond the last mark on the chart.
- Proposed effect: **Your ships may cross the open ocean.**
- Shape: Existing shape. `grantsAbility` with `oceanGoing`, the door that The Astrolabe opens in age 4.
- Site: A coastal city.
- Picture: Two pillars on two headlands with a banner between them, and one small ship sailing out through the gap.
- Note: Kept from the first list. This opens the ocean two ages early for one empire. I could not judge how much that is worth on each map type without a game run.

#### The Stelae of Aksum

- Culture and period: The Kingdom of Aksum, Ethiopia; third and fourth centuries CE. Real.
- In its own tradition: Aksum was a trading kingdom between Rome and India that struck its own gold coin. Its kings raised single stones up to 33 metres tall over their tombs, each carved as a tower of many floors with a false door at the foot for the dead.
- Sought by: The merchant-magister and the keeper of the royal dead. They come to learn how a kingdom of traders makes its name last in one stone.
- Proposed effect: **+2 gold and +2 faith on every trade route you send to a foreign city.**
- Shape: Existing shape. `pays` with `where: route` and an `admits` test on the crossing (The Champagne Fairs uses the same test for domestic routes).
- Site: None.
- Picture: A field of tall thin stones carved like towers, one fallen and broken, with a caravan passing in front.
- Note: This takes the effect proposed for The Court of Prester John. It is the least arcane of the set: its subject is trade and the royal dead. With six to eight routes it pays 24 to 32 yield a turn.

#### The Academy of Gundeshapur

- Culture and period: Sasanian Persia; third to seventh century CE. Real; its size is disputed.
- In its own tradition: A royal city of the Sasanian kings where Persian, Greek, Syriac and Indian medicine and astronomy met. Tradition gives it a hospital, a library and a school. Historians now think later writers made it larger than it was, but its doctors did serve the first Abbasid caliphs.
- Sought by: The physician and the translator. They come for the medicine of four peoples in one room.
- Proposed effect: **A technology that an empire you have met already knows costs you 15% less research.**
- Shape: Existing kind, needs one new option. A research discount on chosen technologies exists (The Court of Rudolf II). The test "known by an empire you have met" is new.
- Site: None.
- Picture: A courtyard where four scholars in four kinds of dress read from four books at one table, under a Persian arch.
- Note: This takes the effect proposed for The School of Toledo. Gundeshapur did the same work (gathering the learning of other peoples) eight centuries earlier. It serves the empire that is behind in research.

#### The Schools of Taxila

- Culture and period: Gandhara, ancient India; about 500 BCE to 450 CE. Real, now a ruin.
- In its own tradition: Takshashila was a city of teachers. Students came from across India to live in a master's house and learn the Vedas, medicine, law, archery and the reading of signs. Indian tradition names the grammarian Pāṇini, the minister Chanakya and the Buddha's doctor Jīvaka among them.
- Sought by: The student of any art. They come to find the one teacher who knows it best and to live in that teacher's house.
- Proposed effect: **+1 choice in every great person offer.**
- Shape: Existing shape. `offerRider` with `offer: greatPerson`.
- Site: None.
- Picture: A teacher under a tree with students around him, one with a bow and one with a palm-leaf book, and a stupa on the hill behind.
- Note: This takes the effect proposed for Solomon's Temple. A city that tradition credits with so many masters is a good home for a wider choice of great people.

### Age 3

#### Nalanda

- Culture and period: Buddhist India; fifth century to about 1200 CE. Real, now a ruin.
- In its own tradition: A Buddhist monastery in Bihar that became the greatest school in Asia, with thousands of monks and students from China, Korea, Tibet and Java. Tibetan accounts say that its library, the Dharmaganja, had three buildings and that one of them rose nine storeys.
- Sought by: The logician and the monk-scholar. They come to debate at the gate, where a keeper tests each visitor before he lets them in, and to read in the library.
- Proposed effect: **When you recruit a great person, gain +100 science.**
- Shape: Existing kind, needs one new option. `windfallRider` has no occasion for a great person recruited. The moment is already announced (`greatPersonRecruited` in `occasions.ts`), so it needs one new occasion and no new kind.
- Site: None.
- Picture: Rows of red brick courts and cells seen from above, with one tall library tower and monks carrying books.
- Note: This takes the effect proposed for Salomon's House, sized for age 3, where a seat makes about 106 science a turn. Nalanda is a ruin and a museum, not a place of worship today.

#### The Maragheh Observatory

- Culture and period: Ilkhanid Persia; founded 1259. Real, now a ruin.
- In its own tradition: The Mongol ruler Hülegü wanted better star tables for his astrologers, and he paid Naṣīr al-Dīn al-Ṭūsī to build an observatory on a hill at Maragheh. Astronomers came from Syria to China, and its library was said to hold 400,000 books. Its new models of the planets replaced parts of Ptolemy.
- Sought by: The astronomer and the court astrologer. They come for better tables of the planets, and for the geometry that makes them.
- Proposed effect: **This city makes 50% more renown.**
- Shape: Existing shape. `cityRenownPercent`.
- Site: None.
- Picture: A hilltop with a great wall quadrant and brass rings, scholars in Persian and Chinese dress, and a Mongol rider waiting.
- Note: This takes the effect proposed for The Studiolo. It rewards a city that already holds wonders and empire buildings, since each pays renown where it stands.

#### The Hall of Light

- Culture and period: Tang China; built 688 CE. Real, destroyed.
- In its own tradition: The Mingtang was the hall where, in the oldest books, a true ruler matched his acts to the seasons and the stars. Nobody knew its real shape, and scholars argued about it for a thousand years. Empress Wu Zetian built one at Luoyang about 90 metres tall, square below for the earth and round above for heaven. It burned in 695 and she built it again.
- Sought by: The geomancer and the keeper of the calendar. They come to learn the right shape for a hall that joins heaven, earth and the ruler.
- Proposed effect: **When you finish a wonder, gain +120 culture.**
- Shape: Existing shape. `windfallRider` on the `completion` occasion, limited to wonders. Confirm that the rider can filter by category.
- Site: Your capital.
- Picture: A huge hall with a square base and a round upper floor under a gold roof, a phoenix on top, and tiny courtiers below.
- Note: This takes the effect proposed for The Tower of Babel, sized for age 3, where a seat makes about 83 culture a turn. The hall was itself a monument about the right to build monuments.

#### The Brazen Head

- Culture and period: Medieval Latin Europe; told of the tenth to thirteenth centuries. Legendary.
- In its own tradition: A head of brass that could answer any question, said to be the work of Gerbert of Aurillac, of Albertus Magnus or of Roger Bacon. In the best-known story it said "Time is, Time was, Time is past" and broke while its maker slept.
- Sought by: The maker of automata. They come to learn how to build a thing that answers, and how not to sleep through the answer.
- Proposed effect: **Each Order hand you pass counts twice toward rarer cards.**
- Shape: Needs a new shape. New rule: a multiplier on the banked skips that `rarityOdds()` reads (`statecraft/draft.ts`). Small, but no card shape does it today.
- Site: None.
- Picture: A brass head on a workbench with its mouth open, a friar asleep at the table, and an hourglass run out.
- Note: Kept from the first list. Roger Bacon is in the roster. The effect rewards patience in the draft, which fits a head that speaks only once.

### Age 4

#### The Observatory of Ulugh Beg

- Culture and period: Timurid Samarkand, Central Asia; built in the 1420s. Real, now a ruin.
- In its own tradition: Ulugh Beg, grandson of Timur and ruler of Samarkand, was an astronomer first. He built a round observatory of three floors around a stone arc 40 metres in radius, and his school measured 1,018 stars again, the first full new catalogue since Ptolemy. He was murdered in 1449 and the building was torn down.
- Sought by: The astronomer. They come to measure every star again and trust no older book.
- Proposed effect: **On completion, a glass bead is yours.**
- Shape: Existing shape. The `bead` grant on completion, as on Chart the Stars. It needs one new bead row. **Depends on wagers.**
- Site: A city with a University (the "needs standing here" rule).
- Picture: A round tiled building cut open to show a huge curved stone track going down into the rock, with one man taking a sighting.
- Note: This takes the effect proposed for The Vault of Rosenkreuz. A bead is one seventh of the door to the Magnum Opus, so this is a powerful wonder with a condition. The worth of a bead depends on how many the wagers give, so set it after the wager rework.

#### The Libraries of Timbuktu

- Culture and period: Mali and Songhai, West Africa; fifteenth and sixteenth centuries. Real.
- In its own tradition: Timbuktu sat where the Niger meets the desert roads, and its scholar families built private libraries of law, astronomy, medicine and poetry, copied by hand and handed down. The scholar Ahmad Baba owned 1,600 books and said that his was a small collection.
- Sought by: The jurist, the copyist and the collector of books. They come by caravan to buy what no other city has.
- Proposed effect: **+3 science and +3 culture in every city where one of your trade routes ends.**
- Shape: Existing shape. `pays` with `where: city` and the scope `routeEndsHere` (the Bank uses the same scope).
- Site: None.
- Picture: A mud-brick room with open chests of loose-leaf books in leather cases, a scholar reading, and camels at the door.
- Note: New effect. It pays an empire of caravans in knowledge. This is about the family libraries and not the mosques, which are places of worship today.

#### The Stone of the Five Suns

- Culture and period: Mexica (Aztec), Mesoamerica; carved about 1502 to 1520. Real.
- In its own tradition: A basalt disc 3.6 metres wide from the centre of Tenochtitlan. It shows the four worlds that ended before ours, each with its own sun, around the face of the fifth, with the twenty day signs in a ring. It is not a working calendar. Scholars think it was a stage for rites.
- Sought by: The keeper of the calendar and the reader of days. They come to learn how many worlds ended before this one, and on which day this one will.
- Proposed effect: **When you finish a technology, gain +25 faith.**
- Shape: Existing shape. `windfallRider` on the `tech` occasion, with a flat faith grant.
- Site: None.
- Picture: A great carved disc painted red and blue, laid flat on a platform before a twin temple, with a lake city behind.
- Note: New effect. It turns research into faith, the reverse of The Temple of Thoth. A seat makes about 128 faith a turn in age 4, so the figure needs a check against how often a technology falls.

#### The Theatre of Memory

- Culture and period: Renaissance Italy and France; the 1530s. Real, never finished.
- In its own tradition: Giulio Camillo built a wooden theatre for the King of France. A person on its stage was meant to see all knowledge set out in seven rising rows under the seven planets.
- Sought by: The master of memory. They come to hold all knowledge in the mind at one time, each thing in its place.
- Proposed effect: **Your Orders are sealed for 2 turns in place of 5.**
- Shape: Existing shape. `metaRule` with the rule `sealTurns`. Two Orders already use it.
- Site: None.
- Picture: A small wooden half-circle of seven steps covered in painted signs, with one man on the stage looking up at it.
- Note: Kept from the first list. It lets a seat change its council for each new plan, which is worth most with 8 to 11 chairs.

### The whole set by culture area and age

- Proposed wonders are in bold.

| Culture area | Age 1 | Age 2 | Age 3 | Age 4 | Now | Proposed |
|---|---|---|---|---|---|---|
| Europe and Greco-Roman | The Temple of Artemis; Stonehenge; The Great Lighthouse; The Oracle | The Mausoleum; The Theatre of Dionysus; The Colossus; **The Pillars of Hercules** | The Great Library; The Statue of Zeus; Hagia Sophia; The Circus Maximus; **The Brazen Head** | Notre-Dame; **The Theatre of Memory** | 12 | 3 |
| Ancient Near East | The Hanging Gardens; The Walls of Uruk; The Great Ziggurat; **The Pillars of Seth** |   | Petra |   | 4 | 1 |
| Egypt and Africa | The Pyramids; **The Temple of Thoth** | **The Stelae of Aksum** | The Great Mosque of Djenné | **The Libraries of Timbuktu** | 2 | 3 |
| Islamic world |   |   |   | The House of Wisdom; The Alhambra | 2 | 0 |
| Persia and Central Asia |   | **The Academy of Gundeshapur** | **The Maragheh Observatory** | **The Observatory of Ulugh Beg** | 0 | 3 |
| India |   | **The Schools of Taxila** | **Nalanda** |   | 0 | 2 |
| China and East Asia | **The Oracle Pits of Yin** |   | The Terracotta Army; The Forbidden City; The Great Wall; The Water Clock of Su Song; **The Hall of Light** |   | 4 | 2 |
| Southeast Asia |   |   | Angkor Wat |   | 1 | 0 |
| Mesoamerica and the Andes | **Chavín de Huántar** |   | Chichen Itza | Machu Picchu; **The Stone of the Five Suns** | 2 | 2 |

- The Great Lighthouse and The Great Library stood in Egypt and were Greek works, so they are counted as Greco-Roman. The Temple of Artemis and The Mausoleum stood in Anatolia and are counted the same way.
- The Libraries of Timbuktu, The Maragheh Observatory and The Observatory of Ulugh Beg also belong to the Islamic world. They are counted once, under their region.
- Southeast Asia has no proposal. Angkor Wat is there now. The best candidate for the theme, Borobudur, is a place of Buddhist worship today, so I left it out.
- Today 12 of the 27 wonders are European or Greco-Roman. With the 16 proposals the count is 15 of 43.

### Dropped from the first list

| Proposal | Why it was dropped, and where its effect went |
|---|---|
| The Tower of Babel | It is the same tower as The Great Ziggurat, which the game has. Its effect went to The Hall of Light. |
| Solomon's Temple | The Temple Mount is holy ground to three living faiths. Its effect went to The Schools of Taxila. |
| The Emerald Tablet | A text and not a place. Its effect went to The Temple of Thoth, the home of the same tradition. |
| The Sibyl's Cave | Greco-Roman, and age 2 keeps one such wonder. Its effect went to The Oracle Pits of Yin. |
| The Telesterion of Eleusis | Greco-Roman, for the same reason. Its effect went to Chavín de Huántar. |
| The Court of Prester John | A legend told in Europe about a king in Africa or Asia. Its effect went to The Stelae of Aksum, the real kingdom that the legend was later tied to. |
| The School of Toledo | Age 3 keeps one European wonder, The Brazen Head. Its effect went to The Academy of Gundeshapur. |
| Salomon's House | European, and age 4 keeps The Theatre of Memory. Its effect went to Nalanda. |
| The Studiolo | European, for the same reason. Its effect went to The Maragheh Observatory. |
| The Vault of Rosenkreuz | European, for the same reason. Its effect went to The Observatory of Ulugh Beg. |

## What I could not determine

- How much a free technology is worth in turns at each column. I did not read the price table.
- The worth of one point of happiness and one point of authority capacity in yield. Verdicts on Notre-Dame, The Circus Maximus and The Forbidden City rest on comparison with buildings, not on a figure.
- How The Great Wall and The Walls of Uruk play. Both need a game run.
- Whether each "existing shape" in part 3 is read by the evaluator in exactly the form proposed. The notes name the kind to check.

## Rebuild

- The script that printed the game text and the script that built this file and the review page are in the session scratchpad (`wonders/dump.ts`, `wonders/build.mjs`). They are not in the repo.
